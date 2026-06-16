'use client'

import { Fragment, useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, CornerDownRight, Users, FolderKanban, CheckCircle2 } from 'lucide-react'
import { TrackingEntry } from '@/lib/actions/team-tracking-actions'
import { cn } from '@/lib/utils'
import {
    EntryMark,
    cellTooltip,
    summariseNote,
    placeEntryOnDates,
    buildDays,
    type CellEntry,
    type Project,
    type GridDay,
} from './TrackingGrid'

// ============================================================
// Employee-pivot daily grid.
//
// Inverts the hierarchy of TrackingGrid: instead of project → (assignee | task),
// the top level is the EMPLOYEE (พนักงาน). Under each employee come the projects
// they have work in (โครงการ), and under each project the individual activities /
// tasks (กิจกรรม / task), sorted by their next-up date. Day columns + cell marks are
// rendered exactly like the project grid so the two views feel like one tab.
// ============================================================

interface Props {
    projects: Project[]
    entries: TrackingEntry[]
    year: number
    month: number   // 1-based — only used for the calendar-month fallback in buildDays
    startDate?: string
    endDate?: string
    isLoading?: boolean
    /** When true, hide tasks whose every entry is DONE / linked task is wrapped up. */
    hideCompletedTasks?: boolean
    /** Day cell clicked. `entryId` focuses a specific entry in the dialog. */
    onCellClick: (projectId: string, date: string, entryId?: string) => void
    /** Project code clicked → open project edit. */
    onProjectClick?: (projectId: string) => void
    /** Project name clicked → open the Gantt-chart popup. */
    onProjectNameClick?: (projectId: string) => void
    /** Task code badge clicked → open the Task detail modal. */
    onTaskCodeClick?: (taskId: string) => void
}

// One unique activity / task within an (employee, project) cell — keyed by its
// cleaned note text, mirroring tasksByProject in TrackingGrid.
interface TaskNode {
    key: string
    display: string
    entries: TrackingEntry[]
    dateCells: Map<string, CellEntry[]>
    total: number
    doneCount: number
    taskDone: boolean
    milestoneColor: string | null
    milestoneName: string | null
    taskCode: string | null
    taskId: string | null
    sortDate: string   // earliest next-up date — drives "ลำดับถัดไป" ordering
}

interface ProjectNode {
    project: Project
    entries: TrackingEntry[]
    dateCells: Map<string, CellEntry[]>
    tasks: TaskNode[]
    sortDate: string
}

interface EmployeeNode {
    key: string
    id: string | null
    name: string
    dateCells: Map<string, CellEntry[]>
    projects: ProjectNode[]
    taskCount: number
}

const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' })
const FAR_FUTURE = '9999-99-99'

// The day where an entry's "current" mark lives — used to sort tasks/projects so
// the soonest upcoming work floats to the top.
function entrySortDate(e: TrackingEntry): string {
    if (e.status === 'DONE') return e.completed_date || e.entry_date || FAR_FUTURE
    if (e.status === 'POSTPONED') return e.postponed_date || e.entry_date || FAR_FUTURE
    return e.entry_date || FAR_FUTURE
}

function buildDateCells(entries: TrackingEntry[]): Map<string, CellEntry[]> {
    const map = new Map<string, CellEntry[]>()
    for (const e of entries) {
        for (const { date, kind } of placeEntryOnDates(e)) {
            if (!map.has(date)) map.set(date, [])
            map.get(date)!.push({ entry: e, kind })
        }
    }
    return map
}

