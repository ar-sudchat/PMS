'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { v4 as uuidv4 } from 'uuid'

// ============================================
// TYPES
// ============================================

export type NotificationChannel = 'EMAIL' | 'MS_TEAMS' | 'IN_APP' | 'ALL'
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'

export interface NotificationRecipient {
    userId?: string
    email?: string
    teamsWebhookUrl?: string
    name?: string
}

export interface NotificationAttachment {
    filename: string
    content?: string // base64
    url?: string
    contentType?: string
}

export interface NotificationPayload {
    subject: string
    body: string
    htmlBody?: string
    recipients: NotificationRecipient[]
    channel: NotificationChannel
    priority?: NotificationPriority
    attachments?: NotificationAttachment[]
    metadata?: Record<string, any>
    // For templating
    templateId?: string
    templateData?: Record<string, any>
}

export interface NotificationResult {
    success: boolean
    notificationId?: string
    channel: NotificationChannel
    error?: string
    sentAt?: Date
}

export interface SendResult {
    success: boolean
    results: NotificationResult[]
    errors?: string[]
}

// Email specific types
export interface EmailConfig {
    host: string
    port: number
    secure: boolean
    user: string
    password: string
    from: string
    fromName?: string
}

// MS Teams specific types
export interface TeamsMessageCard {
    title: string
    text: string
    themeColor?: string
    sections?: TeamsSection[]
    potentialAction?: TeamsAction[]
}

export interface TeamsSection {
    activityTitle?: string
    activitySubtitle?: string
    activityImage?: string
    facts?: { name: string; value: string }[]
    text?: string
}

export interface TeamsAction {
    '@type': string
    name: string
    targets?: { os: string; uri: string }[]
}

// ============================================
// CONFIGURATION HELPERS
// ============================================

/**
 * Get Email configuration from database
 */
async function getEmailConfig(): Promise<EmailConfig | null> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .query(`
                SELECT config_key, config_value
                FROM pms.system_configs
                WHERE config_key IN (
                    'EMAIL_SMTP_HOST',
                    'EMAIL_SMTP_PORT',
                    'EMAIL_SMTP_SECURE',
                    'EMAIL_SMTP_USER',
                    'EMAIL_SMTP_PASSWORD',
                    'EMAIL_FROM_ADDRESS',
                    'EMAIL_FROM_NAME'
                )
            `)

        if (result.recordset.length === 0) {
            return null
        }

        const configMap: Record<string, string> = {}
        for (const row of result.recordset) {
            configMap[row.config_key] = row.config_value
        }

        // Check required fields
        if (!configMap['EMAIL_SMTP_HOST'] || !configMap['EMAIL_FROM_ADDRESS']) {
            return null
        }

        return {
            host: configMap['EMAIL_SMTP_HOST'],
            port: parseInt(configMap['EMAIL_SMTP_PORT'] || '587'),
            secure: configMap['EMAIL_SMTP_SECURE'] === 'true',
            user: configMap['EMAIL_SMTP_USER'] || '',
            password: configMap['EMAIL_SMTP_PASSWORD'] || '',
            from: configMap['EMAIL_FROM_ADDRESS'],
            fromName: configMap['EMAIL_FROM_NAME'] || 'PMS System'
        }
    } catch (error) {
        console.error('getEmailConfig error:', error)
        return null
    }
}

/**
 * Get MS Teams webhook URL from database
 */
async function getTeamsWebhookUrl(): Promise<string | null> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .query(`
                SELECT config_value
                FROM pms.system_configs
                WHERE config_key = 'MS_TEAMS_WEBHOOK_URL'
            `)

        if (result.recordset.length === 0) {
            return null
        }

        return result.recordset[0].config_value
    } catch (error) {
        console.error('getTeamsWebhookUrl error:', error)
        return null
    }
}

// ============================================
// EMAIL FUNCTIONS
// ============================================

/**
 * Send email notification
 * Note: Requires nodemailer to be installed: npm install nodemailer @types/nodemailer
 */
