'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Plus, Trash2, Paperclip, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { createTasksBulk, discardTempTaskAttachments, type BulkTaskInput } from '@/lib/actions/task-actions'
import { getTaskTypes } from '@/lib/actions/task-actions'
import { getAssignableEmployees } from '@/lib/actions/employee-actions'
import FileUpload from '@/components/ui/FileUpload'
import type { Attachment } from '@/lib/actions/attachment-actions'

interface BulkTaskRow {
    rowKey: string
    title: string
    task_type: string
    priority: string
    estimated_hours: string
    due_date: string
    assignee_id: string
    is_count_for_kpi: boolean
    attachments: Attachment[]
    expanded: boolean
    /** Set of field names the user has manually edited in this row.
     * Used to stop the cascade-fill so user-edited cells don't get overwritten. */
    touched: Set<string>
}

const INITIAL_ROW_COUNT = 10
type CascadeField = 'task_type' | 'priority' | 'estimated_hours' | 'due_date' | 'assignee_id' | 'is_count_for_kpi'

interface BulkTaskModalProps {
    isOpen: boolean
    onClose: () => void
    storyId: string
    storyCode?: string
    storyTitle?: string
    currentUserId?: string
    onSuccess?: () => void
    /** Optional pre-filled rows — when provided, the modal opens populated with these
     *  rows instead of 10 empty ones. Used by the "Bulk Convert from Tracking" flow
     *  in the gantt-overview daily view. */
    initialRows?: Partial<Omit<BulkTaskRow, 'rowKey' | 'touched' | 'attachments' | 'expanded'>>[]
    /** Optional title shown in the header (e.g. "แปลงจากกิจกรรม"). */
    headerTitle?: string
    /** Optional callback fired AFTER tasks are created — receives the new task ids
     *  paired with the source identifiers passed via `initialRows[i].title` index. */
    onTasksCreated?: (createdTaskIds: string[]) => void | Promise<void>
}

const PRIORITY_OPTIONS = [
    { value: 'critical', label: '🔴 Critical' },
    { value: 'high', label: '🟠 High' },
    { value: 'medium', label: '🔵 Medium' },
    { value: 'low', label: '⚪ Low' },
]

