'use client'

import { useState, useEffect } from 'react'
import { X, Save, Database, Server, Code, Settings, FileText, FolderOpen, CheckCircle2, XCircle, Check } from 'lucide-react'
import { DeployBackupRecord, createDeployBackupRecord, updateDeployBackupRecord, updateDeployBackupApprovalStatus } from '@/lib/actions/deploy-backup-actions'
import { getActiveBackupSources } from '@/lib/actions/backup-source-actions'
import { getActiveBackupTypes } from '@/lib/actions/backup-type-actions'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
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

interface DeployBackupModalProps {
    open: boolean
    onClose: () => void
    record?: DeployBackupRecord
    currentUserId?: string
}

export function DeployBackupModal({ open, onClose, record, currentUserId }: DeployBackupModalProps) {
    const [formData, setFormData] = useState({
        backup_source_id: '',
        backup_date: new Date().toISOString().split('T')[0],
        deploy_record_id: '',
        backup_type: 'Database',
        backup_location: '',
        backup_size: '',
        version_number: 1,
        is_verified: false,
        verified_by: '',
        is_passed: true,
        failed_reason: '',
        notes: '',
        attachments: [] as UploadedFile[]
    })
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [backupSources, setBackupSources] = useState<{ value: string, label: string, type: string }[]>([])
    const [backupTypes, setBackupTypes] = useState<{ code: string, name: string, is_kpi_counted: boolean }[]>([])
    const [employees, setEmployees] = useState<{ value: string, label: string }[]>([])

    // Approval state
    const [approvalInfo, setApprovalInfo] = useState<{ instanceId?: string; status?: string; canApprove?: boolean }>({})
    const [approvalComment, setApprovalComment] = useState('')
    const [isApprovalLoading, setIsApprovalLoading] = useState(false)

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
                backup_source_id: record.backup_source_id,
                backup_date: record.backup_date
                    ? (typeof record.backup_date === 'string' ? record.backup_date.split('T')[0] : new Date(record.backup_date).toISOString().split('T')[0])
                    : '',
                deploy_record_id: record.deploy_record_id || '',
                backup_type: record.backup_type,
                backup_location: record.backup_location || '',
                backup_size: record.backup_size || '',
                version_number: record.version_number,
                is_verified: record.is_verified,
                verified_by: record.verified_by || '',
                is_passed: record.is_passed !== false,
                failed_reason: record.failed_reason || '',
                notes: record.notes || '',
                attachments
            })
            // Check if user can approve this record
            checkApprovalStatus(record.id)
        } else {
            setFormData({
                backup_source_id: '',
                backup_date: new Date().toISOString().split('T')[0],
                deploy_record_id: '',
                backup_type: 'Database',
                backup_location: '',
                backup_size: '',
                version_number: 1,
                is_verified: false,
                verified_by: '',
                is_passed: true,
                failed_reason: '',
                notes: '',
                attachments: []
            })
            setApprovalInfo({})
        }
        setErrors({})
        setApprovalComment('')
    }, [record, open])

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
            const [sourcesRes, typesRes, employeesRes] = await Promise.all([
                getActiveBackupSources(),
                getActiveBackupTypes(),
                getActiveEmployees()
            ])
            if (sourcesRes.success && sourcesRes.data) {
                setBackupSources(sourcesRes.data.map((s: any) => ({
                    value: s.id,
                    label: `${s.code}: ${s.name}`,
                    type: s.source_type
                })))
            }
            if (typesRes.success && typesRes.data) {
                setBackupTypes(typesRes.data.map((t: any) => ({
                    code: t.code,
                    name: t.name,
                    is_kpi_counted: t.is_kpi_counted
                })))
                // Set default backup_type to first type if not set
                if (!formData.backup_type && typesRes.data.length > 0) {
                    setFormData(prev => ({ ...prev, backup_type: typesRes.data[0].code }))
                }
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

    const getSourceTypeIcon = (type: string) => {
        switch (type) {
            case 'Database': return <Database size={14} className="text-blue-600" />
            case 'Source Code': return <Code size={14} className="text-green-600" />
            case 'Server': return <Server size={14} className="text-purple-600" />
            case 'Application': return <Settings size={14} className="text-orange-600" />
            case 'Config': return <FileText size={14} className="text-amber-600" />
            case 'Files': return <FolderOpen size={14} className="text-slate-600" />
            default: return <Database size={14} className="text-slate-400" />
        }
    }

    const validate = () => {
        const newErrors: { [key: string]: string } = {}
        if (!formData.backup_source_id) newErrors.backup_source_id = 'Backup Source is required'
        if (!formData.backup_date) newErrors.backup_date = 'Date is required'
        if (!formData.backup_type) newErrors.backup_type = 'Backup type is required'
        if (formData.version_number < 1 || formData.version_number > 5) {
            newErrors.version_number = 'Version must be between 1-5'
        }
        // ถ้าไม่ผ่าน ต้องมีเหตุผล
        if (!formData.is_passed && !formData.failed_reason?.trim()) {
            newErrors.failed_reason = 'กรุณาระบุเหตุผลที่ไม่ผ่าน'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        setIsLoading(true)
        try {
            // Serialize attachments
            const attachmentsJson = formData.attachments.length > 0
                ? JSON.stringify(formData.attachments)
                : undefined

            let result
            const submitData = {
                ...formData,
                deploy_record_id: formData.deploy_record_id || undefined,
                verified_by: formData.is_verified ? (formData.verified_by || currentUserId) : undefined,
                failed_reason: formData.is_passed ? undefined : formData.failed_reason,
                attachments: attachmentsJson
            }

            if (record) {
                result = await updateDeployBackupRecord(record.id, submitData)
            } else {
                result = await createDeployBackupRecord({
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
                    await updateDeployBackupApprovalStatus(record.id, 'APPROVED')
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
                    await updateDeployBackupApprovalStatus(record.id, 'REJECTED')
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

    const selectedSource = backupSources.find(s => s.value === formData.backup_source_id)

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
                            {record ? 'Edit Backup Record' : 'New Backup Record'}
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
                    {/* Backup Source */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Backup Source <span className="text-red-500">*</span>
                        </label>
                        <SmartCombobox
                            options={backupSources}
                            value={backupSources.find(s => s.value === formData.backup_source_id) || null}
                            onChange={(opt) => setFormData({ ...formData, backup_source_id: opt?.value?.toString() || '' })}
                            placeholder="Select backup source..."
                            disabled={!!record}
                        />
                        {selectedSource && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                {getSourceTypeIcon(selectedSource.type)}
                                <span>{selectedSource.type}</span>
                            </div>
                        )}
                        {errors.backup_source_id && <p className="text-red-500 text-xs mt-1">{errors.backup_source_id}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Backup Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Backup Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.backup_date}
                                onChange={(e) => setFormData({ ...formData, backup_date: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${errors.backup_date ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                            />
                            {errors.backup_date && <p className="text-red-500 text-xs mt-1">{errors.backup_date}</p>}
                        </div>

                        {/* Backup Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Backup Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.backup_type}
                                onChange={(e) => setFormData({ ...formData, backup_type: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            >
                                {backupTypes.map(type => (
                                    <option key={type.code} value={type.code}>
                                        {type.name} {type.is_kpi_counted ? '(KPI)' : ''}
                                    </option>
                                ))}
                            </select>
                            {/* Show KPI status hint */}
                            {formData.backup_type && (
                                <div className="mt-1 text-xs">
                                    {backupTypes.find(t => t.code === formData.backup_type)?.is_kpi_counted ? (
                                        <span className="text-emerald-600 flex items-center gap-1">
                                            <CheckCircle2 size={12} /> นับ KPI
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 flex items-center gap-1">
                                            <XCircle size={12} /> ไม่นับ KPI
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {/* Version Number */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Version # (1-5) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={5}
                                value={formData.version_number}
                                onChange={(e) => setFormData({ ...formData, version_number: parseInt(e.target.value) || 1 })}
                                className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${errors.version_number ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                            />
                            {errors.version_number && <p className="text-red-500 text-xs mt-1">{errors.version_number}</p>}
                        </div>

                        {/* Backup Size */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Size
                            </label>
                            <input
                                type="text"
                                value={formData.backup_size}
                                onChange={(e) => setFormData({ ...formData, backup_size: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                placeholder="e.g., 2.5 GB"
                            />
                        </div>

                        {/* Placeholder */}
                        <div></div>
                    </div>

                    {/* Backup Location */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Backup Location
                        </label>
                        <input
                            type="text"
                            value={formData.backup_location}
                            onChange={(e) => setFormData({ ...formData, backup_location: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            placeholder="Path or storage location..."
                        />
                    </div>

                    {/* KPI Evaluation Section */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-semibold text-slate-700">KPI Evaluation</span>
                        </div>

                        {/* Pass/Fail Radio */}
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Result <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-6">
                                <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-all ${formData.is_passed ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                    <input
                                        type="radio"
                                        name="is_passed"
                                        checked={formData.is_passed}
                                        onChange={() => setFormData({ ...formData, is_passed: true, failed_reason: '' })}
                                        className="w-4 h-4 text-green-600 focus:ring-green-500"
                                    />
                                    <CheckCircle2 size={18} className={formData.is_passed ? 'text-green-600' : 'text-slate-400'} />
                                    <span className="font-medium">ผ่าน (Pass)</span>
                                </label>
                                <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-all ${!formData.is_passed ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                    <input
                                        type="radio"
                                        name="is_passed"
                                        checked={!formData.is_passed}
                                        onChange={() => setFormData({ ...formData, is_passed: false })}
                                        className="w-4 h-4 text-red-600 focus:ring-red-500"
                                    />
                                    <XCircle size={18} className={!formData.is_passed ? 'text-red-600' : 'text-slate-400'} />
                                    <span className="font-medium">ไม่ผ่าน (Fail)</span>
                                </label>
                            </div>
                        </div>

                        {/* Failed Reason - show only when failed */}
                        {!formData.is_passed && (
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Reason (if failed) <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.failed_reason}
                                    onChange={(e) => setFormData({ ...formData, failed_reason: e.target.value })}
                                    className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 focus:ring-red-500/20 outline-none resize-none ${errors.failed_reason ? 'border-red-500' : 'border-slate-200 focus:border-red-500'}`}
                                    rows={2}
                                    placeholder="ระบุเหตุผลที่ Backup ไม่ผ่าน..."
                                />
                                {errors.failed_reason && <p className="text-red-500 text-xs mt-1">{errors.failed_reason}</p>}
                            </div>
                        )}

                        {/* Verified checkbox */}
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_verified}
                                    onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                                    className="w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500"
                                />
                                <span className="text-sm font-medium text-slate-700">Verified</span>
                            </label>

                            {formData.is_verified && (
                                <div className="flex-1">
                                    <SmartCombobox
                                        options={employees}
                                        value={employees.find(e => e.value === formData.verified_by) || null}
                                        onChange={(opt) => setFormData({ ...formData, verified_by: opt?.value?.toString() || '' })}
                                        placeholder="Select verifier..."
                                    />
                                </div>
                            )}
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
                        subFolder="deploy-backup"
                        label="Attachments"
                        helperText="Upload screenshots or backup logs (max 5 files, 10MB each)"
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
