'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, Clock, CalendarClock, Check, Plus, Trash2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssigneeBucket, TodoTask } from '@/lib/actions/gantt-overview-actions'

interface Props {
    buckets: AssigneeBucket[]
    isLoading: boolean
    /** Date filter (ISO yyyy-MM-dd). Empty string = no date filter (show everything). */
    date: string
    onDateChange: (date: string) => void
    /** If true, include completed (DONE) entries — useful for reviewing what was done. */
    includeDone: boolean
    onIncludeDoneChange: (b: boolean) => void
    /** Click handler — when supplied, project_code becomes a button that opens
     *  the Edit Project modal in-place (same wiring as the Gantt/Daily tabs). */
    onProjectClick?: (projectId: string) => void
    /** Called when the user ticks a task as done. Parent passes either
     *  markTrackingEntryDone or markPersonalTodoDone based on task.is_personal. */
    onMarkDone?: (task: TodoTask) => Promise<void> | void
    /** Create a new personal todo for the current user. */
    onCreatePersonal?: (input: { title: string; due_date: string | null }) => Promise<void> | void
    /** Delete a personal todo (only meaningful when task.is_personal). */
    onDeletePersonal?: (taskId: string) => Promise<void> | void
}

function todayISO(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function shiftIso(iso: string, days: number): string {
    const d = iso ? new Date(iso) : new Date()
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ============================================================
// HTML sanitization — entries are saved as rich text (lists, bold, color),
// so we render them as HTML but strip anything that could execute script.
// Allow-list of safe tags + safe attrs only.
// ============================================================
const ALLOWED_TAGS = /^(ul|ol|li|br|b|strong|i|em|u|p|span|font|div)$/i
const ALLOWED_ATTRS = /^(color|style)$/i
function sanitizeHtml(html: string): string {
    if (!html) return ''
    // Drop entire <script>/<style>/<iframe> blocks (with contents)
    let out = html.replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, '')
    // Strip on*="..." event handlers and javascript: URLs
    out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    out = out.replace(/javascript:/gi, '')
    // Walk each tag and drop disallowed ones
    out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (m, tag, attrs) => {
        if (!ALLOWED_TAGS.test(tag)) return ''
        // Inside attrs, keep only allow-listed attribute names
        const cleanedAttrs = attrs.replace(/\s([a-zA-Z-]+)\s*=\s*("[^"]*"|'[^']*'|\S+)/g, (mm: string, name: string) => {
            return ALLOWED_ATTRS.test(name) ? mm : ''
        })
        return m.startsWith('</') ? `</${tag}>` : `<${tag}${cleanedAttrs}>`
    })
    return out
}

function thShortDate(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    return `${d.getDate()} ${months[d.getMonth()]}`
}

function daysUntil(iso: string | null): number | null {
    if (!iso) return null
    const due = new Date(iso)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)
    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function initials(name: string): string {
    const t = name.trim()
    if (!t) return '—'
    return t.charAt(0)
}

// Hash a name to a stable pastel color for the avatar
function avatarColor(name: string): string {
    const palette = ['#fda4af', '#fcd34d', '#86efac', '#7dd3fc', '#c4b5fd', '#f9a8d4', '#fed7aa', '#a5f3fc']
    let h = 0
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
    return palette[Math.abs(h) % palette.length]
}

