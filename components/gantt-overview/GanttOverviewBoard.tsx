'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Search, RefreshCw, GanttChart, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import {
    getProjectsForGantt,
    type GanttProjectRow,
    type GanttListFilters,
} from '@/lib/actions/gantt-overview-actions'
import { getProjectFilterOptions, getProjectById, type ProjectFilters } from '@/lib/actions/project-actions'
import { ProjectModal } from '@/components/modals/ProjectModal'
import {
    getTeamTrackingData,
    getAssignableEmployees,
    getProjectMilestones,
    type TrackingEntry,
    type AssignableEmployee,
} from '@/lib/actions/team-tracking-actions'
import { TrackingGrid } from '@/components/team-tracking/TrackingGrid'
import { TrackingCellDialog } from '@/components/team-tracking/TrackingCellDialog'
import { ProjectDetailPopup } from './ProjectDetailPopup'
import {
    addMonths, computeBarPosition, daysBetween,
    getWeeksForMonth, lastOfMonth, thMonthShort, thShortDate, toISODate,
} from './gantt-grid-utils'

type ViewMode = 'gantt' | 'daily'

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
    customers: { id: string; code: string; name: string }[]
    managers: { id: string; name: string; name_th: string }[]
    statuses: { id: string; code: string; name: string; color: string }[]
    projectTypes: { id: string; code: string; name: string; color: string }[]
    years: number[]
}

interface UIFilters {
    customerId: string
    managerId: string
    statusId: string
    projectTypeId: string
    search: string
}

const EMPTY_OPTS: FilterOptions = { customers: [], managers: [], statuses: [], projectTypes: [], years: [] }

