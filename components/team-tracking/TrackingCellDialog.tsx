'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Loader2, Search, ChevronDown, Check, CheckCircle2, CalendarClock, Circle, CornerDownRight, X } from 'lucide-react'
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
}: Props) {
    // Snapshots of saved entries (immutable view of server state).
    const savedForms = useMemo(() => entries.map(fromEntry), [entries])

    // Active form = the entry currently being edited / created.
    const [activeForm, setActiveForm] = useState<FormState>(() =>
        savedForms[0] ?? emptyForm()
    )
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Reset whenever drawer opens or the cell context (project/date) changes.
    // Unsaved edits are dropped silently — user requested no confirm prompts.
    useEffect(() => {
        if (!open) return
        setActiveForm(savedForms[0] ?? emptyForm())
        setErrorMsg(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, projectId, entryDate, savedForms])

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

    return (
        <div
            aria-hidden={!open}
            className={`fixed top-0 right-0 bottom-0 z-50 w-[400px] max-w-[95vw] bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
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
        <div className="space-y-2.5">
            {/* Status */}
            <div>
                <label className="block text-[11px] text-slate-600 mb-1">สถานะ</label>
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
                                className={`flex-1 px-2 py-1.5 rounded border text-xs flex items-center justify-center gap-1.5 transition-colors ${
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
                {form.status === 'DONE' && (
                    <div className="mt-1.5">
                        <label className="block text-[11px] text-slate-600 mb-0.5">วันที่เสร็จ</label>
                        <input
                            type="date"
                            value={form.completed_date || entryDate}
                            onChange={(e) => onPatch({ completed_date: e.target.value || null })}
                            className="px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                    </div>
                )}
                {form.status === 'POSTPONED' && (
                    <div className="mt-1.5">
                        <label className="block text-[11px] text-slate-600 mb-0.5">เลื่อนไปวันที่</label>
                        <input
                            type="date"
                            value={form.postponed_date || ''}
                            onChange={(e) => onPatch({ postponed_date: e.target.value || null })}
                            className="px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                    </div>
                )}
            </div>

            {/* Assignee */}
            <div className="relative">
                <label className="block text-[11px] text-slate-600 mb-1">ผู้รับผิดชอบ</label>
                <button
                    type="button"
                    onClick={() => setAssigneeOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-2 py-1.5 border border-slate-300 rounded text-xs text-left bg-white hover:border-slate-400"
                >
                    <span className={form.assignee_id ? 'text-slate-900' : 'text-slate-400'}>
                        {selectedLabel}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
                                        className="w-full pl-7 pr-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                        {!form.assignee_id && <Check className="w-3 h-3 text-blue-600" />}
                                    </div>
                                    <span className="text-slate-500">ไม่ระบุ</span>
                                </button>
                                {filteredEmployees.length === 0 ? (
                                    <div className="py-4 text-center text-[11px] text-slate-500">ไม่พบรายการ</div>
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
                                                    isSelected ? 'bg-blue-50/50' : ''
                                                }`}
                                            >
                                                <div className="w-3.5">
                                                    {isSelected && <Check className="w-3 h-3 text-blue-600" />}
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

            {/* Role */}
            <div>
                <label className="block text-[11px] text-slate-600 mb-1">บทบาท</label>
                <div className="flex flex-wrap gap-1">
                    {ROLE_OPTIONS.map((r) => (
                        <button
                            key={r.value}
                            type="button"
                            onClick={() => onPatch({ assignee_role: r.value })}
                            className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                                form.assignee_role === r.value
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Milestone (combobox, optional) */}
            <div className="relative">
                <label className="block text-[11px] text-slate-600 mb-1">
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

            {/* Note */}
            <div>
                <label className="block text-[11px] text-slate-600 mb-1">รายละเอียด</label>
                <textarea
                    value={form.note}
                    onChange={(e) => onPatch({ note: e.target.value })}
                    rows={2}
                    placeholder="ใส่รายละเอียดงาน..."
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Color + Icon */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[11px] text-slate-600 mb-1">สี</label>
                    <div className="flex flex-wrap gap-1">
                        {COLOR_PRESETS.map((c) => (
                            <button
                                key={c.value}
                                type="button"
                                onClick={() => onPatch({ color: c.value })}
                                className={`w-5 h-5 rounded-full border-2 transition-transform ${
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
                    <label className="block text-[11px] text-slate-600 mb-1">ไอคอน</label>
                    <div className="flex flex-wrap gap-1">
                        <button
                            type="button"
                            onClick={() => onPatch({ icon: null })}
                            className={`h-6 px-1.5 rounded border flex items-center justify-center text-[9px] ${
                                !form.icon
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 text-slate-400 hover:border-slate-300'
                            }`}
                            title="ไม่มี"
                        >
                            -
                        </button>
                        {ICON_OPTIONS.map((opt) => {
                            const Icon = opt.Icon
                            const selected = form.icon === opt.name
                            return (
                                <button
                                    key={opt.name}
                                    type="button"
                                    onClick={() => onPatch({ icon: opt.name })}
                                    className={`h-6 w-6 rounded border flex items-center justify-center transition-colors ${
                                        selected
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                    title={opt.label}
                                >
                                    <Icon
                                        className="w-3 h-3"
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
