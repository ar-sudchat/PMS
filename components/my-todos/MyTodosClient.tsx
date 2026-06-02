'use client'

import * as React from 'react'
import { Plus, Check, Trash2, AlertTriangle, Clock, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    getMyPersonalTodos,
    createPersonalTodo,
    updatePersonalTodo,
    markPersonalTodoDone,
    deletePersonalTodo,
    type PersonalTodo,
} from '@/lib/actions/personal-todos-actions'

function todayISO(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function thShortDate(iso: string | null): string {
    if (!iso) return 'ไม่มีกำหนด'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return 'ไม่มีกำหนด'
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

type FilterMode = 'open' | 'today' | 'overdue' | 'done' | 'all'

export function MyTodosClient() {
    const [todos, setTodos] = React.useState<PersonalTodo[]>([])
    const [loading, setLoading] = React.useState(true)
    const [filter, setFilter] = React.useState<FilterMode>('open')

    // Add form
    const [newTitle, setNewTitle] = React.useState('')
    const [newDue, setNewDue] = React.useState<string>(todayISO())
    const [submitting, setSubmitting] = React.useState(false)

    // Edit state
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [editTitle, setEditTitle] = React.useState('')
    const [editDue, setEditDue] = React.useState<string>('')

    // Optimistic marking
    const [marking, setMarking] = React.useState<Set<string>>(new Set())

    const load = React.useCallback(async () => {
        setLoading(true)
        // Always fetch ALL (done + open); filter on the client so toggles are instant
        const res = await getMyPersonalTodos({ includeDone: true })
        if (res.success) setTodos(res.data)
        setLoading(false)
    }, [])

    React.useEffect(() => { load() }, [load])

    const today = todayISO()
    const visible = React.useMemo(() => {
        return todos.filter(t => {
            const dleft = daysUntil(t.due_date)
            switch (filter) {
                case 'open':    return t.status !== 'DONE'
                case 'today':   return t.status !== 'DONE' && t.due_date === today
                case 'overdue': return t.status !== 'DONE' && dleft !== null && dleft < 0
                case 'done':    return t.status === 'DONE'
                case 'all':     return true
            }
        })
    }, [todos, filter, today])

    // Counts shown on the filter tabs
    const counts = React.useMemo(() => {
        let open = 0, todayCnt = 0, overdue = 0, done = 0
        for (const t of todos) {
            const dleft = daysUntil(t.due_date)
            if (t.status === 'DONE') { done++; continue }
            open++
            if (t.due_date === today) todayCnt++
            if (dleft !== null && dleft < 0) overdue++
        }
        return { open, today: todayCnt, overdue, done, all: todos.length }
    }, [todos, today])

    const handleAdd = async () => {
        if (!newTitle.trim() || submitting) return
        setSubmitting(true)
        const res = await createPersonalTodo({ title: newTitle.trim(), due_date: newDue || null })
        setSubmitting(false)
        if (res.success) {
            setNewTitle('')
            setNewDue(todayISO())
            load()
        } else {
            alert('เพิ่มงานไม่สำเร็จ: ' + (res.error || ''))
        }
    }

    const handleMarkDone = async (id: string) => {
        if (marking.has(id)) return
        setMarking(prev => new Set(prev).add(id))
        // Optimistic: mark as DONE locally
        setTodos(prev => prev.map(t => t.id === id ? { ...t, status: 'DONE', completed_date: today } : t))
        const res = await markPersonalTodoDone(id)
        setMarking(prev => { const next = new Set(prev); next.delete(id); return next })
        if (!res.success) {
            alert('บันทึกสถานะไม่สำเร็จ: ' + (res.error || ''))
            load()  // Revert from server truth
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('ลบงานนี้?')) return
        // Optimistic
        setTodos(prev => prev.filter(t => t.id !== id))
        const res = await deletePersonalTodo(id)
        if (!res.success) {
            alert('ลบไม่สำเร็จ: ' + (res.error || ''))
            load()
        }
    }

    const startEdit = (t: PersonalTodo) => {
        setEditingId(t.id)
        setEditTitle(t.title)
        setEditDue(t.due_date || '')
    }
    const cancelEdit = () => {
        setEditingId(null)
        setEditTitle('')
        setEditDue('')
    }
    const saveEdit = async () => {
        if (!editingId || !editTitle.trim()) return
        const id = editingId
        const newT = editTitle.trim()
        const newD = editDue || null
        // Optimistic
        setTodos(prev => prev.map(t => t.id === id ? { ...t, title: newT, due_date: newD } : t))
        cancelEdit()
        const res = await updatePersonalTodo(id, { title: newT, due_date: newD })
        if (!res.success) {
            alert('แก้ไขไม่สำเร็จ: ' + (res.error || ''))
            load()
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">ToDo ของฉัน</h1>
                <p className="text-sm text-slate-500 mt-1">รายการงานส่วนตัว — เห็นเฉพาะคุณคนเดียว</p>
            </div>

            {/* Add form — always visible, hero placement */}
            <div className="bg-white border-2 border-indigo-200 rounded-xl p-4 mb-4 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                    <Plus className="w-5 h-5 text-indigo-600 shrink-0" />
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                        placeholder="เพิ่มงานใหม่ที่ต้องทำ..."
                        className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-colors"
                    />
                    <input
                        type="date"
                        value={newDue}
                        onChange={(e) => setNewDue(e.target.value)}
                        className="px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-medium bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={!newTitle.trim() || submitting}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        {submitting ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 mb-4 overflow-x-auto">
                <FilterPill active={filter === 'open'}    onClick={() => setFilter('open')}    label="ยังต้องทำ"      count={counts.open} />
                <FilterPill active={filter === 'today'}   onClick={() => setFilter('today')}   label="วันนี้"          count={counts.today} />
                <FilterPill active={filter === 'overdue'} onClick={() => setFilter('overdue')} label="เลยกำหนด"     count={counts.overdue} accent="red" />
                <FilterPill active={filter === 'done'}    onClick={() => setFilter('done')}    label="เสร็จแล้ว"      count={counts.done} accent="green" />
                <FilterPill active={filter === 'all'}     onClick={() => setFilter('all')}     label="ทั้งหมด"         count={counts.all} />
            </div>

            {/* List */}
            {loading && todos.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">กำลังโหลด...</div>
            ) : visible.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-xl border border-slate-200">
                    <div className="text-5xl mb-3">
                        {filter === 'overdue' || filter === 'today' ? '✨' : '🎉'}
                    </div>
                    <div className="text-sm text-slate-500">
                        {filter === 'open'    && 'ไม่มีงานค้าง — ลองเพิ่มงานใหม่ดูสิ'}
                        {filter === 'today'   && 'วันนี้ยังไม่มีอะไรต้องทำ'}
                        {filter === 'overdue' && 'ไม่มีงานเลยกำหนดเลย'}
                        {filter === 'done'    && 'ยังไม่มีงานที่เสร็จ'}
                        {filter === 'all'     && 'ยังไม่มีงานเลย'}
                    </div>
                </div>
            ) : (
                <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
                    {visible.map(t => (
                        <TodoItem
                            key={t.id}
                            todo={t}
                            isEditing={editingId === t.id}
                            editTitle={editTitle}
                            editDue={editDue}
                            isMarking={marking.has(t.id)}
                            onEditTitleChange={setEditTitle}
                            onEditDueChange={setEditDue}
                            onStartEdit={() => startEdit(t)}
                            onCancelEdit={cancelEdit}
                            onSaveEdit={saveEdit}
                            onMarkDone={() => handleMarkDone(t.id)}
                            onDelete={() => handleDelete(t.id)}
                        />
                    ))}
                </ul>
            )}
        </div>
    )
}

function FilterPill({
    active, onClick, label, count, accent,
}: {
    active: boolean
    onClick: () => void
    label: string
    count: number
    accent?: 'red' | 'green'
}) {
    const accentBg = accent === 'red' ? 'bg-red-600' : accent === 'green' ? 'bg-emerald-600' : 'bg-indigo-600'
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                active
                    ? `${accentBg} text-white`
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
        >
            {label}
            <span className={cn(
                "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
                active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
            )}>
                {count}
            </span>
        </button>
    )
}

