'use client'

import { Fragment, useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, Building, ArrowUp, ArrowDown, ArrowUpDown, CheckCircle2, CalendarClock, CornerDownRight, ArrowRight } from 'lucide-react'
import { TrackingEntry } from '@/lib/actions/team-tracking-actions'
import { ICON_MAP } from './icons'

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
    onCellClick: (projectId: string, date: string) => void
    isLoading?: boolean
}

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate()
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n)
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

    if (kind === 'incoming') {
        return <CornerDownRight className={sz} style={{ color: '#f59e0b' }} />
    }
    if (kind === 'departed') {
        // Faded arrow indicating the work moved away from this original day.
        return <ArrowRight className={`${sz} opacity-50`} style={{ color: '#94a3b8' }} />
    }
    if (entry.status === 'DONE') {
        return <CheckCircle2 className={sz} style={{ color: '#10b981' }} />
    }
    if (entry.status === 'POSTPONED') {
        return <CalendarClock className={sz} style={{ color: '#f59e0b' }} />
    }
    const color =
        (entry.color_source === 'MILESTONE' && entry.milestone_color) ||
        entry.color ||
        '#94a3b8'
    const Icon = entry.icon ? ICON_MAP[entry.icon] : null
    if (Icon) {
        return <Icon className={sz} style={{ color }} />
    }
    return <div className={`${dotSz} rounded-full`} style={{ backgroundColor: color }} />
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