function newRowKey() {
    return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyRow(defaults?: Partial<BulkTaskRow>): BulkTaskRow {
    return {
        rowKey: newRowKey(),
        title: '',
        task_type: defaults?.task_type ?? '',
        priority: defaults?.priority ?? 'medium',
        estimated_hours: defaults?.estimated_hours ?? '',
        due_date: defaults?.due_date ?? '',
        assignee_id: defaults?.assignee_id ?? '',
        is_count_for_kpi: defaults?.is_count_for_kpi ?? true,
        attachments: [],
        expanded: false,
        touched: new Set<string>(),
    }
}

function makeInitialRows(): BulkTaskRow[] {
    return Array.from({ length: INITIAL_ROW_COUNT }, () => emptyRow())
}

export function BulkTaskModal({
    isOpen,
    onClose,
    storyId,
    storyCode,
    storyTitle,
    currentUserId,
    onSuccess,
    initialRows,
    headerTitle,
    onTasksCreated,
}: BulkTaskModalProps) {
    // When initialRows is provided, build them; else fall back to 10 empty rows.
    const buildInitial = (): BulkTaskRow[] => {
        if (initialRows && initialRows.length) {
            return initialRows.map(r => ({
                rowKey: newRowKey(),
                title: r.title ?? '',
                task_type: r.task_type ?? '',
                priority: r.priority ?? 'medium',
                estimated_hours: r.estimated_hours ?? '',
                due_date: r.due_date ?? '',
                assignee_id: r.assignee_id ?? '',
                is_count_for_kpi: r.is_count_for_kpi ?? true,
                attachments: [],
                expanded: false,
                touched: new Set<string>(),
            }))
        }
        return makeInitialRows()
    }
    const [rows, setRows] = useState<BulkTaskRow[]>(buildInitial)
    const [taskTypes, setTaskTypes] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [loadingEmps, setLoadingEmps] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // One shared temp folder per modal session — every row's files land here,
    // and createTasksBulk relocates them per-row using the attachments array.
    const tempSessionRef = useRef<string>('')
    if (!tempSessionRef.current) {
        tempSessionRef.current = `tasks/temp-bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }

    // Cache assignable employees per due_date so each row doesn't re-hit the server
    const empCacheRef = useRef<Map<string, any[]>>(new Map())

    useEffect(() => {
        if (!isOpen) return
        getTaskTypes().then(setTaskTypes)
        // Always reset to a fresh batch when the modal is opened. Without this,
        // stale state (including stale `touched` Sets) from a previous session
        // can survive across opens because the parent keeps the modal mounted.
        setRows(makeInitialRows())
        setErrorMsg(null)
        setSuccessMsg(null)
        tempSessionRef.current = `tasks/temp-bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }, [isOpen])

    // Load assignees whenever any row's due_date changes (we need a union of dates).
    // For simplicity, load once when the first non-empty due_date appears, since
    // workload is per-day and most rows in a daily batch share the date.
    useEffect(() => {
        if (!isOpen) return
        const firstDate = rows.find(r => r.due_date)?.due_date
        if (!firstDate) {
            setEmployees([])
            return
        }
        if (empCacheRef.current.has(firstDate)) {
            setEmployees(empCacheRef.current.get(firstDate)!)
            return
        }
        setLoadingEmps(true)
        getAssignableEmployees(firstDate)
            .then(res => {
                if (res.success) {
                    empCacheRef.current.set(firstDate, res.data as any[])
                    setEmployees(res.data as any[])
                }
            })
            .finally(() => setLoadingEmps(false))
    }, [isOpen, rows.map(r => r.due_date).join('|')])

    const taskTypeOptions = useMemo(() => taskTypes.map((t: any) => ({
        value: t.value || t.code,
        label: t.label || t.name_th || t.name,
    })), [taskTypes])

    const employeeOptions = useMemo(() => employees.map((emp: any) => {
        const thaiName = emp.first_name_th && emp.last_name_th
            ? `${emp.first_name_th} ${emp.last_name_th}`
            : `${emp.first_name} ${emp.last_name}`
        const displayName = emp.nickname ? `${thaiName} (${emp.nickname})` : thaiName
        return { value: emp.id, label: displayName, role: emp.role_code }
    }), [employees])

    /**
     * Cascade-update a non-title field: stamp the source row as touched, then
     * walk down the list copying the new value into each subsequent row UNTIL
     * it hits a row the user has already manually edited for that field.
     */
    const updateField = (rowKey: string, field: CascadeField, value: any) => {
        setRows(prev => {
            const idx = prev.findIndex(r => r.rowKey === rowKey)
            if (idx < 0) return prev
            const next = prev.slice()
            // `touched` may be undefined if rows were created by an older code path.
            const sourceTouched = new Set(next[idx].touched ?? [])
            sourceTouched.add(field)
            // Changing due_date invalidates the row's previously-picked assignee
            // (workload check is per-day) — same behavior as the single-task modal.
            const sourcePatch: Partial<BulkTaskRow> = { [field]: value, touched: sourceTouched }
            if (field === 'due_date' && next[idx].due_date !== value) {
                sourcePatch.assignee_id = ''
            }
            next[idx] = { ...next[idx], ...sourcePatch }

            // Propagate downward, stopping at the first row the user has touched for this field
            for (let i = idx + 1; i < next.length; i++) {
                if (next[i].touched?.has(field)) break
                const patch: Partial<BulkTaskRow> = { [field]: value }
                if (field === 'due_date' && next[i].due_date !== value) {
                    patch.assignee_id = ''
                }
                next[i] = { ...next[i], ...patch }
            }
            return next
        })
    }

    const updateTitle = (rowKey: string, value: string) => {
        setRows(prev => prev.map(r => r.rowKey === rowKey ? { ...r, title: value } : r))
    }

    const updateAttachments = (rowKey: string, files: Attachment[]) => {
        setRows(prev => prev.map(r => r.rowKey === rowKey ? { ...r, attachments: files } : r))
    }

    const updateExpanded = (rowKey: string, expanded: boolean) => {
        setRows(prev => prev.map(r => r.rowKey === rowKey ? { ...r, expanded } : r))
    }

    const removeRow = async (rowKey: string) => {
        const row = rows.find(r => r.rowKey === rowKey)
        if (row && row.attachments.length > 0) {
            // Drop temp files belonging to this row.
            const tempPaths = row.attachments.map(a => a.path).filter(p => p && p.startsWith('tasks/temp-'))
            if (tempPaths.length > 0) {
                try { await discardTempTaskAttachments(tempPaths) } catch { /* noop */ }
            }
        }
        setRows(prev => prev.length === 1 ? [emptyRow()] : prev.filter(r => r.rowKey !== rowKey))
    }

    const addRow = () => {
        // Inherit from the last row's current values so a freshly-added row sits
        // naturally at the tail of any cascade in progress.
        const last = rows[rows.length - 1]
        setRows(prev => [...prev, emptyRow({
            task_type: last?.task_type || '',
            priority: last?.priority || 'medium',
            estimated_hours: last?.estimated_hours || '',
            due_date: last?.due_date || '',
            assignee_id: last?.assignee_id || '',
            is_count_for_kpi: last?.is_count_for_kpi ?? true,
        })])
    }

    // Auto-add a fresh row when the user starts typing in the last row's Title.
    const handleTitleChange = (rowKey: string, value: string) => {
        const isLast = rows[rows.length - 1].rowKey === rowKey
        const wasEmpty = rows.find(r => r.rowKey === rowKey)?.title === ''
        updateTitle(rowKey, value)
        if (isLast && wasEmpty && value.trim().length > 0) {
            addRow()
        }
    }

    const validRows = useMemo(() => rows.filter(r => r.title.trim().length > 0), [rows])
    const totalEstimated = useMemo(
        () => validRows.reduce((s, r) => s + (parseFloat(r.estimated_hours) || 0), 0),
        [validRows]
    )

    const handleSubmit = async () => {
        setErrorMsg(null)
        setSuccessMsg(null)

        if (validRows.length === 0) {
            setErrorMsg('กรุณากรอก Title อย่างน้อย 1 row')
            return
        }
        for (const r of validRows) {
            if (!r.task_type) { setErrorMsg(`กรุณาเลือก Task Type สำหรับ "${r.title}"`); return }
            if (!r.priority) { setErrorMsg(`กรุณาเลือก Priority สำหรับ "${r.title}"`); return }
        }

        setSubmitting(true)
        try {
            const payload: BulkTaskInput[] = validRows.map(r => ({
                title: r.title.trim(),
                task_type: r.task_type,
                priority: r.priority,
                estimated_hours: r.estimated_hours ? parseFloat(r.estimated_hours) : undefined,
                due_date: r.due_date || undefined,
                assignee_id: r.assignee_id || undefined,
                is_count_for_kpi: r.is_count_for_kpi,
                attachments: r.attachments.length > 0 ? r.attachments : undefined,
            }))
            const result = await createTasksBulk({ story_id: storyId, tasks: payload })
            if (result.success && result.data) {
                setSuccessMsg(`สร้าง ${result.data.count} Task เรียบร้อย`)
                // Reset for next batch — fresh temp session, fresh 10 empty rows
                tempSessionRef.current = `tasks/temp-bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
                setRows(makeInitialRows())
                onSuccess?.()
                if (onTasksCreated) {
                    try { await onTasksCreated(result.data.tasks.map((t: any) => t.id)) } catch { /* noop */ }
                }
                setTimeout(() => setSuccessMsg(null), 2500)
            } else {
                setErrorMsg(result.error || 'สร้าง Task ไม่สำเร็จ')
            }
        } catch (e: any) {
            setErrorMsg(e?.message || 'Unexpected error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleClose = async () => {
        // Sweep up any temp files left in the modal across all rows.
        const tempPaths: string[] = []
        for (const r of rows) {
            for (const a of r.attachments) {
                if (a.path?.startsWith('tasks/temp-')) tempPaths.push(a.path)
            }
        }
        if (tempPaths.length > 0) {
            try { await discardTempTaskAttachments(tempPaths) } catch { /* noop */ }
        }
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
                    <div>
                        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            {headerTitle || 'Bulk Create Tasks'}
                            {storyCode && <span className="text-sm font-normal text-slate-500">in {storyCode}</span>}
                        </h2>
                        {storyTitle && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-2xl">{storyTitle}</p>
                        )}
                    </div>
                    <button onClick={handleClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Hint */}
                <div className="px-5 py-2 bg-blue-50/50 border-b border-blue-100 text-xs text-blue-700">
                    💡 เริ่มต้น 10 row · เปลี่ยนค่าใน row ไหน → row ถัดไปที่ยังไม่ถูกแก้จะ "เปลี่ยนตาม" ทันที · จุดน้ำเงินที่มุมช่อง = แก้ด้วยตัวเอง (จะไม่ถูกเขียนทับ)
                </div>

                {/* Errors / Success */}
                {errorMsg && (
                    <div className="px-5 py-2 bg-rose-50 border-b border-rose-200 text-sm text-rose-700">{errorMsg}</div>
                )}
                {successMsg && (
                    <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-sm text-emerald-700">{successMsg}</div>
                )}

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 sticky top-0 z-10">
                            <tr>
                                <th className="px-2 py-2 text-left font-medium w-10">#</th>
                                <th className="px-2 py-2 text-left font-medium min-w-[280px]">Title *</th>
                                <th className="px-2 py-2 text-left font-medium w-40">Type *</th>
                                <th className="px-2 py-2 text-left font-medium w-32">Priority *</th>
                                <th className="px-2 py-2 text-left font-medium w-24">Hours</th>
                                <th className="px-2 py-2 text-left font-medium w-36">Due Date</th>
                                <th className="px-2 py-2 text-left font-medium w-44">Assignee</th>
                                <th className="px-2 py-2 text-center font-medium w-16">KPI</th>
                                <th className="px-2 py-2 text-center font-medium w-20">Files</th>
                                <th className="px-2 py-2 text-center font-medium w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((row, idx) => (
                                <RowFragment
                                    key={row.rowKey}
                                    row={row}
                                    index={idx}
                                    taskTypeOptions={taskTypeOptions}
                                    employeeOptions={employeeOptions}
                                    loadingEmps={loadingEmps}
                                    tempFolder={tempSessionRef.current}
                                    onFieldChange={(field, value) => updateField(row.rowKey, field, value)}
                                    onAttachmentsChange={(files) => updateAttachments(row.rowKey, files)}
                                    onExpandedChange={(expanded) => updateExpanded(row.rowKey, expanded)}
                                    onRemove={() => removeRow(row.rowKey)}
                                    onTitleChange={(v) => handleTitleChange(row.rowKey, v)}
                                />
                            ))}
                        </tbody>
                    </table>

                    <div className="p-3">
                        <button
                            type="button"
                            onClick={addRow}
                            className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            <Plus className="w-4 h-4" /> Add Row
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t bg-slate-50 shrink-0 flex items-center justify-between">
                    <div className="text-xs text-slate-600">
                        จะสร้าง <span className="font-semibold text-slate-800">{validRows.length}</span> task
                        {totalEstimated > 0 && <> · รวม {totalEstimated.toFixed(1)} ชม.</>}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white hover:border-slate-400 disabled:opacity-50 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting || validRows.length === 0}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-md shadow-blue-200 disabled:opacity-50 disabled:shadow-none text-sm inline-flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create {validRows.length > 0 ? validRows.length : ''} Task{validRows.length === 1 ? '' : 's'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ============================================
// Row component — broken out so the attachment expansion stays per-row
// without bloating the parent's render tree.
// ============================================

function RowFragment({
    row,
    index,
    taskTypeOptions,
    employeeOptions,
    loadingEmps,
    tempFolder,
    onFieldChange,
    onAttachmentsChange,
    onExpandedChange,
    onRemove,
    onTitleChange,
}: {
    row: BulkTaskRow
    index: number
    taskTypeOptions: { value: string; label: string }[]
    employeeOptions: { value: string; label: string; role: string }[]
    loadingEmps: boolean
    tempFolder: string
    onFieldChange: (field: CascadeField, value: any) => void
    onAttachmentsChange: (files: Attachment[]) => void
    onExpandedChange: (expanded: boolean) => void
    onRemove: () => void
    onTitleChange: (v: string) => void
}) {
    const dotClass = (field: CascadeField) =>
        row.touched?.has(field) ? 'after:bg-blue-500' : 'after:bg-transparent'
    return (
        <>
            <tr className="hover:bg-slate-50/50">
                <td className="px-2 py-1.5 text-center text-xs text-slate-400 font-mono">{index + 1}</td>
                <td className="px-2 py-1.5">
                    <input
                        type="text"
                        value={row.title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        placeholder="Task title..."
                        className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                    />
                </td>
                <td className="px-2 py-1.5">
                    <div className={`relative after:absolute after:top-1 after:right-1 after:w-1.5 after:h-1.5 after:rounded-full ${dotClass('task_type')}`}>
                        <select
                            value={row.task_type}
                            onChange={(e) => onFieldChange('task_type', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                        >
                            <option value="">Select...</option>
                            {taskTypeOptions.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </td>
                <td className="px-2 py-1.5">
                    <div className={`relative after:absolute after:top-1 after:right-1 after:w-1.5 after:h-1.5 after:rounded-full ${dotClass('priority')}`}>
                        <select
                            value={row.priority}
                            onChange={(e) => onFieldChange('priority', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                        >
                            {PRIORITY_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </td>
                <td className="px-2 py-1.5">
                    <div className={`relative after:absolute after:top-1 after:right-1 after:w-1.5 after:h-1.5 after:rounded-full ${dotClass('estimated_hours')}`}>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={row.estimated_hours}
                            onChange={(e) => onFieldChange('estimated_hours', e.target.value)}
                            placeholder="e.g. 4"
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </div>
                </td>
                <td className="px-2 py-1.5">
                    <div className={`relative after:absolute after:top-1 after:right-1 after:w-1.5 after:h-1.5 after:rounded-full ${dotClass('due_date')}`}>
                        <input
                            type="date"
                            value={row.due_date}
                            onChange={(e) => onFieldChange('due_date', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </div>
                </td>
                <td className="px-2 py-1.5">
                    <div className={`relative after:absolute after:top-1 after:right-1 after:w-1.5 after:h-1.5 after:rounded-full ${dotClass('assignee_id')}`}>
                        <select
                            value={row.assignee_id}
                            onChange={(e) => onFieldChange('assignee_id', e.target.value)}
                            disabled={!row.due_date || loadingEmps}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            <option value="">{!row.due_date ? 'เลือก Due Date ก่อน' : 'Unassigned'}</option>
                            {employeeOptions.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </td>
                <td className="px-2 py-1.5 text-center">
                    <input
                        type="checkbox"
                        checked={row.is_count_for_kpi}
                        onChange={(e) => onFieldChange('is_count_for_kpi', e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                </td>
                <td className="px-2 py-1.5 text-center">
                    <button
                        type="button"
                        onClick={() => onExpandedChange(!row.expanded)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${row.attachments.length > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                        title={row.expanded ? 'Hide files' : 'Show files'}
                    >
                        <Paperclip className="w-3 h-3" />
                        {row.attachments.length > 0 ? row.attachments.length : '+'}
                        {row.expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                </td>
                <td className="px-2 py-1.5 text-center">
                    <button
                        type="button"
                        onClick={onRemove}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Remove row"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </td>
            </tr>
            {row.expanded && (
                <tr className="bg-blue-50/30">
                    <td colSpan={10} className="px-4 py-3">
                        <div className="max-w-3xl">
                            <FileUpload
                                value={row.attachments}
                                onChange={(files) => onAttachmentsChange(files as Attachment[])}
                                maxFiles={10}
                                maxSizeMB={10}
                                subFolder={tempFolder}
                                label=""
                                helperText="ไฟล์จะถูกแนบกับ Task นี้เมื่อกด Create"
                            />
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}
