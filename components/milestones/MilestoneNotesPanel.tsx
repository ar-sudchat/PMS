'use client'

import { useState, useEffect, useCallback } from 'react'
import { StickyNote, AlertTriangle, CheckCircle2, Plus, Trash2, Loader2, MessageSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import type { MilestoneNote } from '@/types/project'
import {
    getMilestoneNotes,
    createMilestoneNote,
    deleteMilestoneNote,
    resolveMilestoneIssue
} from '@/lib/actions/milestone-note-actions'

interface MilestoneNotesPanelProps {
    projectId: string
    milestoneId?: string
    milestoneName?: string
}

const NOTE_TYPE_CONFIG = {
    NOTE: { label: 'บันทึก', color: 'bg-blue-100 text-blue-700', icon: StickyNote },
    ISSUE: { label: 'ปัญหา', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
    RESOLUTION: { label: 'แก้ไข', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
}

const PRIORITY_CONFIG = {
    LOW: { label: 'ต่ำ', color: 'bg-slate-100 text-slate-600' },
    NORMAL: { label: 'ปกติ', color: 'bg-blue-50 text-blue-600' },
    HIGH: { label: 'สูง', color: 'bg-amber-100 text-amber-700' },
    CRITICAL: { label: 'วิกฤต', color: 'bg-red-100 text-red-700' },
}

export function MilestoneNotesPanel({ projectId, milestoneId, milestoneName }: MilestoneNotesPanelProps) {
    const [notes, setNotes] = useState<MilestoneNote[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [filterType, setFilterType] = useState<string>('ALL')

    // New note form
    const [newNote, setNewNote] = useState({
        note_type: 'NOTE' as 'NOTE' | 'ISSUE' | 'RESOLUTION',
        priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL',
        content: ''
    })

    const loadNotes = useCallback(async () => {
        setLoading(true)
        const res = await getMilestoneNotes(projectId, milestoneId)
        if (res.success) setNotes(res.data)
        setLoading(false)
    }, [projectId, milestoneId])

    useEffect(() => {
        loadNotes()
    }, [loadNotes])

    const handleCreate = async () => {
        if (!newNote.content.trim()) return
        setSaving(true)
        const res = await createMilestoneNote({
            project_id: projectId,
            milestone_id: milestoneId || null,
            note_type: newNote.note_type,
            priority: newNote.priority,
            content: newNote.content.trim()
        })
        if (res.success) {
            setNewNote({ note_type: 'NOTE', priority: 'NORMAL', content: '' })
            setShowForm(false)
            await loadNotes()
        }
        setSaving(false)
    }

    const handleDelete = async (noteId: string) => {
        await deleteMilestoneNote(noteId)
        await loadNotes()
    }

    const handleResolve = async (noteId: string) => {
        await resolveMilestoneIssue(noteId)
        await loadNotes()
    }

    const filteredNotes = filterType === 'ALL'
        ? notes
        : notes.filter(n => n.note_type === filterType)

    const issueCount = notes.filter(n => n.note_type === 'ISSUE' && !n.resolved_at).length

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">
                        {milestoneName ? `Notes - ${milestoneName}` : 'Notes & Issues'}
                    </span>
                    {notes.length > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-600 rounded-full">
                            {notes.length}
                        </span>
                    )}
                    {issueCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-600 rounded-full">
                            {issueCount} ปัญหา
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                    {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {showForm ? 'ปิด' : 'เพิ่ม'}
                </button>
            </div>

            {/* New note form */}
            {showForm && (
                <div className="p-3 border-b bg-blue-50/30 space-y-2">
                    <div className="flex gap-2">
                        <select
                            value={newNote.note_type}
                            onChange={(e) => setNewNote(prev => ({ ...prev, note_type: e.target.value as any }))}
                            className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                        >
                            <option value="NOTE">บันทึก</option>
                            <option value="ISSUE">ปัญหา</option>
                            <option value="RESOLUTION">แก้ไข</option>
                        </select>
                        <select
                            value={newNote.priority}
                            onChange={(e) => setNewNote(prev => ({ ...prev, priority: e.target.value as any }))}
                            className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                        >
                            <option value="LOW">ต่ำ</option>
                            <option value="NORMAL">ปกติ</option>
                            <option value="HIGH">สูง</option>
                            <option value="CRITICAL">วิกฤต</option>
                        </select>
                    </div>
                    <textarea
                        value={newNote.content}
                        onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="เขียนบันทึก..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={handleCreate}
                            disabled={!newNote.content.trim() || saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                            บันทึก
                        </button>
                    </div>
                </div>
            )}

            {/* Filter tabs */}
            {notes.length > 0 && (
                <div className="flex gap-1 px-3 py-2 border-b">
                    {[
                        { key: 'ALL', label: 'ทั้งหมด' },
                        { key: 'NOTE', label: 'บันทึก' },
                        { key: 'ISSUE', label: 'ปัญหา' },
                        { key: 'RESOLUTION', label: 'แก้ไข' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilterType(tab.key)}
                            className={cn(
                                "px-2 py-1 text-[11px] rounded-md transition-colors",
                                filterType === tab.key
                                    ? "bg-slate-200 text-slate-800 font-medium"
                                    : "text-slate-500 hover:bg-slate-100"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                        <span className="text-sm">ยังไม่มีบันทึก</span>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredNotes.map((note) => {
                            const typeConfig = NOTE_TYPE_CONFIG[note.note_type] || NOTE_TYPE_CONFIG.NOTE
                            const priorityConfig = PRIORITY_CONFIG[note.priority] || PRIORITY_CONFIG.NORMAL
                            const TypeIcon = typeConfig.icon
                            const isResolved = note.note_type === 'ISSUE' && !!note.resolved_at

                            return (
                                <div key={note.id} className={cn(
                                    "px-4 py-3 hover:bg-slate-50/50 transition-colors group",
                                    isResolved && "opacity-60"
                                )}>
                                    <div className="flex items-start gap-2.5">
                                        {/* Icon */}
                                        <div className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                                            typeConfig.color
                                        )}>
                                            <TypeIcon className="w-3.5 h-3.5" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className={cn("px-1.5 py-0.5 text-[10px] font-medium rounded", typeConfig.color)}>
                                                    {typeConfig.label}
                                                </span>
                                                {note.priority !== 'NORMAL' && (
                                                    <span className={cn("px-1.5 py-0.5 text-[10px] font-medium rounded", priorityConfig.color)}>
                                                        {priorityConfig.label}
                                                    </span>
                                                )}
                                                {isResolved && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-100 text-emerald-700">
                                                        แก้ไขแล้ว
                                                    </span>
                                                )}
                                                {note.milestone_name && !milestoneId && (
                                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-500">
                                                        {note.milestone_name}
                                                    </span>
                                                )}
                                            </div>

                                            <p className={cn("text-sm text-slate-700 whitespace-pre-wrap", isResolved && "line-through")}>
                                                {note.content}
                                            </p>

                                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                                                <span>{note.created_by_name}</span>
                                                <span>{formatDateTime(note.created_at)}</span>
                                                {isResolved && note.resolved_by_name && (
                                                    <span className="text-emerald-500">
                                                        แก้ไขโดย {note.resolved_by_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            {note.note_type === 'ISSUE' && !isResolved && (
                                                <button
                                                    onClick={() => handleResolve(note.id)}
                                                    className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                                                    title="แก้ไขปัญหาแล้ว"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(note.id)}
                                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                title="ลบ"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

function formatDateTime(dateStr: string) {
    try {
        return format(new Date(dateStr), 'd MMM yy HH:mm', { locale: th })
    } catch {
        return dateStr
    }
}
