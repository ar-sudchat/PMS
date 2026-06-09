'use client'

import * as React from 'react'
import { X, Inbox, Calendar, ChevronRight } from 'lucide-react'
import { UnscheduledEntry, getUnscheduledTrackingEntries, setTrackingEntryDate } from '@/lib/actions/team-tracking-actions'

interface Props {
    open: boolean
    onClose: () => void
    /** Refresh callback — host reloads the daily grid after a date is assigned. */
    onChanged: () => void
}

function clean(raw: string, max = 80): string {
    if (!raw) return ''
    const noTags = raw.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    const cleaned = noTags.replace(/\s+/g, ' ').trim()
    return cleaned.length > max ? cleaned.slice(0, max).trim() + '…' : cleaned
}

/**
 * "งานยังไม่ระบุวัน" pane — lists action-plan templates with entry_date IS NULL.
 * Each row has an inline date picker so the PM can schedule one at a time without
 * opening the full tracking-cell dialog.
 */
export function UnscheduledPane({ open, onClose, onChanged }: Props) {
    const [items, setItems] = React.useState<UnscheduledEntry[]>([])
    const [loading, setLoading] = React.useState(false)
    const [savingId, setSavingId] = React.useState<string | null>(null)

    const load = React.useCallback(async () => {
        setLoading(true)
        const r = await getUnscheduledTrackingEntries()
        if (r.success) setItems(r.data)
        setLoading(false)
    }, [])

    React.useEffect(() => {
        if (open) load()
    }, [open, load])

    // Group by project for scan-ability — declared BEFORE any early return so React's
    // hooks ordering stays consistent across renders.
    const byProject = React.useMemo(() => {
        const map = new Map<string, { code: string; name: string; items: UnscheduledEntry[] }>()
        for (const it of items) {
            if (!map.has(it.project_id)) map.set(it.project_id, { code: it.project_code, name: it.project_name, items: [] })
            map.get(it.project_id)!.items.push(it)
        }
        return Array.from(map.values())
    }, [items])

    if (!open) return null

    const handleAssignDate = async (id: string, date: string) => {
        if (!date) return
        setSavingId(id)
        const r = await setTrackingEntryDate(id, date)
        setSavingId(null)
        if (r.success) {
            setItems(prev => prev.filter(i => i.id !== id))   // row leaves the unscheduled list
            onChanged()
        } else {
            alert('บันทึกไม่สำเร็จ: ' + (r.error || ''))
        }
    }

    return (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3 bg-indigo-50/60">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
                        <Inbox className="w-5 h-5 text-indigo-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-bold text-slate-800">งานยังไม่ระบุวัน</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            มี <b className="text-indigo-700">{items.length}</b> รายการรอกำหนดวันที่ — ใส่วันที่ในแต่ละบรรทัดเพื่อย้ายเข้าตาราง
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500" title="ปิด">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {loading ? (
                        <div className="p-8 text-center text-xs text-slate-500">กำลังโหลด...</div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500">ไม่มีงานรอกำหนดวัน</div>
                    ) : (
                        byProject.map(g => (
                            <div key={g.code} className="border-b border-slate-200">
                                <div className="sticky top-0 z-10 px-4 py-2 bg-slate-100 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-indigo-700 text-xs">{g.code}</span>
                                        <span className="text-xs text-slate-700 truncate">{g.name}</span>
                                        <span className="ml-auto text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                            {g.items.length}
                                        </span>
                                    </div>
                                </div>
                                <ul className="divide-y divide-slate-100">
                                    {g.items.map(it => (
                                        <li key={it.id} className="px-4 py-2.5 hover:bg-indigo-50/30 flex items-center gap-3">
                                            {/* Milestone color strip */}
                                            <span
                                                className="w-1 self-stretch rounded-full shrink-0"
                                                style={{ background: it.milestone_color || '#cbd5e1' }}
                                                title={it.milestone_name || ''}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-slate-800 truncate" title={it.note}>
                                                    {clean(it.note, 90) || <span className="italic text-slate-400">ไม่มีรายละเอียด</span>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                                                    <span>{it.assignee_name || 'ไม่ระบุคน'}</span>
                                                    {it.milestone_name && <><span>·</span><span>{it.milestone_name}</span></>}
                                                </div>
                                            </div>
                                            <div className="inline-flex items-center gap-1 shrink-0">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                <input
                                                    type="date"
                                                    disabled={savingId === it.id}
                                                    onChange={(e) => handleAssignDate(it.id, e.target.value)}
                                                    className="px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                                                />
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-200 text-[11px] text-slate-500 bg-white">
                    เลือกวันที่ในแต่ละแถวเพื่อกำหนดวัน — รายการจะหายจากที่นี่ทันทีหลังบันทึก
                </div>
            </div>
        </div>
    )
}
