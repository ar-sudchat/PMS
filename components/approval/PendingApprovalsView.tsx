'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, CheckCircle2, XCircle, FileText, Search, RefreshCw, Filter, Inbox } from 'lucide-react'
import { fetchMyPendingApprovals } from '@/lib/actions/approval-actions'
import type { PendingApproval } from '@/lib/services/approval-service'
import { ApprovalStatusBadge } from '@/components/approval/ApprovalStatusBadge'
import { ApprovalActionModal } from '@/components/approval/ApprovalActionModal'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface PendingApprovalsViewProps {
    currentUserId: string
}

const moduleLabels: Record<string, string> = {
    'KPI': 'KPI Records',
    'PROJECT': 'Projects',
    'PURCHASE': 'Purchases',
    'EXPENSE': 'Expenses',
    'HR': 'HR'
}

const documentTypeLabels: Record<string, string> = {
    'DEPLOY_SUCCESS': 'Deploy Success',
    'DEPLOY_BACKUP': 'Backup Record',
    'MEETING_MINUTES': 'Meeting Minutes',
    'PROJECT_CHARTER': 'Project Charter',
    'PO': 'Purchase Order',
    'EXPENSE_CLAIM': 'Expense Claim'
}

const priorityConfig: Record<string, { label: string; color: string }> = {
    'LOW': { label: 'Low', color: 'bg-slate-100 text-slate-600' },
    'NORMAL': { label: 'Normal', color: 'bg-blue-100 text-blue-600' },
    'HIGH': { label: 'High', color: 'bg-amber-100 text-amber-600' },
    'URGENT': { label: 'Urgent', color: 'bg-red-100 text-red-600' }
}

export function PendingApprovalsView({ currentUserId }: PendingApprovalsViewProps) {
    const [approvals, setApprovals] = useState<PendingApproval[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [moduleFilter, setModuleFilter] = useState<string>('')

    // Approval modal state
    const [approvalModalOpen, setApprovalModalOpen] = useState(false)
    const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve')
    const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null)

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await fetchMyPendingApprovals(moduleFilter || undefined)
            setApprovals(data)
        } catch (error) {
            toast.error('Failed to load pending approvals')
        } finally {
            setIsLoading(false)
        }
    }, [moduleFilter])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const openApprovalModal = (approval: PendingApproval, action: 'approve' | 'reject') => {
        setSelectedApproval(approval)
        setApprovalAction(action)
        setApprovalModalOpen(true)
    }

    const filteredApprovals = approvals.filter(a => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            a.document_title?.toLowerCase().includes(query) ||
            a.document_number?.toLowerCase().includes(query) ||
            a.requester_name?.toLowerCase().includes(query)
        )
    })

    const formatDate = (dateStr: string | Date) => {
        const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
        return format(date, 'd MMM yyyy HH:mm', { locale: th })
    }

    const getWaitingStatus = (waitingHours: number | null, timeoutHours: number | null) => {
        if (!waitingHours) return null
        if (timeoutHours && waitingHours > timeoutHours) {
            return { label: 'Overdue', color: 'text-red-600 bg-red-50' }
        }
        if (waitingHours > 24) {
            return { label: `${Math.floor(waitingHours)}h`, color: 'text-amber-600 bg-amber-50' }
        }
        return { label: `${Math.floor(waitingHours)}h`, color: 'text-slate-500 bg-slate-100' }
    }

    return (
        <div>
            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by title, number, requester..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>

                    {/* Module Filter */}
                    <select
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                    >
                        <option value="">All Modules</option>
                        <option value="KPI">KPI Records</option>
                        <option value="PROJECT">Projects</option>
                    </select>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchData()}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-slate-800">{approvals.length}</div>
                    <div className="text-sm text-slate-500">Total Pending</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-red-600">
                        {approvals.filter(a => a.priority === 'URGENT').length}
                    </div>
                    <div className="text-sm text-slate-500">Urgent</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-amber-600">
                        {approvals.filter(a => (a.waiting_hours || 0) > 24).length}
                    </div>
                    <div className="text-sm text-slate-500">Waiting &gt; 24h</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-amber-600">
                        {approvals.filter(a => a.timeout_hours && (a.waiting_hours || 0) > a.timeout_hours).length}
                    </div>
                    <div className="text-sm text-slate-500">Overdue</div>
                </div>
            </div>

            {/* Approvals List */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                ) : filteredApprovals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Inbox size={48} className="mb-3" />
                        <p className="text-lg font-medium">No pending approvals</p>
                        <p className="text-sm">You're all caught up!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredApprovals.map((approval) => {
                            const priority = priorityConfig[approval.priority || 'NORMAL']
                            const waitingStatus = getWaitingStatus(approval.waiting_hours || null, approval.timeout_hours || null)

                            return (
                                <div key={approval.instance_id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Left: Document Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${priority.color}`}>
                                                    {priority.label}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {moduleLabels[approval.module_code] || approval.module_code}
                                                </span>
                                                <span className="text-xs text-slate-300">/</span>
                                                <span className="text-xs text-slate-500">
                                                    {documentTypeLabels[approval.document_type] || approval.document_type}
                                                </span>
                                            </div>

                                            <div className="font-medium text-slate-800 truncate">
                                                {approval.document_title || approval.document_number || 'No title'}
                                            </div>

                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                <span>Requested by: <span className="font-medium text-slate-700">{approval.requester_name}</span></span>
                                                <span>Step: <span className="font-medium text-slate-700">{approval.step_name}</span></span>
                                            </div>

                                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                                                <span>{formatDate(approval.request_date)}</span>
                                                {waitingStatus && (
                                                    <span className={`px-1.5 py-0.5 rounded ${waitingStatus.color}`}>
                                                        Waiting: {waitingStatus.label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openApprovalModal(approval, 'approve')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                                            >
                                                <CheckCircle2 size={16} />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => openApprovalModal(approval, 'reject')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                                            >
                                                <XCircle size={16} />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Approval Action Modal */}
            {selectedApproval && (
                <ApprovalActionModal
                    open={approvalModalOpen}
                    onClose={() => {
                        setApprovalModalOpen(false)
                        setSelectedApproval(null)
                    }}
                    instanceId={selectedApproval.instance_id}
                    documentId={selectedApproval.document_id}
                    documentTitle={selectedApproval.document_title || selectedApproval.document_number}
                    documentType={selectedApproval.document_type}
                    action={approvalAction}
                    onSuccess={() => fetchData()}
                />
            )}
        </div>
    )
}