export async function sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
    const notificationId = uuidv4()

    try {
        const config = await getEmailConfig()
        if (!config) {
            return {
                success: false,
                notificationId,
                channel: 'EMAIL',
                error: 'Email configuration not found. Please configure SMTP settings.'
            }
        }

        // Dynamic import nodemailer (optional dependency)
        let nodemailer
        try {
            nodemailer = await import('nodemailer')
        } catch {
            return {
                success: false,
                notificationId,
                channel: 'EMAIL',
                error: 'nodemailer not installed. Run: npm install nodemailer'
            }
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.user ? {
                user: config.user,
                pass: config.password
            } : undefined
        })

        // Prepare recipients
        const toEmails = payload.recipients
            .filter(r => r.email)
            .map(r => r.name ? `"${r.name}" <${r.email}>` : r.email)
            .join(', ')

        if (!toEmails) {
            return {
                success: false,
                notificationId,
                channel: 'EMAIL',
                error: 'No email recipients provided'
            }
        }

        // Prepare attachments
        const attachments = payload.attachments?.map(att => ({
            filename: att.filename,
            content: att.content,
            path: att.url,
            contentType: att.contentType
        }))

        // Send email
        const info = await transporter.sendMail({
            from: config.fromName ? `"${config.fromName}" <${config.from}>` : config.from,
            to: toEmails,
            subject: payload.subject,
            text: payload.body,
            html: payload.htmlBody || payload.body.replace(/\n/g, '<br>'),
            attachments
        })

        // Log to database
        await logNotification({
            id: notificationId,
            channel: 'EMAIL',
            subject: payload.subject,
            recipients: toEmails,
            status: 'SENT',
            metadata: { messageId: info.messageId }
        })

        return {
            success: true,
            notificationId,
            channel: 'EMAIL',
            sentAt: new Date()
        }

    } catch (error: any) {
        console.error('sendEmail error:', error)

        // Log failure
        await logNotification({
            id: notificationId,
            channel: 'EMAIL',
            subject: payload.subject,
            recipients: payload.recipients.map(r => r.email).join(', '),
            status: 'FAILED',
            error: error.message
        })

        return {
            success: false,
            notificationId,
            channel: 'EMAIL',
            error: error.message
        }
    }
}

// ============================================
// MS TEAMS FUNCTIONS
// ============================================

/**
 * Send MS Teams notification via webhook
 */
export async function sendTeamsMessage(payload: NotificationPayload): Promise<NotificationResult> {
    const notificationId = uuidv4()

    try {
        // Get webhook URL from recipient or config
        let webhookUrl: string | undefined = payload.recipients.find(r => r.teamsWebhookUrl)?.teamsWebhookUrl
        if (!webhookUrl) {
            webhookUrl = await getTeamsWebhookUrl() || undefined
        }

        if (!webhookUrl) {
            return {
                success: false,
                notificationId,
                channel: 'MS_TEAMS',
                error: 'MS Teams webhook URL not configured'
            }
        }

        // Build message card
        const messageCard: TeamsMessageCard = {
            title: payload.subject,
            text: payload.body,
            themeColor: getThemeColor(payload.priority),
            sections: []
        }

        // Add metadata as facts
        if (payload.metadata) {
            const facts = Object.entries(payload.metadata)
                .filter(([_, value]) => value !== undefined && value !== null)
                .map(([key, value]) => ({
                    name: formatFactName(key),
                    value: String(value)
                }))

            if (facts.length > 0) {
                messageCard.sections?.push({ facts })
            }
        }

        // Send to Teams webhook
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                '@type': 'MessageCard',
                '@context': 'http://schema.org/extensions',
                ...messageCard
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Teams webhook failed: ${response.status} - ${errorText}`)
        }

        // Log to database
        await logNotification({
            id: notificationId,
            channel: 'MS_TEAMS',
            subject: payload.subject,
            recipients: 'Teams Channel',
            status: 'SENT'
        })

        return {
            success: true,
            notificationId,
            channel: 'MS_TEAMS',
            sentAt: new Date()
        }

    } catch (error: any) {
        console.error('sendTeamsMessage error:', error)

        // Log failure
        await logNotification({
            id: notificationId,
            channel: 'MS_TEAMS',
            subject: payload.subject,
            recipients: 'Teams Channel',
            status: 'FAILED',
            error: error.message
        })

        return {
            success: false,
            notificationId,
            channel: 'MS_TEAMS',
            error: error.message
        }
    }
}

/**
 * Send Teams Adaptive Card (more advanced formatting)
 */
export async function sendTeamsAdaptiveCard(
    webhookUrl: string,
    card: any,
    subject?: string
): Promise<NotificationResult> {
    const notificationId = uuidv4()

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'message',
                attachments: [{
                    contentType: 'application/vnd.microsoft.card.adaptive',
                    contentUrl: null,
                    content: card
                }]
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Teams webhook failed: ${response.status} - ${errorText}`)
        }

        await logNotification({
            id: notificationId,
            channel: 'MS_TEAMS',
            subject: subject || 'Adaptive Card',
            recipients: 'Teams Channel',
            status: 'SENT'
        })

        return {
            success: true,
            notificationId,
            channel: 'MS_TEAMS',
            sentAt: new Date()
        }

    } catch (error: any) {
        console.error('sendTeamsAdaptiveCard error:', error)
        return {
            success: false,
            notificationId,
            channel: 'MS_TEAMS',
            error: error.message
        }
    }
}

