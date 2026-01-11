'use client'

import { useState, useEffect } from 'react'
import { getProjectMilestonesWithApproval } from '@/lib/actions/milestone-approval-actions'
import { ApproveMilestoneModal } from '@/components/modals/ApproveMilestoneModal'
import { Lock, CheckCircle2, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface MilestoneApprovalViewProps {
    projectId: string
    onMilestoneApproved?: () => void
}

interface MilestoneWithApproval {
    id: string
    name: string
    color: string
    weight_percent: number
    planned_mandays: number
    actual_mandays: number
    due_date: string | null
    completed_date: string | null
    status: string
    is_approved: boolean
    is_locked: boolean
    can_approve: boolean
    done_tasks: number
    total_tasks: number
}

export function MilestoneApprovalView({ projectId, onMilestoneApproved }: MilestoneApprovalViewProps) {
    const [milestones, setMilestones] = useState<MilestoneWithApproval[]>([])
    const [loading, setLoading] = useState(true)
    const [approveModalOpen, setApproveModalOpen] = useState(false)
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)

    useEffect(() => {
        loadMilestones()
    }, [projectId])

    const loadMilestones = async () => {
        setLoading(true)
        const data = await getProjectMilestonesWithApproval(projectId)
        setMilestones(data)
        setLoading(false)
    }

    const handleApproveClick = (milestoneId: string) => {
        setSelectedMilestoneId(milestoneId)
        setApproveModalOpen(true)
    }

    const handleApproved = () => {
        loadMilestones()
        if (onMilestoneApproved) onMilestoneApproved()
    }

    if (loading) {
        return <div className="text-center py-8 text-slate-400">Loading milestones...</div>
    }

    if (milestones.length === 0) {
        return <div className="text-center py-8 text-slate-400">No milestones defined for this project</div>
    }

    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Milestone Approval</h3>
                    <p className="text-xs text-slate-500">
                        💡 เมื่อ Approve แล้ว Milestone จะถูก Lock ไม่สามารถแก้ไขได้
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Milestone</th>
                                <th className="px-3 py-2 text-center font-medium text-slate-600 w-20">Weight</th>
                                <th className="px-3 py-2 text-center font-medium text-slate-600 w-20">Plan MD</th>
                                <th className="px-3 py-2 text-center font-medium text-slate-600 w-20">Act MD</th>
                                <th className="px-3 py-2 text-center font-medium text-slate-600 w-24">Due Date</th>
                                <th className="px-3 py-2 text-center font-medium text-slate-600 w-20">Tasks</th>
                                <th className="px-3 py-2 text-center font-medium text-slate-600 w-28">Status</th>
                                <th className="px-3 py-2 text-center font-medium text-slate-600 w-24">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {milestones.map((m) => (
                                <tr key={m.id} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: m.color }}
                                            />
                                            <span className="font-medium text-slate-800">{m.name}</span>
                                            {m.is_locked && (
                                                <Lock className="w-3 h-3 text-slate-400" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-center text-slate-600">{m.weight_percent}%</td>
                                    <td className="px-3 py-2 text-center text-slate-600">{m.planned_mandays}</td>
                                    <td className={cn(
                                        "px-3 py-2 text-center font-medium",
                                        m.actual_mandays > m.planned_mandays ? "text-red-600" : "text-green-600"
                                    )}>
                                        {m.actual_mandays}
                                    </td>
                                    <td className="px-3 py-2 text-center text-slate-600">
                                        {m.due_date ? format(new Date(m.due_date), 'dd MMM') : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={cn(
                                            "text-xs px-1.5 py-0.5 rounded",
                                            m.done_tasks === m.total_tasks && m.total_tasks > 0
                                                ? "bg-green-100 text-green-700"
                                                : "bg-slate-100 text-slate-600"
                                        )}>
                                            {m.done_tasks}/{m.total_tasks}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {m.is_approved ? (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                                <CheckCircle2 className="w-3 h-3" /> Approved
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                                                <Clock className="w-3 h-3" /> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {m.is_locked ? (
                                            <span className="text-xs text-slate-400 flex items-center justify-center gap-1">
                                                <Lock className="w-3 h-3" /> Locked
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleApproveClick(m.id)}
                                                disabled={!m.can_approve}
                                                className={cn(
                                                    "text-xs px-2 py-1 rounded",
                                                    m.can_approve
                                                        ? "bg-green-600 text-white hover:bg-green-700"
                                                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                )}
                                                title={!m.can_approve ? 'ต้อง Complete ทุก Task ก่อน' : ''}
                                            >
                                                Approve
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ApproveMilestoneModal
                open={approveModalOpen}
                onOpenChange={setApproveModalOpen}
                milestoneId={selectedMilestoneId}
                onApproved={handleApproved}
            />
        </>
    )
}
