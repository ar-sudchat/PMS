'use client'

import { Fragment, useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, Building, ArrowUp, ArrowDown, ArrowUpDown, CheckCircle2, CalendarClock, CornerDownRight, ArrowRight } from 'lucide-react'
import { TrackingEntry } from '@/lib/actions/team-tracking-actions'
import { ICON_MAP } from './icons'
import { cn } from '@/lib/utils'

// A view-level entry tied to a date in the grid.
//   - 'own'      : entry lives at this date (its current/active home)
//   - 'incoming' : was postponed here from another date
//   - 'departed' : originally planned here but moved (postponed or done elsewhere)
type CellEntryKind = 'own' | 'incoming' | 'departed'
interface CellEntry {
    entry: TrackingEntry
    kind: CellEntryKind
}

type SortKey = 'project_code' | 'name' | 'customer_name' | 'project_type_code' | 'owner_name'
type SortDir = 'asc' | 'desc' | null

interface Project {
    id: string
    project_code: string
    name: string
    customer_name: string | null
    project_type_code: string | null
    project_type_color: string | null
    owner_name: string | null
    pm_name: string | null
}

interface Props {
    projects: Project[]
    entries: TrackingEntry[]
    year: number
    month: number   // 1-based
    /** Called when a day cell is clicked. `entryId` is set in task-mode so the
     *  dialog can focus that specific entry (e.g. clicking เกรียงเดช's row opens
     *  เกรียงเดช's entry, not the first one). */
    onCellClick: (projectId: string, date: string, entryId?: string) => void
    isLoading?: boolean
    highlightFilter?: string | null
    /** Optional date range override (yyyy-mm-dd). If both provided, render exactly
     *  those days instead of the full year/month. Useful for "last week + current month"
     *  rolling windows. */
    startDate?: string
    endDate?: string
    /** Hide customer column (default true for backward compat with /team-tracking). */
    showCustomer?: boolean
    /** When provided, รหัส (project_code) becomes clickable and invokes this callback
     *  with the project's id — used to open a project popup from a host page. */
    onProjectClick?: (projectId: string) => void
    /** When provided, ชื่อโครงการ becomes clickable and invokes this callback —
     *  used to open the gantt-chart popup (ProjectDetailPopup) on the host. */
    onProjectNameClick?: (projectId: string) => void
    /** Sub-row grouping mode (default "assignee").
     *  - "assignee": one sub-row per person — aggregates that person's daily entries.
     *  - "task": one sub-row per unique task `note` — shows a single task across the days
     *    it was worked on. The sub-row label becomes the task text (truncated). */
    subRowMode?: 'assignee' | 'task'
    /** When true (task mode only), hide tasks whose every entry has status === 'DONE'. */
    hideCompletedTasks?: boolean
    /** Optional callback — clicked on a project row's "⚡ Bulk Convert" button (task mode only). */
    onBulkConvert?: (projectId: string) => void
    /** Optional callback — clicked on a project row's "+ Task" button (after the No. column).
     *  Use this to open the BulkTaskModal for that project (empty rows, ready for new task
     *  creation in the timesheet system). */
    onCreateTask?: (projectId: string) => void
    /** Optional callback — clicked on the task_code badge in a task sub-row.
     *  Host opens the Task detail modal (with Time Log / Status / Checklist tabs). */
    onTaskCodeClick?: (taskId: string) => void
}

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate()
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n)
}

// Strip HTML tags + entities, collapse whitespace, truncate.
// Notes pasted from Outlook arrive as `<div data-olk-copy-source="MessageBody" style="...">…</div>`;
// the raw markup is unreadable in a one-line cell.
function summariseNote(raw: string, max = 60): string {
    if (!raw) return ''
    // 1) drop tags  2) decode common entities  3) collapse whitespace
    const noTags = raw.replace(/<[^>]*>/g, ' ')
    const decoded = noTags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    const cleaned = decoded.replace(/\s+/g, ' ').trim()
    return cleaned.length > max ? cleaned.slice(0, max).trim() + '…' : cleaned
}

function isWeekend(year: number, month: number, day: number): boolean {
    const d = new Date(year, month - 1, day).getDay()
    return d === 0 || d === 6
}