export function TasksByAssigneeView({
    buckets, isLoading, date, onDateChange, includeDone, onIncludeDoneChange,
    onProjectClick, onMarkDone, onCreatePersonal, onDeletePersonal,
}: Props) {
    const today = todayISO()
    const [showAddForm, setShowAddForm] = React.useState(false)
    const [newTitle, setNewTitle] = React.useState('')
    const [newDue, setNewDue] = React.useState<string>(today)
    const [submitting, setSubmitting] = React.useState(false)

    const handleAdd = async () => {
        if (!onCreatePersonal || !newTitle.trim() || submitting) return
        setSubmitting(true)
        try {
            await onCreatePersonal({ title: newTitle.trim(), due_date: newDue || null })
            setNewTitle('')
            setNewDue(today)
            setShowAddForm(false)
        } finally {
            setSubmitting(false)
        }
    }
    const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
    // Optimistic UI: fade out + hide rows while the server call is in flight
    const [marking, setMarking] = React.useState<Set<string>>(new Set())

    const toggle = (key: string) => {
        setCollapsed(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const handleMarkDone = async (task: TodoTask) => {
        if (!onMarkDone || marking.has(task.id)) return
        setMarking(prev => new Set(prev).add(task.id))
        try {
            await onMarkDone(task)
        } finally {
            setMarking(prev => {
                const next = new Set(prev)
                next.delete(task.id)
                return next
            })
        }
    }

    return (
        <div className="p-4 space-y-3 max-w-6xl mx-auto">
            {/* Scoped styling for rich-text notes — bullets, spacing, color. */}
            <style dangerouslySetInnerHTML={{ __html: `
                .todo-note ul { list-style: disc inside; margin: 0; padding: 0; }
                .todo-note ol { list-style: decimal inside; margin: 0; padding: 0; }
                .todo-note li { margin: 0; line-height: 1.45; }
                .todo-note p { margin: 0; }
                .todo-note b, .todo-note strong { font-weight: 600; }
                .todo-note u { text-decoration: underline; }
            ` }} />

            {/* Filter bar — date picker + quick chips + DONE toggle */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2 flex-wrap shadow-sm">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onDateChange(shiftIso(date || today, -1))}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                        title="วันก่อนหน้า"
                    >
                        ◀
                    </button>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:border-indigo-500 outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => onDateChange(shiftIso(date || today, 1))}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                        title="วันถัดไป"
                    >
                        ▶
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onDateChange(today)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                            date === today
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                    >
                        วันนี้
                    </button>
                    <button
                        type="button"
                        onClick={() => onDateChange(shiftIso(today, 1))}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                            date === shiftIso(today, 1)
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                    >
                        พรุ่งนี้
                    </button>
                    <button
                        type="button"
                        onClick={() => onDateChange('')}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                            date === ''
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                        title="แสดงทุกวัน"
                    >
                        ทั้งหมด
                    </button>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={includeDone}
                            onChange={(e) => onIncludeDoneChange(e.target.checked)}
                            className="w-4 h-4 rounded accent-emerald-600"
                        />
                        <span className="text-xs font-medium text-slate-700">แสดงงานที่เสร็จแล้ว</span>
                    </label>
                    {onCreatePersonal && (
                        <button
                            type="button"
                            onClick={() => setShowAddForm(v => !v)}
                            className={cn(
                                "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors",
                                showAddForm
                                    ? "bg-slate-100 text-slate-700 border-slate-300"
                                    : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                            )}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            เพิ่มงานของฉัน
                        </button>
                    )}
                </div>
            </div>

            {/* Inline add form for personal todos */}
            {showAddForm && onCreatePersonal && (
                <div className="bg-indigo-50/40 border-2 border-indigo-200 border-dashed rounded-xl p-3 flex items-center gap-2 flex-wrap shadow-sm">
                    <User className="w-4 h-4 text-indigo-600 shrink-0" />
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                        placeholder="งานที่ต้องทำของฉัน..."
                        autoFocus
                        className="flex-1 min-w-[200px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:border-indigo-500 outline-none"
                    />
                    <input
                        type="date"
                        value={newDue}
                        onChange={(e) => setNewDue(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:border-indigo-500 outline-none"
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={!newTitle.trim() || submitting}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'กำลังเพิ่ม...' : 'บันทึก'}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setShowAddForm(false); setNewTitle('') }}
                        className="px-3 py-1.5 rounded-lg bg-white text-slate-600 text-xs font-medium border border-slate-300 hover:bg-slate-50"
                    >
                        ยกเลิก
                    </button>
                </div>
            )}

            {isLoading && buckets.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">กำลังโหลด...</div>
            ) : !isLoading && buckets.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-xl border border-slate-200">
                    <div className="text-5xl mb-3">🎉</div>
                    <div className="text-sm text-slate-500">
                        {date
                            ? `ไม่มีงาน${includeDone ? '' : 'ค้าง'}ของวันที่ ${date} ตามฟิลเตอร์`
                            : 'ไม่มีงานค้างของใครเลย ตามฟิลเตอร์ที่เลือก'}
                    </div>
                </div>
            ) : null}
            {buckets.map((b) => {
                const key = b.assignee_id || '__unassigned__'
                const isCollapsed = collapsed.has(key)
                const ac = avatarColor(b.assignee_name)
                return (
                    <section key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Person header */}
                        <button
                            type="button"
                            onClick={() => toggle(key)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100"
                        >
                            {isCollapsed
                                ? <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-slate-900 shrink-0 shadow-inner"
                                style={{ background: ac }}
                            >
                                {initials(b.assignee_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                                    {b.assignee_name}
                                    {b.assignee_nickname && (
                                        <span className="text-xs font-normal text-slate-400">({b.assignee_nickname})</span>
                                    )}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                    {b.task_count} งานที่ยังต้องทำ
                                    {b.overdue_count > 0 && (
                                        <> · <span className="text-red-600 font-semibold">เลยกำหนด {b.overdue_count}</span></>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {b.overdue_count > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                        <AlertTriangle className="w-3 h-3" />
                                        {b.overdue_count}
                                    </span>
                                )}
                                <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {b.task_count}
                                </span>
                            </div>
                        </button>

                        {/* Tasks */}
                        {!isCollapsed && (
                            <ul className="divide-y divide-slate-100">
                                {b.tasks.map(t => (
                                    <TaskRow
                                        key={t.id}
                                        task={t}
                                        onProjectClick={onProjectClick}
                                        onMarkDone={onMarkDone ? () => handleMarkDone(t) : undefined}
                                        onDelete={t.is_personal && onDeletePersonal ? () => onDeletePersonal(t.id) : undefined}
                                        isMarking={marking.has(t.id)}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>
                )
            })}
        </div>
    )
}

function TaskRow({
    task, onProjectClick, onMarkDone, onDelete, isMarking,
}: {
    task: TodoTask
    onProjectClick?: (id: string) => void
    onMarkDone?: () => void
    onDelete?: () => void
    isMarking: boolean
}) {
    const dLeft = daysUntil(task.due_date)
    const ptColor = task.project_type_color || '#64748b'
    // Color tint: prefer milestone color, otherwise the manually-picked entry color
    const tint = task.milestone_color || task.color || '#6366f1'

    const isPostponed = task.status === 'POSTPONED'
    const isDone = task.status === 'DONE'

    let dueClass = 'bg-slate-100 text-slate-600 border border-slate-200'
    let dueText = thShortDate(task.due_date)
    if (isDone) {
        dueClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        dueText = `เสร็จ · ${dueText}`
    } else if (dLeft !== null) {
        if (dLeft < 0) {
            dueClass = 'bg-red-50 text-red-700 border border-red-200'
            dueText = `เลย ${Math.abs(dLeft)} วัน · ${dueText}`
        } else if (dLeft === 0) {
            dueClass = 'bg-amber-50 text-amber-700 border border-amber-200'
            dueText = `วันนี้ · ${dueText}`
        } else if (dLeft <= 3) {
            dueClass = 'bg-amber-50 text-amber-700 border border-amber-200'
            dueText = `อีก ${dLeft} วัน · ${dueText}`
        } else {
            dueClass = 'bg-slate-50 text-slate-600 border border-slate-200'
            dueText = `อีก ${dLeft} วัน · ${dueText}`
        }
    }
    const sanitized = React.useMemo(() => sanitizeHtml(task.title), [task.title])

    return (
        <li className={cn(
            "flex items-start gap-3 px-4 py-2.5 hover:bg-indigo-50/40 transition-all",
            isMarking && "opacity-40 pointer-events-none",
            isDone && "bg-emerald-50/30"
        )}>
            {/* Left: tick-to-done checkbox (interactive). Already DONE → solid green check. */}
            {isDone ? (
                <div
                    className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-emerald-500 border-2 border-emerald-500 text-white"
                    title="เสร็จแล้ว"
                >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onMarkDone}
                    disabled={!onMarkDone || isMarking}
                    className={cn(
                        "mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                        "hover:scale-110 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600",
                        onMarkDone ? "cursor-pointer text-transparent hover:text-emerald-600" : "cursor-default",
                    )}
                    style={{ borderColor: `${tint}80` }}
                    title="ทำเสร็จแล้ว"
                >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
            )}

            {/* Middle: note + project */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                    {/* Rendered HTML from the daily-tab note (rich text: <ul>/<li>/<font color>/...).
                        Scoped style block below gives bullets + tight spacing without needing
                        the Tailwind typography plugin. */}
                    <div
                        className={cn(
                            "todo-note text-sm leading-snug",
                            isDone ? "text-slate-400 line-through" : "text-slate-800"
                        )}
                        dangerouslySetInnerHTML={{ __html: sanitized }}
                    />
                    {isPostponed && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            <CalendarClock className="w-2.5 h-2.5" />
                            เลื่อนแผน
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
                    {task.is_personal ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                            <User className="w-2.5 h-2.5" />
                            งานส่วนตัว
                        </span>
                    ) : (
                        <>
                            {onProjectClick && task.project_id ? (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onProjectClick(task.project_id!) }}
                                    className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                    title={task.project_name || ''}
                                >
                                    {task.project_code}
                                </button>
                            ) : task.project_id ? (
                                <a
                                    href={`/projects/${task.project_id}`}
                                    className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                    title={task.project_name || ''}
                                >
                                    {task.project_code}
                                </a>
                            ) : null}
                            {task.project_name && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span className="truncate max-w-[240px]" title={task.project_name}>{task.project_name}</span>
                                </>
                            )}
                            {task.project_type_code && (
                                <span
                                    className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold"
                                    style={{ background: `${ptColor}15`, color: ptColor, border: `1px solid ${ptColor}30` }}
                                >
                                    {task.project_type_code}
                                </span>
                            )}
                            {task.milestone_name && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span
                                        className="inline-flex items-center gap-1 font-medium"
                                        style={{ color: task.milestone_color || '#64748b' }}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-sm" style={{ background: task.milestone_color || '#94a3b8' }} />
                                        {task.milestone_name}
                                    </span>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Right: due chip + (personal) delete button */}
            <div className="shrink-0 pt-0.5 flex items-center gap-2">
                <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap",
                    dueClass
                )}>
                    <Clock className="w-3 h-3" />
                    {dueText}
                </span>
                {onDelete && (
                    <button
                        type="button"
                        onClick={onDelete}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="ลบงานนี้"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </li>
    )
}
