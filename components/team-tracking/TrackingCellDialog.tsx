'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Trash2, Loader2, Search, ChevronDown, Check, CheckCircle2, CalendarClock, Circle, CornerDownRight, X, Bold, Italic, Underline, List, ListOrdered, Palette } from 'lucide-react'
import {
    TrackingEntry,
    TrackingStatus,
    AssignableEmployee,
    createTrackingEntry,
    updateTrackingEntry,
    deleteTrackingEntry,
} from '@/lib/actions/team-tracking-actions'
import { ICON_OPTIONS } from './icons'

const COLOR_PRESETS = [
    { value: '#3b82f6', label: 'น้ำเงิน' },
    { value: '#10b981', label: 'เขียว' },
    { value: '#f59e0b', label: 'ส้ม' },
    { value: '#ef4444', label: 'แดง' },
    { value: '#8b5cf6', label: 'ม่วง' },
    { value: '#06b6d4', label: 'ฟ้า' },
    { value: '#ec4899', label: 'ชมพู' },
    { value: '#6b7280', label: 'เทา' },
]

const ROLE_OPTIONS = [
    { value: 'SA', label: 'SA' },
    { value: 'PM', label: 'PM' },
    { value: 'EMPLOYEE', label: 'พนักงาน' },
    { value: 'TESTER', label: 'Tester' },
    { value: 'DEV', label: 'Developer' },
]

const STATUS_OPTIONS: { value: TrackingStatus; label: string; color: string; Icon: any }[] = [
    { value: 'PLANNED', label: 'วางแผน', color: '#64748b', Icon: Circle },
    { value: 'DONE', label: 'เสร็จแล้ว', color: '#10b981', Icon: CheckCircle2 },
    { value: 'POSTPONED', label: 'เลื่อน', color: '#f59e0b', Icon: CalendarClock },
]

interface Props {
    open: boolean
    onClose: () => void
    onSaved: () => void
    projectId: string
    projectName: string
    entryDate: string                   // 'yyyy-MM-dd'
    entries: TrackingEntry[]
    employees: AssignableEmployee[]
    milestones?: { id: string; name: string; color: string | null }[]
    /** When set, the dialog opens focused on this specific entry instead of the first one. */
    initialEntryId?: string
}

interface FormState {
    // ID present = existing entry; absent = new
    id?: string
    // Local-only key for React (stable across edits)
    _key: string
    // Original entry_date — to detect "incoming postponed" entries opened from a target date
    origin_date?: string
    assignee_id: string | null
    assignee_role: string | null
    note: string
    color: string
    icon: string | null
    milestone_id: string | null
    status: TrackingStatus
    completed_date: string | null
    postponed_date: string | null
    // dirty flag — only saved entries that changed
    dirty: boolean
}

function fromEntry(entry: TrackingEntry): FormState {
    return {
        id: entry.id,
        _key: entry.id,
        origin_date: entry.entry_date,
        assignee_id: entry.assignee_id,
        assignee_role: entry.assignee_role,
        note: entry.note || '',
        color: entry.color || COLOR_PRESETS[0].value,
        icon: entry.icon,
        milestone_id: entry.milestone_id,
        status: entry.status || 'PLANNED',
        completed_date: entry.completed_date,
        postponed_date: entry.postponed_date,
        dirty: false,
    }
}

function emptyForm(): FormState {
    return {
        _key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        assignee_id: null,
        assignee_role: 'EMPLOYEE',
        note: '',
        color: COLOR_PRESETS[0].value,
        icon: null,
        milestone_id: null,
        status: 'PLANNED',
        completed_date: null,
        postponed_date: null,
        dirty: false,
    }
}