// Render a single entry mark inside a cell. Used by both main rows and
// expanded sub-rows so they look consistent.
function EntryMark({ cell, size = 'sm' }: { cell: CellEntry; size?: 'sm' | 'md' }) {
    const { entry, kind } = cell
    const sz = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'
    const dotSz = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'
    
    // Smooth fade & bounce entry animations
    const wrapperClass = `flex items-center justify-center p-0.5 rounded-md border shadow-sm transition-all duration-300 hover:scale-110`

    if (kind === 'incoming') {
        return (
            <span className={`${wrapperClass} bg-amber-50 border-amber-200/50 text-amber-500 shadow-[0_1px_4px_rgba(245,158,11,0.15)]`} title="เลื่อนเข้ามา">
                <CornerDownRight className={sz} />
            </span>
        )
    }
    if (kind === 'departed') {
        return (
            <span className={`${wrapperClass} bg-slate-50 border-slate-200/40 text-slate-400 opacity-60`} title="ย้ายแผนออก">
                <ArrowRight className={sz} />
            </span>
        )
    }
    if (entry.status === 'DONE') {
        return (
            <span className={`${wrapperClass} bg-emerald-50 border-emerald-200/50 text-emerald-500 shadow-[0_1px_4px_rgba(16,185,129,0.15)]`} title="เสร็จสิ้น">
                <CheckCircle2 className={sz} />
            </span>
        )
    }
    if (entry.status === 'POSTPONED') {
        return (
            <span className={`${wrapperClass} bg-amber-50 border-amber-200/50 text-amber-500 shadow-[0_1px_4px_rgba(245,158,11,0.15)]`} title="เลื่อนแผน">
                <CalendarClock className={sz} />
            </span>
        )
    }
    const color =
        (entry.color_source === 'MILESTONE' && entry.milestone_color) ||
        entry.color ||
        '#94a3b8'
    const Icon = entry.icon ? ICON_MAP[entry.icon] : null
    
    if (Icon) {
        return (
            <span 
                className={`${wrapperClass} bg-white border-slate-100`} 
                style={{ 
                    color, 
                    boxShadow: `0 1px 4px ${color}15`,
                    borderColor: `${color}20`
                }}
            >
                <Icon className={sz} />
            </span>
        )
    }
    return (
        <span 
            className={`${wrapperClass} bg-white border-slate-100`}
            style={{ 
                boxShadow: `0 1px 4px ${color}15`,
                borderColor: `${color}20`
            }}
        >
            <div className={`${dotSz} rounded-full`} style={{ backgroundColor: color }} />
        </span>
    )
}

function cellTooltip(cell: CellEntry): string {
    const { entry, kind } = cell
    const who = entry.assignee_name || 'ไม่ระบุ'
    if (kind === 'incoming') {
        return `${who}: เลื่อนมาจากวันที่ ${entry.entry_date}${entry.note ? ` — ${entry.note}` : ''}`
    }
    if (kind === 'departed') {
        if (entry.status === 'DONE' && entry.completed_date) {
            return `${who}: แผนเดิม — เลื่อนและเสร็จในวันที่ ${entry.completed_date}`
        }
        if (entry.status === 'POSTPONED' && entry.postponed_date) {
            return `${who}: แผนเดิม — เลื่อนไปวันที่ ${entry.postponed_date}`
        }
        return `${who}: แผนเดิม`
    }
    if (entry.status === 'DONE') {
        return `${who}: เสร็จแล้ว${entry.completed_date ? ` (${entry.completed_date})` : ''}${entry.note ? ` — ${entry.note}` : ''}`
    }
    if (entry.status === 'POSTPONED' && entry.postponed_date) {
        return `${who}: เลื่อนไปวันที่ ${entry.postponed_date}${entry.note ? ` — ${entry.note}` : ''}`
    }
    return `${who}${entry.note ? `: ${entry.note}` : ''}`
}

function isCellMatched(cellEntries: CellEntry[], filter: string | null | undefined): boolean {
    if (!filter) return true
    return cellEntries.some((c) => {
        if (filter === 'DONE' || filter === 'POSTPONED') {
            return c.entry.status === filter
        }
        if (filter === 'incoming' || filter === 'departed') {
            return c.kind === filter
        }
        return c.entry.icon === filter
    })
}

