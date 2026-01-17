'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Save, Send, Check, XCircle } from 'lucide-react'
import { DeployRecord, createDeployRecord, updateDeployRecord, getActiveCustomers, submitDeployRecordForApproval, updateDeployRecordApprovalStatus } from '@/lib/actions/deploy-record-actions'
import { getWeeksOfYear, getCurrentWeek } from '@/lib/utils/week-helper'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import { getApprovalInstanceByDocumentId, approveRequest, rejectRequest } from '@/lib/actions/approval-actions'
import { ApprovalStatusBadge } from '@/components/approval/ApprovalStatusBadge'
import FileUpload from '@/components/ui/FileUpload'

interface UploadedFile {
    id: string
    name: string
    path: string
    size: number
    mimeType: string
}

interface DeployRecordModalProps {
    open: boolean
    onClose: () => void
    record?: DeployRecord
    currentUserId?: string
}

export function DeployRecordModal({ open, onClose, record, currentUserId }: DeployRecordModalProps) {
    const currentYear = new Date().getFullYear()
    const currentWeek = getCurrentWeek()

    const [formData, setFormData] = useState({
        customer_id: '',
        week_value: currentWeek.value,
        deploy_count: 0,
        rollback_count: 0,
        notes: '',
        attachments: [] as UploadedFile[]
    })
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [customers, setCustomers] = useState<{ value: string, label: string }[]>([])

    // Approval state
    const [approvalInfo, setApprovalInfo] = useState<{ instanceId?: string; status?: string; canApprove?: boolean }>({})
    const [approvalComment, setApprovalComment] = useState('')
    const [isApprovalLoading, setIsApprovalLoading] = useState(false)

    // Generate weeks for current year
    const weeks = useMemo(() => getWeeksOfYear(currentYear), [currentYear])

    useEffect(() => {
        if (record) {
            // Parse attachments from record
            let attachments: UploadedFile[] = []
            try {
                if ((record as any).attachments) {
                    attachments = JSON.parse((record as any).attachments)
                }
            } catch (e) { }

            setFormData({
                customer_id: record.customer_id,
                week_value: `${record.year}-W${record.week_number.toString().padStart(2, '0')}`,
                deploy_count: record.deploy_count,
                rollback_count: record.rollback_count,
                notes: record.notes || '',
                attachments
            })
            // Check if user can approve this record
            checkApprovalStatus(record.id)
        } else {
            setFormData({
                customer_id: '',
                week_value: currentWeek.value,
                deploy_count: 0,
                rollback_count: 0,
                notes: '',
                attachments: []
            })
            setApprovalInfo({})
        }
        setErrors({})
        setApprovalComment('')
    }, [record, open, currentWeek.value])

    const checkApprovalStatus = async (recordId: string) => {
        try {
            const result = await getApprovalInstanceByDocumentId(recordId, 'KPI')
            setApprovalInfo(result)
        } catch (error) {
            console.error('Error checking approval status:', error)
        }
    }

    useEffect(() => {
        const loadCustomers = async () => {
            const result = await getActiveCustomers()
            if (result.success && result.data) {
                setCustomers(result.data.map((c: any) => ({
                    value: c.id,
                    label: c.name
                })))
            }
        }
        if (open) loadCustomers()
    }, [open])

    const validate = () => {
        const newErrors: { [key: string]: string } = {}
        if (!formData.customer_id) newErrors.customer_id = 'Customer is required'
        if (!formData.week_value) newErrors.week_value = 'Week is required'
        if (formData.deploy_count < 0) newErrors.deploy_count = 'Must be 0 or more'
        if (formData.rollback_count < 0) newErrors.rollback_count = 'Must be 0 or more'
        if (formData.rollback_count > formData.deploy_count) {
            newErrors.rollback_count = 'Cannot exceed deploy count'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent, submitForApproval: boolean = false) => {
        e.preventDefault()
        if (!validate()) return

        setIsLoading(true)
        try {
            // Parse week value to get year, week_number, week_start_date
            const selectedWeek = weeks.find(w => w.value === formData.week_value)
            if (!selectedWeek) {
                toast.error('Invalid week selected')
                return
            }

            // Serialize attachments
            const attachmentsJson = formData.attachments.length > 0
                ? JSON.stringify(formData.attachments)
                : undefined

            let result
            if (record) {
                // Update - only allow changing counts, notes and attachments
                result = await updateDeployRecord(record.id, {
                    deploy_count: formData.deploy_count,
                    rollback_count: formData.rollback_count,
                    notes: formData.notes || undefined,
                    attachments: attachmentsJson
                })
            } else {
                // Create
                result = await createDeployRecord({
                    customer_id: formData.customer_id,
                    week_start_date: selectedWeek.week_start_date,
                    year: selectedWeek.year,
                    week_number: selectedWeek.week_number,
                    deploy_count: formData.deploy_count,
                    rollback_count: formData.rollback_count,
                    notes: formData.notes || undefined,
                    attachments: attachmentsJson,
                    created_by: currentUserId || ''
                })
            }

            if (result.success) {
                // Get the record ID - for new records it's in result.id, for updates use record.id
                const recordId = (result as any).id || record?.id

                // If submitForApproval is true, submit the record for approval
                if (submitForApproval && recordId) {
                    const customerName = customers.find(c => c.value === formData.customer_id)?.label || 'Unknown'
                    const approvalResult = await submitDeployRecordForApproval(
                        recordId,
                        `Deploy Success - ${customerName} - W${selectedWeek.week_number}`
                    )
                    if (approvalResult.success) {
                        toast.success('Record created and submitted for approval')
                    } else {
                        toast.warning(`Record saved but approval submission failed: ${approvalResult.error}`)
                    }
                } else {
                    toast.success(record ? 'Record updated' : 'Record created')
                }
                onClose()
            } else {
                toast.error(result.error || 'Operation failed')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handleApprove = async () => {
        if (!approvalInfo.instanceId) return

        setIsApprovalLoading(true)
        try {
            const result = await approveRequest(approvalInfo.instanceId, approvalComment)
            if (result.success) {
                // Update record status
                if (record) {
                    await updateDeployRecordApprovalStatus(record.id, 'APPROVED')
                }
                toast.success('Approved successfully')
                onClose()
            } else {
                toast.error(result.error || 'Failed to approve')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsApprovalLoading(false)
        }
    }

    const handleReject = async () => {
        if (!approvalInfo.instanceId) return

        if (!approvalComment.trim()) {
            toast.error('Please provide a reason for rejection')
            return
        }

        setIsApprovalLoading(true)
        try {
            const result = await rejectRequest(approvalInfo.instanceId, approvalComment)
            if (result.success) {
                // Update record status
                if (record) {
                    await updateDeployRecordApprovalStatus(record.id, 'REJECTED')
                }
                toast.success('Rejected successfully')
                onClose()
            } else {
                toast.error(result.error || 'Failed to reject')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsApprovalLoading(false)
        }
    }

    // Calculate success rate preview
    const successRate = formData.deploy_count > 0
        ? Math.round(((formData.deploy_count - formData.rollback_count) / formData.deploy_count) * 100)
        : 100

    const approvalStatus = (record as any)?.approval_status || 'DRAFT'
    const isPending = approvalStatus === 'PENDING' || approvalInfo.status === 'IN_PROGRESS'

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-slate-800">
                            {record ? 'Edit Deploy Record' : 'Add Deploy Record'}
                        </h2>
                        {record && <ApprovalStatusBadge status={approvalStatus} size="sm" />}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Customer */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Customer <span className="text-red-500">*</span>
                        </label>
                        <SmartCombobox
                            options={customers}
                            value={customers.find(c => c.value === formData.customer_id) || null}
                            onChange={(opt) => setFormData({ ...formData, customer_id: opt?.value?.toString() || '' })}
                            placeholder="Select customer..."
                            disabled={!!record}
                        />
                        {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
                    </div>

                    {/* Week */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Week <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.week_value}
                            onChange={(e) => setFormData({ ...formData, week_value: e.target.value })}
                            disabled={!!record}
                            className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${errors.week_value ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'} ${record ? 'bg-slate-50 text-slate-500' : ''}`}
                        >
                            {weeks.map(w => (
                                <option key={w.value} value={w.value}>{w.label}</option>
                            ))}
                        </select>
                        {errors.week_value && <p className="text-red-500 text-xs mt-1">{errors.week_value}</p>}
                    </div>

                    {/* Deploy Count & Rollback Count */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Deploy Count <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.deploy_count}
                                onChange={(e) => setFormData({ ...formData, deploy_count: parseInt(e.target.value) || 0 })}
                                className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${errors.deploy_count ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                            />
                            {errors.deploy_count && <p className="text-red-500 text-xs mt-1">{errors.deploy_count}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Rollback Count <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                max={formData.deploy_count}
                                value={formData.rollback_count}
                                onChange={(e) => setFormData({ ...formData, rollback_count: parseInt(e.target.value) || 0 })}
                                className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${errors.rollback_count ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                            />
                            {errors.rollback_count && <p className="text-red-500 text-xs mt-1">{errors.rollback_count}</p>}
                        </div>
                    </div>

                    {/* Success Rate Preview */}
                    <div className={`p-4 rounded-lg border ${successRate >= 95 ? 'bg-green-50 border-green-200' : successRate >= 80 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="text-sm font-medium text-slate-600 mb-1">Success Rate</div>
                        <div className={`text-2xl font-bold ${successRate >= 95 ? 'text-green-600' : successRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                            {successRate}%
                            {successRate >= 95 ? ' ✅' : successRate >= 80 ? ' ⚠️' : ' ❌'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Target: ≥95%</div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                            rows={2}
                            placeholder="Additional notes..."
                        />
                    </div>

                    {/* Attachments */}
                    <FileUpload
                        value={formData.attachments}
                        onChange={(files) => setFormData({ ...formData, attachments: files })}
                        maxFiles={5}
                        maxSizeMB={10}
                        subFolder="deploy-success"
                        label="Attachments"
                        helperText="Upload screenshots or documents (max 5 files, 10MB each)"
                    />

                    {/* Approval Comment - Show only when user can approve */}
                    {approvalInfo.canApprove && isPending && (
                        <div className="border-t pt-4 mt-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Approval Comment
                            </label>
                            <textarea
                                value={approvalComment}
                                onChange={(e) => setApprovalComment(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                                rows={2}
                                placeholder="Comment (required for rejection)..."
                            />
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
                    <div>
                        {/* Cancel button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
                            disabled={isLoading || isApprovalLoading}
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="flex gap-3">
                        {/* Approval buttons - Show when user can approve and status is PENDING */}
                        {approvalInfo.canApprove && isPending && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleReject}
                                    disabled={isApprovalLoading}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isApprovalLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <XCircle size={16} />
                                    )}
                                    Reject
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApprove}
                                    disabled={isApprovalLoading}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isApprovalLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Check size={16} />
                                    )}
                                    Approve
                                </button>
                            </>
                        )}

                        {/* Save/Submit buttons - Show when not pending approval OR user is not approver */}
                        {(!isPending || !approvalInfo.canApprove) && (
                            <>
                                <button
                                    onClick={(e) => handleSubmit(e, false)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    {record ? 'Update' : 'Save Draft'}
                                </button>
                                {/* Show Submit button for new records OR existing DRAFT records */}
                                {(!record || approvalStatus === 'DRAFT') && (
                                    <button
                                        onClick={(e) => handleSubmit(e, true)}
                                        disabled={isLoading}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm shadow-green-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Send size={16} />
                                        )}
                                        {record ? 'Submit for Approval' : 'Save & Submit'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