export function TrackingCellDialog({
    open,
    onClose,
    onSaved,
    projectId,
    projectName,
    entryDate,
    entries,
    employees,
    milestones = [],
    initialEntryId,
}: Props) {
    // Snapshots of saved entries (immutable view of server state).
    const savedForms = useMemo(() => entries.map(fromEntry), [entries])

    // Active form = the entry currently being edited / created.
    // If `initialEntryId` is provided (task-mode click), focus that entry; else default to first.
    const [activeForm, setActiveForm] = useState<FormState>(() => {
        if (initialEntryId) {
            const found = savedForms.find(f => f._key === initialEntryId)
            if (found) return found
        }
        return savedForms[0] ?? emptyForm()
    })
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Reset whenever drawer opens or the cell context (project/date) changes.
    // Unsaved edits are dropped silently — user requested no confirm prompts.
    // If `initialEntryId` is set (task-mode click), focus that entry on open.
    useEffect(() => {
        if (!open) return
        const target = initialEntryId
            ? savedForms.find(f => f._key === initialEntryId)
            : null
        setActiveForm(target ?? savedForms[0] ?? emptyForm())
        setErrorMsg(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, projectId, entryDate, savedForms, initialEntryId])

    const dateLabel = useMemo(() => {
        const d = new Date(entryDate)
        return d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }, [entryDate])

    const employeeOptions = useMemo(
        () =>
            employees.map((e) => ({
                value: e.id,
                label: `${e.name_th || e.name}${e.position_code ? ` (${e.position_code})` : ''}`,
            })),
        [employees]
    )

    const switchToEntry = (entryId: string) => {
        const found = savedForms.find((f) => f.id === entryId)
        if (found) setActiveForm(found)
    }

    const startNewEntry = () => {
        setActiveForm(emptyForm())
        setErrorMsg(null)
    }

    const patchActiveForm = (patch: Partial<FormState>) => {
        setActiveForm((prev) => ({ ...prev, ...patch, dirty: true }))
    }

    const handleDelete = async () => {
        if (!activeForm.id) {
            // unsaved local form → drop and go to first saved or empty
            setActiveForm(savedForms[0] ?? emptyForm())
            return
        }
        if (!confirm('ลบรายการนี้?')) return
        setDeleting(true)
        try {
            const result = await deleteTrackingEntry(activeForm.id)
            if (!result.success) {
                setErrorMsg(result.error || 'ลบไม่สำเร็จ')
                return
            }
            const remaining = savedForms.filter((f) => f.id !== activeForm.id)
            setActiveForm(remaining[0] ?? emptyForm())
            onSaved()
        } finally {
            setDeleting(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setErrorMsg(null)
        try {
            const f = activeForm
            const payload = {
                assignee_id: f.assignee_id,
                assignee_role: f.assignee_role,
                note: f.note || null,
                color: f.color,
                color_source: 'MANUAL' as const,
                icon: f.icon,
                milestone_id: f.milestone_id,
                status: f.status,
                completed_date: f.status === 'DONE' ? f.completed_date || entryDate : null,
                postponed_date: f.status === 'POSTPONED' ? f.postponed_date : null,
            }
            const result = f.id
                ? await updateTrackingEntry(f.id, payload)
                : await createTrackingEntry({
                      project_id: projectId,
                      entry_date: entryDate,
                      ...payload,
                  })

            if (!result.success) {
                setErrorMsg(result.error || 'บันทึกไม่สำเร็จ')
                return
            }
            onSaved()
            onClose()
        } catch (e) {
            setErrorMsg('เกิดข้อผิดพลาด: ' + (e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const isNewEntry = !activeForm.id
    const drawerRef = useRef<HTMLDivElement | null>(null)

    // Click-outside-to-close — but EXCLUDE the tracking-grid table so the user
    // can click a different cell to switch the drawer's context without it
    // collapsing first. Also exclude Esc keypress.
    useEffect(() => {
        if (!open) return
        const onMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target) return
            // Inside the drawer itself? leave it alone.
            if (drawerRef.current?.contains(target)) return
            // Click on a tracking-grid cell (or anywhere inside the grid table) — keep open.
            if (target.closest('[data-tracking-grid]')) return
            // Click on another popover (color picker / dropdown the drawer mounts in portal-style) — leave it.
            if (target.closest('[data-tracking-dialog-popover]')) return
            onClose()
        }
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        // mousedown so we react before any focus/click handler on the cell fires
        document.addEventListener('mousedown', onMouseDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onMouseDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open, onClose])

    return (
        <div
            ref={drawerRef}
            aria-hidden={!open}
            className={`fixed top-0 right-0 bottom-0 z-50 w-[600px] max-w-[95vw] bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
                open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
            }`}
        >
                {/* Header */}
                <div className="px-4 pt-3 pb-2 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate" title={projectName}>
                                {projectName}
                            </div>
                            <div className="text-xs font-normal text-slate-500 mt-0.5">{dateLabel}</div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 -mr-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded shrink-0"
                            title="ปิด"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Entry switcher (only when 1+ saved entries exist) */}
                    {savedForms.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <span className="text-[11px] text-slate-500">รายการ:</span>
                            {savedForms.map((f, i) => {
                                const isActive = activeForm.id === f.id
                                const isIncoming = !!f.origin_date && f.origin_date !== entryDate
                                return (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => switchToEntry(f.id!)}
                                        title={
                                            isIncoming
                                                ? `เลื่อนมาจากวันที่ ${f.origin_date}`
                                                : undefined
                                        }
                                        className={`px-2 py-0.5 rounded text-[11px] border transition-colors flex items-center gap-1 ${
                                            isActive
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : isIncoming
                                                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {isIncoming ? (
                                            <CornerDownRight
                                                className="w-3 h-3"
                                                style={{
                                                    color: isActive ? 'white' : '#f59e0b',
                                                }}
                                            />
                                        ) : (
                                            <span
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        isActive ? 'white' : f.color || '#94a3b8',
                                                }}
                                            />
                                        )}
                                        {i + 1}
                                        {f.assignee_id && (
                                            <span className="ml-0.5 opacity-75 truncate max-w-[80px]">
                                                · {employeeOptions.find((o) => o.value === f.assignee_id)?.label.split(' ')[0]}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                            <button
                                type="button"
                                onClick={startNewEntry}
                                className={`px-2 py-0.5 rounded text-[11px] border transition-colors flex items-center gap-1 ${
                                    isNewEntry
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-blue-600 border-dashed border-blue-300 hover:bg-blue-50'
                                }`}
                            >
                                <Plus className="w-3 h-3" />
                                เพิ่มรายการ
                            </button>
                        </div>
                    )}
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                    {errorMsg && (
                        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            {errorMsg}
                        </div>
                    )}
                    {activeForm.origin_date && activeForm.origin_date !== entryDate && (
                        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-1.5">
                            <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                            งานนี้ถูกเลื่อนมาจากวันที่ <strong>{activeForm.origin_date}</strong> — แก้ไขสถานะ/วันที่เลื่อนได้ที่นี่
                        </div>
                    )}
                    <EntryForm
                        form={activeForm}
                        employeeOptions={employeeOptions}
                        milestones={milestones}
                        entryDate={entryDate}
                        onPatch={patchActiveForm}
                    />
                </div>

                {/* Sticky footer */}
                <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 flex items-center justify-between gap-2">
                    {!isNewEntry ? (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {deleting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Trash2 className="w-3 h-3" />
                            )}
                            ลบ
                        </button>
                    ) : (
                        <span />
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50"
                        >
                            ปิด
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !activeForm.dirty}
                            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                            บันทึก
                        </button>
                    </div>
                </div>
        </div>
    )
}

// ============================================================
// EntryForm — single entry editor inside the dialog
// ============================================================
interface EntryFormProps {
    form: FormState
    employeeOptions: { value: string; label: string }[]
    milestones: { id: string; name: string; color: string | null }[]
    entryDate: string
    onPatch: (patch: Partial<FormState>) => void
}

function EntryForm({
    form,
    employeeOptions,
    milestones,
    entryDate,
    onPatch,
}: EntryFormProps) {
    const [assigneeOpen, setAssigneeOpen] = useState(false)
    const [assigneeQuery, setAssigneeQuery] = useState('')
    const [milestoneOpen, setMilestoneOpen] = useState(false)
    const [milestoneQuery, setMilestoneQuery] = useState('')

    const filteredEmployees = useMemo(() => {
        if (!assigneeQuery) return employeeOptions
        const q = assigneeQuery.toLowerCase().replace(/\s+/g, '')
        return employeeOptions.filter((o) =>
            o.label.toLowerCase().replace(/\s+/g, '').includes(q)
        )
    }, [employeeOptions, assigneeQuery])

    const filteredMilestones = useMemo(() => {
        if (!milestoneQuery) return milestones
        const q = milestoneQuery.toLowerCase().replace(/\s+/g, '')
        return milestones.filter((m) =>
            m.name.toLowerCase().replace(/\s+/g, '').includes(q)
        )
    }, [milestones, milestoneQuery])

    const selectedLabel = form.assignee_id
        ? employeeOptions.find((o) => o.value === form.assignee_id)?.label || 'ไม่ระบุ'
        : 'ไม่ระบุ'

    const selectedMilestone = form.milestone_id
        ? milestones.find((m) => m.id === form.milestone_id)
        : null

    return (
        <div className="space-y-3">
            {/* Status */}
            <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">สถานะ</label>
                <div className="flex gap-1.5">
                    {STATUS_OPTIONS.map((s) => {
                        const Icon = s.Icon
                        const selected = form.status === s.value
                        return (
                            <button
                                key={s.value}
                                type="button"
                                onClick={() => {
                                    const patch: Partial<FormState> = { status: s.value }
                                    if (s.value === 'DONE' && !form.completed_date) {
                                        patch.completed_date = entryDate
                                    }
                                    onPatch(patch)
                                }}
                                className={`flex-1 px-2 py-2 rounded border text-xs flex items-center justify-center gap-1.5 transition-colors ${
                                    selected
                                        ? 'border-transparent text-white'
                                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                                style={selected ? { backgroundColor: s.color } : {}}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {s.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Date + Assignee in same row */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        {form.status === 'DONE' ? 'วันที่เสร็จ' : form.status === 'POSTPONED' ? 'เลื่อนไปวันที่' : 'วันที่งาน'}
                    </label>
                    {form.status === 'DONE' ? (
                        <input
                            type="date"
                            value={form.completed_date || entryDate}
                            onChange={(e) => onPatch({ completed_date: e.target.value || null })}
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    ) : form.status === 'POSTPONED' ? (
                        <input
                            type="date"
                            value={form.postponed_date || ''}
                            onChange={(e) => onPatch({ postponed_date: e.target.value || null })}
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    ) : (
                        <input
                            type="date"
                            value={entryDate}
                            readOnly
                            className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-slate-50 text-slate-600"
                        />
                    )}
                </div>

                <div className="relative">
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">ผู้รับผิดชอบ</label>
                    <button
                        type="button"
                        onClick={() => setAssigneeOpen((o) => !o)}
                        className="w-full flex items-center justify-between px-3 py-2 border border-slate-300 rounded text-sm text-left bg-white hover:border-slate-400"
                    >
                        <span className={`truncate ${form.assignee_id ? 'text-slate-900' : 'text-slate-400'}`}>
                            {selectedLabel}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>

                    {assigneeOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-[60]"
                                onClick={() => {
                                    setAssigneeOpen(false)
                                    setAssigneeQuery('')
                                }}
                            />
                            <div className="absolute z-[70] top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg overflow-hidden">
                                <div className="p-1.5 border-b border-slate-100">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                        <input
                                            type="text"
                                            value={assigneeQuery}
                                            onChange={(e) => setAssigneeQuery(e.target.value)}
                                            placeholder="ค้นหา..."
                                            autoFocus
                                            className="w-full pl-7 pr-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onPatch({ assignee_id: null })
                                            setAssigneeOpen(false)
                                            setAssigneeQuery('')
                                        }}
                                        className="w-full px-2 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                                    >
                                        <div className="w-3.5">
                                            {!form.assignee_id && <Check className="w-3 h-3 text-indigo-600" />}
                                        </div>
                                        <span className="text-slate-500">ไม่ระบุ</span>
                                    </button>
                                    {filteredEmployees.length === 0 ? (
                                        <div className="py-4 text-center text-xs text-slate-500">ไม่พบรายการ</div>
                                    ) : (
                                        filteredEmployees.map((opt) => {
                                            const isSelected = form.assignee_id === opt.value
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => {
                                                        onPatch({ assignee_id: opt.value })
                                                        setAssigneeOpen(false)
                                                        setAssigneeQuery('')
                                                    }}
                                                    className={`w-full px-2 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-2 ${
                                                        isSelected ? 'bg-indigo-50/50' : ''
                                                    }`}
                                                >
                                                    <div className="w-3.5">
                                                        {isSelected && <Check className="w-3 h-3 text-indigo-600" />}
                                                    </div>
                                                    <span className="truncate">{opt.label}</span>
                                                </button>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Milestone (combobox, optional) */}
            <div className="relative">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Milestone <span className="text-slate-400">(ไม่บังคับ)</span>
                </label>
                <button
                    type="button"
                    onClick={() => setMilestoneOpen((o) => !o)}
                    disabled={milestones.length === 0}
                    className="w-full flex items-center justify-between px-2 py-1.5 border border-slate-300 rounded text-xs text-left bg-white hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="flex items-center gap-1.5">
                        {selectedMilestone && (
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: selectedMilestone.color || '#475569' }}
                            />
                        )}
                        <span className={selectedMilestone ? 'text-slate-900' : 'text-slate-400'}>
                            {selectedMilestone
                                ? selectedMilestone.name
                                : milestones.length === 0
                                  ? 'โครงการนี้ยังไม่มี milestones'
                                  : 'ไม่ระบุ'}
                        </span>
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {milestoneOpen && milestones.length > 0 && (
                    <>
                        <div
                            className="fixed inset-0 z-[60]"
                            onClick={() => {
                                setMilestoneOpen(false)
                                setMilestoneQuery('')
                            }}
                        />
                        <div className="absolute z-[70] top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg overflow-hidden">
                            <div className="p-1.5 border-b border-slate-100">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                    <input
                                        type="text"
                                        value={milestoneQuery}
                                        onChange={(e) => setMilestoneQuery(e.target.value)}
                                        placeholder="ค้นหา milestone..."
                                        autoFocus
                                        className="w-full pl-7 pr-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onPatch({ milestone_id: null })
                                        setMilestoneOpen(false)
                                        setMilestoneQuery('')
                                    }}
                                    className="w-full px-2 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                                >
                                    <div className="w-3.5">
                                        {!form.milestone_id && <Check className="w-3 h-3 text-blue-600" />}
                                    </div>
                                    <span className="text-slate-500">ไม่ระบุ</span>
                                </button>
                                {filteredMilestones.length === 0 ? (
                                    <div className="py-4 text-center text-[11px] text-slate-500">
                                        ไม่พบ milestone
                                    </div>
                                ) : (
                                    filteredMilestones.map((m) => {
                                        const isSelected = form.milestone_id === m.id
                                        return (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => {
                                                    onPatch({ milestone_id: m.id })
                                                    setMilestoneOpen(false)
                                                    setMilestoneQuery('')
                                                }}
                                                className={`w-full px-2 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-2 ${
                                                    isSelected ? 'bg-blue-50/50' : ''
                                                }`}
                                            >
                                                <div className="w-3.5">
                                                    {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                                                </div>
                                                <span
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: m.color || '#475569' }}
                                                />
                                                <span className="truncate">{m.name}</span>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Note (rich text) */}
            <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">รายละเอียด</label>
                <RichNoteEditor
                    valueHtml={form.note}
                    onChange={(html) => onPatch({ note: html })}
                />
            </div>

            {/* Color + Icon */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">สี</label>
                    <div className="flex flex-wrap gap-1.5">
                        {COLOR_PRESETS.map((c) => (
                            <button
                                key={c.value}
                                type="button"
                                onClick={() => onPatch({ color: c.value })}
                                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                                    form.color === c.value
                                        ? 'border-slate-900 scale-110'
                                        : 'border-white hover:scale-105'
                                }`}
                                style={{ backgroundColor: c.value }}
                                title={c.label}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">ไอคอน</label>
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => onPatch({ icon: null })}
                            className={`h-8 px-2 rounded border flex items-center justify-center text-xs ${
                                !form.icon
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 text-slate-400 hover:border-slate-300'
                            }`}
                            title="ไม่มี"
                        >
                            -
                        </button>
                        {ICON_OPTIONS.slice(0, 7).map((opt) => {
                            const Icon = opt.Icon
                            const selected = form.icon === opt.name
                            return (
                                <button
                                    key={opt.name}
                                    type="button"
                                    onClick={() => onPatch({ icon: opt.name })}
                                    className={`h-8 w-8 rounded border flex items-center justify-center transition-colors ${
                                        selected
                                            ? 'border-indigo-600 bg-indigo-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                    title={opt.label}
                                >
                                    <Icon
                                        className="w-4 h-4"
                                        style={{ color: selected ? form.color : '#475569' }}
                                    />
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

        </div>
    )
}

// ============================================================
// RichNoteEditor — minimal contenteditable with B/I/U + color toolbar.
// Stores HTML in the model; displays as-is. For internal use only.
// ============================================================

const TEXT_COLORS = [
    { color: '#0f172a', label: 'ปกติ' },
    { color: '#ef4444', label: 'แดง' },
    { color: '#f59e0b', label: 'ส้ม' },
    { color: '#10b981', label: 'เขียว' },
    { color: '#3b82f6', label: 'น้ำเงิน' },
    { color: '#8b5cf6', label: 'ม่วง' },
]

function RichNoteEditor({ valueHtml, onChange }: { valueHtml: string; onChange: (html: string) => void }) {
    const editorRef = useRef<HTMLDivElement>(null)
    const lastValueRef = useRef<string>('')
    const [colorOpen, setColorOpen] = useState(false)

    // Sync external value into the editor only when the model differs from what's already rendered.
    // (Avoid re-setting innerHTML on every keystroke — that would move the cursor.)
    useEffect(() => {
        if (!editorRef.current) return
        if (valueHtml !== lastValueRef.current) {
            editorRef.current.innerHTML = valueHtml || ''
            lastValueRef.current = valueHtml || ''
        }
    }, [valueHtml])

    const exec = (cmd: string, value?: string) => {
        editorRef.current?.focus()
        // execCommand is deprecated but still works in all modern browsers; sufficient for an internal note field.
        try { document.execCommand(cmd, false, value) } catch { /* ignore */ }
        flush()
    }

    const flush = () => {
        if (!editorRef.current) return
        const html = editorRef.current.innerHTML
        lastValueRef.current = html
        onChange(html)
    }

    return (
        <div className="border border-slate-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-slate-200 bg-slate-50">
                <ToolbarBtn title="ตัวหนา (Ctrl+B)" onClick={() => exec('bold')}>
                    <Bold className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn title="ตัวเอน (Ctrl+I)" onClick={() => exec('italic')}>
                    <Italic className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn title="ขีดเส้นใต้ (Ctrl+U)" onClick={() => exec('underline')}>
                    <Underline className="w-3.5 h-3.5" />
                </ToolbarBtn>

                <div className="w-px h-4 bg-slate-300 mx-1" />

                <ToolbarBtn title="รายการแบบจุด" onClick={() => exec('insertUnorderedList')}>
                    <List className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn title="รายการแบบเลข" onClick={() => exec('insertOrderedList')}>
                    <ListOrdered className="w-3.5 h-3.5" />
                </ToolbarBtn>

                <div className="w-px h-4 bg-slate-300 mx-1" />

                {/* Color picker */}
                <div className="relative">
                    <ToolbarBtn title="สีตัวอักษร" onClick={() => setColorOpen(o => !o)}>
                        <Palette className="w-3.5 h-3.5" />
                    </ToolbarBtn>
                    {colorOpen && (
                        <>
                            <div className="fixed inset-0 z-[60]" onClick={() => setColorOpen(false)} />
                            <div className="absolute z-[70] top-full left-0 mt-1 p-1.5 bg-white border border-slate-200 rounded shadow-lg flex gap-1">
                                {TEXT_COLORS.map(c => (
                                    <button
                                        key={c.color}
                                        type="button"
                                        title={c.label}
                                        onClick={() => { exec('foreColor', c.color); setColorOpen(false) }}
                                        className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                                        style={{ background: c.color }}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex-1" />
                <ToolbarBtn title="ล้างฟอร์แมต" onClick={() => exec('removeFormat')}>
                    <span className="text-[10px] font-bold">Tx</span>
                </ToolbarBtn>
            </div>

            {/* Editable area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={flush}
                onBlur={flush}
                suppressContentEditableWarning
                className="px-3 py-2 text-sm min-h-[180px] max-h-[320px] overflow-y-auto outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_b]:font-bold [&_i]:italic"
                data-placeholder="ใส่รายละเอียดงาน..."
            />
            <style jsx>{`
                div[contenteditable]:empty::before {
                    content: attr(data-placeholder);
                    color: rgb(148 163 184);
                    pointer-events: none;
                }
            `}</style>
        </div>
    )
}

function ToolbarBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            title={title}
            onClick={(e) => { e.preventDefault(); onClick() }}
            onMouseDown={(e) => e.preventDefault()}  // keep selection in editor
            className="p-1.5 rounded hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 flex items-center justify-center"
        >
            {children}
        </button>
    )
}
