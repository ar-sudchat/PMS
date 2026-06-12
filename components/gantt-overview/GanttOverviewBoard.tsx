'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Search, RefreshCw, GanttChart, CalendarDays, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import {
    getProjectsForGantt,
    getOpenTasksByAssignee,
    type GanttProjectRow,
    type GanttListFilters,
    type AssigneeBucket,
} from '@/lib/actions/gantt-overview-actions'
import { TasksByAssigneeView } from './TasksByAssigneeView'
import { getProjectFilterOptions, getProjectById, type ProjectFilters } from '@/lib/actions/project-actions'
import { ProjectModal } from '@/components/modals/ProjectModal'
import {
    getTeamTrackingData,
    getAssignableEmployees,
    getProjectMilestones,
    markTrackingEntryDone,
    type TrackingEntry,
    type AssignableEmployee,
} from '@/lib/actions/team-tracking-actions'
import {
    createPersonalTodo,
    markPersonalTodoDone,
    deletePersonalTodo,
} from '@/lib/actions/personal-todos-actions'
import { updateMilestoneProgress } from '@/lib/actions/kpi-actions'

// "ผู้ปฏิบัติงาน" dropdown loaded separately from PM list
type EmployeeOpt = { id: string; name: string; name_th: string }
import { TrackingGrid } from '@/components/team-tracking/TrackingGrid'
import { TrackingCellDialog } from '@/components/team-tracking/TrackingCellDialog'
import { OverdueWorkDialog } from './OverdueWorkDialog'
import { UnscheduledPane } from './UnscheduledPane'
import { BulkTaskModal } from '@/components/modals/BulkTaskModal'
import { TaskDetailModal } from '@/components/my-tasks/TaskDetailModal'
import { QuickLogTimeModal } from '@/components/my-tasks/QuickLogTimeModal'
import { MyTask, getTaskDetail, updateTaskStatus as myTasksUpdateStatus } from '@/lib/actions/my-tasks-actions'
import {
    getOverdueTrackingEntries, OverdueEntry,
    getConvertibleEntriesForProject, getOrCreateGeneralStory, linkTrackingEntriesToTasks,
    createTrackingEntriesForTasks,
} from '@/lib/actions/team-tracking-actions'
import { ProjectDetailPopup } from './ProjectDetailPopup'
import {
    addMonths, computeBarPosition, daysBetween,
    getWeeksForMonth, getWeeksForRange, lastOfMonth, thMonthShort, thShortDate, toISODate,
} from './gantt-grid-utils'

// In Gantt and Daily views, extend the visible window by this many extra days
// past the last month so bars / cells that fall slightly past the month boundary
// still render.
const GANTT_TRAIL_DAYS = 15
const DAILY_TRAIL_DAYS = 15

type ViewMode = 'gantt' | 'daily' | 'todo'

interface DailyTrackingProject {
    id: string
    project_code: string
    name: string
    customer_name: string | null
    project_type_code: string | null
    project_type_color: string | null
    owner_name: string | null
    pm_name: string | null
}

interface FilterOptions {
    customers: { id: string; code: string; name: string; project_count?: number }[]
    managers: { id: string; name: string; name_th: string }[]  // kept (used by project queries) but not surfaced in UI
    statuses: { id: string; code: string; name: string; color: string }[]
    projectTypes: { id: string; code: string; name: string; color: string }[]
    milestones: { id: string; code: string; name: string; name_th?: string; color: string }[]
    years: number[]
}

interface UIFilters {
    customerId: string
    employeeId: string
    statusId: string
    projectTypeIds: string[]   // multi-select; [] = ทุกประเภท
    milestoneIds: string[]     // multi-select; [] = ทั้งหมด
    search: string
}

const EMPTY_OPTS: FilterOptions = { customers: [], managers: [], statuses: [], projectTypes: [], milestones: [], years: [] }

