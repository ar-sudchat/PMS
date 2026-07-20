'use client'

import { useState, useMemo, useRef, KeyboardEvent } from 'react'
import { Trash2, Lock, Unlock, CheckCircle2, AlertCircle, Calendar as CalendarIcon, FileText, X, Plus, PlusCircle, MessageSquare, History } from 'lucide-react'
import { MilestoneRow } from '@/types/project'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import { DueDateChangeReasonDialog } from '@/components/milestones/DueDateChangeReasonDialog'
import { MilestoneNotesPanel } from '@/components/milestones/MilestoneNotesPanel'
import { MilestoneChangeLogTimeline } from '@/components/milestones/MilestoneChangeLogTimeline'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { unlockMilestone } from '@/lib/actions/milestone-approval-actions'

// Field order for Enter key navigation
const FIELD_ORDER = ['weight_ttd', 'weight_mdc', 'planned_mandays', 'due_date', 'completed_date'] as const

interface MilestonesTabProps {
    milestones: MilestoneRow[]
    setMilestones: (milestones: MilestoneRow[]) => void
    milestoneConfigs: any[]
    currentMilestoneId?: string
    onCurrentMilestoneChange?: (id: string) => void
    projectId?: string
    dueDateChangeReasons?: Record<string, string>
    onDueDateChangeReasons?: (reasons: Record<string, string>) => void
}