export function GanttOverviewBoard() {
    // Filters
    const [opts, setOpts] = React.useState<FilterOptions>(EMPTY_OPTS)
    const [filters, setFilters] = React.useState<UIFilters>({
        customerId: '', managerId: '', statusId: '', projectTypeId: '', search: '',
    })

    // View mode: gantt = 3-month timeline / daily = 1-month day-grid with icons
    const [view, setView] = React.useState<ViewMode>('gantt')

    // Window: Gantt=3 months, Daily=1 month
    const [windowStart, setWindowStart] = React.useState<Date>(() => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), 1)
    })
    const monthsInWindow = view === 'daily' ? 1 : 3

    // Data
    const [rows, setRows] = React.useState<GanttProjectRow[]>([])
    const [loading, setLoading] = React.useState(true)
    const [openProjectId, setOpenProjectId] = React.useState<string | null>(null)
    // Edit Project modal — opened by clicking the project code on a row
    const [editProjectModal, setEditProjectModal] = React.useState<{ open: boolean; project: any | null }>({ open: false, project: null })
    // Wait for filter options + default filters to be applied BEFORE first fetch
    // (otherwise we'd fire two requests on mount: empty → then DEV+Active).
    const [filtersReady, setFiltersReady] = React.useState(false)

    // Daily-mode data + dialog
    const [dailyProjects, setDailyProjects] = React.useState<DailyTrackingProject[]>([])
    const [dailyEntries, setDailyEntries] = React.useState<TrackingEntry[]>([])
    const [employees, setEmployees] = React.useState<AssignableEmployee[]>([])
    const [cellOpen, setCellOpen] = React.useState(false)
    const [cellCtx, setCellCtx] = React.useState<{ projectId: string; projectName: string; date: string } | null>(null)
    const [cellMilestones, setCellMilestones] = React.useState<{ id: string; name: string; color: string | null }[]>([])

    // Load filter options once + apply default DEV / Active filters (match team-tracking).
    // setFiltersReady at the END so the data-loading effect only fires AFTER defaults are in.
    React.useEffect(() => {
        getProjectFilterOptions().then(res => {
            if (!res.success || !res.data) {
                setFiltersReady(true)
                return
            }
            const data = res.data as FilterOptions
            setOpts(data)
            const activeStatus = data.statuses.find(
                s => s.code?.toLowerCase() === 'active' || s.name?.toLowerCase() === 'active'
            )
            const devType = data.projectTypes.find(t => t.code?.toUpperCase() === 'DEV')
            setFilters(prev => ({
                ...prev,
                statusId: prev.statusId || activeStatus?.id || '',
                projectTypeId: prev.projectTypeId || devType?.id || '',
            }))
            setFiltersReady(true)
        })
    }, [])

    // Load projects whenever filters OR window OR view change
    const reqIdRef = React.useRef(0)
    const load = React.useCallback(async () => {
        if (!filtersReady) return
        setLoading(true)
        const reqId = ++reqIdRef.current
        const winEnd = lastOfMonth(addMonths(windowStart, monthsInWindow - 1))
        const startIso = toISODate(windowStart)
        const endIso = toISODate(winEnd)

        if (view === 'daily') {
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
                managerId: filters.managerId || undefined,
                statusId: filters.statusId || undefined,
                projectTypeId: filters.projectTypeId || undefined,
                search: filters.search || undefined,
            }
            const res = await getTeamTrackingData(ttFilters, toISODate(back), endIso)
            if (reqId !== reqIdRef.current) return
            if (res.success && res.data) {
                setDailyProjects(res.data.projects)
                setDailyEntries(res.data.entries)
            }
        } else {
            // Gantt mode: fetch via gantt-overview API (returns project bars).
            const payload: GanttListFilters = {
                search: filters.search || undefined,
                statusIds: filters.statusId ? [filters.statusId] : undefined,
                typeIds: filters.projectTypeId ? [filters.projectTypeId] : undefined,
                projectManagerIds: filters.managerId ? [filters.managerId] : undefined,
            }
            const res = await getProjectsForGantt(startIso, endIso, payload)
            if (reqId !== reqIdRef.current) return
            if (res.success) setRows(res.data)
        }
        setLoading(false)
    }, [filters, windowStart, view, monthsInWindow, filtersReady])

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

    // Cell click in daily view: open TrackingCellDialog with project + date pre-filled.
    const handleCellClick = async (projectId: string, date: string) => {
        const proj = dailyProjects.find(p => p.id === projectId)
        if (!proj) return
        setCellCtx({ projectId, projectName: proj.name, date })
        setCellOpen(true)
        // Lazy-load employees + milestones on first open
        if (employees.length === 0) {
            const r = await getAssignableEmployees()
            if (r.success && r.data) setEmployees(r.data)
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

    const months = React.useMemo(() => {
        const arr: Date[] = []
        for (let i = 0; i < monthsInWindow; i++) arr.push(addMonths(windowStart, i))
        return arr
    }, [windowStart, monthsInWindow])
    const rangeStart = months[0]
    const rangeEnd = lastOfMonth(months[months.length - 1])
    const totalDays = daysBetween(rangeStart, rangeEnd) + 1

    const weeksPerMonth = React.useMemo(
        () => months.map(m => getWeeksForMonth(m)),
        [months]
    )
    const totalWeekCells = weeksPerMonth.reduce((a, ws) => a + ws.length, 0)

    // Week boundary % positions (excluding 0% and 100%) for the timeline column —
    // used to render thin vertical grid lines in each row.
    const weekBoundaryPcts = React.useMemo(() => {
        const out: number[] = []
        let acc = 0
        const flat = weeksPerMonth.flat()
        for (let i = 0; i < flat.length - 1; i++) {
            acc += flat[i].days
            out.push((acc / totalDays) * 100)
        }
        return out
    }, [weeksPerMonth, totalDays])

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
                        {' · '}<b>{view === 'daily' ? dailyProjects.length : filteredRows.length}</b> โครงการ
                        {' · '}<span className="text-slate-400">{view === 'daily' ? 'มุมมองรายวัน' : 'มุมมอง Gantt'}</span>
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
                    </div>
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

                    {/* Customer */}
                    <div className="flex flex-col gap-1 min-w-[170px]">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ลูกค้า</span>
                        <div className="[&_button]:!py-1.5 [&_button]:!px-2.5 [&_button]:!text-xs [&_button]:!rounded-lg [&_button]:bg-slate-50/50 [&_button]:border-slate-200 [&_button]:hover:bg-slate-50">
                            <SmartCombobox
                                placeholder="ลูกค้าทั้งหมด"
                                options={[
                                    { value: '', label: 'ลูกค้าทั้งหมด' },
                                    ...opts.customers.map((c) => ({ value: c.id, label: c.name })),
                                ]}
                                value={
                                    filters.customerId
                                        ? opts.customers.find(c => c.id === filters.customerId)
                                            ? { value: filters.customerId, label: opts.customers.find(c => c.id === filters.customerId)!.name }
                                            : null
                                        : { value: '', label: 'ลูกค้าทั้งหมด' }
                                }
                                onChange={(opt) => setFilter('customerId', String(opt?.value || ''))}
                                maxDisplayItems={10}
                            />
                        </div>
                    </div>

                    {/* PM */}
                    <div className="flex flex-col gap-1 min-w-[150px]">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">PM</span>
                        <div className="[&_button]:!py-1.5 [&_button]:!px-2.5 [&_button]:!text-xs [&_button]:!rounded-lg [&_button]:bg-slate-50/50 [&_button]:border-slate-200 [&_button]:hover:bg-slate-50">
                            <SmartCombobox
                                placeholder="PM ทั้งหมด"
                                options={[
                                    { value: '', label: 'PM ทั้งหมด' },
                                    ...opts.managers.map((m) => ({ value: m.id, label: m.name_th || m.name })),
                                ]}
                                value={
                                    filters.managerId
                                        ? opts.managers.find(m => m.id === filters.managerId)
                                            ? {
                                                value: filters.managerId,
                                                label: opts.managers.find(m => m.id === filters.managerId)!.name_th
                                                    || opts.managers.find(m => m.id === filters.managerId)!.name,
                                            }
                                            : null
                                        : { value: '', label: 'PM ทั้งหมด' }
                                }
                                onChange={(opt) => setFilter('managerId', String(opt?.value || ''))}
                                maxDisplayItems={10}
                            />
                        </div>
                    </div>

                    {/* Type */}
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ประเภทงาน</span>
                        <select
                            value={filters.projectTypeId}
                            onChange={(e) => setFilter('projectTypeId', e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs min-w-[95px] bg-slate-50/50 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white transition-all outline-none shadow-sm font-medium"
                        >
                            <option value="">ทุกประเภท</option>
                            {opts.projectTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.code}</option>
                            ))}
                        </select>
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
                {view === 'daily' ? (
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
                            endDate={toISODate(lastOfMonth(windowStart))}
                            onCellClick={handleCellClick}
                            onProjectClick={handleEditProject}
                            isLoading={loading && dailyProjects.length === 0}
                            highlightFilter={null}
                            showCustomer={false}
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
                        />
                        {loading && filteredRows.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 text-xs">กำลังโหลด...</div>
                        ) : filteredRows.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 text-xs">
                                ไม่พบโครงการตามฟิลเตอร์ที่เลือก
                            </div>
                        ) : (
                            filteredRows.map((row) => (
                                <ProjectRow
                                    key={row.id}
                                    row={row}
                                    rangeStart={rangeStart}
                                    totalDays={totalDays}
                                    gridPcts={weekBoundaryPcts}
                                    onClick={() => setOpenProjectId(row.id)}
                                    onCodeClick={() => handleEditProject(row.id)}
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
                employees={employees}
                milestones={cellMilestones}
            />
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
    compact?: boolean
}

export function GridHeader({
    months, weeksPerMonth, totalWeekCells,
    leftWidth = 260, midWidth = 100, codeCol, thirdCol, compact = false,
}: GridHeaderProps) {
    const codePart = codeCol ? `${codeCol.width}px ` : ''
    const thirdPart = thirdCol ? `${thirdCol.width}px ` : ''
    return (
        <>
            <div className="grid sticky top-0 z-20 bg-slate-50 border-b border-slate-200"
                style={{ gridTemplateColumns: `${codePart}${leftWidth}px ${midWidth}px ${thirdPart}repeat(${months.length}, minmax(220px, 1fr))` }}>
                {codeCol && (
                    <div className={cn("px-3 text-xs font-semibold text-slate-700 border-r border-slate-200", compact ? "py-1.5" : "py-2")}>
                        {codeCol.label}
                    </div>
                )}
                <div className={cn("px-3 text-xs font-semibold text-slate-700 border-r border-slate-200", compact ? "py-1.5" : "py-2")}>
                    {compact ? 'กิจกรรม' : 'โครงการ'}
                </div>
                <div className={cn("px-3 text-xs font-semibold text-slate-700 border-r border-slate-200", compact ? "py-1.5" : "py-2")}>
                    กำหนดส่ง
                </div>
                {thirdCol && (
                    <div className={cn("px-3 text-xs font-semibold text-slate-700 border-r border-slate-200", compact ? "py-1.5" : "py-2")}>
                        {thirdCol.label}
                    </div>
                )}
                {months.map((m, i) => (
                    <div key={i} className={cn("px-2 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 tracking-tight", compact ? "py-1.5" : "py-2")}>
                        {thMonthShort(m)}
                    </div>
                ))}
            </div>

            <div className={cn("grid sticky z-20 bg-slate-50/80 border-b border-slate-200 text-xs text-slate-700", compact ? "top-[30px]" : "top-[36px]")}
                style={{ gridTemplateColumns: `${codePart}${leftWidth}px ${midWidth}px ${thirdPart}repeat(${totalWeekCells}, minmax(48px, 1fr))` }}>
                {codeCol && <div className="border-r border-slate-200" />}
                <div className="border-r border-slate-200" />
                <div className="border-r border-slate-200" />
                {thirdCol && <div className="border-r border-slate-200" />}
                {weeksPerMonth.flatMap((weeks, monthIdx) =>
                    weeks.map((w, wIdx) => (
                        <div key={`${monthIdx}-${wIdx}`} className="text-center py-1 border-r border-slate-100 font-medium">
                            W{wIdx + 1}
                        </div>
                    ))
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
    onClick: () => void
    onCodeClick: () => void
}

// Single accent color for all timeline bars — keeps the board calm and lets the
// progress fill itself communicate status. Milestone phase still surfaces via the
// "มายสโตนปัจจุบัน" column (which keeps its own per-phase color marker).
const BAR_COLOR = '#6366f1'   // indigo-500

function ProjectRow({ row, rangeStart, totalDays, gridPcts, onClick, onCodeClick }: ProjectRowProps) {
    const bar = computeBarPosition(row.start_date, row.end_date, rangeStart, totalDays)
    const color = BAR_COLOR
    const msColor = row.current_milestone_color || '#64748b'

    return (
        <div
            className="group grid border-b border-slate-100 hover:bg-indigo-50/40 transition-colors relative cursor-pointer"
            style={{ gridTemplateColumns: '90px 260px 100px 150px 1fr', minHeight: 48 }}
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
            <div className="relative">
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
                        <div
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/95 text-xs font-bold text-slate-800 px-1.5 py-0.5 rounded tabular-nums"
                            style={{ boxShadow: `0 0 0 1.25px ${color}` }}
                        >
                            {row.progress}%
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