export function GanttOverviewBoard() {
    // Filters
    const [opts, setOpts] = React.useState<FilterOptions>(EMPTY_OPTS)
    const [filters, setFilters] = React.useState<UIFilters>({
        customerId: '', employeeId: '', statusId: '', projectTypeIds: [], milestoneIds: [], search: '',
    })

    // View mode: gantt = 3-month timeline / daily = 1-month day-grid with icons
    // Default view = "รายวัน" (daily) per user preference — most users land here to triage today's work.
    const [view, setView] = React.useState<ViewMode>('daily')

    // Window: Gantt=3 months, Daily=1 month
    const [windowStart, setWindowStart] = React.useState<Date>(() => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), 1)
    })
    const monthsInWindow = view === 'daily' ? 1 : 3
    // Sub-row grouping mode for the daily view — "assignee" or "task". Default "task"
    // because the per-task view is the one users land on most for daily triage.
    const [dailySubRowMode, setDailySubRowMode] = React.useState<'assignee' | 'task'>('task')
    // In task mode, optionally hide tasks where every entry has status === 'DONE'.
    // Default: hidden — completed tasks rarely need a follow-up; user can uncheck to see them.
    const [dailyHideDone, setDailyHideDone] = React.useState(true)

    // Data
    const [rows, setRows] = React.useState<GanttProjectRow[]>([])
    const [loading, setLoading] = React.useState(true)
    const [openProjectId, setOpenProjectId] = React.useState<string | null>(null)
    // Edit Project modal — opened by clicking the project code on a row
    const [editProjectModal, setEditProjectModal] = React.useState<{ open: boolean; project: any | null }>({ open: false, project: null })
    // Wait for filter options + default filters to be applied BEFORE first fetch
    // (otherwise we'd fire two requests on mount: empty → then DEV+Active).
    const [filtersReady, setFiltersReady] = React.useState(false)

    // Todo-mode data (open tasks grouped by assignee)
    const [todoBuckets, setTodoBuckets] = React.useState<AssigneeBucket[]>([])
    // Todo-tab filters — default: today's items, exclude DONE
    const [todoDate, setTodoDate] = React.useState<string>(() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
    const [todoIncludeDone, setTodoIncludeDone] = React.useState(false)

    // All employees (used by the unified "พนักงาน/ผู้ปฏิบัติงาน" dropdown across all views)
    const [employees, setEmployees] = React.useState<EmployeeOpt[]>([])

    // Daily-mode data + dialog
    const [dailyProjects, setDailyProjects] = React.useState<DailyTrackingProject[]>([])
    const [dailyEntries, setDailyEntries] = React.useState<TrackingEntry[]>([])
    const [dialogEmployees, setDialogEmployees] = React.useState<AssignableEmployee[]>([])
    const [cellOpen, setCellOpen] = React.useState(false)
    const [cellCtx, setCellCtx] = React.useState<{ projectId: string; projectName: string; date: string; focusEntryId?: string } | null>(null)
    const [cellMilestones, setCellMilestones] = React.useState<{ id: string; name: string; color: string | null }[]>([])
    // Overdue work popup — load once on mount. Shows every page-load if any items
    // are still overdue; the only gate is the close button (no sessionStorage cache
    // so the alert stays visible until the data is cleared).
    const [overdueItems, setOverdueItems] = React.useState<OverdueEntry[]>([])
    const [overdueOpen, setOverdueOpen] = React.useState(false)
    const [unscheduledOpen, setUnscheduledOpen] = React.useState(false)
    // Task detail / quick log time — opened from clicking a task_code badge
    const [detailTask, setDetailTask] = React.useState<MyTask | null>(null)
    const [detailOpen, setDetailOpen] = React.useState(false)
    const [logTimeTask, setLogTimeTask] = React.useState<MyTask | null>(null)
    const [logTimeOpen, setLogTimeOpen] = React.useState(false)
    const [detailRefreshKey, setDetailRefreshKey] = React.useState(0)

    const openTaskDetail = async (taskId: string) => {
        const t = await getTaskDetail(taskId)
        if (!t) { alert('ไม่พบ Task'); return }
        setDetailTask(t)
        setDetailOpen(true)
    }
    // Bulk Convert state — opens BulkTaskModal pre-filled with the project's convertible tracking entries
    const [bulkConvertCtx, setBulkConvertCtx] = React.useState<{
        storyId: string
        storyCode: string
        projectName: string
        initialRows: { title: string; due_date: string; assignee_id: string }[]
        sourceIds: string[]    // parallel to initialRows — index N = tracking entry to link
    } | null>(null)

    const handleBulkConvert = async (projectId: string) => {
        const projName = dailyProjects.find(p => p.id === projectId)?.name || ''
        const conv = await getConvertibleEntriesForProject(projectId)
        if (!conv.success || conv.data.length === 0) {
            alert(conv.success ? 'ไม่มีกิจกรรมที่ยังไม่ได้แปลงเป็น Task' : ('โหลดไม่สำเร็จ: ' + conv.error))
            return
        }
        const story = await getOrCreateGeneralStory(projectId)
        if (!story.success) { alert('สร้าง story ไม่สำเร็จ: ' + story.error); return }
        setBulkConvertCtx({
            storyId: story.storyId,
            storyCode: story.storyCode,
            projectName: projName,
            initialRows: conv.data.map(e => ({
                title: e.title_clean,
                due_date: e.entry_date || '',
                assignee_id: e.assignee_id || '',
            })),
            sourceIds: conv.data.map(e => e.id),
        })
    }
    // Count of unscheduled tracking entries (entry_date IS NULL) — drives the toolbar badge.
    const [unscheduledCount, setUnscheduledCount] = React.useState(0)
    const refreshUnscheduledCount = React.useCallback(async () => {
        const { getUnscheduledTrackingEntries } = await import('@/lib/actions/team-tracking-actions')
        const r = await getUnscheduledTrackingEntries()
        if (r.success) setUnscheduledCount(r.data.length)
    }, [])
    React.useEffect(() => { refreshUnscheduledCount() }, [refreshUnscheduledCount])
    React.useEffect(() => {
        getOverdueTrackingEntries().then(r => {
            if (r.success && r.data.length > 0) {
                setOverdueItems(r.data)
                setOverdueOpen(true)
            }
        })
    }, [])

    // Load filter options + employees list once + apply default DEV / Active filters.
    // setFiltersReady at the END so the data-loading effect only fires AFTER defaults are in.
    React.useEffect(() => {
        Promise.all([getProjectFilterOptions({ year: windowStart.getFullYear() }), getAssignableEmployees()]).then(([res, empRes]) => {
            if (res.success && res.data) {
                const data = res.data as FilterOptions
                setOpts(data)
                const activeStatus = data.statuses.find(
                    s => s.code?.toLowerCase() === 'active' || s.name?.toLowerCase() === 'active'
                )
                const devType = data.projectTypes.find(t => t.code?.toUpperCase() === 'DEV')
                setFilters(prev => ({
                    ...prev,
                    statusId: prev.statusId || activeStatus?.id || '',
                    projectTypeIds: prev.projectTypeIds.length ? prev.projectTypeIds : (devType ? [devType.id] : []),
                }))
            }
            if (empRes.success && empRes.data) {
                setEmployees(empRes.data.map(e => ({
                    id: e.id, name: e.name, name_th: e.name_th || e.name,
                })))
            }
            setFiltersReady(true)
        })
    }, [])

    // Re-fetch customer list (with year-scoped project_count) whenever the year changes.
    // Skip the first run — the initial mount-effect above already loaded with the correct year.
    const yearRef = React.useRef(windowStart.getFullYear())
    React.useEffect(() => {
        const y = windowStart.getFullYear()
        if (y === yearRef.current) return
        yearRef.current = y
        getProjectFilterOptions({ year: y }).then(r => {
            if (r.success && r.data) {
                // Only swap the customer list — keep other options stable
                setOpts(prev => ({ ...prev, customers: (r.data as FilterOptions).customers }))
            }
        })
    }, [windowStart])

    // Load projects whenever filters OR window OR view change
    const reqIdRef = React.useRef(0)
    const load = React.useCallback(async () => {
        if (!filtersReady) return
        setLoading(true)
        const reqId = ++reqIdRef.current
        const winEnd = lastOfMonth(addMonths(windowStart, monthsInWindow - 1))
        const startIso = toISODate(windowStart)
        const endIso = toISODate(winEnd)

        if (view === 'todo') {
            // Todo mode: open tasks grouped by assignee.
            // The "พนักงาน" dropdown filters by *task assignee* here (the person doing the work),
            // not project_manager_id like the other views.
            const res = await getOpenTasksByAssignee({
                search: filters.search || undefined,
                statusIds: filters.statusId ? [filters.statusId] : undefined,
                typeIds: filters.projectTypeIds.length ? filters.projectTypeIds : undefined,
                assigneeIds: filters.employeeId ? [filters.employeeId] : undefined,
                milestoneConfigIds: filters.milestoneIds.length ? filters.milestoneIds : undefined,
                dateFilter: todoDate || undefined,
                includeDone: todoIncludeDone,
            })
            if (reqId !== reqIdRef.current) return
            if (res.success) setTodoBuckets(res.data)
        } else if (view === 'daily') {
            // Daily mode: fetch via team-tracking API (returns projects+entries for the cell grid).
            // If looking at the current calendar month, start from (today - 7 days) so the
            // user can see context from the past week. Otherwise start at first-of-month.
            const today = new Date()
            const sameMonth = windowStart.getFullYear() === today.getFullYear()
                && windowStart.getMonth() === today.getMonth()
            const back = sameMonth
                ? (() => { const d = new Date(today); d.setDate(d.getDate() - 7); return d })()
                : windowStart
            const ttFilters: ProjectFilters = {
                customerId: filters.customerId || undefined,
                // employeeId is interpreted as project_manager_id here (Gantt/Daily list projects by PM)
                managerId: filters.employeeId || undefined,
                statusId: filters.statusId || undefined,
                // Multi-select project types — server now supports `projectTypeIds`.
                projectTypeIds: filters.projectTypeIds.length ? filters.projectTypeIds : undefined,
                milestoneIds: filters.milestoneIds.length ? filters.milestoneIds : undefined,
                search: filters.search || undefined,
            }
            // Daily view extends the window by DAILY_TRAIL_DAYS past end-of-month
            const dailyEndDate = new Date(lastOfMonth(windowStart))
            dailyEndDate.setDate(dailyEndDate.getDate() + DAILY_TRAIL_DAYS)
            const res = await getTeamTrackingData(ttFilters, toISODate(back), toISODate(dailyEndDate))
            if (reqId !== reqIdRef.current) return
            if (res.success && res.data) {
                setDailyProjects(res.data.projects)
                setDailyEntries(res.data.entries)
            }
        } else {
            // Gantt mode: fetch via gantt-overview API (returns project bars).
            // NB: we deliberately pass empty start/end so the SQL date-range filter
            // is skipped — the user wants every project matching the other filters
            // to appear as a ROW, even if its timeline is fully outside the window
            // (the bar just won't render then, via computeBarPosition returning null).
            const payload: GanttListFilters = {
                search: filters.search || undefined,
                statusIds: filters.statusId ? [filters.statusId] : undefined,
                typeIds: filters.projectTypeIds.length ? filters.projectTypeIds : undefined,
                // employeeId interpreted as project_manager_id here
                projectManagerIds: filters.employeeId ? [filters.employeeId] : undefined,
                milestoneConfigIds: filters.milestoneIds.length ? filters.milestoneIds : undefined,
            }
            const res = await getProjectsForGantt('', '', payload)
            if (reqId !== reqIdRef.current) return
            if (res.success) setRows(res.data)
        }
        setLoading(false)
    }, [filters, windowStart, view, monthsInWindow, filtersReady, todoDate, todoIncludeDone])

    React.useEffect(() => { load() }, [load])

    // Open Edit Project modal in-place (instead of navigating to /projects/{id})
    const handleEditProject = async (projectId: string) => {
        const res = await getProjectById(projectId)
        if (res.success && res.data) {
            setEditProjectModal({ open: true, project: res.data })
        } else {
            alert('โหลดข้อมูลโครงการไม่สำเร็จ')
        }
    }

    // Cell click in daily view. Two paths:
    //   - existing entry (focusEntryId set, OR there are entries on this date) → open
    //     TrackingCellDialog so the user can edit. Toggle is ignored here.
    //   - empty cell + toggle = "task" → open BulkTaskModal pre-filled with 1 row.
    //   - empty cell + toggle = "activity" → open TrackingCellDialog with empty form.
    const handleCellClick = async (projectId: string, date: string, focusEntryId?: string) => {
        const proj = dailyProjects.find(p => p.id === projectId)
        if (!proj) return

        const hasEntryToday = focusEntryId || dailyEntries.some(e =>
            e.project_id === projectId && (
                e.entry_date === date ||
                (e.status === 'DONE' && e.completed_date === date) ||
                (e.status === 'POSTPONED' && e.postponed_date === date)
            ))

        // Always open activity slide. Task creation is via the "+ Task" button on the row.
        void hasEntryToday
        setCellCtx({ projectId, projectName: proj.name, date, focusEntryId })
        setCellOpen(true)
        if (dialogEmployees.length === 0) {
            const r = await getAssignableEmployees()
            if (r.success && r.data) setDialogEmployees(r.data)
        }
        const m = await getProjectMilestones(projectId)
        if (m.success) setCellMilestones(m.data)
    }

    const cellEntries = React.useMemo(() => {
        if (!cellCtx) return [] as TrackingEntry[]
        return dailyEntries.filter(e => {
            if (e.project_id !== cellCtx.projectId) return false
            if (e.entry_date === cellCtx.date) return true
            if (e.status === 'POSTPONED' && e.postponed_date === cellCtx.date) return true
            if (e.status === 'DONE' && e.completed_date === cellCtx.date) return true
            return false
        })
    }, [dailyEntries, cellCtx])

    // Client-side customer filter (server-side will be added later)
    const filteredRows = React.useMemo(() => {
        if (!filters.customerId) return rows
        // We need a customer match — but row doesn't carry customer_id. Use customer_name match for now.
        const c = opts.customers.find(c => c.id === filters.customerId)
        if (!c) return rows
        return rows.filter(r => r.customer_name === c.name)
    }, [rows, filters.customerId, opts.customers])

    // Sort by clicked column header. 3-state: asc → desc → none.
    // Default = milestone ASC (Marketing → Mapping Data → ... → Close Go-Live) per user's
    // preferred lifecycle ordering.
    type SortKey = 'code' | 'name' | 'due' | 'milestone'
    const [sortKey, setSortKey] = React.useState<SortKey | null>('milestone')
    const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')
    const toggleSort = (k: SortKey) => {
        if (sortKey !== k) { setSortKey(k); setSortDir('asc'); return }
        if (sortDir === 'asc') setSortDir('desc')
        else { setSortKey(null); setSortDir('asc') }
    }
    const sortedRows = React.useMemo(() => {
        if (!sortKey) return filteredRows
        const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' })
        const arr = [...filteredRows]
        arr.sort((a, b) => {
            // Milestone column sorts by lifecycle (Marketing → Mapping Data → System Test → UAT → Go-Live → Close)
            // via milestone_configs.sort_order — NOT by alphabetical name.
            if (sortKey === 'milestone') {
                const so = (x: GanttProjectRow) => x.current_milestone_sort_order ?? Number.MAX_SAFE_INTEGER
                return so(a) - so(b)
            }
            let va: string, vb: string
            switch (sortKey) {
                case 'code': va = a.project_code || ''; vb = b.project_code || ''; break
                case 'name': va = a.name_th || a.name || ''; vb = b.name_th || b.name || ''; break
                case 'due':  va = a.end_date || '9999-12-31'; vb = b.end_date || '9999-12-31'; break
            }
            return collator.compare(va!, vb!)
        })
        if (sortDir === 'desc') arr.reverse()
        return arr
    }, [filteredRows, sortKey, sortDir])

    // In Gantt mode we tack on a partial trailing month covering GANTT_TRAIL_DAYS
    // extra days past the last full month. Daily/Todo modes don't use this.
    const trail = view === 'gantt'
    const months = React.useMemo(() => {
        const arr: Date[] = []
        for (let i = 0; i < monthsInWindow; i++) arr.push(addMonths(windowStart, i))
        if (trail) {
            // 4th entry is the start of the month right after the window
            arr.push(addMonths(windowStart, monthsInWindow))
        }
        return arr
    }, [windowStart, monthsInWindow, trail])
    const rangeStart = months[0]
    // rangeEnd = last full month's end + 15 days (when trail is on), or just last month end
    const rangeEnd = React.useMemo(() => {
        if (!trail) return lastOfMonth(months[months.length - 1])
        const lastFull = lastOfMonth(addMonths(windowStart, monthsInWindow - 1))
        const e = new Date(lastFull)
        e.setDate(e.getDate() + GANTT_TRAIL_DAYS)
        return e
    }, [months, trail, windowStart, monthsInWindow])
    const totalDays = daysBetween(rangeStart, rangeEnd) + 1

    const weeksPerMonth = React.useMemo(() => {
        if (!trail) return months.map(m => getWeeksForMonth(m))
        // First N months: full weeks. Last (partial) month: only up to rangeEnd.
        return months.map((m, i) => {
            if (i < monthsInWindow) return getWeeksForMonth(m)
            return getWeeksForRange(m, rangeEnd)
        })
    }, [months, trail, monthsInWindow, rangeEnd])
    const totalWeekCells = weeksPerMonth.reduce((a, ws) => a + ws.length, 0)

    // Week boundary % positions (excluding 0% and 100%) for the timeline column.
    // Use even-spacing so the lines align with the GridHeader's equal-width W columns
    // (`repeat(N, minmax(32px, 1fr))`). The row's timeline cell uses the same `repeat`,
    // so lines at `i/N * 100%` of the timeline width sit exactly on column boundaries.
    const weekBoundaryPcts = React.useMemo(() => {
        const out: number[] = []
        for (let i = 1; i < totalWeekCells; i++) {
            out.push((i / totalWeekCells) * 100)
        }
        return out
    }, [totalWeekCells])

    const setFilter = <K extends keyof UIFilters>(k: K, v: UIFilters[K]) =>
        setFilters(prev => ({ ...prev, [k]: v }))

    const goToToday = () => {
        const now = new Date()
        setWindowStart(new Date(now.getFullYear(), now.getMonth(), 1))
    }
    const shiftWindow = (deltaMonths: number) => {
        setWindowStart(prev => addMonths(prev, deltaMonths))
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden antialiased">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
                <div>
                    <h1 className="text-sm font-bold text-slate-900 tracking-tight">แผนภาพไทม์ไลน์โครงการ (Gantt Overview)</h1>
                    <p className="text-xs text-slate-500">
                        {thMonthShort(months[0])} {months[0].getFullYear() + 543}
                        {months.length > 1 && <>{' – '}{thMonthShort(months[months.length - 1])} {months[months.length - 1].getFullYear() + 543}</>}
                        {view === 'todo' ? (
                            <>
                                {' · '}<b>{todoBuckets.reduce((s, b) => s + b.task_count, 0)}</b> งาน
                                {' · '}<b>{todoBuckets.length}</b> คน
                                {' · '}<span className="text-slate-400">รายการงานต่อคน</span>
                            </>
                        ) : (
                            <>
                                {' · '}<b>{view === 'daily' ? dailyProjects.length : filteredRows.length}</b> โครงการ
                                {' · '}<span className="text-slate-400">{view === 'daily' ? 'มุมมองรายวัน' : 'มุมมอง Gantt'}</span>
                            </>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View toggle: Gantt | Daily */}
                    <div className="flex items-center border rounded-lg overflow-hidden bg-white shadow-sm">
                        <button
                            onClick={() => setView('gantt')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                                view === 'gantt'
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                            title="มุมมอง Gantt: 3 เดือน timeline bars"
                        >
                            <GanttChart className="w-3.5 h-3.5" />
                            Gantt
                        </button>
                        <button
                            onClick={() => setView('daily')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-slate-200 transition-colors",
                                view === 'daily'
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                            title="มุมมองรายวัน: 1 เดือน + icons แต่ละวัน"
                        >
                            <CalendarDays className="w-3.5 h-3.5" />
                            รายวัน
                        </button>
                        <button
                            onClick={() => setView('todo')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-slate-200 transition-colors",
                                view === 'todo'
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                            title="รายการงานค้างของแต่ละคน"
                        >
                            <ListTodo className="w-3.5 h-3.5" />
                            ToDo
                        </button>
                    </div>

                    {/* Daily-only: switch between "by assignee" (aggregated) and "by task" sub-rows */}
                    {view === 'daily' && (
                        <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                            <button
                                onClick={() => setDailySubRowMode('assignee')}
                                className={cn(
                                    "px-2.5 py-1.5 text-[11px] font-semibold",
                                    dailySubRowMode === 'assignee' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
                                )}
                                title="แสดงราย ผู้ปฏิบัติงาน"
                            >
                                ตามผู้ปฏิบัติงาน
                            </button>
                            <button
                                onClick={() => setDailySubRowMode('task')}
                                className={cn(
                                    "px-2.5 py-1.5 text-[11px] font-semibold border-l",
                                    dailySubRowMode === 'task' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
                                )}
                                title="แสดงรายงาน (1 บรรทัด = 1 task)"
                            >
                                ตามงาน
                            </button>
                        </div>
                    )}

                    {/* Hide completed tasks — only meaningful in task mode */}
                    {view === 'daily' && dailySubRowMode === 'task' && (
                        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 border rounded-lg bg-white hover:bg-slate-50">
                            <input
                                type="checkbox"
                                checked={dailyHideDone}
                                onChange={(e) => setDailyHideDone(e.target.checked)}
                                className="w-3.5 h-3.5 accent-indigo-600"
                            />
                            ซ่อนงานเสร็จ
                        </label>
                    )}


                    <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                        <button onClick={() => shiftWindow(-1)} className="p-1.5 hover:bg-slate-50 border-r" title={view === 'daily' ? "เดือนก่อนหน้า" : "เดือนก่อนหน้า"}>
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={goToToday} className="px-3 hover:bg-slate-50 text-xs font-medium text-slate-600" title="กระโดดมาเดือนปัจจุบัน">
                            วันนี้
                        </button>
                        <button onClick={() => shiftWindow(1)} className="p-1.5 hover:bg-slate-50 border-l" title="เดือนถัดไป">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    {/* "งานยังไม่ระบุวัน" — opens a pane to schedule action-plan templates.
                        Shows a red badge with the count so it's hard to miss. */}
                    <button
                        onClick={() => setUnscheduledOpen(true)}
                        className={cn(
                            "px-2.5 py-1.5 text-[11px] font-semibold rounded-lg inline-flex items-center gap-1.5 border",
                            unscheduledCount > 0
                                ? "text-red-700 border-red-300 bg-red-50 hover:bg-red-100 animate-pulse"
                                : "text-slate-500 border-slate-200 bg-white hover:bg-slate-50",
                        )}
                        title="งานที่ยังไม่ได้กำหนดวันที่ (action plan รอกระจาย)"
                    >
                        📌 งานยังไม่ระบุวัน
                        {unscheduledCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold text-white bg-red-600">
                                {unscheduledCount}
                            </span>
                        )}
                    </button>
                    <button onClick={load} className="p-1.5 hover:bg-slate-100 rounded-lg border text-slate-500">
                        <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Filter bar — pattern from /team-tracking */}
            <div className="bg-white/80 px-4 py-2.5 border-b border-slate-200/60 shrink-0">
                <div className="flex flex-wrap items-end gap-3">
                    {/* Year — quick jump to Jan of selected year */}
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">กระโดดไปปี</span>
                        <select
                            value={windowStart.getFullYear()}
                            onChange={(e) => setWindowStart(new Date(parseInt(e.target.value), 0, 1))}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs min-w-[90px] bg-slate-50/50 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white transition-all outline-none shadow-sm font-medium"
                        >
                            {(opts.years.length ? opts.years : [windowStart.getFullYear()]).map(y => (
                                <option key={y} value={y}>{y + 543}</option>
                            ))}
                        </select>
                    </div>

                    {/* Customer — top-5 quick-picks + searchable combobox for the long tail */}
                    <div className="flex flex-col gap-1 min-w-[260px]">
                        {opts.customers.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {opts.customers
                                    .filter(c => (c.project_count ?? 0) > 0)
                                    .slice(0, 5)
                                    .map(c => {
                                    const active = filters.customerId === c.id
                                    // Short label — drop the corporate prefix "บริษัท" so the chip stays compact
                                    const shortName = c.name
                                        .replace(/^บริษัท\s*/, '')
                                        .replace(/\s*จำกัด(\s*\(มหาชน\))?$/, '')
                                        .replace(/\s*จํากัด(\s*\(มหาชน\))?$/, '')
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setFilter('customerId', active ? '' : c.id)}
                                            className={cn(
                                                "px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors max-w-[90px] inline-flex items-center gap-1",
                                                active
                                                    ? "bg-indigo-600 text-white border-indigo-600"
                                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                            )}
                                            title={c.name + (c.project_count ? ` · ${c.project_count} โครงการ` : '')}
                                        >
                                            <span className="truncate">{shortName}</span>
                                            {c.project_count != null && (
                                                <span className={cn(
                                                    "text-[8px] font-bold px-1 rounded-full shrink-0",
                                                    active ? "bg-white/30 text-white" : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {c.project_count}
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                        <div className="[&_button]:!py-1.5 [&_button]:!px-2.5 [&_button]:!text-xs [&_button]:!rounded-lg [&_button]:bg-slate-50/50 [&_button]:border-slate-200 [&_button]:hover:bg-slate-50">
                            <SmartCombobox
                                placeholder="ค้นหาลูกค้าทั้งหมด..."
                                options={[
                                    { value: '', label: 'ลูกค้าทั้งหมด' },
                                    ...opts.customers.map((c) => ({
                                        value: c.id,
                                        label: c.project_count ? `${c.name}  (${c.project_count})` : c.name,
                                    })),
                                ]}
                                value={
                                    filters.customerId
                                        ? opts.customers.find(c => c.id === filters.customerId)
                                            ? { value: filters.customerId, label: opts.customers.find(c => c.id === filters.customerId)!.name }
                                            : null
                                        : { value: '', label: 'ลูกค้าทั้งหมด' }
                                }
                                onChange={(opt) => setFilter('customerId', String(opt?.value || ''))}
                                maxDisplayItems={15}
                            />
                        </div>
                    </div>

                    {/* Employee / Assignee — in Todo view filters task assignee; in Gantt/Daily filters project PM */}
                    <div className="flex flex-col gap-1 min-w-[170px]">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {view === 'todo' ? 'ผู้ปฏิบัติงาน' : 'พนักงาน'}
                        </span>
                        <div className="[&_button]:!py-1.5 [&_button]:!px-2.5 [&_button]:!text-xs [&_button]:!rounded-lg [&_button]:bg-slate-50/50 [&_button]:border-slate-200 [&_button]:hover:bg-slate-50">
                            <SmartCombobox
                                placeholder="ทุกคน"
                                options={[
                                    { value: '', label: 'ทุกคน' },
                                    ...employees.map((e) => ({ value: e.id, label: e.name_th || e.name })),
                                ]}
                                value={
                                    filters.employeeId
                                        ? employees.find(e => e.id === filters.employeeId)
                                            ? {
                                                value: filters.employeeId,
                                                label: employees.find(e => e.id === filters.employeeId)!.name_th
                                                    || employees.find(e => e.id === filters.employeeId)!.name,
                                            }
                                            : null
                                        : { value: '', label: 'ทุกคน' }
                                }
                                onChange={(opt) => setFilter('employeeId', String(opt?.value || ''))}
                                maxDisplayItems={10}
                            />
                        </div>
                    </div>

                    {/* Type — multi-select */}
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ประเภทงาน</span>
                        <ChipMultiSelect
                            placeholderAll="ทุกประเภท"
                            options={opts.projectTypes.map(t => ({
                                id: t.id,
                                label: t.code,
                                color: t.color,
                            }))}
                            value={filters.projectTypeIds}
                            onChange={(ids) => setFilter('projectTypeIds', ids)}
                        />
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">สถานะ</span>
                        <select
                            value={filters.statusId}
                            onChange={(e) => setFilter('statusId', e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs min-w-[110px] bg-slate-50/50 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white transition-all outline-none shadow-sm font-medium"
                        >
                            <option value="">ทุกสถานะ</option>
                            {opts.statuses.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Milestone — multi-select */}
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Milestone</span>
                        <ChipMultiSelect
                            placeholderAll="ทั้งหมด"
                            options={opts.milestones.map(m => ({
                                id: m.id,
                                // User wants English names (Marketing / Mapping Data / ...)
                                // matching the milestone_configs settings page.
                                label: m.name || m.name_th || m.code,
                                color: m.color,
                            }))}
                            value={filters.milestoneIds}
                            onChange={(ids) => setFilter('milestoneIds', ids)}
                        />
                    </div>

                    {/* Search */}
                    <div className="flex flex-col gap-1 relative ml-auto w-56">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ค้นหาโครงการ</span>
                        <div className="relative w-full">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => setFilter('search', e.target.value)}
                                placeholder="ค้นหาชื่อ/รหัสโครงการ..."
                                className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:border-indigo-500 transition-all shadow-inner outline-none font-medium"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto">
                {view === 'todo' ? (
                    <TasksByAssigneeView
                        buckets={todoBuckets}
                        isLoading={loading}
                        date={todoDate}
                        onDateChange={setTodoDate}
                        includeDone={todoIncludeDone}
                        onIncludeDoneChange={setTodoIncludeDone}
                        onProjectClick={handleEditProject}
                        onMarkDone={async (task) => {
                            // Personal todos and project entries live in different tables.
                            const res = task.is_personal
                                ? await markPersonalTodoDone(task.id)
                                : await markTrackingEntryDone(task.id)
                            if (res.success) {
                                // Optimistically drop the row, then refresh
                                setTodoBuckets(prev => prev
                                    .map(b => ({ ...b, tasks: b.tasks.filter(t => t.id !== task.id) }))
                                    .map(b => ({
                                        ...b,
                                        task_count: b.tasks.length,
                                        overdue_count: b.tasks.filter(t => t.is_overdue).length,
                                    }))
                                    .filter(b => b.task_count > 0)
                                )
                                load()
                            } else {
                                alert('บันทึกสถานะไม่สำเร็จ: ' + (res.error || ''))
                            }
                        }}
                        onCreatePersonal={async ({ title, due_date }) => {
                            const res = await createPersonalTodo({ title, due_date })
                            if (res.success) {
                                load()
                            } else {
                                alert('เพิ่มงานไม่สำเร็จ: ' + (res.error || ''))
                            }
                        }}
                        onDeletePersonal={async (taskId) => {
                            if (!confirm('ลบงานนี้?')) return
                            const res = await deletePersonalTodo(taskId)
                            if (res.success) {
                                setTodoBuckets(prev => prev
                                    .map(b => ({ ...b, tasks: b.tasks.filter(t => t.id !== taskId) }))
                                    .map(b => ({
                                        ...b,
                                        task_count: b.tasks.length,
                                        overdue_count: b.tasks.filter(t => t.is_overdue).length,
                                    }))
                                    .filter(b => b.task_count > 0)
                                )
                                load()
                            } else {
                                alert('ลบไม่สำเร็จ: ' + (res.error || ''))
                            }
                        }}
                    />
                ) : view === 'daily' ? (
                    /* Daily view — reuse TrackingGrid from /team-tracking */
                    <div className="p-1.5">
                        <TrackingGrid
                            projects={dailyProjects}
                            entries={dailyEntries}
                            year={windowStart.getFullYear()}
                            month={windowStart.getMonth() + 1}
                            /* Rolling window: -7d from TODAY (only when viewing current month);
                               otherwise show the navigated month from the 1st. */
                            startDate={(() => {
                                const today = new Date()
                                const sameMonth = windowStart.getFullYear() === today.getFullYear()
                                    && windowStart.getMonth() === today.getMonth()
                                if (sameMonth) {
                                    const d = new Date(today); d.setDate(d.getDate() - 7)
                                    return toISODate(d)
                                }
                                return toISODate(windowStart)
                            })()}
                            endDate={(() => {
                                const e = new Date(lastOfMonth(windowStart))
                                e.setDate(e.getDate() + DAILY_TRAIL_DAYS)
                                return toISODate(e)
                            })()}
                            onCellClick={handleCellClick}
                            onProjectClick={handleEditProject}
                            isLoading={loading && dailyProjects.length === 0}
                            highlightFilter={null}
                            showCustomer={false}
                            subRowMode={dailySubRowMode}
                            hideCompletedTasks={dailyHideDone}
                            onBulkConvert={handleBulkConvert}
                            onProjectNameClick={(pid) => setOpenProjectId(pid)}
                            onTaskCodeClick={(taskId) => openTaskDetail(taskId)}
                            onCreateTask={async (pid) => {
                                const proj = dailyProjects.find(p => p.id === pid)
                                if (!proj) return
                                const story = await getOrCreateGeneralStory(pid)
                                if (!story.success) { alert('สร้าง story ไม่สำเร็จ: ' + story.error); return }
                                setBulkConvertCtx({
                                    storyId: story.storyId,
                                    storyCode: story.storyCode,
                                    projectName: proj.name,
                                    initialRows: [],   // empty → BulkTaskModal falls back to 10 empty rows
                                    sourceIds: [],
                                })
                            }}
                        />
                    </div>
                ) : (
                    <div className="min-w-[1500px]">
                        <GridHeader
                            months={months}
                            weeksPerMonth={weeksPerMonth}
                            totalWeekCells={totalWeekCells}
                            codeCol={{ width: 90, label: 'รหัส' }}
                            thirdCol={{ width: 150, label: 'มายสโตนปัจจุบัน' }}
                            sort={{
                                activeKey: sortKey,
                                dir: sortDir,
                                onToggle: (k) => toggleSort(k as SortKey),
                            }}
                        />
                        {loading && filteredRows.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 text-xs">กำลังโหลด...</div>
                        ) : filteredRows.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 text-xs">
                                ไม่พบโครงการตามฟิลเตอร์ที่เลือก
                            </div>
                        ) : (
                            sortedRows.map((row) => (
                                <ProjectRow
                                    key={row.id}
                                    row={row}
                                    rangeStart={rangeStart}
                                    totalDays={totalDays}
                                    gridPcts={weekBoundaryPcts}
                                    totalWeekCells={totalWeekCells}
                                    onClick={() => setOpenProjectId(row.id)}
                                    onCodeClick={() => handleEditProject(row.id)}
                                    onUpdateProgress={async (milestoneId, percent) => {
                                        // Optimistic: bump the row's % locally; the next load() reconciles.
                                        setRows(prev => prev.map(r => r.id === row.id ? { ...r, progress: percent } : r))
                                        const res = await updateMilestoneProgress(milestoneId, percent)
                                        if (res.success) load()
                                        else { alert('บันทึก % ไม่สำเร็จ: ' + (res.error || '')); load() }
                                    }}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>

            {openProjectId && (
                <ProjectDetailPopup
                    projectId={openProjectId}
                    months={months}
                    rangeStart={rangeStart}
                    totalDays={totalDays}
                    weeksPerMonth={weeksPerMonth}
                    onClose={() => setOpenProjectId(null)}
                />
            )}

            {/* Edit Project modal — opened by clicking the project code */}
            {editProjectModal.project && (
                <ProjectModal
                    open={editProjectModal.open}
                    onClose={() => setEditProjectModal({ open: false, project: null })}
                    mode="edit"
                    project={editProjectModal.project}
                    onSuccess={() => {
                        setEditProjectModal({ open: false, project: null })
                        load()
                    }}
                />
            )}

            {/* Daily-mode cell dialog */}
            <TrackingCellDialog
                open={cellOpen}
                onClose={() => setCellOpen(false)}
                onSaved={() => load()}
                projectId={cellCtx?.projectId ?? ''}
                projectName={cellCtx?.projectName ?? ''}
                entryDate={cellCtx?.date ?? ''}
                entries={cellEntries}
                employees={dialogEmployees}
                milestones={cellMilestones}
                initialEntryId={cellCtx?.focusEntryId}
            />

            <OverdueWorkDialog
                open={overdueOpen}
                items={overdueItems}
                onClose={() => setOverdueOpen(false)}
                onOpenItem={(it) => {
                    setOverdueOpen(false)
                    handleCellClick(it.project_id, it.entry_date, it.id)
                }}
            />

            <UnscheduledPane
                open={unscheduledOpen}
                onClose={() => setUnscheduledOpen(false)}
                onChanged={() => { load(); refreshUnscheduledCount() }}
            />

            {/* Task detail + quick log time — opened from clicking task_code badge in task rows */}
            <TaskDetailModal
                open={detailOpen}
                onOpenChange={setDetailOpen}
                task={detailTask}
                onLogTime={(t) => { setLogTimeTask(t); setLogTimeOpen(true) }}
                onStatusChange={async (t, newStatus, reason) => {
                    const r = await myTasksUpdateStatus(t.task_id, newStatus, reason)
                    if (r.success) {
                        // refresh: pull fresh task detail + reload daily grid
                        const fresh = await getTaskDetail(t.task_id)
                        if (fresh) setDetailTask(fresh)
                        load()
                    } else {
                        alert(r.error || 'อัพเดตสถานะไม่สำเร็จ')
                    }
                }}
                onDataChange={() => load()}
                refreshTrigger={detailRefreshKey}
                canUnassign={false}
            />

            <QuickLogTimeModal
                open={logTimeOpen}
                onOpenChange={setLogTimeOpen}
                task={logTimeTask}
                postLogAction={async () => {
                    // After logging time, the task's progress / hours may change → refresh
                    if (detailTask) {
                        const fresh = await getTaskDetail(detailTask.task_id)
                        if (fresh) setDetailTask(fresh)
                    }
                    setDetailRefreshKey(k => k + 1)
                    load()
                }}
            />

            {/* Bulk-convert tracking entries → tasks. Reuses BulkTaskModal pre-filled. */}
            {bulkConvertCtx && (
                <BulkTaskModal
                    isOpen={!!bulkConvertCtx}
                    onClose={() => setBulkConvertCtx(null)}
                    storyId={bulkConvertCtx.storyId}
                    storyCode={bulkConvertCtx.storyCode}
                    storyTitle={`${bulkConvertCtx.projectName} (auto-General)`}
                    headerTitle="แปลงกิจกรรม → Task"
                    initialRows={bulkConvertCtx.initialRows}
                    onTasksCreated={async (taskIds) => {
                        // `createTasksBulk` already auto-mirrors each new task into a
                        // tracking entry, so we don't call createTrackingEntriesForTasks
                        // here anymore — calling it would duplicate.
                        //
                        // For the bulk-convert path (sourceIds set): link the OLD source
                        // entries to the new tasks AND delete the auto-mirrored duplicates
                        // (the auto-mirrors are the freshest entries with task_id set but
                        // a different id than any of our sourceIds).
                        if (bulkConvertCtx.sourceIds.length > 0) {
                            const pairs = taskIds.map((tid, i) => ({
                                trackingId: bulkConvertCtx.sourceIds[i],
                                taskId: tid,
                            })).filter(p => p.trackingId)
                            // Delete auto-mirrored entries first (those with task_id set but
                            // id NOT in our sourceIds) so the link-back doesn't leave dupes.
                            const { deleteAutoMirroredEntries } = await import('@/lib/actions/team-tracking-actions')
                            await deleteAutoMirroredEntries(taskIds, bulkConvertCtx.sourceIds)
                            await linkTrackingEntriesToTasks(pairs)
                        }
                        load()
                        refreshUnscheduledCount()
                    }}
                    onSuccess={() => setBulkConvertCtx(null)}
                />
            )}
        </div>
    )
}

// ============================================================
// Generic checkbox-popover multi-select. Used by Milestone + Project Type filters.
// ============================================================

interface ChipOpt {
    id: string
    label: string
    color?: string
}

function ChipMultiSelect({
    options, value, onChange, placeholderAll = 'ทั้งหมด',
}: {
    options: ChipOpt[]
    value: string[]
    onChange: (ids: string[]) => void
    placeholderAll?: string
}) {
    const [open, setOpen] = React.useState(false)
    const wrapRef = React.useRef<HTMLDivElement | null>(null)

    React.useEffect(() => {
        if (!open) return
        const onDoc = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [open])

    const toggle = (id: string) => {
        if (value.includes(id)) onChange(value.filter(x => x !== id))
        else onChange([...value, id])
    }

    const label = value.length === 0
        ? placeholderAll
        : value.length === 1
            ? (options.find(o => o.id === value[0])?.label || '1 รายการ')
            : `${value.length} รายการ`

    return (
        <div className="relative" ref={wrapRef}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={cn(
                    "px-2.5 py-1.5 border rounded-lg text-xs min-w-[130px] text-left bg-slate-50/50 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white transition-all outline-none shadow-sm font-medium flex items-center justify-between gap-2",
                    value.length > 0 ? "border-indigo-300 text-indigo-700" : "border-slate-200 text-slate-600"
                )}
            >
                <span className="truncate">{label}</span>
                <span className="text-slate-400 shrink-0">▾</span>
            </button>
            {open && (
                <div className="absolute z-30 mt-1 w-64 max-h-72 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1">
                    <div className="flex items-center justify-end px-3 py-1.5 border-b border-slate-100 sticky top-0 bg-white">
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                            disabled={value.length === 0}
                        >
                            ล้าง
                        </button>
                    </div>
                    {options.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400">ไม่มีข้อมูล</div>
                    ) : options.map(opt => {
                        const checked = value.includes(opt.id)
                        return (
                            <label
                                key={opt.id}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50",
                                    checked && "bg-indigo-50/40"
                                )}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(opt.id)}
                                    className="w-3.5 h-3.5 rounded accent-indigo-600"
                                />
                                {opt.color && (
                                    <span
                                        className="w-2 h-2 rounded-sm shrink-0"
                                        style={{ background: opt.color }}
                                    />
                                )}
                                <span className="text-xs text-slate-700 truncate">{opt.label}</span>
                            </label>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ============================================================
// Header (used by main + sub-gantt — exported)
// ============================================================

interface GridHeaderProps {
    months: Date[]
    weeksPerMonth: { start: Date; days: number }[][]
    totalWeekCells: number
    leftWidth?: number
    midWidth?: number
    /** Optional leading column (e.g. "รหัส") rendered to the LEFT of the name column. */
    codeCol?: { width: number; label: string }
    /** Optional third fixed column (e.g. "มายสโตนปัจจุบัน") rendered between midWidth and the timeline. */
    thirdCol?: { width: number; label: string }
    /** Optional extra fixed columns rendered after thirdCol, before the month timeline.
     *  Used by the main Gantt Overview to surface key milestone dates (UAT / Go-Live / Close). */
    extraCols?: { width: number; label: string }[]
    compact?: boolean
    /** When provided, the fixed column headers become clickable sort triggers. */
    sort?: {
        activeKey: string | null
        dir: 'asc' | 'desc'
        onToggle: (key: 'code' | 'name' | 'due' | 'milestone') => void
    }
}

// Sortable header cell helper — adds arrow indicator + click handler
function SortHeader({
    label, sortKey, sort, compact, stickyLeft,
}: {
    label: string
    sortKey: 'code' | 'name' | 'due' | 'milestone'
    sort?: GridHeaderProps['sort']
    compact: boolean
    /** When set, the header cell becomes `position: sticky` with this left offset (px).
     *  Keeps the label visible while the timeline scrolls horizontally. */
    stickyLeft?: number
}) {
    const base = cn(
        "px-3 text-xs font-semibold text-slate-700 border-r border-slate-200 bg-slate-50",
        compact ? "py-1.5" : "py-2",
        stickyLeft != null && "sticky z-20",
    )
    const style = stickyLeft != null ? { left: `${stickyLeft}px` } : undefined
    if (!sort) return <div className={base} style={style}>{label}</div>
    const isActive = sort.activeKey === sortKey
    return (
        <button
            type="button"
            onClick={() => sort.onToggle(sortKey)}
            style={style}
            className={cn(base, "text-left inline-flex items-center gap-1 hover:bg-slate-100 transition-colors cursor-pointer select-none", isActive && "text-indigo-700")}
        >
            {label}
            <span className={cn("text-[10px]", isActive ? "text-indigo-600" : "text-slate-300")}>
                {isActive ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}
            </span>
        </button>
    )
}

export function GridHeader({
    months, weeksPerMonth, totalWeekCells,
    leftWidth = 260, midWidth = 100, codeCol, thirdCol, extraCols, compact = false, sort,
}: GridHeaderProps) {
    const codePart = codeCol ? `${codeCol.width}px ` : ''
    const thirdPart = thirdCol ? `${thirdCol.width}px ` : ''
    const extraPart = (extraCols && extraCols.length)
        ? extraCols.map(c => `${c.width}px`).join(' ') + ' '
        : ''
    return (
        <>
            {/* MONTH header — uses the same week-based grid as the W row below it.
                Each month spans `weeksPerMonth[i].length` columns so the boundaries
                line up exactly with W column boundaries. */}
            <div className="grid sticky top-0 z-20 bg-slate-50 border-b border-slate-200"
                style={{ gridTemplateColumns: `${codePart}${leftWidth}px ${midWidth}px ${thirdPart}${extraPart}repeat(${totalWeekCells}, minmax(32px, 1fr))` }}>
                {/* Pin the first two/three label columns so they stay visible while the
                    timeline scrolls horizontally. Offsets accumulate from the left. */}
                {codeCol && (
                    <SortHeader label={codeCol.label} sortKey="code" sort={sort} compact={compact} stickyLeft={0} />
                )}
                <SortHeader label={compact ? 'กิจกรรม' : 'โครงการ'} sortKey="name" sort={sort} compact={compact} stickyLeft={codeCol ? codeCol.width : 0} />
                <SortHeader label="กำหนดส่ง" sortKey="due" sort={sort} compact={compact} stickyLeft={(codeCol ? codeCol.width : 0) + leftWidth} />
                {thirdCol && (
                    <SortHeader label={thirdCol.label} sortKey="milestone" sort={sort} compact={compact} />
                )}
                {extraCols?.map((c, i) => (
                    <div key={i} className={cn("px-2 text-[10px] font-semibold text-slate-600 border-r border-slate-200 tracking-tight text-center", compact ? "py-1.5" : "py-2")}>
                        {c.label}
                    </div>
                ))}
                {months.map((m, i) => (
                    <div
                        key={i}
                        className={cn("px-2 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 tracking-tight", compact ? "py-1.5" : "py-2")}
                        style={{ gridColumn: `span ${weeksPerMonth[i]?.length || 1}` }}
                    >
                        {thMonthShort(m)}
                    </div>
                ))}
            </div>

            <div className={cn("grid sticky z-20 bg-slate-50/80 border-b border-slate-200 text-xs text-slate-700", compact ? "top-[30px]" : "top-[36px]")}
                style={{ gridTemplateColumns: `${codePart}${leftWidth}px ${midWidth}px ${thirdPart}${extraPart}repeat(${totalWeekCells}, minmax(32px, 1fr))` }}>
                {codeCol && <div className="border-r border-slate-200" />}
                <div className="border-r border-slate-200" />
                <div className="border-r border-slate-200" />
                {thirdCol && <div className="border-r border-slate-200" />}
                {extraCols?.map((_, i) => (
                    <div key={i} className="border-r border-slate-200" />
                ))}
                {weeksPerMonth.flatMap((weeks, monthIdx) =>
                    weeks.map((w, wIdx) => {
                        // Absolute week-of-year — W1 == first week containing Jan 1 of THIS week's year.
                        // Counted in calendar weeks from Jan 1 (not ISO weeks) for predictability.
                        const jan1 = new Date(w.start.getFullYear(), 0, 1)
                        const daysFromJan1 = Math.floor((w.start.getTime() - jan1.getTime()) / 86400000)
                        const absWeek = Math.floor(daysFromJan1 / 7) + 1
                        return (
                            <div key={`${monthIdx}-${wIdx}`} className="text-center py-1 border-r border-slate-100 text-[9px] font-normal text-slate-400 tabular-nums">
                                W{absWeek}
                            </div>
                        )
                    })
                )}
            </div>
        </>
    )
}

// ============================================================
// Project row
// ============================================================

interface ProjectRowProps {
    row: GanttProjectRow
    rangeStart: Date
    totalDays: number
    gridPcts: number[]
    /** Number of W columns — used to mirror the header's `repeat(N, minmax(32px, 1fr))` so
     *  vertical grid lines and the bar both line up with the W column dividers. */
    totalWeekCells: number
    onClick: () => void
    onCodeClick: () => void
    /** Inline edit handler — called when the user types a new % on the bar chip.
     *  Targets the row's CURRENT milestone; the project-level % then recomputes from the avg. */
    onUpdateProgress?: (milestoneId: string, percent: number) => Promise<void> | void
}

// Single accent color for all timeline bars — keeps the board calm and lets the
// progress fill itself communicate status. Milestone phase still surfaces via the
// "มายสโตนปัจจุบัน" column (which keeps its own per-phase color marker).
const BAR_COLOR = '#6366f1'   // indigo-500

function ProjectRow({ row, rangeStart, totalDays, gridPcts, totalWeekCells, onClick, onCodeClick, onUpdateProgress }: ProjectRowProps) {
    const bar = computeBarPosition(row.start_date, row.end_date, rangeStart, totalDays)
    const color = BAR_COLOR
    const msColor = row.current_milestone_color || '#64748b'

    // Inline edit state for the % chip
    const [editing, setEditing] = React.useState(false)
    const [pctDraft, setPctDraft] = React.useState<string>(String(row.progress))
    const [saving, setSaving] = React.useState(false)
    const canEdit = !!(onUpdateProgress && row.current_milestone_id)

    const commit = async () => {
        if (!canEdit || saving) return
        const n = Math.max(0, Math.min(100, Math.round(Number(pctDraft) || 0)))
        setSaving(true)
        try {
            await onUpdateProgress!(row.current_milestone_id!, n)
        } finally {
            setSaving(false)
            setEditing(false)
        }
    }
    const cancelEdit = () => {
        setPctDraft(String(row.progress))
        setEditing(false)
    }

    return (
        <div
            className="group grid border-b border-slate-100 hover:bg-indigo-50/40 transition-colors relative cursor-pointer"
            style={{ gridTemplateColumns: `90px 260px 100px 150px repeat(${totalWeekCells}, minmax(32px, 1fr))`, minHeight: 48 }}
            onClick={onClick}
        >
            {/* Project code — opens Edit Project modal in-place (not the activity popup). */}
            <div className="px-3 py-2 border-r border-slate-200 flex items-center">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onCodeClick() }}
                    className="text-xs font-semibold font-mono text-indigo-600 hover:text-indigo-800 hover:underline"
                    title="แก้ไขโครงการ"
                >
                    {row.project_code}
                </button>
            </div>
            <div className="px-3 py-2 border-r border-slate-200 flex items-center">
                <div className="text-xs font-medium text-slate-800 truncate">
                    {row.name_th || row.name}
                </div>
            </div>
            <div className="px-3 py-2 border-r border-slate-200 flex items-center text-xs font-mono text-slate-700">
                {thShortDate(row.end_date)}
            </div>
            <div className="px-3 py-2 border-r border-slate-200 flex items-center gap-1.5 min-w-0">
                {row.current_milestone_name ? (
                    <>
                        <span className="w-1.5 h-4 rounded-sm shrink-0" style={{ background: msColor }} />
                        <span className="text-xs font-semibold text-slate-800 truncate">
                            {row.current_milestone_name}
                        </span>
                    </>
                ) : (
                    <span className="text-xs text-slate-400">—</span>
                )}
            </div>
            <div className="relative" style={{ gridColumn: `span ${totalWeekCells}` }}>
                {/* Vertical grid lines at week boundaries */}
                {gridPcts.map((pct, i) => (
                    <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                        style={{ left: `${pct}%` }}
                    />
                ))}
                {bar && (
                    <div
                        className="absolute top-2 bottom-2 rounded-md overflow-hidden"
                        style={{
                            left: `${bar.leftPct}%`,
                            width: `${bar.widthPct}%`,
                            background: `linear-gradient(180deg, ${color}14, ${color}26)`,
                        }}
                    >
                        <div
                            className="absolute inset-y-0 left-0 rounded-l-md transition-[width] duration-300"
                            style={{
                                width: `${row.progress}%`,
                                background: `linear-gradient(180deg, ${color}, ${color}d9)`,
                            }}
                        />
                        {editing ? (
                            <div
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white text-xs font-bold text-slate-800 px-1.5 py-0.5 rounded inline-flex items-center gap-1 z-20"
                                style={{ boxShadow: `0 0 0 1.5px ${color}` }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={pctDraft}
                                    onChange={(e) => setPctDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commit()
                                        if (e.key === 'Escape') cancelEdit()
                                    }}
                                    onBlur={() => { if (!saving) commit() }}
                                    autoFocus
                                    className="w-12 px-1 py-0 text-xs font-bold tabular-nums outline-none border-0 bg-transparent text-right"
                                />
                                <span className="text-slate-500">%</span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (canEdit) {
                                        setPctDraft(String(row.progress))
                                        setEditing(true)
                                    }
                                }}
                                className={cn(
                                    "absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/95 text-xs font-bold text-slate-800 px-1.5 py-0.5 rounded tabular-nums",
                                    canEdit && "hover:bg-white cursor-pointer"
                                )}
                                style={{ boxShadow: `0 0 0 1.25px ${color}` }}
                                title={canEdit ? "คลิกเพื่อแก้ %" : ""}
                            >
                                {row.progress}%
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