// Group an (employee, project)'s entries into unique tasks by cleaned note text.
function buildTasks(entries: TrackingEntry[]): TaskNode[] {
    const map = new Map<string, TaskNode>()
    for (const e of entries) {
        const clean = summariseNote(e.note || '', 9999)
        const key = clean || '__no_note__'
        let slot = map.get(key)
        if (!slot) {
            slot = {
                key,
                display: clean || 'ไม่มีรายละเอียด',
                entries: [],
                dateCells: new Map(),
                total: 0,
                doneCount: 0,
                taskDone: false,
                milestoneColor: null,
                milestoneName: null,
                taskCode: null,
                taskId: null,
                sortDate: FAR_FUTURE,
            }
            map.set(key, slot)
        }
        slot.entries.push(e)
        slot.total += 1
        if (e.status === 'DONE') slot.doneCount += 1
        if (!slot.milestoneColor && e.milestone_color) {
            slot.milestoneColor = e.milestone_color
            slot.milestoneName = e.milestone_name
        }
        if (!slot.taskCode && e.task_code) slot.taskCode = e.task_code
        if (!slot.taskId && e.task_id) slot.taskId = e.task_id
        if (!slot.taskDone && e.task_id) {
            const terminal = e.task_status === 'done' || e.task_status === 'done_not_planned' || e.task_status === 'cancelled'
            const fullyLogged = (e.task_estimated_hours ?? 0) > 0
                && (e.task_actual_hours ?? 0) >= (e.task_estimated_hours ?? 0)
            if (terminal || fullyLogged) slot.taskDone = true
        }
        const sd = entrySortDate(e)
        if (sd < slot.sortDate) slot.sortDate = sd
    }
    const tasks = Array.from(map.values())
    for (const t of tasks) t.dateCells = buildDateCells(t.entries)
    // Chronological — next-up first ("ลำดับถัดไป").
    tasks.sort((a, b) =>
        a.sortDate < b.sortDate ? -1 : a.sortDate > b.sortDate ? 1 : collator.compare(a.display, b.display),
    )
    return tasks
}

// Render the marks inside one day cell (single mark or a count badge for 2+).
function CellMarks({ cellEntries, size = 'md' }: { cellEntries: CellEntry[]; size?: 'sm' | 'md' }) {
    if (cellEntries.length === 0) return null
    if (cellEntries.length === 1) {
        return (
            <div className="flex items-center justify-center">
                <EntryMark cell={cellEntries[0]} size={size} />
            </div>
        )
    }
    return (
        <div className="flex items-center justify-center">
            <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-sm"
                title={`${cellEntries.length} รายการ`}
            >
                {cellEntries.length}
            </span>
        </div>
    )
}