export function MilestonesTab({ milestones, setMilestones, milestoneConfigs, currentMilestoneId, onCurrentMilestoneChange, projectId, dueDateChangeReasons, onDueDateChangeReasons }: MilestonesTabProps) {
    // Ref for table to find inputs
    const tableRef = useRef<HTMLTableElement>(null)

    // Due date change dialog state
    const [dueDateDialog, setDueDateDialog] = useState<{
        open: boolean; index: number; oldDate: string; newDate: string; milestoneName: string
    } | null>(null)

    // Notes/History panel state
    const [notesPanel, setNotesPanel] = useState<{ milestoneId: string; milestoneName: string } | null>(null)
    const [historyPanel, setHistoryPanel] = useState<{ milestoneId: string; milestoneName: string } | null>(null)

    // Unlock dialog state
    const [unlockDialog, setUnlockDialog] = useState<{
        open: boolean; index: number; milestoneId: string; milestoneName: string
    } | null>(null)
    const [unlockReason, setUnlockReason] = useState('')
    const [unlockLoading, setUnlockLoading] = useState(false)

    // Handle Enter key to move to next field in row, or next row
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, rowIndex: number, fieldName: string) => {
        if (e.key === 'Enter') {
            e.preventDefault()

            const currentFieldIndex = FIELD_ORDER.indexOf(fieldName as typeof FIELD_ORDER[number])
            if (currentFieldIndex === -1) return

            // Try to move to next field in same row
            if (currentFieldIndex < FIELD_ORDER.length - 1) {
                const nextField = FIELD_ORDER[currentFieldIndex + 1]
                const nextInput = tableRef.current?.querySelector(
                    `input[data-row="${rowIndex}"][data-field="${nextField}"]`
                ) as HTMLInputElement
                if (nextInput && !nextInput.disabled) {
                    nextInput.focus()
                    nextInput.select()
                    return
                }
            }

            // If last field in row, move to first field of next row
            const nextRowIndex = rowIndex + 1
            if (nextRowIndex < milestones.length) {
                const firstField = FIELD_ORDER[0]
                const nextInput = tableRef.current?.querySelector(
                    `input[data-row="${nextRowIndex}"][data-field="${firstField}"]`
                ) as HTMLInputElement
                if (nextInput && !nextInput.disabled) {
                    nextInput.focus()
                    nextInput.select()
                }
            }
        }
    }

    // --- Computed Totals & Validation ---
    const totalTTD = milestones.reduce((sum, m) => sum + (m.weight_ttd || 0), 0)
    const totalMDC = milestones.reduce((sum, m) => sum + (m.weight_mdc || 0), 0)
    const totalPlanMD = milestones.reduce((sum, m) => sum + (m.planned_mandays || m.effective_planned_mandays || 0), 0)
    const totalActMD = milestones.reduce((sum, m) => sum + (m.actual_mandays || 0), 0)

    const isTTDValid = Math.abs(totalTTD - 100) < 0.1
    const isMDCValid = Math.abs(totalMDC - 100) < 0.1

    // --- Available Milestones (not yet added) ---
    const availableMilestones = useMemo(() => {
        return milestoneConfigs
            .filter(config => config.is_active !== false && !milestones.some(m => m.milestone_config_id === config.id))
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    }, [milestoneConfigs, milestones])

    // --- Handlers ---

    const handleUpdateMilestone = (index: number, field: keyof MilestoneRow, value: any) => {
        const updated = [...milestones]
        // If locked, prevent editing certain fields (handled in UI, but double check here)
        if (updated[index].is_locked) {
            if (field === 'is_approved') {
                return
            }
        }

        // Intercept due_date changes on existing milestones (not new ones)
        if (field === 'due_date' && updated[index].id && !updated[index].is_new) {
            const oldDate = formatDateForInput(updated[index].due_date)
            const newDate = value || ''
            if (oldDate && oldDate !== newDate) {
                // Open reason dialog — don't update yet
                setDueDateDialog({
                    open: true,
                    index,
                    oldDate,
                    newDate,
                    milestoneName: updated[index].milestone_name || 'Milestone'
                })
                return
            }
        }

        updated[index] = { ...updated[index], [field]: value }
        setMilestones(updated)
    }

    const handleDueDateConfirm = (reason: string) => {
        if (!dueDateDialog) return
        const { index, newDate } = dueDateDialog
        const configId = milestones[index]?.milestone_config_id
        if (configId && onDueDateChangeReasons) {
            onDueDateChangeReasons({ ...dueDateChangeReasons, [configId]: reason })
        }
        const updated = [...milestones]
        updated[index] = { ...updated[index], due_date: newDate }
        setMilestones(updated)
        setDueDateDialog(null)
    }

    const handleDueDateCancel = () => {
        // Revert — don't change the date
        setDueDateDialog(null)
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

    const handleUnlockClick = (index: number) => {
        const m = milestones[index]
        if (!m.id || !m.is_locked) return
        setUnlockReason('')
        setUnlockDialog({ open: true, index, milestoneId: m.id, milestoneName: m.milestone_name || 'Milestone' })
    }

    const handleUnlockConfirm = async () => {
        if (!unlockDialog || !unlockReason.trim()) return
        setUnlockLoading(true)
        try {
            const result = await unlockMilestone(unlockDialog.milestoneId, unlockReason.trim())
            if (result.success) {
                const updated = [...milestones]
                updated[unlockDialog.index] = {
                    ...updated[unlockDialog.index],
                    is_locked: false,
                    is_approved: false,
                    is_verified: false
                }
                setMilestones(updated)
                setUnlockDialog(null)
            } else {
                alert(result.error || 'ไม่สามารถปลดล็อกได้')
            }
        } catch {
            alert('เกิดข้อผิดพลาดในการปลดล็อก')
        } finally {
            setUnlockLoading(false)
        }
    }

    // Add a single milestone from config
    const handleAddMilestone = (configId: string) => {
        const config = milestoneConfigs.find(c => c.id === configId)
        if (!config) return

        const newMilestone: MilestoneRow = {
            milestone_config_id: config.id,
            milestone_name: config.name,
            milestone_color: config.color || '#6B7280',
            weight_percent: 0,
            weight_ttd: config.ttd_weight || 0,
            weight_mdc: config.mdc_weight || 0,
            due_date: '',
            completed_date: '',
            planned_mandays: 0,
            actual_mandays: 0,
            deliverable_ids: [],
            deliverables: [],
            progress_percent: 0,
            is_locked: false,
            is_approved: false,
            kpi_ttd_pass: undefined,
            kpi_mdc_pass: undefined,
            sort_order: config.sort_order || 0,
            status: undefined,
            is_new: true
        }

        // Insert in correct sort order
        const updated = [...milestones, newMilestone].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        setMilestones(updated)
    }

    // Add all available milestones
    const handleAddAllMilestones = () => {
        const newMilestones: MilestoneRow[] = availableMilestones.map(config => ({
            milestone_config_id: config.id,
            milestone_name: config.name,
            milestone_color: config.color || '#6B7280',
            weight_percent: 0,
            weight_ttd: config.ttd_weight || 0,
            weight_mdc: config.mdc_weight || 0,
            due_date: '',
            completed_date: '',
            planned_mandays: 0,
            actual_mandays: 0,
            deliverable_ids: [],
            deliverables: [],
            progress_percent: 0,
            is_locked: false,
            is_approved: false,
            kpi_ttd_pass: undefined,
            kpi_mdc_pass: undefined,
            sort_order: config.sort_order || 0,
            status: undefined,
            is_new: true
        }))

        const updated = [...milestones, ...newMilestones].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        setMilestones(updated)
    }

    // All milestones for Current Milestone dropdown (both saved and new)
    // For saved milestones, use id. For new milestones, use index-based temp id
    const milestonesForCurrentDropdown = useMemo(() => {
        return milestones.map((m, idx) => ({
            ...m,
            tempId: m.id || `temp-${idx}`,
            displayName: m.milestone_name || 'Unnamed Milestone'
        }))
    }, [milestones])

    // Helper to format date for input (YYYY-MM-DD)
    const formatDateForInput = (date: string | Date | null | undefined): string => {
        if (!date) return ''
        try {
            if (typeof date === 'string') {
                // If already YYYY-MM-DD format, return as is
                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
                // Otherwise parse and format
                return new Date(date).toISOString().split('T')[0]
            }
            return date.toISOString().split('T')[0]
        } catch {
            return ''
        }
    }

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
                                ...milestonesForCurrentDropdown.map(m => ({
                                    value: m.id || m.tempId,
                                    label: `${m.displayName} (${m.progress_percent || 0}%)`
                                }))
                            ]}
                            value={currentMilestoneId
                                ? milestonesForCurrentDropdown.find(m => m.id === currentMilestoneId || m.tempId === currentMilestoneId)
                                    ? {
                                        value: currentMilestoneId,
                                        label: `${milestonesForCurrentDropdown.find(m => m.id === currentMilestoneId || m.tempId === currentMilestoneId)?.displayName} (${milestonesForCurrentDropdown.find(m => m.id === currentMilestoneId || m.tempId === currentMilestoneId)?.progress_percent || 0}%)`
                                    }
                                    : null
                                : null
                            }
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
                    <table ref={tableRef} className="w-full text-sm">
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
                                <th className="px-2 py-3 w-14 text-center text-xs" title="Mark as TTD KPI Failed (manual)">TTD Fail</th>
                                <th className="px-2 py-3 w-14 text-center text-xs" title="Mark as Docs KPI Failed (manual)">Docs Fail</th>
                                <th className="px-2 py-3 w-12 text-center text-xs">KPI</th>
                                <th className="px-2 py-3 w-20 text-center">Status</th>
                                <th className="px-2 py-3 w-16 text-center text-xs">Verified</th>
                                <th className="px-2 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {milestones.length === 0 ? (
                                <tr>
                                    <td colSpan={16} className="px-4 py-8 text-center text-slate-400">
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
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnlockClick(i)}
                                                        className="group relative mx-auto flex items-center justify-center w-6 h-6 rounded hover:bg-amber-50 transition-colors"
                                                        title="คลิกเพื่อปลดล็อก Milestone"
                                                    >
                                                        <Lock className="w-4 h-4 text-slate-400 group-hover:hidden" />
                                                        <Unlock className="w-4 h-4 text-amber-500 hidden group-hover:block" />
                                                    </button>
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
                                                    {/* Notes & History buttons (only for saved milestones) */}
                                                    {projectId && m.id && (
                                                        <div className="flex items-center gap-0.5 ml-auto">
                                                            <button
                                                                type="button"
                                                                onClick={() => setNotesPanel({ milestoneId: m.id!, milestoneName: m.milestone_name || '' })}
                                                                className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                                title="Notes & Issues"
                                                            >
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setHistoryPanel({ milestoneId: m.id!, milestoneName: m.milestone_name || '' })}
                                                                className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors"
                                                                title="Due Date History"
                                                            >
                                                                <History className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
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
                                                    onKeyDown={(e) => handleKeyDown(e, i, 'weight_ttd')}
                                                    data-row={i}
                                                    data-field="weight_ttd"
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
                                                    onKeyDown={(e) => handleKeyDown(e, i, 'weight_mdc')}
                                                    data-row={i}
                                                    data-field="weight_mdc"
                                                    disabled={isLocked}
                                                />
                                            </td>

                                            {/* Plan MD */}
                                            <td className="px-2 py-2">
                                                <input
                                                    type="number"
                                                    className="w-full text-center border-slate-200 rounded px-1 py-1 text-xs"
                                                    value={m.planned_mandays || m.effective_planned_mandays || 0}
                                                    title={!m.planned_mandays && m.effective_planned_mandays ? `อัตโนมัติจาก MDC% × งบขาย (${m.effective_planned_mandays})` : undefined}
                                                    onChange={(e) => handleUpdateMilestone(i, 'planned_mandays', parseFloat(e.target.value))}
                                                    onKeyDown={(e) => handleKeyDown(e, i, 'planned_mandays')}
                                                    data-row={i}
                                                    data-field="planned_mandays"
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
                                                    className="w-full border border-slate-200 rounded px-1 py-1 text-xs"
                                                    value={formatDateForInput(m.due_date)}
                                                    onChange={(e) => handleUpdateMilestone(i, 'due_date', e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, i, 'due_date')}
                                                    data-row={i}
                                                    data-field="due_date"
                                                    disabled={isLocked}
                                                />
                                            </td>

                                            {/* Completed Date */}
                                            <td className="px-3 py-2">
                                                <input
                                                    type="date"
                                                    className="w-full border border-slate-200 rounded px-1 py-1 text-xs"
                                                    value={formatDateForInput(m.completed_date)}
                                                    onChange={(e) => handleUpdateMilestone(i, 'completed_date', e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, i, 'completed_date')}
                                                    data-row={i}
                                                    data-field="completed_date"
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

                                            {/* TTD Manual Fail */}
                                            <td className="px-2 py-2 text-center">
                                                {m.is_verified ? (
                                                    <span className={`text-xs font-medium ${m.kpi_ttd_manual_fail ? 'text-rose-600' : 'text-slate-300'}`}>
                                                        {m.kpi_ttd_manual_fail ? 'Fail' : '-'}
                                                    </span>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-rose-300 text-rose-500 focus:ring-rose-500 cursor-pointer"
                                                        checked={m.kpi_ttd_manual_fail || false}
                                                        onChange={(e) => handleUpdateMilestone(i, 'kpi_ttd_manual_fail', e.target.checked)}
                                                        disabled={isLocked}
                                                        title="ติ๊กเพื่อระบุว่า Milestone นี้ตก KPI Time to Delivery"
                                                    />
                                                )}
                                            </td>

                                            {/* Docs Manual Fail */}
                                            <td className="px-2 py-2 text-center">
                                                {m.is_verified ? (
                                                    <span className={`text-xs font-medium ${m.kpi_docs_manual_fail ? 'text-rose-600' : 'text-slate-300'}`}>
                                                        {m.kpi_docs_manual_fail ? 'Fail' : '-'}
                                                    </span>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-rose-300 text-rose-500 focus:ring-rose-500 cursor-pointer"
                                                        checked={m.kpi_docs_manual_fail || false}
                                                        onChange={(e) => handleUpdateMilestone(i, 'kpi_docs_manual_fail', e.target.checked)}
                                                        disabled={isLocked}
                                                        title="ติ๊กเพื่อระบุว่า Milestone นี้ตก KPI Docs On-time"
                                                    />
                                                )}
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
                                                {m.is_verified ? (
                                                    <span className="text-green-600 font-medium">Verified</span>
                                                ) : isLocked ? (
                                                    <span className="text-slate-500 font-medium">Locked</span>
                                                ) : m.will_verify ? (
                                                    <span className="text-emerald-600 font-medium">Will Verify</span>
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
                                                        checked={m.will_verify || false}
                                                        onChange={(e) => handleUpdateMilestone(i, 'will_verify', e.target.checked)}
                                                        disabled={!m.completed_date || isLocked}
                                                        title={m.completed_date ? "Check to verify on save" : "Please set Completed Date first"}
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
                    Total TTD and MDC weights must each sum to 100%.
                </div>
            )}

            {/* Add Milestone Section */}
            {availableMilestones.length > 0 && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1">
                        <SmartCombobox
                            options={availableMilestones.map(config => ({
                                value: config.id,
                                label: `${config.name} (TTD: ${config.ttd_weight || 0}%, MDC: ${config.mdc_weight || 0}%)`
                            }))}
                            value={null}
                            onChange={(opt) => {
                                if (opt?.value) {
                                    handleAddMilestone(opt.value as string)
                                }
                            }}
                            placeholder="Select milestone to add..."
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleAddAllMilestones}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add All ({availableMilestones.length})
                    </button>
                </div>
            )}

            {/* Due Date Change Reason Dialog */}
            {dueDateDialog && (
                <DueDateChangeReasonDialog
                    open={dueDateDialog.open}
                    onClose={handleDueDateCancel}
                    milestoneName={dueDateDialog.milestoneName}
                    oldDate={dueDateDialog.oldDate}
                    newDate={dueDateDialog.newDate}
                    onConfirm={handleDueDateConfirm}
                />
            )}

            {/* Notes Side Panel */}
            <Sheet open={!!notesPanel} onOpenChange={(v) => { if (!v) setNotesPanel(null) }}>
                <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 overflow-hidden flex flex-col">
                    <VisuallyHidden><SheetTitle>Milestone Notes</SheetTitle></VisuallyHidden>
                    {notesPanel && projectId && (
                        <MilestoneNotesPanel
                            projectId={projectId}
                            milestoneId={notesPanel.milestoneId}
                            milestoneName={notesPanel.milestoneName}
                        />
                    )}
                </SheetContent>
            </Sheet>

            {/* History Side Panel */}
            <Sheet open={!!historyPanel} onOpenChange={(v) => { if (!v) setHistoryPanel(null) }}>
                <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 overflow-hidden flex flex-col">
                    <VisuallyHidden><SheetTitle>Due Date History</SheetTitle></VisuallyHidden>
                    {historyPanel && (
                        <MilestoneChangeLogTimeline
                            milestoneId={historyPanel.milestoneId}
                        />
                    )}
                </SheetContent>
            </Sheet>

            {/* Unlock Milestone Dialog */}
            {unlockDialog?.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setUnlockDialog(null)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
                                <Unlock className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">ปลดล็อก Milestone</h3>
                                <p className="text-sm text-slate-500">{unlockDialog.milestoneName}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">
                            การปลดล็อกจะทำให้สามารถแก้ไข Milestone นี้ได้อีกครั้ง กรุณาระบุเหตุผล
                        </p>
                        <textarea
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                            rows={3}
                            placeholder="ระบุเหตุผลในการปลดล็อก..."
                            value={unlockReason}
                            onChange={(e) => setUnlockReason(e.target.value)}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => setUnlockDialog(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                disabled={unlockLoading}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleUnlockConfirm}
                                disabled={!unlockReason.trim() || unlockLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {unlockLoading ? 'กำลังปลดล็อก...' : 'ปลดล็อก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
