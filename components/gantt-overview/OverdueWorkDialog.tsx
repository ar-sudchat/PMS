'use client'

import * as React from 'react'
import { AlertTriangle, X, ChevronRight, Clock } from 'lucide-react'
import { OverdueEntry } from '@/lib/actions/team-tracking-actions'
import { cn } from '@/lib/utils'

interface Props {
    open: boolean
    items: OverdueEntry[]
    onClose: () => void
    /** When the user clicks an item, the host can open the TrackingCellDialog
     *  focused on that entry. */
    onOpenItem: (item: OverdueEntry) => void
    /** Optional shortcut — when set, items linked to a Task get a 🕐 Log Time
     *  button that opens the timesheet log-time modal without closing the popup
     *  so the user can keep working through the list. */
    onLogTime?: (taskId: string) => void
}

// Strip HTML + truncate the note for readability in the list.
function clean(raw: string, max = 60): string {
    if (!raw) return ''
    const noTags = raw.replace(/<[^>]*>/g, ' ')
    const decoded = noTags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
    const cleaned = decoded.replace(/\s+/g, ' ').trim()
    return cleaned.length > max ? cleaned.slice(0, max).trim() + '…' : cleaned
}

const thaiDate = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

/**
 * "งานค้าง" popup — auto-shown when the user lands on the gantt overview if there
 * are tracking entries from prior dates that aren't DONE. Lets the PM quickly chase
 * each one (click → opens the TrackingCellDialog focused on that entry).
 */
export function OverdueWorkDialog({ open, items, onClose, onOpenItem, onLogTime }: Props) {
    if (!open) return null

    // Filter by assignee (optional) then sort by days_overdue desc.
    const [assigneeFilter, setAssigneeFilter] = React.useState('')

    // Unique assignees + their counts — drives the dropdown
    const assigneeOptions = React.useMemo(() => {
        const counts = new Map<string, number>()
        for (const it of items) {
            const k = it.assignee_name || 'ไม่ระบุ'
            counts.set(k, (counts.get(k) ?? 0) + 1)
        }
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])    // by count desc
            .map(([name, count]) => ({ name, count }))
    }, [items])

    const sortedItems = React.useMemo(
        () => [...items]
            .filter(it => !assigneeFilter || (it.assignee_name || 'ไม่ระบุ') === assigneeFilter)
            .sort((a, b) => b.days_overdue - a.days_overdue),
        [items, assigneeFilter],
    )

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header — red alarm icon when there's anything overdue */}
                <div className="px-5 py-4 border-b border-slate-200 bg-red-50/60">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center animate-pulse shrink-0">
                            <AlertTriangle className="w-6 h-6 text-red-600" strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-base font-bold text-red-700">⚠️ มีงานค้างก่อนวันนี้</h2>
                            <p className="text-xs text-slate-600 mt-0.5">
                                <b className="text-red-700">{sortedItems.length}</b>
                                {assigneeFilter ? <> / {items.length}</> : null} รายการ ยังไม่อัพเดทสถานะ — เรียงจากค้างนานสุดก่อน
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500" title="ปิด">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Assignee filter — combobox; sorted by count desc */}
                    {assigneeOptions.length > 1 && (
                        <div className="mt-3 flex items-center gap-2">
                            <label className="text-xs text-slate-600 font-semibold whitespace-nowrap">
                                กรองรายคน:
                            </label>
                            <select
                                value={assigneeFilter}
                                onChange={(e) => setAssigneeFilter(e.target.value)}
                                className="flex-1 px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                            >
                                <option value="">ทั้งหมด ({items.length} รายการ)</option>
                                {assigneeOptions.map(o => (
                                    <option key={o.name} value={o.name}>
                                        {o.name} ({o.count})
                                    </option>
                                ))}
                            </select>
                            {assigneeFilter && (
                                <button
                                    type="button"
                                    onClick={() => setAssigneeFilter('')}
                                    className="text-[10px] text-red-600 font-bold hover:underline whitespace-nowrap"
                                    title="ล้างตัวกรอง"
                                >
                                    ล้าง ×
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* List — flat list, sorted by days_overdue desc, big-day-number-first layout */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {sortedItems.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500">ไม่มีงานค้าง — ทุกคนอัพเดทครบ</div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {sortedItems.map((it) => {
                                const sev = it.days_overdue > 7 ? 'red'
                                    : it.days_overdue > 3 ? 'amber'
                                    : 'slate'
                                const sevBadge =
                                    sev === 'red' ? "bg-red-100 text-red-700 border-red-200"
                                    : sev === 'amber' ? "bg-amber-100 text-amber-700 border-amber-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                return (
                                    <li key={it.id}>
                                        <button
                                            type="button"
                                            onClick={() => onOpenItem(it)}
                                            className="w-full text-left px-4 py-3 hover:bg-indigo-50/40 flex items-center gap-3 transition-colors"
                                        >
                                            {/* BIG days-overdue badge — easiest visual cue */}
                                            <div className={cn(
                                                "w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center shrink-0",
                                                sevBadge,
                                            )}>
                                                <span className="text-xl font-extrabold leading-none">{it.days_overdue}</span>
                                                <span className="text-[9px] font-bold tracking-tight mt-0.5">วัน</span>
                                            </div>

                                            {/* Milestone color strip */}
                                            <span
                                                className="w-1 self-stretch rounded-full shrink-0"
                                                style={{ background: it.milestone_color || '#cbd5e1' }}
                                                title={it.milestone_name || ''}
                                            />

                                            <div className="flex-1 min-w-0">
                                                {/* Line 1 — Assignee (the one we'll chase up) */}
                                                <div className="text-sm font-bold text-slate-800 truncate">
                                                    {it.assignee_name}
                                                </div>
                                                {/* Line 2 — Task text */}
                                                <div className="text-xs text-slate-700 truncate mt-0.5" title={it.note}>
                                                    {clean(it.note, 80) || <span className="italic text-slate-400">ไม่มีรายละเอียด</span>}
                                                </div>
                                                {/* Line 3 — Project + date (secondary context) */}
                                                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                                                    <span className="font-mono font-semibold text-indigo-600">{it.project_code}</span>
                                                    <span className="truncate">{it.project_name}</span>
                                                    <span className="text-slate-400">·</span>
                                                    <span>{thaiDate(it.entry_date)}</span>
                                                </div>
                                                {/* Line 4 — Recorder (so PM can chase the right person for context) */}
                                                {it.created_by_name && it.created_by_name !== it.assignee_name && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        บันทึกโดย: <span className="text-slate-600 font-semibold">{it.created_by_name}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Inline Log-Time shortcut for task-linked entries — doesn't close
                                                the popup so the user can keep working through the list. */}
                                            {onLogTime && it.task_id && (
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => {
                                                        e.stopPropagation()    // prevent the row's onOpenItem
                                                        onLogTime(it.task_id!)
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.stopPropagation()
                                                            onLogTime(it.task_id!)
                                                        }
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 shrink-0 mr-1 cursor-pointer"
                                                    title={`Log Time → ${it.task_code || it.task_id}`}
                                                >
                                                    <Clock className="w-3 h-3" />
                                                    Log Time
                                                </span>
                                            )}
                                            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500 bg-white">
                    <span>คลิกรายการเพื่อเปิดและอัพเดทสถานะ</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
    )
}