export function TrackingGrid({ projects, entries, year, month, onCellClick, isLoading }: Props) {
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
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

    const SortIcon = ({ k }: { k: SortKey }) => {
        if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-slate-300" />
        return sortDir === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-blue-600" />
        ) : (
            <ArrowDown className="w-3 h-3 text-blue-600" />
        )
    }

    const days = useMemo(() => {
        const total = daysInMonth(year, month)
        const arr: { day: number; date: string; weekend: boolean }[] = []
        for (let d = 1; d <= total; d++) {
            arr.push({
                day: d,
                date: `${year}-${pad2(month)}-${pad2(d)}`,
                weekend: isWeekend(year, month, d),
            })
        }
        return arr
    }, [year, month])

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
            <div className="bg-white rounded border border-slate-200 p-8 text-center text-xs text-slate-500">
                กำลังโหลด...
            </div>
        )
    }

    if (projects.length === 0) {
        return (
            <div className="bg-white rounded border border-slate-200 p-8 text-center text-xs text-slate-500">
                ไม่พบโครงการ
            </div>
        )
    }

    return (
        <div className="bg-white rounded border border-slate-200 overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-160px)]">
                <table className="min-w-full border-collapse text-xs">
                    <thead className="bg-slate-50 sticky top-0 z-20">
                        <tr>
                            <th className="sticky left-0 top-0 z-30 bg-slate-50 border-b border-r border-slate-200 px-2 py-1.5 text-center font-medium text-slate-700 w-[40px] min-w-[40px]">
                                No.
                            </th>
                            <th
                                onClick={() => toggleSort('project_code')}
                                className="sticky left-[40px] top-0 z-30 bg-slate-50 border-b border-r border-slate-200 px-2 py-1.5 text-left font-medium text-slate-700 min-w-[80px] cursor-pointer hover:bg-slate-100 select-none"
                            >
                                <span className="inline-flex items-center gap-1">
                                    Code <SortIcon k="project_code" />
                                </span>
                            </th>
                            <th
                                onClick={() => toggleSort('name')}
                                className="sticky left-[120px] top-0 z-30 bg-slate-50 border-b border-r border-slate-200 px-2 py-1.5 text-left font-medium text-slate-700 min-w-[180px] cursor-pointer hover:bg-slate-100 select-none"
                            >
                                <span className="inline-flex items-center gap-1">
                                    Project Name <SortIcon k="name" />
                                </span>
                            </th>
                            <th
                                onClick={() => toggleSort('customer_name')}
                                className="border-b border-r border-slate-200 px-2 py-1.5 text-left font-medium text-slate-700 min-w-[140px] cursor-pointer hover:bg-slate-100 select-none"
                            >
                                <span className="inline-flex items-center gap-1">
                                    Customer <SortIcon k="customer_name" />
                                </span>
                            </th>
                            <th
                                onClick={() => toggleSort('project_type_code')}
                                className="border-b border-r border-slate-200 px-2 py-1.5 text-center font-medium text-slate-700 min-w-[50px] cursor-pointer hover:bg-slate-100 select-none"
                            >
                                <span className="inline-flex items-center gap-1">
                                    Type <SortIcon k="project_type_code" />
                                </span>
                            </th>
                            <th
                                onClick={() => toggleSort('owner_name')}
                                className="border-b border-r border-slate-200 px-2 py-1.5 text-left font-medium text-slate-700 min-w-[140px] cursor-pointer hover:bg-slate-100 select-none"
                            >
                                <span className="inline-flex items-center gap-1">
                                    SA <SortIcon k="owner_name" />
                                </span>
                            </th>
                            {days.map((d) => (
                                <th
                                    key={d.day}
                                    className={`border-b border-r border-slate-200 px-1 py-1.5 text-center font-medium min-w-[36px] ${
                                        d.weekend ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-700'
                                    }`}
                                    title={`${d.day} ${monthLabel}`}
                                >
                                    <div className="text-[10px] leading-tight whitespace-nowrap">
                                        {d.day}-{THAI_MONTHS_SHORT[month - 1]}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedProjects.map((p, idx) => {
                            const isExpanded = expandedProjects.has(p.id)
                            const projectEntries = entriesByProjectAndDate.get(p.id)
                            const assignees = assigneesByProject.get(p.id)
                            const assigneeList = assignees ? Array.from(assignees.values()) : []

                            return (
                                <Fragment key={p.id}>
                                    {/* Main project row */}
                                    <tr className="hover:bg-slate-50/50">
                                        <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-2 py-2 align-middle text-center text-slate-500 w-[40px] min-w-[40px]">
                                            {idx + 1}
                                        </td>
                                        <td className="sticky left-[40px] z-10 bg-white border-b border-r border-slate-200 px-2 py-2 align-middle">
                                            <div className="flex items-center gap-1">
                                                {assigneeList.length > 0 && (
                                                    <button
                                                        onClick={() => toggleExpand(p.id)}
                                                        className="p-0.5 hover:bg-slate-200 rounded"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-3 h-3 text-slate-500" />
                                                        ) : (
                                                            <ChevronRight className="w-3 h-3 text-slate-500" />
                                                        )}
                                                    </button>
                                                )}
                                                <span className="font-medium text-slate-900">{p.project_code}</span>
                                            </div>
                                        </td>
                                        <td className="sticky left-[120px] z-10 bg-white border-b border-r border-slate-200 px-2 py-2 align-middle">
                                            <div className="text-slate-900 truncate max-w-[200px]" title={p.name}>
                                                {p.name}
                                            </div>
                                        </td>
                                        <td className="border-b border-r border-slate-200 px-2 py-2 align-middle">
                                            <div className="flex items-center gap-1 text-slate-700">
                                                <Building className="w-3 h-3 text-slate-400 shrink-0" />
                                                <span className="truncate max-w-[130px]" title={p.customer_name || ''}>
                                                    {p.customer_name || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="border-b border-r border-slate-200 px-1.5 py-2 text-center align-middle">
                                            {p.project_type_code && (
                                                <span
                                                    className="px-1 py-0.5 rounded text-[10px] font-medium"
                                                    style={{
                                                        backgroundColor: p.project_type_color ? `${p.project_type_color}20` : '#f1f5f9',
                                                        color: p.project_type_color || '#64748b',
                                                    }}
                                                >
                                                    {p.project_type_code}
                                                </span>
                                            )}
                                        </td>
                                        <td className="border-b border-r border-slate-200 px-2 py-2 align-middle text-slate-700">
                                            <span className="block truncate whitespace-nowrap max-w-[130px]" title={p.owner_name || ''}>
                                                {p.owner_name || '-'}
                                            </span>
                                        </td>
                                        {days.map((d) => {
                                            const cellEntries = projectEntries?.get(d.date) || []
                                            const tooltip = cellEntries.length
                                                ? cellEntries.map(cellTooltip).join(' • ')
                                                : 'คลิกเพื่อเพิ่ม'
                                            return (
                                                <td
                                                    key={d.day}
                                                    onClick={() => onCellClick(p.id, d.date)}
                                                    className={`border-b border-r border-slate-200 px-0.5 py-2 text-center cursor-pointer hover:bg-blue-50 transition-colors ${
                                                        d.weekend ? 'bg-slate-50' : ''
                                                    }`}
                                                    title={tooltip}
                                                >
                                                    {cellEntries.length > 0 && (
                                                        <div className="flex items-center justify-center gap-0.5 flex-wrap">
                                                            {cellEntries.slice(0, 3).map((c, i) => (
                                                                <EntryMark key={`${c.entry.id}-${c.kind}-${i}`} cell={c} size="md" />
                                                            ))}
                                                            {cellEntries.length > 3 && (
                                                                <span className="text-[9px] text-slate-500 ml-0.5">
                                                                    +{cellEntries.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>

                                    {/* Sub-rows (assignees) */}
                                    {isExpanded &&
                                        assigneeList.map((a) => (
                                            <tr key={`${p.id}-${a.id || 'none'}`} className="bg-slate-50/30">
                                                <td className="sticky left-0 z-10 bg-slate-50/30 border-b border-r border-slate-200 w-[40px] min-w-[40px]" />
                                                <td className="sticky left-[40px] z-10 bg-slate-50/30 border-b border-r border-slate-200" />
                                                <td
                                                    colSpan={4}
                                                    className="sticky left-[120px] z-10 bg-slate-50/30 border-b border-r border-slate-200 px-2 py-1 text-slate-700"
                                                >
                                                    <div className="pl-4">
                                                        <span className="font-medium">{a.name}</span>
                                                    </div>
                                                </td>
                                                {days.map((d) => {
                                                    const cellEntries = (projectEntries?.get(d.date) || []).filter(
                                                        (c) =>
                                                            (c.entry.assignee_id || '__unassigned__') ===
                                                            (a.id || '__unassigned__')
                                                    )
                                                    const tooltip = cellEntries.length
                                                        ? cellEntries.map(cellTooltip).join(' • ')
                                                        : ''
                                                    return (
                                                        <td
                                                            key={d.day}
                                                            onClick={() => onCellClick(p.id, d.date)}
                                                            className={`border-b border-r border-slate-200 px-0.5 py-2 text-center cursor-pointer hover:bg-blue-50 transition-colors ${
                                                                d.weekend ? 'bg-slate-100' : ''
                                                            }`}
                                                            title={tooltip}
                                                        >
                                                            {cellEntries.length > 0 && (
                                                                <div className="flex items-center justify-center gap-0.5 flex-wrap">
                                                                    {cellEntries.slice(0, 3).map((c, i) => (
                                                                        <EntryMark
                                                                            key={`${c.entry.id}-${c.kind}-${i}`}
                                                                            cell={c}
                                                                            size="sm"
                                                                        />
                                                                    ))}
                                                                    {cellEntries.length > 3 && (
                                                                        <span className="text-[9px] text-slate-500 ml-0.5">
                                                                            +{cellEntries.length - 3}
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
