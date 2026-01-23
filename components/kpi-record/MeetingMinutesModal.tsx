'use client'

import { useState, useEffect } from 'react'
import { X, Save, Check, XCircle } from 'lucide-react'
import { MeetingMinutesRecord, createMeetingMinutesRecord, updateMeetingMinutesRecord, updateMeetingMinutesApprovalStatus } from '@/lib/actions/meeting-minutes-actions'
import { MEETING_TYPES } from '@/lib/constants/kpi-record'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import { getActiveProjects } from '@/lib/actions/project-actions'
import { getActiveEmployees } from '@/lib/actions/employee-actions'
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

interface MeetingMinutesModalProps {
    open: boolean
    onClose: () => void
    record?: MeetingMinutesRecord
    currentUserId?: string
}

export function MeetingMinutesModal({ open, onClose, record, currentUserId }: MeetingMinutesModalProps) {
    const [formData, setFormData] = useState({
        project_id: '',
        meeting_date: '',
        meeting_end_time: '',
        meeting_type: 'Weekly',
        meeting_title: '',
        organized_by: '',
        attendees: '',
        mom_sent_at: '',
        sent_by: '',
        mom_file_path: '',
        notes: '',
        attachments: [] as UploadedFile[]
    })
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [projects, setProjects] = useState<{ value: string, label: string }[]>([])
    const [employees, setEmployees] = useState<{ value: string, label: string }[]>([])

    // Approval state
    const [approvalInfo, setApprovalInfo] = useState<{ instanceId?: string; status?: string; canApprove?: boolean }>({})
    const [approvalComment, setApprovalComment] = useState('')
    const [isApprovalLoading, setIsApprovalLoading] = useState(false)

    useEffect(() => {
        console.log('useEffect triggered: open=', open, 'currentUserId=', currentUserId, 'record=', record?.id)
        if (record) {
            // Parse attachments from record
            let attachments: UploadedFile[] = []
            try {
                if ((record as any).attachments) {
                    attachments = JSON.parse((record as any).attachments)
                }
            } catch (e) { }

            setFormData({
                project_id: record.project_id || '',
                meeting_date: record.meeting_date ? formatDateTimeLocal(record.meeting_date) : '',
                meeting_end_time: record.meeting_end_time ? formatDateTimeLocal(record.meeting_end_time) : '',
                meeting_type: record.meeting_type,
                meeting_title: record.meeting_title,
                organized_by: record.organized_by || '',
                attendees: record.attendees || '',
                mom_sent_at: record.mom_sent_at ? formatDateTimeLocal(record.mom_sent_at) : '',
                sent_by: record.sent_by || '',
                mom_file_path: record.mom_file_path || '',
                notes: record.notes || '',
                attachments
            })
            // Check if user can approve this record
            checkApprovalStatus(record.id)
        } else {
            const now = new Date()
            const nowStr = now.toISOString().slice(0, 16)
            setFormData({
                project_id: '',
                meeting_date: nowStr,
                meeting_end_time: '',
                meeting_type: 'Weekly',
                meeting_title: '',
                organized_by: currentUserId || '',
                attendees: '',
                mom_sent_at: '',
                sent_by: currentUserId || '',
                mom_file_path: '',
                notes: '',
                attachments: []
            })
            setApprovalInfo({})
        }
        setErrors({})
        setApprovalComment('')
    }, [record, open, currentUserId])

    const checkApprovalStatus = async (recordId: string) => {
        try {
            const result = await getApprovalInstanceByDocumentId(recordId, 'KPI')
            setApprovalInfo(result)
        } catch (error) {
            console.error('Error checking approval status:', error)
        }
    }

    useEffect(() => {
        const loadData = async () => {
            const [projectsRes, employeesRes] = await Promise.all([
                getActiveProjects(),
                getActiveEmployees()
            ])
            if (projectsRes.success && projectsRes.data) {
                setProjects([
                    { value: '', label: 'No Project (Internal)' },
                    ...projectsRes.data.map((p: any) => ({
                        value: p.id,
                        label: `${p.project_code} - ${p.name}`
                    }))
                ])
            }
            if (employeesRes.success && employeesRes.data) {
                setEmployees(employeesRes.data.map((e: any) => ({
                    value: e.id,
                    label: e.full_name || e.nickname || e.employee_code
                })))
            }
        }
        if (open) loadData()
    }, [open])

    const formatDateTimeLocal = (dateStr: string) => {
        try {
            const date = new Date(dateStr)
            return date.toISOString().slice(0, 16)
        } catch {
            return ''
        }
    }

    const validate = () => {
        const newErrors: { [key: string]: string } = {}
        if (!formData.meeting_date) newErrors.meeting_date = 'Meeting date/time is required'
        if (!formData.meeting_title.trim()) newErrors.meeting_title = 'Title is required'
        if (!formData.meeting_type) newErrors.meeting_type = 'Meeting type is required'
        if (!formData.organized_by) newErrors.organized_by = 'Organizer is required'

        setErrors(newErrors)

        // Show toast for validation errors
        if (Object.keys(newErrors).length > 0) {
            const errorMessages = Object.values(newErrors).join(', ')
            toast.error(`Validation failed: ${errorMessages}`)
        }

        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
        e?.preventDefault()
        console.log('handleSubmit called', formData)
        console.log('organized_by value:', formData.organized_by, 'length:', formData.organized_by?.length)
        if (!validate()) {
            console.log('validation failed', errors)
            return
        }

        setIsLoading(true)
        try {
            // Serialize attachments
            const attachmentsJson = formData.attachments.length > 0
                ? JSON.stringify(formData.attachments)
                : undefined

            let result
            const submitData = {
                project_id: formData.project_id || undefined,
                meeting_date: formData.meeting_date,
                meeting_end_time: formData.meeting_end_time || undefined,
                meeting_type: formData.meeting_type,
                meeting_title: formData.meeting_title,
                organized_by: formData.organized_by,
                attendees: formData.attendees || undefined,
                mom_sent_at: formData.mom_sent_at || undefined,
                sent_by: formData.sent_by || undefined,
                mom_file_path: formData.mom_file_path || undefined,
                notes: formData.notes || undefined,
                attachments: attachmentsJson
            }

            if (record) {
                result = await updateMeetingMinutesRecord(record.id, submitData)
            } else {
                result = await createMeetingMinutesRecord({
                    ...submitData,
                    created_by: currentUserId || ''
                })
            }

            if (result.success) {
                toast.success(record ? 'Record updated successfully' : 'Record created successfully')
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
                    await updateMeetingMinutesApprovalStatus(record.id, 'APPROVED')
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
                    await updateMeetingMinutesApprovalStatus(record.id, 'REJECTED')
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

    const approvalStatus = (record as any)?.approval_status || 'DRAFT'
    const isPending = approvalStatus === 'PENDING' || approvalInfo.status === 'IN_PROGRESS'

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-slate-800">
                            {record ? 'Edit Meeting Minutes' : 'New Meeting Minutes'}
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
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Project (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Project
                        </label>
                        <SmartCombobox
                            options={projects}
                            value={projects.find(p => p.value === formData.project_id) || null}
                            onChange={(opt) => setFormData({ ...formData, project_id: opt?.value?.toString() || '' })}
                            placeholder="Select project (optional)..."
                        />
                    </div>

                    {/* Organizer (KPI Owner) */}
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                        <label className="block text-sm font-semibold text-amber-800 mb-2">
                            ผู้จัดประชุม (เจ้าของ KPI) <span className="text-red-500">*</span>
                        </label>
                        <SmartCombobox
                            options={employees}
                            value={employees.find(e => e.value === formData.organized_by) || null}
                            onChange={(opt) => setFormData({ ...formData, organized_by: opt?.value?.toString() || '' })}
                            placeholder="เลือกผู้จัดประชุม..."
                        />
                        {errors.organized_by && <p className="text-red-500 text-xs mt-1">{errors.organized_by}</p>}
                    </div>

                    {/* Meeting Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Meeting Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.meeting_title}
                            onChange={(e) => setFormData({ ...formData, meeting_title: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${errors.meeting_title ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                            placeholder="e.g., Weekly Progress Review"
                        />
                        {errors.meeting_title && <p className="text-red-500 text-xs mt-1">{errors.meeting_title}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {/* Meeting Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Meeting Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.meeting_type}
                                onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            >
                                {MEETING_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        {/* Meeting Start */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Start Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.meeting_date}
                                onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${errors.meeting_date ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                            />
                            {errors.meeting_date && <p className="text-red-500 text-xs mt-1">{errors.meeting_date}</p>}
                        </div>

                        {/* Meeting End */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                End Time
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.meeting_end_time}
                                onChange={(e) => setFormData({ ...formData, meeting_end_time: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                        </div>
                    </div>

                    {/* Attendees */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Attendees
                        </label>
                        <input
                            type="text"
                            value={formData.attendees}
                            onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            placeholder="e.g., John, Jane, Customer Team"
                        />
                    </div>

                    {/* MoM Sent Section */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h3 className="text-sm font-semibold text-blue-800 mb-3">MoM Submission (KPI: ≤ 24 hours)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    MoM Sent At
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.mom_sent_at}
                                    onChange={(e) => setFormData({ ...formData, mom_sent_at: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Sent By
                                </label>
                                <SmartCombobox
                                    options={employees}
                                    value={employees.find(e => e.value === formData.sent_by) || null}
                                    onChange={(opt) => setFormData({ ...formData, sent_by: opt?.value?.toString() || '' })}
                                    placeholder="Select who sent MoM..."
                                />
                            </div>
                        </div>

                        <div className="mt-3">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                MoM File Path
                            </label>
                            <input
                                type="text"
                                value={formData.mom_file_path}
                                onChange={(e) => setFormData({ ...formData, mom_file_path: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                placeholder="SharePoint/Drive link or file path"
                            />
                        </div>
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
                            rows={3}
                            placeholder="Additional notes..."
                        />
                    </div>

                    {/* Attachments */}
                    <FileUpload
                        value={formData.attachments}
                        onChange={(files) => setFormData({ ...formData, attachments: files })}
                        maxFiles={5}
                        maxSizeMB={10}
                        subFolder="meeting-minutes"
                        label="Attachments"
                        helperText="Upload MoM documents or screenshots (max 5 files, 10MB each)"
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

                        {/* Save button - Show when not pending approval OR user is not approver */}
                        {(!isPending || !approvalInfo.canApprove) && (
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Save size={16} />
                                )}
                                {record ? 'Update' : 'Save'}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