// ============================================
// IN-APP NOTIFICATION FUNCTIONS
// ============================================

/**
 * Create in-app notification (stored in database)
 */
export async function createInAppNotification(
    userId: string,
    activityType: string,
    activityId: string,
    message?: string
): Promise<NotificationResult> {
    const notificationId = uuidv4()

    try {
        const pool = await getConnection()

        await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .input('activityType', sql.VarChar(50), activityType)
            .input('activityId', sql.VarChar(50), activityId)
            .input('message', sql.NVarChar(500), message || null)
            .query(`
                INSERT INTO pms.user_notifications (user_id, activity_type, activity_id, message, is_read, created_at)
                VALUES (@userId, @activityType, @activityId, @message, 0, GETDATE())
            `)

        return {
            success: true,
            notificationId,
            channel: 'IN_APP',
            sentAt: new Date()
        }

    } catch (error: any) {
        console.error('createInAppNotification error:', error)
        return {
            success: false,
            notificationId,
            channel: 'IN_APP',
            error: error.message
        }
    }
}

// ============================================
// MAIN NOTIFICATION FUNCTION
// ============================================

/**
 * Send notification via specified channels
 * This is the main function to use for sending notifications
 */
export async function sendNotification(payload: NotificationPayload): Promise<SendResult> {
    const results: NotificationResult[] = []
    const errors: string[] = []

    // Determine which channels to use
    const channels: NotificationChannel[] = payload.channel === 'ALL'
        ? ['EMAIL', 'MS_TEAMS', 'IN_APP']
        : [payload.channel]

    for (const channel of channels) {
        let result: NotificationResult

        switch (channel) {
            case 'EMAIL':
                result = await sendEmail(payload)
                break

            case 'MS_TEAMS':
                result = await sendTeamsMessage(payload)
                break

            case 'IN_APP':
                // Create in-app notification for each recipient with userId
                const inAppRecipients = payload.recipients.filter(r => r.userId)
                if (inAppRecipients.length > 0) {
                    for (const recipient of inAppRecipients) {
                        const inAppResult = await createInAppNotification(
                            recipient.userId!,
                            payload.metadata?.activityType || 'notification',
                            payload.metadata?.activityId || uuidv4(),
                            payload.body
                        )
                        results.push(inAppResult)
                        if (!inAppResult.success && inAppResult.error) {
                            errors.push(inAppResult.error)
                        }
                    }
                    continue // Skip adding to results again
                } else {
                    result = {
                        success: false,
                        channel: 'IN_APP',
                        error: 'No userId provided for in-app notification'
                    }
                }
                break

            default:
                result = {
                    success: false,
                    channel,
                    error: `Unknown channel: ${channel}`
                }
        }

        results.push(result)
        if (!result.success && result.error) {
            errors.push(result.error)
        }
    }

    return {
        success: errors.length === 0,
        results,
        errors: errors.length > 0 ? errors : undefined
    }
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

/**
 * Send approval request notification
 */
export async function sendApprovalNotification(data: {
    approverEmail: string
    approverName: string
    approverUserId?: string
    documentType: string
    documentId: string
    documentTitle: string
    requesterName: string
    amount?: number
    description?: string
    approvalUrl?: string
}): Promise<SendResult> {
    const subject = `[PMS] รออนุมัติ: ${data.documentType} - ${data.documentTitle}`

    const body = `
เรียน ${data.approverName}

มีเอกสารรออนุมัติจากคุณ

รายละเอียด:
- ประเภท: ${data.documentType}
- เลขที่: ${data.documentId}
- รายการ: ${data.documentTitle}
- ผู้ขออนุมัติ: ${data.requesterName}
${data.amount ? `- จำนวนเงิน: ${data.amount.toLocaleString()} บาท` : ''}
${data.description ? `- รายละเอียด: ${data.description}` : ''}

${data.approvalUrl ? `กรุณาดำเนินการอนุมัติที่: ${data.approvalUrl}` : 'กรุณาเข้าระบบเพื่อดำเนินการอนุมัติ'}

ขอบคุณ
PMS System
`.trim()

    return sendNotification({
        subject,
        body,
        channel: 'ALL',
        priority: 'HIGH',
        recipients: [{
            email: data.approverEmail,
            name: data.approverName,
            userId: data.approverUserId
        }],
        metadata: {
            activityType: 'approval_request',
            activityId: data.documentId,
            documentType: data.documentType,
            documentTitle: data.documentTitle,
            requesterName: data.requesterName,
            amount: data.amount
        }
    })
}

/**
 * Send approval result notification
 */
export async function sendApprovalResultNotification(data: {
    requesterEmail: string
    requesterName: string
    requesterUserId?: string
    documentType: string
    documentId: string
    documentTitle: string
    approverName: string
    isApproved: boolean
    comments?: string
}): Promise<SendResult> {
    const status = data.isApproved ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ'
    const subject = `[PMS] ${status}: ${data.documentType} - ${data.documentTitle}`

    const body = `
เรียน ${data.requesterName}

เอกสารของคุณได้รับการพิจารณาแล้ว

รายละเอียด:
- ประเภท: ${data.documentType}
- เลขที่: ${data.documentId}
- รายการ: ${data.documentTitle}
- ผลการพิจารณา: ${status}
- ผู้อนุมัติ: ${data.approverName}
${data.comments ? `- หมายเหตุ: ${data.comments}` : ''}

ขอบคุณ
PMS System
`.trim()

    return sendNotification({
        subject,
        body,
        channel: 'ALL',
        priority: data.isApproved ? 'NORMAL' : 'HIGH',
        recipients: [{
            email: data.requesterEmail,
            name: data.requesterName,
            userId: data.requesterUserId
        }],
        metadata: {
            activityType: data.isApproved ? 'approval_approved' : 'approval_rejected',
            activityId: data.documentId,
            documentType: data.documentType,
            documentTitle: data.documentTitle,
            approverName: data.approverName
        }
    })
}

/**
 * Send task assignment notification
 */
export async function sendTaskAssignmentNotification(data: {
    assigneeEmail: string
    assigneeName: string
    assigneeUserId?: string
    taskName: string
    taskId: string
    projectName: string
    assignerName: string
    dueDate?: Date
    description?: string
}): Promise<SendResult> {
    const subject = `[PMS] งานใหม่: ${data.taskName}`

    const body = `
เรียน ${data.assigneeName}

คุณได้รับมอบหมายงานใหม่

รายละเอียด:
- ชื่องาน: ${data.taskName}
- โครงการ: ${data.projectName}
- มอบหมายโดย: ${data.assignerName}
${data.dueDate ? `- กำหนดส่ง: ${data.dueDate.toLocaleDateString('th-TH')}` : ''}
${data.description ? `- รายละเอียด: ${data.description}` : ''}

ขอบคุณ
PMS System
`.trim()

    return sendNotification({
        subject,
        body,
        channel: 'ALL',
        priority: 'NORMAL',
        recipients: [{
            email: data.assigneeEmail,
            name: data.assigneeName,
            userId: data.assigneeUserId
        }],
        metadata: {
            activityType: 'task_assigned',
            activityId: data.taskId,
            taskName: data.taskName,
            projectName: data.projectName,
            assignerName: data.assignerName
        }
    })
}

// ============================================
// LOGGING & UTILITY FUNCTIONS
// ============================================

/**
 * Log notification to database
 */
async function logNotification(data: {
    id: string
    channel: NotificationChannel
    subject: string
    recipients: string
    status: NotificationStatus
    error?: string
    metadata?: Record<string, any>
}): Promise<void> {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, data.id)
            .input('channel', sql.VarChar(20), data.channel)
            .input('subject', sql.NVarChar(500), data.subject)
            .input('recipients', sql.NVarChar(sql.MAX), data.recipients)
            .input('status', sql.VarChar(20), data.status)
            .input('error', sql.NVarChar(sql.MAX), data.error || null)
            .input('metadata', sql.NVarChar(sql.MAX), data.metadata ? JSON.stringify(data.metadata) : null)
            .query(`
                INSERT INTO pms.notification_logs (id, channel, subject, recipients, status, error_message, metadata, created_at)
                VALUES (@id, @channel, @subject, @recipients, @status, @error, @metadata, GETDATE())
            `)
    } catch (error) {
        // Silent fail for logging - don't break the notification flow
        console.error('logNotification error:', error)
    }
}