export function TrackingGrid({ projects, entries, year, month, onCellClick, isLoading, highlightFilter, startDate, endDate, showCustomer = true, onProjectClick, onProjectNameClick, subRowMode = 'assignee', hideCompletedTasks = false, onBulkConvert, onCreateTask, onTaskCodeClick }: Props) {
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
    const todayStr = useMemo(() => {
        const d = new Date()
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    }, [])
    const [sortKey, setSortKey] = useState<SortKey | null>(null)
    const [sortDir, setSortDir] = useState<SortDir>(null)

    const toggleSort = (key: SortKey) => {
        if (sortKey !== key) {
            setSortKey(key)
            setSortDir('asc')
        } else if (sortDir === 'asc') {
            setSortDir('desc')
        } else if (sortDir === 'desc') {
            setSortKey(null)
            setSortDir(null)
        } else {
            setSortDir('asc')
        }
    }

    const sortedProjects = useMemo(() => {
        if (!sortKey || !sortDir) return projects
        const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' })
        const sorted = [...projects].sort((a, b) => {
            const va = (a[sortKey] || '') as string
            const vb = (b[sortKey] || '') as string
            return collator.compare(va, vb)
        })
        if (sortDir === 'desc') sorted.reverse()
        return sorted
    }, [projects, sortKey, sortDir])

    const getSortIcon = (k: SortKey) => {
        if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-slate-300" />
        return sortDir === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-blue-600" />
        ) : (
            <ArrowDown className="w-3 h-3 text-blue-600" />
        )
    }

    const days = useMemo(() => {
        const arr: { day: number; date: string; weekend: boolean; monthShort?: string }[] = []
        // If a date range is provided, iterate from startDate to endDate (inclusive).
        // Otherwise fall back to the entire calendar month.
        if (startDate && endDate) {
            const s = new Date(startDate)
            const e = new Date(endDate)
            const cur = new Date(s)
            while (cur <= e) {
                arr.push({
                    day: cur.getDate(),
                    date: `${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}-${pad2(cur.getDate())}`,
                    weekend: cur.getDay() === 0 || cur.getDay() === 6,
                    monthShort: THAI_MONTHS_SHORT[cur.getMonth()],
                })
                cur.setDate(cur.getDate() + 1)
            }
            return arr
        }
        const total = daysInMonth(year, month)
        for (let d = 1; d <= total; d++) {
            arr.push({
                day: d,
                date: `${year}-${pad2(month)}-${pad2(d)}`,
                weekend: isWeekend(year, month, d),
                monthShort: THAI_MONTHS_SHORT[month - 1],
            })
        }
        return arr
    }, [year, month, startDate, endDate])

    // Group entries: projectId -> date -> CellEntry[]
    //
    // Placement rules — each entry can appear at up to two days:
    //   1) DONE + completed_date ≠ entry_date
    //      - completed_date  : kind='own'      (✓ green at the day work finished)
    //      - entry_date      : kind='departed' (faded → at the original plan day)
    //   2) POSTPONED + postponed_date ≠ entry_date
    //      - entry_date      : kind='own'      (🕒 at the original day)
    //      - postponed_date  : kind='incoming' (↳ orange at the new day)
    //   3) Otherwise
    //      - entry_date only : kind='own'
    const entriesByProjectAndDate = useMemo(() => {
        const map = new Map<string, Map<string, CellEntry[]>>()
        const push = (projectId: string, date: string, cellEntry: CellEntry) => {
            if (!map.has(projectId)) map.set(projectId, new Map())
            const inner = map.get(projectId)!
            if (!inner.has(date)) inner.set(date, [])
            inner.get(date)!.push(cellEntry)
        }
        for (const e of entries) {
            if (!e.entry_date) continue   // skip the per-DAY map only; tasksByProject still includes these
            if (e.status === 'DONE' && e.completed_date) {
                push(e.project_id, e.completed_date, { entry: e, kind: 'own' })
                if (e.completed_date !== e.entry_date) {
                    push(e.project_id, e.entry_date, { entry: e, kind: 'departed' })
                }
                continue
            }
            push(e.project_id, e.entry_date, { entry: e, kind: 'own' })
            if (e.status === 'POSTPONED' && e.postponed_date && e.postponed_date !== e.entry_date) {
                push(e.project_id, e.postponed_date, { entry: e, kind: 'incoming' })
            }
        }
        return map
    }, [entries])

    // Group by assignee per project (for sub-rows when expanded)
    const assigneesByProject = useMemo(() => {
        const map = new Map<string, Map<string, { id: string | null; name: string }>>()
        for (const e of entries) {
            if (!map.has(e.project_id)) map.set(e.project_id, new Map())
            const inner = map.get(e.project_id)!
            const key = e.assignee_id || '__unassigned__'
            if (!inner.has(key)) {
                inner.set(key, { id: e.assignee_id, name: e.assignee_name || 'ไม่ระบุ' })
            }
        }
        return map
    }, [entries])

    // Group by task (note text) per project — used for the "task" sub-row mode.
    // Key = HTML-stripped + collapsed note (so Outlook-pasted markup collapses to plain
    // text and notes that only differ in whitespace/markup merge into one row).
    // Empty notes bucket as "ไม่มีรายละเอียด".
    // `total` / `doneCount` let us hide tasks where every entry is DONE.
    // `milestoneColor` / `milestoneName` — first non-null milestone seen for this task,
    // used to draw the colored strip on the left of the task row.
    const tasksByProject = useMemo(() => {
        const map = new Map<string, Map<string, {
            display: string;
            assignees: Set<string>;
            total: number;
            doneCount: number;
            milestoneColor: string | null;
            milestoneName: string | null;
            taskCode: string | null;
            taskId: string | null;
        }>>()
        for (const e of entries) {
            const clean = summariseNote(e.note || '', 9999)  // full cleaned text for the key
            const noteKey = clean || '__no_note__'
            if (!map.has(e.project_id)) map.set(e.project_id, new Map())
            const inner = map.get(e.project_id)!
            if (!inner.has(noteKey)) {
                inner.set(noteKey, {
                    display: clean || 'ไม่มีรายละเอียด',
                    assignees: new Set(),
                    total: 0,
                    doneCount: 0,
                    milestoneColor: null,
                    milestoneName: null,
                    taskCode: null,
                    taskId: null,
                })
            }
            const slot = inner.get(noteKey)!
            slot.total += 1
            if (e.status === 'DONE') slot.doneCount += 1
            if (e.assignee_name) slot.assignees.add(e.assignee_name)
            if (!slot.milestoneColor && e.milestone_color) {
                slot.milestoneColor = e.milestone_color
                slot.milestoneName = e.milestone_name
            }
            if (!slot.taskCode && e.task_code) {
                slot.taskCode = e.task_code
            }
            if (!slot.taskId && e.task_id) {
                slot.taskId = e.task_id
            }
        }
        return map
    }, [entries])

    const toggleExpand = (projectId: string) => {
        setExpandedProjects((prev) => {
            const next = new Set(prev)
            if (next.has(projectId)) next.delete(projectId)
            else next.add(projectId)
            return next
        })
    }

    const monthLabel = `${THAI_MONTHS_SHORT[month - 1]} ${year + 543}`

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-xs text-slate-500 shadow-inner">
                กำลังโหลดข้อมูล...
            </div>
        )
    }

    return (
        <div data-tracking-grid className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-inner">
            <div className="overflow-auto max-h-[calc(100vh-170px)] scrollbar-thin scrollbar-thumb-slate-200">
                <table className="min-w-full border-collapse text-xs">
                    <thead className="bg-slate-50/95 backdrop-blur-sm sticky top-0 z-20 border-b border-slate-200 shadow-sm">
                        <tr>
                            <th className="sticky left-0 top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-700 w-[40px] min-w-[40px] shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                                No.
                            </th>
                            <th
                                onClick={() => toggleSort('project_code')}
                                className="sticky left-[40px] top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2 text-left font-bold text-slate-700 min-w-[80px] cursor-pointer hover:bg-slate-200/80 transition-colors select-none shadow-[1px_0_0_rgba(0,0,0,0.05)]"
                            >
                                <span className="inline-flex items-center gap-1">
                                    รหัส {getSortIcon('project_code')}
                                </span>
                            </th>
                            <th
                                onClick={() => toggleSort('name')}
                                className="sticky left-[120px] top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-3 py-2 text-left font-bold text-slate-700 min-w-[180px] cursor-pointer hover:bg-slate-200/80 transition-colors select-none shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                            >
                                <span className="inline-flex items-center gap-1">
                                    ชื่อโครงการ {getSortIcon('name')}
                                </span>
                            </th>
                            {showCustomer && (
                                <th
                                    onClick={() => toggleSort('customer_name')}
                                    className="border-b border-r border-slate-200 px-3 py-2 text-left font-bold text-slate-600 min-w-[140px] cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                                >
                                    <span className="inline-flex items-center gap-1">
                                        ลูกค้า {getSortIcon('customer_name')}
                                    </span>
                                </th>
                            )}
                            <th
                                onClick={() => toggleSort('project_type_code')}
                                className="border-b border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600 min-w-[50px] cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                            >
                                <span className="inline-flex items-center justify-center gap-1">
                                    ประเภท {getSortIcon('project_type_code')}
                                </span>
                            </th>
                            <th
                                onClick={() => toggleSort('owner_name')}
                                className="border-b border-r border-slate-200 px-3 py-2 text-left font-bold text-slate-600 min-w-[140px] cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                            >
                                <span className="inline-flex items-center gap-1">
                                    พนักงาน {getSortIcon('owner_name')}
                                </span>
                            </th>
                            {days.map((d) => {
                                const isToday = d.date === todayStr
                                return (
                                    <th
                                        key={d.date}
                                        className={`border-b border-r border-slate-200 px-1 py-1.5 text-center font-bold min-w-[38px] transition-all relative ${
                                            isToday
                                                ? 'bg-gradient-to-b from-indigo-600 to-blue-600 text-white ring-2 ring-indigo-500 ring-offset-0 z-30 shadow-[0_4px_12px_rgba(79,70,229,0.25)]'
                                                : d.weekend
                                                ? 'bg-slate-100/85 text-slate-400'
                                                : 'bg-slate-50/90 text-slate-600'
                                        }`}
                                        title={`${d.day} ${monthLabel}${isToday ? ' (วันนี้)' : ''}`}
                                    >
                                        <div className="text-[10px] leading-tight whitespace-nowrap flex flex-col items-center justify-center">
                                            <span className={isToday ? 'text-xs font-extrabold text-amber-300' : 'font-semibold text-slate-700'}>{d.day}</span>
                                            <span className={isToday ? 'text-[8px] font-extrabold tracking-widest text-indigo-100 uppercase' : 'text-[8px] font-normal opacity-75'}>
                                                {isToday ? 'วันนี้' : (d.monthShort ?? THAI_MONTHS_SHORT[month - 1])}
                                            </span>
                                        </div>
                                        {isToday && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 animate-pulse" />
                                        )}
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedProjects.map((p, idx) => {
                            const isExpanded = expandedProjects.has(p.id)
                            const projectEntries = entriesByProjectAndDate.get(p.id)
                            const assignees = assigneesByProject.get(p.id)
                            const assigneeList = assignees ? Array.from(assignees.values()) : []
                            const tasks = tasksByProject.get(p.id)
                            const rawTaskList = tasks ? Array.from(tasks.entries()).map(([key, v]) => ({ key, display: v.display, assignees: v.assignees, total: v.total, doneCount: v.doneCount, milestoneColor: v.milestoneColor, milestoneName: v.milestoneName, taskCode: v.taskCode, taskId: v.taskId })) : []
                            // Sort by first assignee name (Thai collation) so each person's
                            // tasks group together — user requested this for scan-ability.
                            // Tasks without an assignee sort last.
                            rawTaskList.sort((a, b) => {
                                const aName = a.assignees.size ? Array.from(a.assignees).sort()[0] : '~~'
                                const bName = b.assignees.size ? Array.from(b.assignees).sort()[0] : '~~'
                                return aName.localeCompare(bName, 'th')
                            })
                            const taskList = hideCompletedTasks
                                ? rawTaskList.filter(t => t.doneCount < t.total)  // hide tasks where every entry is DONE
                                : rawTaskList
                            const subRowCount = subRowMode === 'task' ? taskList.length : assigneeList.length
 
                            return (
                                <Fragment key={p.id}>
                                    {/* Main project row */}
                                    <tr className="hover:bg-slate-50/70 transition-colors duration-150 group">
                                        <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-2 py-2.5 align-middle text-center text-slate-400 w-[40px] min-w-[40px] font-medium group-hover:bg-slate-50 transition-colors shadow-[1px_0_0_rgba(0,0,0,0.02)]">
                                            {idx + 1}
                                        </td>
                                        <td className="sticky left-[40px] z-10 bg-white border-b border-r border-slate-200 px-2 py-2.5 align-middle group-hover:bg-slate-50 transition-colors shadow-[1px_0_0_rgba(0,0,0,0.02)]">
                                            <div className="flex items-center gap-1.5">
                                                {/* "+ Task" button — opens BulkTaskModal for this project */}
                                                {onCreateTask && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); onCreateTask(p.id) }}
                                                        className="inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold text-rose-400 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:text-rose-600"
                                                        title="สร้าง Task ใหม่ในโครงการนี้"
                                                    >
                                                        +
                                                    </button>
                                                )}
                                                {subRowCount > 0 ? (
                                                    <button
                                                        onClick={() => toggleExpand(p.id)}
                                                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-3 h-3" />
                                                        ) : (
                                                            <ChevronRight className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                ) : (
                                                    // Placeholder keeps the project code column aligned across rows
                                                    <span className="inline-block p-1" aria-hidden>
                                                        <span className="block w-3 h-3" />
                                                    </span>
                                                )}
                                                {onProjectClick ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); onProjectClick(p.id) }}
                                                        className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                                                        title="แก้ไขโครงการ"
                                                    >
                                                        {p.project_code}
                                                    </button>
                                                ) : (
                                                    <a
                                                        href={`/projects/${p.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                                                        title="เปิดหน้าโครงการ (edit)"
                                                    >
                                                        {p.project_code}
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="sticky left-[120px] z-10 bg-white border-b border-r border-slate-200 px-2.5 py-2.5 align-middle group-hover:bg-slate-50 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                                            {onProjectNameClick ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); onProjectNameClick(p.id) }}
                                                    className="text-slate-900 font-semibold truncate max-w-[200px] hover:text-indigo-700 hover:underline text-left"
                                                    title={`${p.name} — คลิกเพื่อดู Gantt Chart`}
                                                >
                                                    {p.name}
                                                </button>
                                            ) : (
                                                <div className="text-slate-900 font-semibold truncate max-w-[200px]" title={p.name}>
                                                    {p.name}
                                                </div>
                                            )}
                                        </td>
                                        {showCustomer && (
                                            <td className="border-b border-r border-slate-200 px-2.5 py-2.5 align-middle">
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-[130px] font-medium" title={p.customer_name || ''}>
                                                        {p.customer_name || '-'}
                                                    </span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="border-b border-r border-slate-200 px-1.5 py-2.5 text-center align-middle">
                                            <div className="inline-flex items-center gap-1.5">
                                                {p.project_type_code && (
                                                    <span
                                                        className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm border border-slate-200/50"
                                                        style={{
                                                            backgroundColor: p.project_type_color ? `${p.project_type_color}15` : '#f1f5f9',
                                                            color: p.project_type_color || '#64748b',
                                                            borderColor: p.project_type_color ? `${p.project_type_color}30` : 'transparent'
                                                        }}
                                                    >
                                                        {p.project_type_code}
                                                    </span>
                                                )}
                                                {/* Task count badge — meaningful in task mode (one item per unique note) */}
                                                {subRowMode === 'task' && taskList.length > 0 && (
                                                    <span
                                                        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200"
                                                        title={`${taskList.length} งาน`}
                                                    >
                                                        {taskList.length}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="border-b border-r border-slate-200 px-2.5 py-2.5 align-middle text-slate-700">
                                            <span className="block truncate font-semibold text-slate-700 whitespace-nowrap max-w-[130px]" title={p.owner_name || ''}>
                                                {p.owner_name || '-'}
                                            </span>
                                        </td>
                                        {days.map((d) => {
                                            const cellEntries = projectEntries?.get(d.date) || []
                                            const isToday = d.date === todayStr
                                            const matched = !highlightFilter || isCellMatched(cellEntries, highlightFilter)
                                            const tooltip = cellEntries.length
                                                ? cellEntries.map(cellTooltip).join(' • ')
                                                : 'คลิกเพื่อเพิ่ม'
 
                                            // Determine background styles
                                            let bgClass = 'bg-white'
                                            if (isToday) {
                                                bgClass = 'bg-blue-50/30 border-l border-r border-blue-500/20'
                                            } else if (d.weekend) {
                                                bgClass = 'bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,rgba(241,245,249,0.3)_4px,rgba(241,245,249,0.3)_8px)] bg-slate-50/30 text-slate-400'
                                            }
 
                                            // Hover effects
                                            const hoverClass = 'hover:bg-indigo-50/60 hover:ring-1 hover:ring-indigo-400 hover:scale-[1.08] hover:shadow-md hover:rounded-sm z-10'
 
                                            // Highlight filter styling
                                            let filterClass = 'transition-all duration-300'
                                            if (highlightFilter) {
                                                if (!matched) {
                                                    filterClass += ' opacity-15 blur-[0.4px] scale-95 pointer-events-none'
                                                } else {
                                                    filterClass += ' ring-2 ring-indigo-500 ring-offset-1 scale-110 z-10 bg-indigo-50/50 shadow-md font-bold'
                                                }
                                            }
 
                                            return (
                                                <td
                                                    key={d.date}
                                                    onClick={() => onCellClick(p.id, d.date)}
                                                    className={`border-b border-r border-slate-200 px-0.5 py-2 text-center cursor-pointer transition-all ${bgClass} ${hoverClass} ${filterClass}`}
                                                    title={tooltip}
                                                >
                                                    {cellEntries.length > 0 && (
                                                        <div className="flex items-center justify-center">
                                                            {cellEntries.length === 1 ? (
                                                                <EntryMark cell={cellEntries[0]} size="md" />
                                                            ) : (
                                                                // 2+ entries: show single count badge instead of multiple marks
                                                                // so the column doesn't need to stretch
                                                                <span
                                                                    className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-sm"
                                                                    title={`${cellEntries.length} รายการ`}
                                                                >
                                                                    {cellEntries.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
 
                                    {/* Sub-rows (assignees) — only in 'assignee' mode */}
                                    {isExpanded && subRowMode === 'assignee' &&
                                        assigneeList.map((a) => (
                                            <tr key={`${p.id}-${a.id || 'none'}`} className="bg-slate-50/20 hover:bg-slate-100/40 transition-colors duration-150">
                                                <td className="sticky left-0 z-10 bg-slate-50/40 border-b border-r border-slate-200 w-[40px] min-w-[40px] shadow-[1px_0_0_rgba(0,0,0,0.02)]" />
                                                <td className="sticky left-[40px] z-10 bg-slate-50/40 border-b border-r border-slate-200 shadow-[1px_0_0_rgba(0,0,0,0.02)]" />
                                                <td
                                                    colSpan={showCustomer ? 3 : 2}
                                                    className="sticky left-[120px] z-10 bg-slate-50/40 border-b border-r border-slate-200 px-2 py-1 text-slate-400 shadow-[2px_0_4px_rgba(0,0,0,0.02)]"
                                                >
                                                    <div className="pl-4 flex items-center gap-2">
                                                        <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="inline-flex items-center bg-slate-100/80 text-slate-500 rounded-full px-2 py-0.5 text-[9px] font-bold border border-slate-200/50">
                                                            ผู้ปฏิบัติงาน
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="border-b border-r border-slate-200 px-2.5 py-1.5 align-middle text-slate-700 bg-slate-50/10">
                                                    <span className="font-semibold text-slate-700">{a.name}</span>
                                                </td>
                                                {days.map((d) => {
                                                    const cellEntries = (projectEntries?.get(d.date) || []).filter(
                                                        (c) =>
                                                            (c.entry.assignee_id || '__unassigned__') ===
                                                            (a.id || '__unassigned__')
                                                    )
                                                    const isToday = d.date === todayStr
                                                    const matched = !highlightFilter || isCellMatched(cellEntries, highlightFilter)
                                                    const tooltip = cellEntries.length
                                                        ? cellEntries.map(cellTooltip).join(' • ')
                                                        : ''
 
                                                    // Determine background styles for expanded sub-row cells
                                                    let bgClass = 'bg-slate-50/10'
                                                    if (isToday) {
                                                        bgClass = 'bg-blue-50/20 border-l border-r border-blue-500/10'
                                                    } else if (d.weekend) {
                                                        bgClass = 'bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,rgba(241,245,249,0.25)_4px,rgba(241,245,249,0.25)_8px)] bg-slate-100/20 text-slate-400'
                                                    }
 
                                                    // Hover effects
                                                    const hoverClass = 'hover:bg-indigo-50/50 hover:ring-1 hover:ring-indigo-400 hover:scale-[1.06] hover:shadow-sm z-10'
 
                                                    // Highlight filter styling
                                                    let filterClass = 'transition-all duration-300'
                                                    if (highlightFilter) {
                                                        if (!matched) {
                                                            filterClass += ' opacity-15 blur-[0.4px] scale-95 pointer-events-none'
                                                        } else {
                                                            filterClass += ' ring-2 ring-indigo-500 ring-offset-1 scale-110 z-10 bg-indigo-50/40 shadow-md font-bold'
                                                        }
                                                    }
 
                                                    return (
                                                        <td
                                                            key={d.date}
                                                            onClick={() => onCellClick(p.id, d.date)}
                                                            className={`border-b border-r border-slate-200 px-0.5 py-1.5 text-center cursor-pointer transition-all ${bgClass} ${hoverClass} ${filterClass}`}
                                                            title={tooltip}
                                                        >
                                                            {cellEntries.length > 0 && (
                                                                <div className="flex items-center justify-center">
                                                                    {cellEntries.length === 1 ? (
                                                                        <EntryMark cell={cellEntries[0]} size="sm" />
                                                                    ) : (
                                                                        <span
                                                                            className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-md text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-sm"
                                                                            title={`${cellEntries.length} รายการ`}
                                                                        >
                                                                            {cellEntries.length}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}

                                    {/* Sub-rows (per task) — only in 'task' mode.
                                        Each row = a unique task note across the visible window.
                                        Task text spans รหัส + ชื่อโครงการ + ประเภท (+ ลูกค้า) so it has
                                        breathing room; พนักงาน keeps its own cell at the right with
                                        the assignee names. */}
                                    {isExpanded && subRowMode === 'task' &&
                                        taskList.map((t) => (
                                            <tr key={`${p.id}-task-${t.key}`} className="bg-slate-50 hover:bg-slate-100 transition-colors duration-150">
                                                <td className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 w-[40px] min-w-[40px] shadow-[1px_0_0_rgba(0,0,0,0.02)]" />
                                                {/* Task text spans only รหัส + ชื่อโครงการ — stops at the end
                                                    of ชื่อโครงการ so ประเภท / (ลูกค้า) / พนักงาน stay their own cells.
                                                    Solid bg-slate-50 so the assignee name behind it doesn't bleed
                                                    through the truncated text. */}
                                                <td
                                                    colSpan={2}
                                                    className="sticky left-[40px] z-10 bg-slate-50 border-b border-r border-slate-200 px-2 py-2.5 text-slate-700 shadow-[2px_0_4px_rgba(0,0,0,0.02)] relative"
                                                >
                                                    {/* Milestone color strip — shows which milestone this task belongs to. */}
                                                    {t.milestoneColor && (
                                                        <div
                                                            className="absolute left-0 top-0 bottom-0 w-1"
                                                            style={{ background: t.milestoneColor }}
                                                            title={t.milestoneName || ''}
                                                        />
                                                    )}
                                                    {/* Click the title → open the slide-bar focused on the first occurrence
                                                        of this task across the visible window. */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            // 1) Try to focus an entry in the visible day range (normal "scheduled" path)
                                                            for (const d of days) {
                                                                const cellEntries = (projectEntries?.get(d.date) || []).filter(
                                                                    (c) => (summariseNote(c.entry.note || '', 9999) || '__no_note__') === t.key
                                                                )
                                                                if (cellEntries.length) {
                                                                    onCellClick(p.id, d.date, cellEntries[0].entry.id)
                                                                    return
                                                                }
                                                            }
                                                            // 2) Fallback for unscheduled tasks (entry_date IS NULL) — find ANY
                                                            //    entry for this project+task key and open it. We pass today's
                                                            //    date as the cell context; the user can then set the real date
                                                            //    inside the slide.
                                                            const orphan = entries.find(e =>
                                                                e.project_id === p.id
                                                                && (summariseNote(e.note || '', 9999) || '__no_note__') === t.key,
                                                            )
                                                            if (orphan) onCellClick(p.id, orphan.entry_date || todayStr, orphan.id)
                                                        }}
                                                        className="pl-2 flex items-center min-w-0 w-full text-left hover:bg-indigo-50/40 -mx-2 px-2 py-0.5 rounded transition-colors"
                                                        title={t.display + (t.milestoneName ? ` · ${t.milestoneName}` : '') + ' — คลิกเพื่อเปิด'}
                                                    >
                                                        <span className="text-xs text-slate-700 truncate">
                                                            {summariseNote(t.display, 60)}
                                                        </span>
                                                    </button>
                                                </td>
                                                {showCustomer && (
                                                    <td className="border-b border-r border-slate-200 bg-slate-50" />
                                                )}
                                                {/* ประเภท cell — shows the linked task_code (clickable → opens task detail) */}
                                                <td className="border-b border-r border-slate-200 bg-slate-50 px-1.5 py-2.5 text-center align-middle">
                                                    {t.taskCode && (
                                                        onTaskCodeClick && t.taskId ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => onTaskCodeClick(t.taskId!)}
                                                                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:underline cursor-pointer"
                                                                title={`Task: ${t.taskCode} — คลิกเพื่อดูรายละเอียด / ลง Time Log`}
                                                            >
                                                                {t.taskCode}
                                                            </button>
                                                        ) : (
                                                            <span
                                                                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200"
                                                                title={`Task: ${t.taskCode}`}
                                                            >
                                                                {t.taskCode}
                                                            </span>
                                                        )
                                                    )}
                                                </td>
                                                <td className="border-b border-r border-slate-200 px-2.5 py-2.5 align-middle text-slate-600 bg-slate-50">
                                                    <span
                                                        className="block truncate text-[11px] text-slate-500 whitespace-nowrap max-w-[130px]"
                                                        title={t.assignees.size ? Array.from(t.assignees).join(', ') : ''}
                                                    >
                                                        {t.assignees.size ? Array.from(t.assignees).join(', ') : '—'}
                                                    </span>
                                                </td>
                                                {days.map((d) => {
                                                    const cellEntries = (projectEntries?.get(d.date) || []).filter(
                                                        (c) => (summariseNote(c.entry.note || '', 9999) || '__no_note__') === t.key
                                                    )
                                                    const isToday = d.date === todayStr
                                                    // First matching entry id — passed to onCellClick so the dialog
                                                    // can focus this specific row's entry instead of the project's first.
                                                    const focusEntryId = cellEntries[0]?.entry.id
                                                    return (
                                                        <td
                                                            key={`${p.id}-task-${t.key}-${d.date}`}
                                                            className={cn(
                                                                "border-b border-r border-slate-200 px-1 py-1 text-center align-middle cursor-pointer relative",
                                                                isToday ? "bg-amber-50/30" : "",
                                                                cellEntries.length > 0 ? "hover:bg-indigo-50/60" : "hover:bg-slate-50",
                                                            )}
                                                            onClick={() => onCellClick(p.id, d.date, focusEntryId)}
                                                            title={cellEntries.length ? cellEntries.map(cellTooltip).join(' • ') : ''}
                                                        >
                                                            {cellEntries.length > 0 && (
                                                                <div className="flex items-center justify-center">
                                                                    {cellEntries.length === 1 ? (
                                                                        <EntryMark cell={cellEntries[0]} size="sm" />
                                                                    ) : (
                                                                        <span
                                                                            className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-md text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-sm"
                                                                            title={`${cellEntries.length} รายการ`}
                                                                        >
                                                                            {cellEntries.length}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                </Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
