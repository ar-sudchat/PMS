'use client'

import { useState, useMemo } from 'react'
import { Trash2, Lock, CheckCircle2, AlertCircle, Calendar as CalendarIcon, FileText, X } from 'lucide-react'
import { MilestoneRow } from '@/types/project'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import { VerifyMilestoneModal } from '@/components/modals/VerifyMilestoneModal'

interface MilestonesTabProps {
    milestones: MilestoneRow[]
    setMilestones: (milestones: MilestoneRow[]) => void
    milestoneConfigs: any[]
    currentMilestoneId?: string
    onCurrentMilestoneChange?: (id: string) => void
}

export function MilestonesTab({ milestones, setMilestones, milestoneConfigs, currentMilestoneId, onCurrentMilestoneChange }: MilestonesTabProps) {
    // State for Verify Milestone Modal
    const [verifyModal, setVerifyModal] = useState<{
        open: boolean
        milestoneId?: string
        milestoneName?: string
        completedDate?: string
        dueDate?: string
    }>({ open: false })

    // --- Computed Totals & Validation ---
    const totalTTD = milestones.reduce((sum, m) => sum + (m.weight_ttd || 0), 0)
    const totalMDC = milestones.reduce((sum, m) => sum + (m.weight_mdc || 0), 0)
    const totalPlanMD = milestones.reduce((sum, m) => sum + (m.planned_mandays || 0), 0)
    const totalActMD = milestones.reduce((sum, m) => sum + (m.actual_mandays || 0), 0)

    const isTTDValid = Math.abs(totalTTD - 100) < 0.1
    const isMDCValid = Math.abs(totalMDC - 100) < 0.1

    // --- Handlers ---

    const handleUpdateMilestone = (index: number, field: keyof MilestoneRow, value: any) => {
        const updated = [...milestones]
        // If locked, prevent editing certain fields (handled in UI, but double check here)
        if (updated[index].is_locked) {
            if (field === 'is_approved') {
                // Locked milestones cannot be un-approved here (require Admin unlock usually, or different flow)
                // But for this UI, check request "Checkboxเลือก Approve"
                return
            }
            // Allow checkbox toggle ONLY if it's about approving (transitioning to locked)
            // If already locked, do nothing
        }

        updated[index] = { ...updated[index], [field]: value }
        setMilestones(updated)
    }

    const handleToggleApprove = (index: number, checked: boolean) => {
        const m = milestones[index]
        if (m.is_locked) return // Cannot uncheck if locked

        // Validation: Can only check if Completed Date exists
        if (checked && !m.required_docs_pass) {
            // Ideally show toast, but for now just block or rely on submit validation
        }

        const updated = [...milestones]
        updated[index] = { ...updated[index], will_approve: checked }
        setMilestones(updated)
    }

    const handleRemoveMilestone = (index: number) => {
        if (milestones[index].is_locked) return
        const updated = milestones.filter((_, i) => i !== index)
        setMilestones(updated)
    }

    // Filter milestones that have IDs (saved) for the "Current Milestone" dropdown
    const availableForCurrent = milestones.filter(m => m.id)

    return (
        <div className="space-y-6">
            {/* Current Milestone Selector */}
            {onCurrentMilestoneChange && (
                <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-blue-900 mb-1">
                            Current Project Milestone
                        </label>
                        <SmartCombobox
                            options={[
                                { value: '', label: 'Select Current Milestone' },
                                ...availableForCurrent.map(m => ({
                                    value: m.id!,
                                    label: `${m.milestone_name} (${m.progress_percent}%)`
                                }))
                            ]}
                            value={currentMilestoneId ? availableForCurrent.find(m => m.id === currentMilestoneId) ? { value: currentMilestoneId, label: `${availableForCurrent.find(m => m.id === currentMilestoneId)?.milestone_name} (${availableForCurrent.find(m => m.id === currentMilestoneId)?.progress_percent}%)` } : null : null}
                            onChange={(opt) => onCurrentMilestoneChange(opt?.value as string || '')}
                            placeholder="Select current active milestone..."
                        />
                    </div>
                    <div className="text-sm text-blue-700 max-w-md">
                        <AlertCircle className="w-4 h-4 inline mr-1 mb-0.5" />
                        Setting the current milestone highlights it in the Gantt chart and tracks overall project stage.
                    </div>
                </div>
            )}

            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b">
                            <tr>
                                <th className="px-3 py-3 w-10 text-center">🔒</th>
                                <th className="px-3 py-3 text-left">Milestone</th>
                                <th className="px-2 py-3 w-16 text-center text-xs">TTD %</th>
                                <th className="px-2 py-3 w-16 text-center text-xs">MDC %</th>
                                <th className="px-2 py-3 w-16 text-center text-xs">Plan MD</th>
                                <th className="px-2 py-3 w-16 text-center text-xs">Act MD</th>
                                <th className="px-3 py-3 w-28 text-center">Due Date</th>
                                <th className="px-3 py-3 w-28 text-center">Completed</th>
                                <th className="px-3 py-3 w-28 text-center">Support End</th>
                                <th className="px-2 py-3 w-16 text-center text-xs">Docs</th>
                                <th className="px-2 py-3 w-12 text-center text-xs">KPI</th>
                                <th className="px-2 py-3 w-16 text-center text-xs">Verified</th>
                                <th className="px-2 py-3 w-20 text-center">Status</th>
                                <th className="px-2 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {milestones.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="px-4 py-8 text-center text-slate-400">
                                        No milestones added.
                                    </td>
                                </tr>
                            ) : (
                                milestones.map((m, i) => {
                                    const isLocked = m.is_locked
                                    const canApprove = !!m.completed_date // Simple check for now
                                    // Use fallback if deliverable_count is undefined
                                    const devCount = m.deliverable_count || 0
                                    const docStatus = m.submitted_count === devCount && devCount > 0

                                    const isCurrent = m.id === currentMilestoneId

                                    return (
                                        <tr key={m.id || i} className={cn(
                                            "hover:bg-slate-50/50 transition-colors",
                                            isLocked && "bg-slate-50 opacity-90",
                                            isCurrent && "bg-blue-50 ring-2 ring-inset ring-blue-200"
                                        )}>
                                            {/* Lock / Approve Checkbox */}
                                            <td className="px-3 py-2 text-center">
                                                {isLocked ? (
                                                    <Lock className="w-4 h-4 text-slate-400 mx-auto" />
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300"
                                                        checked={m.will_approve || false}
                                                        onChange={(e) => handleToggleApprove(i, e.target.checked)}
                                                        disabled={!canApprove}
                                                        title={canApprove ? "Check to approve on save" : "Please set Completed Date first"}
                                                    />
                                                )}
                                            </td>

                                            {/* Milestone Name */}
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-medium text-slate-900">{m.milestone_name || 'New Milestone'}</div>
                                                    {isCurrent && (
                                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] uppercase font-bold tracking-wider rounded">
                                                            Current
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* TTD Weight */}
                                            <td className="px-2 py-2">
                                                <input
                                                    type="number"
                                                    className="w-full text-center border-slate-200 rounded px-1 py-1 text-xs"
                                                    value={m.weight_ttd || 0}
                                                    onChange={(e) => handleUpdateMilestone(i, 'weight_ttd', parseFloat(e.target.value))}
                                                    disabled={isLocked}
                                                />
                                            </td>

                                            {/* MDC Weight */}
                                            <td className="px-2 py-2">
                                                <input
                                                    type="number"
                                                    className="w-full text-center border-slate-200 rounded px-1 py-1 text-xs"
                                                    value={m.weight_mdc || 0}
                                                    onChange={(e) => handleUpdateMilestone(i, 'weight_mdc', parseFloat(e.target.value))}
                                                    disabled={isLocked}
                                                />
                                            </td>

                                            {/* Plan MD */}
                                            <td className="px-2 py-2">
                                                <input
                                                    type="number"
                                                    className="w-full text-center border-slate-200 rounded px-1 py-1 text-xs"
                                                    value={m.planned_mandays || 0}
                                                    onChange={(e) => handleUpdateMilestone(i, 'planned_mandays', parseFloat(e.target.value))}
                                                    disabled={isLocked}
                                                />
                                            </td>

                                            {/* Actual MD (Read-only) */}
                                            <td className="px-2 py-2 text-center text-slate-600 font-medium">
                                                {m.actual_mandays || 0}
                                            </td>

                                            {/* Due Date */}
                                            <td className="px-3 py-2">
                                                <input
                                                    type="date"
                                                    className="w-full border-slate-200 rounded px-1 py-1 text-xs"
                                                    value={m.due_date ? new Date(m.due_date).toISOString().split('T')[0] : ''}
                                                    onChange={(e) => handleUpdateMilestone(i, 'due_date', e.target.value)}
                                                    disabled={isLocked}
                                                />
                                            </td>

                                            {/* Completed Date */}
                                            <td className="px-3 py-2">
                                                <input
                                                    type="date"
                                                    className="w-full border-slate-200 rounded px-1 py-1 text-xs"
                                                    value={m.completed_date ? new Date(m.completed_date).toISOString().split('T')[0] : ''}
                                                    onChange={(e) => handleUpdateMilestone(i, 'completed_date', e.target.value)}
                                                    disabled={isLocked}
                                                />
                                            </td>

                                            {/* Support End Date */}
                                            <td className="px-3 py-2">
                                                {m.is_verified ? (
                                                    <div className="text-xs text-center text-slate-700">
                                                        {m.support_end_date ? new Date(m.support_end_date).toLocaleDateString('th-TH') : '-'}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-center text-slate-400">-</div>
                                                )}
                                            </td>

                                            {/* Docs Badge */}
                                            <td className="px-2 py-2 text-center text-xs">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5",
                                                    (m.submitted_required_docs === m.required_docs && (m.required_docs || 0) > 0) ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-600"
                                                )}>
                                                    {m.submitted_required_docs || 0}/{m.required_docs || 0}
                                                </span>
                                            </td>

                                            {/* KPI Badges */}
                                            <td className="px-2 py-2 text-center">
                                                <div className="flex justify-center gap-1">
                                                    {/* TTD Badge */}
                                                    <div className="flex flex-col items-center justify-center w-5">
                                                        {m.kpi_ttd_pass === true ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                        ) : m.kpi_ttd_pass === false ? (
                                                            <X className="w-4 h-4 text-red-500" />
                                                        ) : (
                                                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                                                        )}
                                                    </div>
                                                    {/* MDC Badge */}
                                                    <div className="flex flex-col items-center justify-center w-5">
                                                        {m.kpi_mdc_pass === true ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                        ) : m.kpi_mdc_pass === false ? (
                                                            <X className="w-4 h-4 text-red-500" />
                                                        ) : (
                                                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-2 py-2 text-center text-xs">
                                                {isLocked ? (
                                                    <span className="text-slate-500 font-medium">Locked</span>
                                                ) : m.will_approve ? (
                                                    <span className="text-blue-600 font-medium">Will Approve</span>
                                                ) : (
                                                    <span className="text-slate-400">Pending</span>
                                                )}
                                            </td>

                                            {/* Verified Checkbox */}
                                            <td className="px-2 py-2 text-center">
                                                {m.is_verified ? (
                                                    <div className="flex items-center justify-center gap-1 text-green-600">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <Lock className="w-3 h-3" />
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 cursor-pointer"
                                                        checked={false}
                                                        onChange={() => {
                                                            if (m.id && m.milestone_name) {
                                                                setVerifyModal({
                                                                    open: true,
                                                                    milestoneId: m.id,
                                                                    milestoneName: m.milestone_name,
                                                                    completedDate: m.completed_date,
                                                                    dueDate: m.due_date
                                                                })
                                                            }
                                                        }}
                                                        disabled={!m.completed_date || isLocked}
                                                        title={m.completed_date ? "Click to verify and lock this milestone" : "Please set Completed Date first"}
                                                    />
                                                )}
                                            </td>

                                            {/* Delete */}
                                            <td className="px-2 py-2 text-center">
                                                {!isLocked && (
                                                    <button onClick={() => handleRemoveMilestone(i)} className="text-slate-400 hover:text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Summary Footer */}
                <div className="bg-slate-50 p-3 flex flex-wrap items-center justify-between text-xs border-t gap-4">
                    <div className="flex gap-4">
                        <div className={cn("flex items-center gap-1 font-medium", isTTDValid ? "text-green-700" : "text-red-600")}>
                            <span>TTD Weight: {totalTTD}%</span>
                            {isTTDValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        </div>
                        <div className={cn("flex items-center gap-1 font-medium", isMDCValid ? "text-green-700" : "text-red-600")}>
                            <span>MDC Weight: {totalMDC}%</span>
                            {isMDCValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        </div>
                    </div>
                    <div className="flex gap-4 text-slate-600 font-medium">
                        <span>Plan MD: {totalPlanMD}</span>
                        <span>Act MD: {totalActMD}</span>
                    </div>
                </div>
            </div>

            {(!isTTDValid || !isMDCValid) && (
                <div className="text-red-500 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Total TTD and MDC weights must each assume to 100%.
                </div>
            )}
            {/* Verify Milestone Modal */}
            {verifyModal.open && verifyModal.milestoneId && (
                <VerifyMilestoneModal
                    isOpen={verifyModal.open}
                    onClose={() => setVerifyModal({ open: false })}
                    milestoneId={verifyModal.milestoneId}
                    milestoneName={verifyModal.milestoneName || ''}
                    completedDate={verifyModal.completedDate}
                    dueDate={verifyModal.dueDate}
                    onSuccess={() => {
                        // Refresh milestone data - parent should handle this
                        // For now, just close the modal, parent will refresh via save
                        setVerifyModal({ open: false })
                    }}
                />
            )}
        </div>
    )
}