function TodoItem({
    todo, isEditing, editTitle, editDue, isMarking,
    onEditTitleChange, onEditDueChange,
    onStartEdit, onCancelEdit, onSaveEdit,
    onMarkDone, onDelete,
}: {
    todo: PersonalTodo
    isEditing: boolean
    editTitle: string
    editDue: string
    isMarking: boolean
    onEditTitleChange: (v: string) => void
    onEditDueChange: (v: string) => void
    onStartEdit: () => void
    onCancelEdit: () => void
    onSaveEdit: () => void
    onMarkDone: () => void
    onDelete: () => void
}) {
    const isDone = todo.status === 'DONE'
    const effectiveDate = isDone ? todo.completed_date : todo.due_date
    const dLeft = daysUntil(effectiveDate)

    let dueClass = 'bg-slate-100 text-slate-600 border border-slate-200'
    let dueText = thShortDate(effectiveDate)
    if (isDone) {
        dueClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        dueText = `เสร็จ · ${dueText}`
    } else if (dLeft !== null) {
        if (dLeft < 0) {
            dueClass = 'bg-red-50 text-red-700 border border-red-200'
            dueText = `เลย ${Math.abs(dLeft)} วัน`
        } else if (dLeft === 0) {
            dueClass = 'bg-amber-50 text-amber-700 border border-amber-200'
            dueText = 'วันนี้'
        } else if (dLeft <= 3) {
            dueClass = 'bg-amber-50 text-amber-700 border border-amber-200'
            dueText = `อีก ${dLeft} วัน`
        } else {
            dueClass = 'bg-slate-50 text-slate-600 border border-slate-200'
            dueText = `อีก ${dLeft} วัน`
        }
    }

    if (isEditing) {
        return (
            <li className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50/40">
                <div className="w-6 h-6 shrink-0" />
                <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => onEditTitleChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onSaveEdit()
                        if (e.key === 'Escape') onCancelEdit()
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 border border-slate-300 rounded-md text-sm bg-white focus:border-indigo-500 outline-none"
                />
                <input
                    type="date"
                    value={editDue}
                    onChange={(e) => onEditDueChange(e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded-md text-xs bg-white focus:border-indigo-500 outline-none"
                />
                <button
                    type="button"
                    onClick={onSaveEdit}
                    className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                >
                    บันทึก
                </button>
                <button
                    type="button"
                    onClick={onCancelEdit}
                    className="p-1 rounded-md text-slate-500 hover:bg-slate-200"
                    title="ยกเลิก"
                >
                    <X className="w-4 h-4" />
                </button>
            </li>
        )
    }

    return (
        <li className={cn(
            "flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50/30 transition-colors group",
            isMarking && "opacity-40 pointer-events-none",
            isDone && "bg-emerald-50/20"
        )}>
            {/* Checkbox */}
            {isDone ? (
                <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-emerald-500 text-white flex items-center justify-center shrink-0" title="เสร็จแล้ว">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onMarkDone}
                    className={cn(
                        "w-6 h-6 rounded-full border-2 border-slate-300 text-transparent shrink-0 flex items-center justify-center transition-all",
                        "hover:scale-110 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600",
                        dLeft !== null && dLeft < 0 && "border-red-400"
                    )}
                    title="ทำเสร็จแล้ว"
                >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
            )}

            {/* Title */}
            <div className={cn(
                "flex-1 min-w-0 text-sm cursor-text",
                isDone ? "text-slate-400 line-through" : "text-slate-800"
            )}
                 onDoubleClick={onStartEdit}
                 title="ดับเบิลคลิกเพื่อแก้ไข">
                {todo.title}
            </div>

            {/* Due chip */}
            <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap shrink-0",
                dueClass
            )}>
                {!isDone && dLeft !== null && dLeft < 0 ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {dueText}
            </span>

            {/* Hover actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isDone && (
                    <button
                        type="button"
                        onClick={onStartEdit}
                        className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        title="แก้ไข"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={onDelete}
                    className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="ลบ"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </li>
    )
}