/**
 * Get theme color based on priority for Teams messages
 */
function getThemeColor(priority?: NotificationPriority): string {
    switch (priority) {
        case 'URGENT':
            return 'FF0000' // Red
        case 'HIGH':
            return 'FFA500' // Orange
        case 'NORMAL':
            return '0078D4' // Blue
        case 'LOW':
            return '808080' // Gray
        default:
            return '0078D4' // Blue
    }
}

/**
 * Format fact name for Teams message
 */
function formatFactName(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/^./, str => str.toUpperCase())
        .trim()
}

// ============================================
// TEST FUNCTIONS
// ============================================

/**
 * Test email configuration
 */
export async function testEmailConnection(): Promise<{
    success: boolean
    message: string
    config?: Partial<EmailConfig>
}> {
    try {
        const config = await getEmailConfig()

        if (!config) {
            return {
                success: false,
                message: 'Email configuration not found. Please configure SMTP settings in system configs.'
            }
        }

        // Try to import nodemailer
        let nodemailer
        try {
            nodemailer = await import('nodemailer')
        } catch {
            return {
                success: false,
                message: 'nodemailer not installed. Run: npm install nodemailer',
                config: { host: config.host, port: config.port, from: config.from }
            }
        }

        // Create transporter and verify
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.user ? {
                user: config.user,
                pass: config.password
            } : undefined
        })

        await transporter.verify()

        return {
            success: true,
            message: 'Email connection successful',
            config: { host: config.host, port: config.port, from: config.from }
        }

    } catch (error: any) {
        return {
            success: false,
            message: `Email connection failed: ${error.message}`
        }
    }
}

/**
 * Test MS Teams webhook
 */
export async function testTeamsWebhook(webhookUrl?: string): Promise<{
    success: boolean
    message: string
}> {
    try {
        const url = webhookUrl || await getTeamsWebhookUrl()

        if (!url) {
            return {
                success: false,
                message: 'MS Teams webhook URL not configured'
            }
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                '@type': 'MessageCard',
                '@context': 'http://schema.org/extensions',
                title: 'PMS Test Message',
                text: 'This is a test message from PMS system. If you see this, Teams integration is working!',
                themeColor: '00FF00'
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            return {
                success: false,
                message: `Teams webhook failed: ${response.status} - ${errorText}`
            }
        }

        return {
            success: true,
            message: 'MS Teams webhook test successful'
        }

    } catch (error: any) {
        return {
            success: false,
            message: `MS Teams test failed: ${error.message}`
        }
    }
}