function dayBgClass(d: GridDay, todayStr: string): string {
    if (d.date === todayStr) return 'bg-blue-50/30 border-l border-r border-blue-500/20'
    if (d.weekend) return 'bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,rgba(241,245,249,0.3)_4px,rgba(241,245,249,0.3)_8px)] bg-slate-50/30'
    return ''
}

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export function TrackingGridByEmployee({
    projects, entries, year, month, startDate, endDate, isLoading,
    hideCompletedTasks = false,
    onCellClick, onProjectClick, onProjectNameClick, onTaskCodeClick,
}: Props) {
    // Employees expanded by default (so projects are visible immediately); projects
    // collapsed by default (expand to reveal the activity/task list).
    const [collapsedEmps, setCollapsedEmps] = useState<Set<string>>(new Set())
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

    const todayStr = useMemo(() => {
        const d = new Date()
        const p = (n: number) => (n < 10 ? `0${n}` : String(n))
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    }, [])

    const days = useMemo(
        () => buildDays(year, month, startDate, endDate),
        [year, month, startDate, endDate],
    )
    const monthLabel = `${THAI_MONTHS_SHORT[month - 1]} ${year + 543}`

    const employees = useMemo<EmployeeNode[]>(() => {
        const projectById = new Map(projects.map(p => [p.id, p]))

        // 1) bucket entries by assignee
        const byEmp = new Map<string, { id: string | null; name: string; entries: TrackingEntry[] }>()
        for (const e of entries) {
            const key = e.assignee_id || '__unassigned__'
            if (!byEmp.has(key)) {
                byEmp.set(key, {
                    id: e.assignee_id,
                    name: e.assignee_name?.trim() || 'ไม่ระบุผู้รับผิดชอบ',
                    entries: [],
                })
            }
            byEmp.get(key)!.entries.push(e)
        }

        // 2) for each employee, bucket by project → build project + task nodes
        const out: EmployeeNode[] = []
        for (const [key, emp] of byEmp) {
            const byProj = new Map<string, TrackingEntry[]>()
            for (const e of emp.entries) {
                if (!byProj.has(e.project_id)) byProj.set(e.project_id, [])
                byProj.get(e.project_id)!.push(e)
            }

            const projectNodes: ProjectNode[] = []
            let taskCount = 0
            // Entries that survive the "ซ่อนงานเสร็จ" filter — used so the rollup cell
            // counts (employee / project rows) reconcile with the visible task rows.
            const empVisibleEntries: TrackingEntry[] = []
            for (const [pid, pEntries] of byProj) {
                const project = projectById.get(pid)
                if (!project) continue
                const tasks = buildTasks(pEntries)
                // Hide done activities (every entry DONE) AND wrapped-up linked Tasks.
                const visibleTasks = hideCompletedTasks
                    ? tasks.filter(t => !(t.doneCount >= t.total && t.total > 0) && !t.taskDone)
                    : tasks
                if (visibleTasks.length === 0) continue   // project fully done → skip when hiding
                const visibleEntries = visibleTasks.flatMap(t => t.entries)
                empVisibleEntries.push(...visibleEntries)
                taskCount += visibleTasks.length
                const sortDate = visibleEntries.reduce(
                    (m, e) => { const sd = entrySortDate(e); return sd < m ? sd : m },
                    FAR_FUTURE,
                )
                projectNodes.push({
                    project,
                    entries: visibleEntries,
                    dateCells: buildDateCells(visibleEntries),
                    tasks: visibleTasks,
                    sortDate,
                })
            }
            if (projectNodes.length === 0) continue   // employee has no outstanding work
            // soonest-upcoming project first, then by code
            projectNodes.sort((a, b) =>
                a.sortDate < b.sortDate ? -1 : a.sortDate > b.sortDate ? 1
                    : collator.compare(a.project.project_code || '', b.project.project_code || ''),
            )

            out.push({
                key,
                id: emp.id,
                name: emp.name,
                dateCells: buildDateCells(empVisibleEntries),
                projects: projectNodes,
                taskCount,
            })
        }

        // unassigned bucket last, otherwise by name
        out.sort((a, b) => {
            const au = a.id === null, bu = b.id === null
            if (au !== bu) return au ? 1 : -1
            return collator.compare(a.name, b.name)
        })
        return out
    }, [projects, entries, hideCompletedTasks])

    const toggleEmp = (key: string) =>
        setCollapsedEmps(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    const toggleProject = (key: string) =>
        setExpandedProjects(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })

    // Open the slide-bar focused on a task's first visible (or any) entry.
    const openTask = (projectId: string, t: TaskNode) => {
        for (const d of days) {
            const cells = t.dateCells.get(d.date)
            if (cells && cells.length) {
                onCellClick(projectId, d.date, cells[0].entry.id)
                return
            }
        }
        const orphan = t.entries[0]
        if (orphan) onCellClick(projectId, orphan.entry_date || todayStr, orphan.id)
    }

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-xs text-slate-500 shadow-inner">
                กำลังโหลดข้อมูล...
            </div>
        )
    }

    return (
        <div data-tracking-grid-by-employee className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-inner">
            <div className="overflow-auto max-h-[calc(100vh-170px)] scrollbar-thin scrollbar-thumb-slate-200">
                <table className="min-w-full border-collapse text-xs">
                    <thead className="bg-slate-50/95 backdrop-blur-sm sticky top-0 z-20 border-b border-slate-200 shadow-sm">
                        <tr>
                            <th className="sticky left-0 top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-700 w-[40px] min-w-[40px] shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                                No.
                            </th>
                            <th className="sticky left-[40px] top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-3 py-2 text-left font-bold text-slate-700 w-[320px] min-w-[320px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                                พนักงาน / โครงการ / งาน
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
                        {employees.length === 0 ? (
                            <tr>
                                <td colSpan={2 + days.length} className="p-10 text-center text-slate-400 text-xs">
                                    ไม่พบงานของพนักงานตามฟิลเตอร์ที่เลือก
                                </td>
                            </tr>
                        ) : employees.map((emp, idx) => {
                            const empExpanded = !collapsedEmps.has(emp.key)
                            return (
                                <Fragment key={emp.key}>
                                    {/* ── Employee row ── */}
                                    <tr className="hover:bg-slate-50/70 transition-colors duration-150 group">
                                        <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-2 py-2.5 align-middle text-center text-slate-400 w-[40px] min-w-[40px] font-medium group-hover:bg-slate-50 transition-colors shadow-[1px_0_0_rgba(0,0,0,0.02)]">
                                            {idx + 1}
                                        </td>
                                        <td className="sticky left-[40px] z-10 bg-white border-b border-r border-slate-200 px-2 py-2.5 align-middle w-[320px] min-w-[320px] group-hover:bg-slate-50 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => toggleEmp(emp.key)}
                                                    className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                                                    title={empExpanded ? 'ย่อ' : 'ขยาย'}
                                                >
                                                    {empExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                </button>
                                                <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                <span className="font-bold text-slate-900 truncate max-w-[180px]" title={emp.name}>
                                                    {emp.name}
                                                </span>
                                                <span
                                                    className="inline-flex items-center justify-center px-1.5 h-[18px] rounded-full text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 shrink-0"
                                                    title={`${emp.projects.length} โครงการ · ${emp.taskCount} งาน`}
                                                >
                                                    {emp.projects.length} โครงการ
                                                </span>
                                            </div>
                                        </td>
                                        {days.map((d) => {
                                            const cells = emp.dateCells.get(d.date) || []
                                            return (
                                                <td
                                                    key={d.date}
                                                    className={cn('border-b border-r border-slate-200 px-0.5 py-2 text-center align-middle', dayBgClass(d, todayStr))}
                                                    title={cells.length ? cells.map(cellTooltip).join(' • ') : ''}
                                                >
                                                    <CellMarks cellEntries={cells} size="md" />
                                                </td>
                                            )
                                        })}
                                    </tr>

                                    {/* ── Project rows ── */}
                                    {empExpanded && emp.projects.map((pn) => {
                                        const projKey = `${emp.key}::${pn.project.id}`
                                        const projExpanded = expandedProjects.has(projKey)
                                        // pn.tasks is already filtered by "ซ่อนงานเสร็จ" in the memo,
                                        // so the rollup cell counts above reconcile with these rows.
                                        const taskList = pn.tasks
                                        return (
                                            <Fragment key={projKey}>
                                                <tr className="bg-slate-50/40 hover:bg-slate-100/50 transition-colors duration-150">
                                                    <td className="sticky left-0 z-10 bg-slate-50/60 border-b border-r border-slate-200 w-[40px] min-w-[40px] shadow-[1px_0_0_rgba(0,0,0,0.02)]" />
                                                    <td className="sticky left-[40px] z-10 bg-slate-50/60 border-b border-r border-slate-200 px-2 py-2 align-middle w-[320px] min-w-[320px] shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                                                        <div className="flex items-center gap-1.5 pl-4">
                                                            {taskList.length > 0 ? (
                                                                <button
                                                                    onClick={() => toggleProject(projKey)}
                                                                    className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700 transition-colors"
                                                                    title={projExpanded ? 'ย่อ' : 'ดูกิจกรรม/งาน'}
                                                                >
                                                                    {projExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                                </button>
                                                            ) : (
                                                                <span className="inline-block p-0.5" aria-hidden><span className="block w-3 h-3" /></span>
                                                            )}
                                                            <FolderKanban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            {onProjectClick ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); onProjectClick(pn.project.id) }}
                                                                    className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors shrink-0"
                                                                    title="แก้ไขโครงการ"
                                                                >
                                                                    {pn.project.project_code}
                                                                </button>
                                                            ) : (
                                                                <span className="font-semibold text-indigo-600 shrink-0">{pn.project.project_code}</span>
                                                            )}
                                                            {onProjectNameClick ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); onProjectNameClick(pn.project.id) }}
                                                                    className="text-slate-700 font-medium truncate max-w-[150px] hover:text-indigo-700 hover:underline text-left"
                                                                    title={`${pn.project.name} — คลิกเพื่อดู Gantt Chart`}
                                                                >
                                                                    {pn.project.name}
                                                                </button>
                                                            ) : (
                                                                <span className="text-slate-700 font-medium truncate max-w-[150px]" title={pn.project.name}>
                                                                    {pn.project.name}
                                                                </span>
                                                            )}
                                                            {pn.project.project_type_code && (
                                                                <span
                                                                    className="inline-block px-1.5 py-0.5 rounded-full text-[8px] font-bold shadow-sm border border-slate-200/50 shrink-0"
                                                                    style={{
                                                                        backgroundColor: pn.project.project_type_color ? `${pn.project.project_type_color}15` : '#f1f5f9',
                                                                        color: pn.project.project_type_color || '#64748b',
                                                                        borderColor: pn.project.project_type_color ? `${pn.project.project_type_color}30` : 'transparent',
                                                                    }}
                                                                >
                                                                    {pn.project.project_type_code}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {days.map((d) => {
                                                        const cells = pn.dateCells.get(d.date) || []
                                                        const focusId = cells[0]?.entry.id
                                                        return (
                                                            <td
                                                                key={d.date}
                                                                onClick={() => onCellClick(pn.project.id, d.date, focusId)}
                                                                className={cn(
                                                                    'border-b border-r border-slate-200 px-0.5 py-1.5 text-center align-middle cursor-pointer hover:bg-indigo-50/50',
                                                                    dayBgClass(d, todayStr),
                                                                )}
                                                                title={cells.length ? cells.map(cellTooltip).join(' • ') : 'คลิกเพื่อเพิ่ม'}
                                                            >
                                                                <CellMarks cellEntries={cells} size="sm" />
                                                            </td>
                                                        )
                                                    })}
                                                </tr>

                                                {/* ── Task rows ── */}
                                                {projExpanded && taskList.map((t) => (
                                                    <tr key={`${projKey}::${t.key}`} className="bg-white hover:bg-slate-50 transition-colors duration-150">
                                                        <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 w-[40px] min-w-[40px] shadow-[1px_0_0_rgba(0,0,0,0.02)]" />
                                                        <td className="sticky left-[40px] z-10 bg-white border-b border-r border-slate-200 px-2 py-2 align-middle w-[320px] min-w-[320px] shadow-[2px_0_4px_rgba(0,0,0,0.02)] relative">
                                                            {t.milestoneColor && (
                                                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: t.milestoneColor }} title={t.milestoneName || ''} />
                                                            )}
                                                            <div className="flex items-center gap-1.5 pl-9 min-w-0">
                                                                <CornerDownRight className="w-3 h-3 text-slate-300 shrink-0" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openTask(pn.project.id, t)}
                                                                    className="text-[11px] text-slate-600 truncate text-left hover:text-indigo-700 hover:underline min-w-0"
                                                                    title={t.display + (t.milestoneName ? ` · ${t.milestoneName}` : '') + ' — คลิกเพื่อเปิด'}
                                                                >
                                                                    {summariseNote(t.display, 48)}
                                                                </button>
                                                                {t.taskCode && (
                                                                    onTaskCodeClick && t.taskId ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => onTaskCodeClick(t.taskId!)}
                                                                            className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:underline cursor-pointer shrink-0"
                                                                            title={`Task: ${t.taskCode} — คลิกเพื่อดูรายละเอียด / ลง Time Log`}
                                                                        >
                                                                            {t.taskCode}
                                                                        </button>
                                                                    ) : (
                                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 shrink-0" title={`Task: ${t.taskCode}`}>
                                                                            {t.taskCode}
                                                                        </span>
                                                                    )
                                                                )}
                                                            </div>
                                                        </td>
                                                        {days.map((d) => {
                                                            const cells = t.dateCells.get(d.date) || []
                                                            const focusId = cells[0]?.entry.id
                                                            const isToday = d.date === todayStr
                                                            return (
                                                                <td
                                                                    key={d.date}
                                                                    onClick={() => onCellClick(pn.project.id, d.date, focusId)}
                                                                    className={cn(
                                                                        'border-b border-r border-slate-200 px-1 py-1 text-center align-middle cursor-pointer',
                                                                        isToday ? 'bg-amber-50/30' : '',
                                                                        cells.length > 0 ? 'hover:bg-indigo-50/60' : 'hover:bg-slate-50',
                                                                    )}
                                                                    title={cells.length ? cells.map(cellTooltip).join(' • ') : ''}
                                                                >
                                                                    {cells.length > 0 && (
                                                                        <div className="flex items-center justify-center">
                                                                            {cells.length === 1 ? (
                                                                                cells[0].entry.task_id && (cells[0].entry.task_actual_hours ?? 0) > 0 ? (
                                                                                    <CheckCircle2
                                                                                        className="w-4 h-4 text-emerald-600"
                                                                                        strokeWidth={2.5}
                                                                                        aria-label={`Logged ${cells[0].entry.task_actual_hours}h`}
                                                                                    />
                                                                                ) : (
                                                                                    <EntryMark cell={cells[0]} size="sm" />
                                                                                )
                                                                            ) : (
                                                                                <span
                                                                                    className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-md text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-sm"
                                                                                    title={`${cells.length} รายการ`}
                                                                                >
                                                                                    {cells.length}
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
                                </Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
