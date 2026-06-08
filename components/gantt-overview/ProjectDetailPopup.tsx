'use client'

import * as React from 'react'
import { X, Loader2, ChevronDown, ChevronRight, Minus, Maximize2, Minimize2, Square, ClipboardPlus, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    getProjectDetailForGantt,
    getProjectTrackingHistory,
    type GanttProjectDetail,
    type GanttMilestoneNode,
    type GanttStoryNode,
    type GanttTaskNode,
    type ProjectTrackingEntry,
} from '@/lib/actions/gantt-overview-actions'
import {
    getAssignableEmployees,
    type AssignableEmployee,
} from '@/lib/actions/team-tracking-actions'
import { TrackingCellDialog } from '@/components/team-tracking/TrackingCellDialog'
import { GridHeader } from './GanttOverviewBoard'
import { computeBarPosition, thShortDate, getWeeksForMonth, lastOfMonth, toISODate } from './gantt-grid-utils'
import { WhatIfView } from './ScenarioPanel'

// Today's date in local-tz yyyy-MM-dd
function todayIso(): string {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
}

interface Props {
    projectId: string
    months: Date[]
    rangeStart: Date
    totalDays: number
    weeksPerMonth: { start: Date; days: number }[][]
    onClose: () => void
}

type WindowState = 'normal' | 'maximized' | 'minimized'
type TabId = 'gantt' | 'history' | 'whatif'

const LEFT_W = 200
const MID_W = 90
// Excel-like extra columns (planned vs actual) — same widths in header + row
const EXTRA_COLS: { key: 'plannedStart' | 'duration' | 'actualStart' | 'actualDuration' | 'graphPct'; label: string; width: number }[] = [
    { key: 'plannedStart',   label: 'เริ่ม',        width: 72 },
    { key: 'duration',       label: 'ระยะเวลา',     width: 64 },
    { key: 'actualStart',    label: 'เริ่มจริง',    width: 72 },
    { key: 'actualDuration', label: 'เวลาจริง',    width: 64 },
    { key: 'graphPct',       label: '% กราฟ',       width: 56 },
]

export function ProjectDetailPopup({
    projectId, months, rangeStart, totalDays, weeksPerMonth, onClose,
}: Props) {
    const [data, setData] = React.useState<GanttProjectDetail | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [expandedMs, setExpandedMs] = React.useState<Set<string>>(new Set())
    const [expandedStory, setExpandedStory] = React.useState<Set<string>>(new Set())
    const [winState, setWinState] = React.useState<WindowState>('normal')
    // Excel-style column group — show "เริ่ม / ระยะเวลา / เริ่มจริง / เวลาจริง / % กราฟ"
    const [showExtraCols, setShowExtraCols] = React.useState(false)
    // User-picked month range — empty = auto-fit to project data; otherwise override.
    // Format: 'YYYY-MM' to match the native <input type="month"> value
    const [userStartMonth, setUserStartMonth] = React.useState<string>('')
    const [userEndMonth, setUserEndMonth] = React.useState<string>('')

    // Tracking dialog: PM sends new work / note to team_tracking_entries
    const [trackingOpen, setTrackingOpen] = React.useState(false)
    const [trackingDate, setTrackingDate] = React.useState<string>(todayIso())
    const [employees, setEmployees] = React.useState<AssignableEmployee[]>([])

    const openTracking = async () => {
        if (employees.length === 0) {
            const r = await getAssignableEmployees()
            if (r.success && r.data) setEmployees(r.data)
        }
        setTrackingOpen(true)
    }

    // Tabs + lazy-loaded tracking history
    const [tab, setTab] = React.useState<TabId>('gantt')
    const [history, setHistory] = React.useState<ProjectTrackingEntry[] | null>(null)
    const [historyLoading, setHistoryLoading] = React.useState(false)

    const loadHistory = React.useCallback(async () => {
        setHistoryLoading(true)
        const r = await getProjectTrackingHistory(projectId)
        if (r.success) setHistory(r.data)
        setHistoryLoading(false)
    }, [projectId])

    // Auto-load history when switching to that tab for the first time, or after save
    React.useEffect(() => {
        if (tab === 'history' && history === null && !historyLoading) loadHistory()
    }, [tab, history, historyLoading, loadHistory])

    const loadDetail = React.useCallback(async () => {
        setLoading(true)
        setError(null)
        const res = await getProjectDetailForGantt(projectId)
        if (res.success) {
            setData(res.data)
        } else {
            setError(res.error)
        }
        setLoading(false)
    }, [projectId])

    React.useEffect(() => {
        loadDetail()
        // Default: all milestones collapsed. User clicks to expand.
        setExpandedMs(new Set())
        setExpandedStory(new Set())
    }, [loadDetail])

    // Inline-edit handlers for milestone due_date / progress.
    // Optimistically patch local state, then fire-and-forget the server save.
    const handleEditMilestoneDate = async (msId: string, due: string | null) => {
        setData(prev => prev ? {
            ...prev,
            milestones: prev.milestones.map(m => m.id === msId ? { ...m, due_date: due } : m),
        } : prev)
        const { updateMilestoneDueDate } = await import('@/lib/actions/kpi-actions')
        const r = await updateMilestoneDueDate(msId, due)
        if (!r.success) { alert('บันทึกวันที่ไม่สำเร็จ: ' + (r.error || '')); loadDetail() }
    }
    const handleEditMilestoneProgress = async (msId: string, percent: number) => {
        setData(prev => prev ? {
            ...prev,
            milestones: prev.milestones.map(m => m.id === msId ? { ...m, progress: percent } : m),
        } : prev)
        const { updateMilestoneProgress } = await import('@/lib/actions/kpi-actions')
        const r = await updateMilestoneProgress(msId, percent)
        if (!r.success) { alert('บันทึก % ไม่สำเร็จ: ' + (r.error || '')); loadDetail() }
    }
    const handleEditMilestoneActualStart = async (msId: string, date: string | null) => {
        setData(prev => prev ? {
            ...prev,
            milestones: prev.milestones.map(m => m.id === msId ? { ...m, actual_start_date: date } : m),
        } : prev)
        const { updateMilestoneActual } = await import('@/lib/actions/kpi-actions')
        const r = await updateMilestoneActual(msId, { actual_start_date: date })
        if (!r.success) { alert('บันทึกเริ่มจริงไม่สำเร็จ: ' + (r.error || '')); loadDetail() }
    }
    const handleEditMilestonePlannedStart = async (msId: string, date: string | null) => {
        setData(prev => prev ? {
            ...prev,
            milestones: prev.milestones.map(m => m.id === msId ? { ...m, planned_start_date: date } : m),
        } : prev)
        const { updateMilestonePlannedStart } = await import('@/lib/actions/kpi-actions')
        const r = await updateMilestonePlannedStart(msId, date)
        if (!r.success) { alert('บันทึกเริ่มไม่สำเร็จ: ' + (r.error || '')); loadDetail() }
    }
    const handleEditMilestoneActualDuration = async (msId: string, days: number | null) => {
        setData(prev => prev ? {
            ...prev,
            milestones: prev.milestones.map(m => m.id === msId ? { ...m, actual_duration_days: days } : m),
        } : prev)
        const { updateMilestoneActual } = await import('@/lib/actions/kpi-actions')
        const r = await updateMilestoneActual(msId, { actual_duration_days: days })
        if (!r.success) { alert('บันทึกเวลาจริงไม่สำเร็จ: ' + (r.error || '')); loadDetail() }
    }

    // Window for the timeline. Priority:
    //   1. user explicitly picked start/end months → use those
    //   2. auto-fit to span ALL of THIS project's milestones (planned + actual)
    //   3. fall back to overview window props
    const fit = React.useMemo(() => {
        if (!data) return null
        // Manual override
        if (userStartMonth && userEndMonth) {
            const [sy, sm] = userStartMonth.split('-').map(Number)
            const [ey, em] = userEndMonth.split('-').map(Number)
            if (sy && sm && ey && em) {
                const start = new Date(sy, sm - 1, 1)
                const end = lastOfMonth(new Date(ey, em - 1, 1))
                if (start <= end) {
                    const months: Date[] = []
                    const cur = new Date(start)
                    while (cur <= end) {
                        months.push(new Date(cur))
                        cur.setMonth(cur.getMonth() + 1)
                    }
                    const weeks = months.map(m => getWeeksForMonth(m))
                    const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
                    const totalWeekCells = weeks.reduce((a, w) => a + w.length, 0)
                    return { months, rangeStart: start, totalDays, weeksPerMonth: weeks, totalWeekCells }
                }
            }
        }
        // Auto-fit from milestone/story dates
        const dates: number[] = []
        const pushIso = (iso: string | null | undefined) => {
            if (!iso) return
            const t = new Date(iso).getTime()
            if (!isNaN(t)) dates.push(t)
        }
        pushIso(data.project.start_date)
        pushIso(data.project.end_date)
        data.milestones.forEach(m => { pushIso(m.due_date); pushIso(m.actual_start_date) })
        data.stories.forEach(s => { pushIso(s.start_date); pushIso(s.end_date) })
        if (dates.length === 0) return null
        const minT = Math.min(...dates)
        const maxT = Math.max(...dates)
        const minD = new Date(minT)
        const maxD = new Date(maxT)
        const start = new Date(minD.getFullYear(), minD.getMonth(), 1)
        const end = lastOfMonth(maxD)
        const fitMonths: Date[] = []
        const cur = new Date(start)
        while (cur <= end) {
            fitMonths.push(new Date(cur))
            cur.setMonth(cur.getMonth() + 1)
        }
        const fitWeeks = fitMonths.map(m => getWeeksForMonth(m))
        const fitTotalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
        const fitTotalWeekCells = fitWeeks.reduce((a, w) => a + w.length, 0)
        return { months: fitMonths, rangeStart: start, totalDays: fitTotalDays, weeksPerMonth: fitWeeks, totalWeekCells: fitTotalWeekCells }
    }, [data, userStartMonth, userEndMonth])

    // Auto-populate the month range pickers ONCE with the fit range when data first loads.
    // Tracked via a ref so the user can later clear the inputs without us re-filling them.
    const didAutoPopulateRange = React.useRef(false)
    React.useEffect(() => {
        if (didAutoPopulateRange.current) return
        if (!fit || !fit.months.length) return
        const first = fit.months[0]
        const last = fit.months[fit.months.length - 1]
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        setUserStartMonth(fmt(first))
        setUserEndMonth(fmt(last))
        didAutoPopulateRange.current = true
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fit])

    // Final values used by the grid — auto-fit when available, otherwise fall back to props.
    const renderMonths = fit?.months ?? months
    const renderRangeStart = fit?.rangeStart ?? rangeStart
    const renderTotalDays = fit?.totalDays ?? totalDays
    const renderWeeksPerMonth = fit?.weeksPerMonth ?? weeksPerMonth
    const totalWeekCells = fit?.totalWeekCells ?? renderWeeksPerMonth.reduce((a, ws) => a + ws.length, 0)
    const projectName = data?.project.name_th || data?.project.name || '—'

    // Vertical grid lines for milestone rows. Use *even* spacing matching the W column count
    // (GridHeader uses `repeat(totalWeekCells, minmax(...))` which makes columns equal-width),
    // so the lines fall exactly under the W column dividers even when calendar weeks have
    // unequal day counts (e.g., the last W of a month might only have 3 days). Trade-off: a
    // milestone bar's left/width uses real day-% so it may not snap to a W boundary — that's
    // acceptable per user preference ("ไม่ต้องเป๊ะ ขอแค่เส้นตรงกัน").
    const weekBoundaryPcts = React.useMemo(() => {
        const out: number[] = []
        for (let i = 1; i < totalWeekCells; i++) {
            out.push((i / totalWeekCells) * 100)
        }
        return out
    }, [totalWeekCells])

    // Minimized: render a small taskbar at bottom-right
    if (winState === 'minimized') {
        return (
            <div className="fixed bottom-4 right-4 z-[1000] bg-white rounded-xl shadow-2xl border border-slate-200 flex items-center gap-2 pl-3 pr-1 py-1.5 max-w-[360px]">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-xs font-medium text-slate-700 truncate flex-1">
                    {projectName}
                </span>
                <button
                    onClick={() => setWinState('normal')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500"
                    title="ขยาย"
                >
                    <Square className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-slate-500"
                    title="ปิด"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        )
    }

    const isMax = winState === 'maximized'

    return (
        <div
            className={cn(
                "fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center",
                isMax ? "p-0" : "p-4"
            )}
            onClick={(e) => {
                // Only close on backdrop click in normal mode
                if (!isMax && e.target === e.currentTarget) onClose()
            }}
        >
            <div
                className={cn(
                    "bg-white shadow-2xl flex flex-col overflow-hidden",
                    isMax
                        ? "w-full h-full rounded-none"
                        : "w-[1280px] max-w-[98vw] h-[92vh] rounded-2xl"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header — windows-mode chrome */}
                <div className="flex items-start justify-between p-4 border-b border-slate-200 shrink-0 select-none">
                    <div className="flex items-center gap-3 min-w-0">
                        <span
                            className="px-2 py-0.5 text-xs font-semibold rounded-full shrink-0"
                            style={{
                                color: data?.project.status_color || '#475569',
                                background: (data?.project.status_color || '#475569') + '22',
                            }}
                        >
                            {data?.project.status_code || 'PROJECT'}
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                                Gantt Chart แผนงาน: {projectName}
                            </h2>
                            <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                                <span>{data?.project.project_manager_name ? `PM: ${data.project.project_manager_name} · ` : ''}</span>
                                <span>ความคืบหน้ารวม</span>
                                <span className="inline-flex items-center bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[10px] tabular-nums ring-1 ring-slate-200">
                                    {data?.project.progress ?? 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Window control buttons */}
                    <div className="flex items-center gap-0.5 shrink-0 ml-2">
                        <button
                            onClick={() => setWinState('minimized')}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
                            title="ย่อ"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setWinState(isMax ? 'normal' : 'maximized')}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
                            title={isMax ? "ย่อกลับ" : "ขยายเต็มจอ"}
                        >
                            {isMax ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded text-slate-500"
                            title="ปิด"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center border-b border-slate-200 bg-slate-50/60 px-4 shrink-0">
                    {[
                        { id: 'gantt' as TabId, label: 'แผน Gantt' },
                        { id: 'history' as TabId, label: `ประวัติการจ่ายงาน${history ? ` (${history.length})` : ''}` },
                        { id: 'whatif' as TabId, label: 'จำลองแผน (What-if)' },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={cn(
                                "px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors",
                                tab === t.id
                                    ? "border-indigo-600 text-indigo-700"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-slate-50/40">
                    {loading ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500 p-12 justify-center">
                            <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-600 text-xs">{error}</div>
                    ) : tab === 'history' ? (
                        <HistoryView
                            entries={history}
                            loading={historyLoading}
                            onRefresh={loadHistory}
                        />
                    ) : tab === 'whatif' ? (
                        <WhatIfView projectId={projectId} projectName={data?.project?.name_th || data?.project?.name || ''} />
                    ) : data ? (
                        <div className="min-w-[1000px] bg-white border-x border-slate-200 m-0">
                            {/* Toolbar: +/− toggle + month-range pickers */}
                            <div className="flex items-center justify-start gap-3 px-3 py-1 border-b border-slate-100 bg-white text-[10px] text-slate-500 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setShowExtraCols(v => !v)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 font-bold text-slate-600"
                                    title={showExtraCols ? "ซ่อนคอลัมน์เพิ่มเติม" : "แสดงคอลัมน์เพิ่มเติม (เริ่ม/ระยะเวลา/เริ่มจริง/เวลาจริง/% กราฟ)"}
                                >
                                    <span className="text-sm leading-none">{showExtraCols ? '−' : '+'}</span>
                                    คอลัมน์ขยาย
                                </button>

                                {/* Month range — when set, overrides the auto-fit window */}
                                <div className="inline-flex items-center gap-1">
                                    <span className="text-slate-400">ช่วงเดือน:</span>
                                    <input
                                        type="month"
                                        value={userStartMonth}
                                        onChange={(e) => setUserStartMonth(e.target.value)}
                                        className="px-1.5 py-0.5 border border-slate-200 rounded text-[10px] font-mono"
                                        title="เดือนเริ่มต้น"
                                    />
                                    <span className="text-slate-400">→</span>
                                    <input
                                        type="month"
                                        value={userEndMonth}
                                        onChange={(e) => setUserEndMonth(e.target.value)}
                                        className="px-1.5 py-0.5 border border-slate-200 rounded text-[10px] font-mono"
                                        title="เดือนสิ้นสุด"
                                    />
                                    {(userStartMonth || userEndMonth) && (
                                        <button
                                            type="button"
                                            onClick={() => { setUserStartMonth(''); setUserEndMonth('') }}
                                            className="px-2 py-0.5 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                                            title="กลับเป็นอัตโนมัติ"
                                        >
                                            อัตโนมัติ
                                        </button>
                                    )}
                                </div>
                            </div>
                            <GridHeader
                                months={renderMonths}
                                weeksPerMonth={renderWeeksPerMonth}
                                totalWeekCells={totalWeekCells}
                                leftWidth={LEFT_W}
                                midWidth={MID_W}
                                extraCols={showExtraCols ? EXTRA_COLS.map(c => ({ width: c.width, label: c.label })) : undefined}
                                compact
                            />
                            {data.milestones.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-500">
                                    โครงการนี้ยังไม่มี milestone
                                </div>
                            ) : (
                                data.milestones.map((m, idx, arr) => (
                                    <MilestoneRow
                                        key={m.id}
                                        milestone={m}
                                        /* Previous milestone's due date is where THIS milestone starts.
                                           First milestone has no predecessor → uses project start as fallback. */
                                        prevDueDate={idx === 0
                                            ? data.project.start_date
                                            : arr[idx - 1].due_date}
                                        stories={data.stories.filter(s => s.milestone_id === m.id)}
                                        tasks={data.tasks}
                                        rangeStart={renderRangeStart}
                                        totalDays={renderTotalDays}
                                        expandedStory={expandedStory}
                                        isExpanded={expandedMs.has(m.id)}
                                        onToggle={() => {
                                            const next = new Set(expandedMs)
                                            if (next.has(m.id)) {
                                                next.delete(m.id)
                                            } else {
                                                next.add(m.id)
                                            }
                                            setExpandedMs(next)
                                        }}
                                        onToggleStory={(id) => {
                                            const next = new Set(expandedStory)
                                            if (next.has(id)) {
                                                next.delete(id)
                                            } else {
                                                next.add(id)
                                            }
                                            setExpandedStory(next)
                                        }}
                                        onEditDate={(due) => handleEditMilestoneDate(m.id, due)}
                                        onEditProgress={(percent) => handleEditMilestoneProgress(m.id, percent)}
                                        onEditActualStart={(date) => handleEditMilestoneActualStart(m.id, date)}
                                        onEditActualDuration={(days) => handleEditMilestoneActualDuration(m.id, days)}
                                        onEditPlannedStart={(date) => handleEditMilestonePlannedStart(m.id, date)}
                                        showExtraCols={showExtraCols}
                                        weekBoundaryPcts={weekBoundaryPcts}
                                        totalWeekCells={totalWeekCells}
                                        weeksPerMonth={renderWeeksPerMonth}
                                    />
                                ))
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center shrink-0">
                    <div>
                        Milestones: <b>{data?.milestones.length || 0}</b>{' '}
                        · Stories: <b>{data?.stories.length || 0}</b>{' '}
                        · Tasks: <b>{data?.tasks.length || 0}</b>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href="/team-tracking"
                            target="_blank"
                            rel="noopener"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                            title="เปิด Team Tracking ในแท็บใหม่"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Team Tracking
                        </a>
                        {/* Date picker + assign button group */}
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                            <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 text-xs text-slate-500 border-r border-slate-200">
                                วันที่งาน:
                                <input
                                    type="date"
                                    value={trackingDate}
                                    onChange={(e) => setTrackingDate(e.target.value)}
                                    className="text-xs font-medium text-slate-800 bg-transparent outline-none"
                                />
                            </label>
                            <button
                                onClick={openTracking}
                                disabled={!trackingDate}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                                title="สั่งงาน / บันทึกกิจกรรมในวันที่เลือก"
                            >
                                <ClipboardPlus className="w-3.5 h-3.5" />
                                สั่งงาน / บันทึก
                            </button>
                        </div>
                        <button onClick={onClose} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs">
                            ปิด
                        </button>
                    </div>
                </div>
            </div>

            {/* TrackingCellDialog — PM creates new tracking entry from project context */}
            <TrackingCellDialog
                open={trackingOpen}
                onClose={() => setTrackingOpen(false)}
                onSaved={() => {
                    // Refresh in-popup history so the newly created entry shows up.
                    loadHistory()
                }}
                projectId={data?.project.id ?? ''}
                projectName={data?.project.name_th || data?.project.name || ''}
                entryDate={trackingDate}
                entries={[]}
                employees={employees}
                milestones={data?.milestones.map(m => ({
                    id: m.id,
                    name: m.milestone_name,
                    color: m.color,
                })) || []}
            />
        </div>
    )
}

// ============================================================
// Milestone row
// ============================================================

interface MilestoneRowProps {
    milestone: GanttMilestoneNode
    /** Previous milestone's due_date — used as THIS milestone's start when there are no stories.
     *  Sequential layout: each milestone starts where the previous ended. */
    prevDueDate: string | null
    stories: GanttStoryNode[]
    tasks: GanttTaskNode[]
    rangeStart: Date
    totalDays: number
    expandedStory: Set<string>
    isExpanded: boolean
    onToggle: () => void
    onToggleStory: (id: string) => void
    /** Inline-edit handlers — when present, due_date and progress become click-to-edit cells. */
    onEditDate?: (due: string | null) => void
    onEditProgress?: (percent: number) => void
    onEditActualStart?: (date: string | null) => void
    onEditActualDuration?: (days: number | null) => void
    onEditPlannedStart?: (date: string | null) => void
    /** Show the extra "เริ่ม/ระยะเวลา/เริ่มจริง/เวลาจริง/% กราฟ" columns */
    showExtraCols?: boolean
    /** Boundary % positions used to draw vertical grid lines aligned with the W header. */
    weekBoundaryPcts?: number[]
    /** Number of W columns — used so the row's timeline mirrors the header's
     *  `repeat(N, minmax(32px, 1fr))` and the lines line up under W boundaries. */
    totalWeekCells?: number
    /** Week segments grouped per month — needed to convert a date to a column-index
     *  so bars land exactly on column boundaries (not on day-based %). */
    weeksPerMonth?: { start: Date; days: number }[][]
}

function MilestoneRow({
    milestone, prevDueDate, stories, tasks, rangeStart, totalDays,
    expandedStory, isExpanded, onToggle, onToggleStory, onEditDate, onEditProgress,
    onEditActualStart, onEditActualDuration, onEditPlannedStart,
    showExtraCols, weekBoundaryPcts, totalWeekCells, weeksPerMonth,
}: MilestoneRowProps) {
    const [editPlanStart, setEditPlanStart] = React.useState(false)
    const [psDraft, setPsDraft] = React.useState<string>('')

    // Convert an ISO date to a column-index in [0..totalWeekCells]. Each column has equal
    // CSS width (minmax(32px, 1fr)), but its date span can be partial (e.g., 3 days at a
    // month boundary). Using column index for bar % keeps bars aligned with the W headers.
    const dateToColIdx = React.useCallback((iso: string | null): number | null => {
        if (!iso || !weeksPerMonth) return null
        const t = new Date(iso).getTime()
        let idx = 0
        for (const ws of weeksPerMonth) {
            for (const w of ws) {
                const startT = w.start.getTime()
                const endT = startT + w.days * 86400000
                if (t < startT) return idx                    // before this column
                if (t < endT) {
                    const frac = (t - startT) / (w.days * 86400000)
                    return idx + frac
                }
                idx++
            }
        }
        return idx
    }, [weeksPerMonth])

    // Build a bar % using column-index space (matches the header columns exactly)
    const colBar = React.useCallback((startIso: string | null, endIso: string | null) => {
        if (!startIso || !endIso || !totalWeekCells) return null
        const sIdx = dateToColIdx(startIso)
        const eIdx = dateToColIdx(endIso)
        if (sIdx == null || eIdx == null || eIdx <= sIdx) return null
        return {
            leftPct: (sIdx / totalWeekCells) * 100,
            widthPct: ((eIdx - sIdx) / totalWeekCells) * 100,
        }
    }, [dateToColIdx, totalWeekCells])
    // Inline edits for the extra cols
    const [editActualStart, setEditActualStart] = React.useState(false)
    const [editActualDur, setEditActualDur] = React.useState(false)
    const [editPlanDays, setEditPlanDays] = React.useState(false)
    const [asDraft, setAsDraft] = React.useState<string>(milestone.actual_start_date || '')
    const [adDraft, setAdDraft] = React.useState<string>(milestone.actual_duration_days != null ? String(milestone.actual_duration_days) : '')
    const [pdDraft, setPdDraft] = React.useState<string>('')
    React.useEffect(() => { setAsDraft(milestone.actual_start_date || '') }, [milestone.actual_start_date])
    React.useEffect(() => { setAdDraft(milestone.actual_duration_days != null ? String(milestone.actual_duration_days) : '') }, [milestone.actual_duration_days])
    const commitAS = () => {
        const next = asDraft || null
        if (next !== (milestone.actual_start_date || null) && onEditActualStart) onEditActualStart(next)
        setEditActualStart(false)
    }
    // เวลาจริง input is in WEEKS → store as days (×7) in DB
    const commitAD = () => {
        const v = adDraft.trim()
        const weeks = v === '' ? null : Math.max(0, Math.round(Number(v) || 0))
        const days = weeks == null ? null : weeks * 7
        if (days !== (milestone.actual_duration_days ?? null) && onEditActualDuration) onEditActualDuration(days)
        setEditActualDur(false)
    }
    // ระยะเวลา input is in WEEKS → recompute due_date = plan_start + N*7 days → save via onEditDate
    const commitPlanDays = () => {
        const v = pdDraft.trim()
        const weeks = v === '' ? null : Math.max(0, Math.round(Number(v) || 0))
        if (weeks != null && planStartIso && onEditDate) {
            const next = new Date(planStartIso)
            next.setDate(next.getDate() + weeks * 7)
            const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
            onEditDate(iso)
        }
        setEditPlanDays(false)
    }
    // Local inline-edit state for the due-date cell + the % chip
    const [editingDate, setEditingDate] = React.useState(false)
    const [dateDraft, setDateDraft] = React.useState<string>(milestone.due_date || '')
    const [editingPct, setEditingPct] = React.useState(false)
    const [pctDraft, setPctDraft] = React.useState<string>(String(milestone.progress ?? 0))
    React.useEffect(() => { setDateDraft(milestone.due_date || '') }, [milestone.due_date])
    React.useEffect(() => { setPctDraft(String(milestone.progress ?? 0)) }, [milestone.progress])

    const commitDate = () => {
        const next = dateDraft || null
        if (next !== (milestone.due_date || null) && onEditDate) onEditDate(next)
        setEditingDate(false)
    }
    const commitPct = () => {
        const n = Math.max(0, Math.min(100, Math.round(Number(pctDraft) || 0)))
        if (n !== milestone.progress && onEditProgress) onEditProgress(n)
        setEditingPct(false)
    }

    // Derived "Excel-style" columns — computed from existing data.
    // เริ่ม / เริ่มจริง are surfaced as week-of-year numbers (W1 = first week of Jan)
    // so a Gantt planner can think in W units instead of calendar dates.
    // Prefer the milestone's own planned_start_date override; else fall back to the
    // previous milestone's due_date (sequential auto-layout).
    const planStartIso = milestone.planned_start_date || prevDueDate
    // Convert ISO date → week-of-year (1-53). W1 = the week containing Jan 1 of that year.
    const weekOfYear = (iso: string | null): number | null => {
        if (!iso) return null
        const d = new Date(iso)
        if (isNaN(d.getTime())) return null
        const jan1 = new Date(d.getFullYear(), 0, 1)
        const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000)
        return Math.floor(days / 7) + 1
    }
    // Convert week-of-year + reference year → first day of that week.
    // The Gantt header splits columns at Sundays (calendar weeks), so a W column
    // labeled "W21" actually starts on a Sunday. Snap to the next Sunday so the
    // bar aligns with the visible column, not the raw "Jan 1 + (W-1)*7" Wednesday.
    const weekToDateIso = (week: number, year: number): string => {
        const d = new Date(year, 0, 1)
        d.setDate(d.getDate() + (week - 1) * 7)
        const dow = d.getDay()  // 0 = Sunday
        if (dow !== 0) d.setDate(d.getDate() + (7 - dow))
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    const planStartWeek = weekOfYear(planStartIso)
    const actualStartWeek = weekOfYear(milestone.actual_start_date)
    // Reference year for week-number editing — prefer planned start, fall back to current year
    const refYear = planStartIso ? new Date(planStartIso).getFullYear() : new Date().getFullYear()
    // Planned span in calendar days, then in weeks for the planning columns
    const planDays = (planStartIso && milestone.due_date)
        ? Math.max(0, Math.round((new Date(milestone.due_date).getTime() - new Date(planStartIso).getTime()) / 86400000))
        : null
    const planWeeks = planDays != null ? Math.round(planDays / 7) : null
    const actualWeeks = milestone.actual_duration_days != null
        ? Math.round(milestone.actual_duration_days / 7)
        : null
    // Everything below this point uses *W-snapped* dates so the bar zones line up with
    // the W column boundaries on screen. (Raw planStartIso can be mid-week — e.g. the
    // previous milestone's due_date — and would cause a small "early" leftover even
    // when both planned and actual start at the same W.)
    const planStartWSnap   = planStartWeek != null ? weekToDateIso(planStartWeek, refYear) : null
    const planEndWSnap     = (planStartWeek != null && planWeeks != null) ? weekToDateIso(planStartWeek + planWeeks, refYear) : null
    const actualStartWSnap = actualStartWeek != null ? weekToDateIso(actualStartWeek, refYear) : null
    const actualEndWSnap   = (actualStartWeek != null && actualWeeks != null) ? weekToDateIso(actualStartWeek + actualWeeks, refYear) : null
    // Raw end (for tooltip / external use) — keep for now
    const actualEndIso: string | null = actualEndWSnap
    // Expected % at "today" — used only as a coloring hint on the % chip in the column.
    const graphPct = (() => {
        if (!planStartIso || !milestone.due_date) return null
        const s = new Date(planStartIso).getTime()
        const e = new Date(milestone.due_date).getTime()
        const now = Date.now()
        if (e <= s) return now >= e ? 100 : 0
        if (now <= s) return 0
        if (now >= e) return 100
        return Math.round(((now - s) / (e - s)) * 100)
    })()
    // Bar span:
    //   - If milestone has stories: span = stories' earliest_start → latest_end (own work range)
    //   - Otherwise: span = prevDueDate → this.due_date (sequential layout, default for typical projects)
    //   - If prevDueDate is null (first milestone, no project start either): single-day marker at due_date
    const childStartDates = stories.map(s => s.start_date).filter(Boolean) as string[]
    const childEndDates = stories.map(s => s.end_date).filter(Boolean) as string[]
    // Planned outline bar — uses W-snapped column-index math when planning data is set,
    // so the outline lands on W column boundaries. Falls back to day-based positioning
    // for raw / child-derived spans.
    const start = childStartDates.length
        ? childStartDates.sort()[0]
        : (planStartWSnap || prevDueDate || milestone.due_date)
    const end = childEndDates.length
        ? childEndDates.sort().slice(-1)[0]
        : (planEndWSnap || milestone.due_date)
    const bar = (planStartWSnap && planEndWSnap)
        ? colBar(planStartWSnap, planEndWSnap)
        : computeBarPosition(start, end, rangeStart, totalDays)
    // Single accent for milestone bars; the chip on the left keeps the per-phase milestone color.
    const color = '#6366f1'   // indigo-500
    const phaseColor = milestone.color || '#64748b'
    const hasChildren = stories.length > 0

    return (
        <>
            <div
                className={cn(
                    "grid border-b border-slate-100 relative",
                    hasChildren && "cursor-pointer hover:bg-indigo-50/40",
                )}
                style={{
                    // Mirror the GridHeader's timeline structure so vertical lines align with W cols.
                    // `repeat(N, minmax(32px, 1fr))` matches the header in compact mode.
                    gridTemplateColumns: (() => {
                        const left = `${LEFT_W}px ${MID_W}px`
                        const extras = showExtraCols ? ' ' + EXTRA_COLS.map(c => `${c.width}px`).join(' ') : ''
                        const timeline = totalWeekCells
                            ? ` repeat(${totalWeekCells}, minmax(32px, 1fr))`
                            : ' 1fr'
                        return left + extras + timeline
                    })(),
                    minHeight: 44
                }}
                onClick={hasChildren ? onToggle : undefined}
            >
                <div className="px-2 py-1.5 border-r border-slate-200 flex items-center gap-1.5 sticky left-0 bg-white z-10">
                    {hasChildren ? (
                        isExpanded
                            ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : <div className="w-3.5 shrink-0" />}
                    <span className="w-1.5 h-5 rounded-sm shrink-0" style={{ background: phaseColor }} />
                    <span className="text-xs font-medium text-slate-800 truncate">
                        {milestone.milestone_name}
                    </span>
                </div>
                <div
                    className="px-2 py-1.5 border-r border-slate-200 flex items-center text-xs font-mono text-slate-700 cursor-pointer hover:bg-indigo-50/40 sticky bg-white z-10"
                    style={{ left: `${LEFT_W}px` }}
                    onClick={(e) => { e.stopPropagation(); if (onEditDate) setEditingDate(true) }}
                    title={onEditDate ? "คลิกเพื่อแก้วันที่" : ""}
                >
                    {editingDate ? (
                        <input
                            type="date"
                            value={dateDraft}
                            autoFocus
                            onChange={(e) => setDateDraft(e.target.value)}
                            onBlur={commitDate}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitDate()
                                if (e.key === 'Escape') { setDateDraft(milestone.due_date || ''); setEditingDate(false) }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-xs font-mono outline-none border-0 bg-transparent"
                        />
                    ) : (
                        <span className={cn(milestone.due_date ? "" : "text-slate-300")}>
                            {milestone.due_date ? thShortDate(milestone.due_date) : '— คลิกเพื่อใส่วันที่'}
                        </span>
                    )}
                </div>
                {showExtraCols && (
                    <>
                        {/* เริ่ม (W of year — editable, falls back to prev milestone's due_date) */}
                        <div
                            className="px-1.5 py-1.5 border-r border-slate-200 flex items-center justify-center text-[11px] font-mono cursor-pointer hover:bg-indigo-50/40"
                            onClick={(e) => {
                                e.stopPropagation()
                                if (onEditPlannedStart) {
                                    setPsDraft(planStartWeek != null ? String(planStartWeek) : '')
                                    setEditPlanStart(true)
                                }
                            }}
                            title={onEditPlannedStart ? `คลิกเพื่อแก้เริ่ม (W) — อ้างอิงปี ${refYear}` : ''}
                        >
                            {editPlanStart ? (
                                <input
                                    type="number" min={1} max={53} step={1} value={psDraft} autoFocus
                                    onChange={(e) => setPsDraft(e.target.value)}
                                    onBlur={() => {
                                        const v = psDraft.trim()
                                        const n = v === '' ? null : Math.max(1, Math.min(53, Math.round(Number(v) || 0)))
                                        if (n == null) {
                                            if (milestone.planned_start_date && onEditPlannedStart) onEditPlannedStart(null)
                                        } else if (onEditPlannedStart) {
                                            onEditPlannedStart(weekToDateIso(n, refYear))
                                        }
                                        setEditPlanStart(false)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                        if (e.key === 'Escape') setEditPlanStart(false)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-[11px] font-mono outline-none border-0 bg-transparent text-center"
                                />
                            ) : planStartWeek != null ? (
                                <span className="text-slate-700 tabular-nums" title={planStartIso ? thShortDate(planStartIso) : ''}>{planStartWeek}</span>
                            ) : <span className="text-slate-300">—</span>}
                        </div>
                        {/* ระยะเวลา (editable — drives due_date) */}
                        <div
                            className="px-1.5 py-1.5 border-r border-slate-200 flex items-center justify-center text-[11px] font-mono cursor-pointer hover:bg-indigo-50/40"
                            onClick={(e) => {
                                e.stopPropagation()
                                if (!planStartIso) { alert('ต้องมี milestone ก่อนหน้า (เริ่ม) ก่อน — กรอกวันที่ของ milestone ลำดับก่อนหน้าให้ก่อน'); return }
                                setPdDraft(planWeeks != null ? String(planWeeks) : '')
                                setEditPlanDays(true)
                            }}
                            title={planStartIso ? "คลิกเพื่อแก้ระยะเวลา (สัปดาห์) — กำหนดส่ง = เริ่ม + N สัปดาห์" : "ต้องมีวันที่เริ่มก่อน"}
                        >
                            {editPlanDays ? (
                                <input
                                    type="number" min={0} step={1} value={pdDraft} autoFocus
                                    onChange={(e) => setPdDraft(e.target.value)}
                                    onBlur={commitPlanDays}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitPlanDays()
                                        if (e.key === 'Escape') setEditPlanDays(false)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-[11px] font-mono outline-none border-0 bg-transparent text-center"
                                />
                            ) : planWeeks != null ? (
                                <span className="text-slate-700 tabular-nums">{planWeeks}</span>
                            ) : <span className="text-slate-300">—</span>}
                        </div>
                        {/* เริ่มจริง (W of year — editable as integer) */}
                        <div
                            className="px-1.5 py-1.5 border-r border-slate-200 flex items-center justify-center text-[11px] font-mono cursor-pointer hover:bg-indigo-50/40"
                            onClick={(e) => {
                                e.stopPropagation()
                                if (onEditActualStart) {
                                    setAsDraft(actualStartWeek != null ? String(actualStartWeek) : '')
                                    setEditActualStart(true)
                                }
                            }}
                            title={onEditActualStart ? `คลิกเพื่อแก้เริ่มจริง (W) — อ้างอิงปี ${refYear}` : ''}
                        >
                            {editActualStart ? (
                                <input
                                    type="number" min={1} max={53} step={1} value={asDraft} autoFocus
                                    onChange={(e) => setAsDraft(e.target.value)}
                                    onBlur={() => {
                                        const v = asDraft.trim()
                                        const n = v === '' ? null : Math.max(1, Math.min(53, Math.round(Number(v) || 0)))
                                        if (n == null) {
                                            if (milestone.actual_start_date && onEditActualStart) onEditActualStart(null)
                                        } else if (onEditActualStart) {
                                            onEditActualStart(weekToDateIso(n, refYear))
                                        }
                                        setEditActualStart(false)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                        if (e.key === 'Escape') { setEditActualStart(false) }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-[11px] font-mono outline-none border-0 bg-transparent text-center"
                                />
                            ) : actualStartWeek != null ? (
                                <span className="text-slate-700 tabular-nums" title={milestone.actual_start_date ? thShortDate(milestone.actual_start_date) : ''}>{actualStartWeek}</span>
                            ) : <span className="text-slate-300">—</span>}
                        </div>
                        {/* เวลาจริง (editable days) */}
                        <div
                            className="px-1.5 py-1.5 border-r border-slate-200 flex items-center justify-center text-[11px] font-mono cursor-pointer hover:bg-indigo-50/40"
                            onClick={(e) => {
                                e.stopPropagation()
                                if (onEditActualDuration) {
                                    setAdDraft(actualWeeks != null ? String(actualWeeks) : '')
                                    setEditActualDur(true)
                                }
                            }}
                            title={onEditActualDuration ? "คลิกเพื่อแก้เวลาจริง (สัปดาห์)" : ""}
                        >
                            {editActualDur ? (
                                <input
                                    type="number" min={0} step={1} value={adDraft} autoFocus
                                    onChange={(e) => setAdDraft(e.target.value)}
                                    onBlur={commitAD}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitAD()
                                        if (e.key === 'Escape') { setAdDraft(milestone.actual_duration_days != null ? String(milestone.actual_duration_days) : ''); setEditActualDur(false) }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-[11px] font-mono outline-none border-0 bg-transparent text-center"
                                />
                            ) : actualWeeks != null ? (
                                <span className="text-slate-700 tabular-nums">{actualWeeks}</span>
                            ) : <span className="text-slate-300">—</span>}
                        </div>
                        {/* % กราฟ — always an input (no toggle), saves on Enter/blur.
                            Linked to milestone.progress (same value as the bar's % chip). */}
                        <div
                            className="px-1.5 py-1.5 border-r border-slate-200 flex items-center justify-center text-[11px] font-mono"
                            onClick={(e) => e.stopPropagation()}
                            title="แก้ % กราฟ — แสดงผลบน timeline"
                        >
                            <input
                                type="number" min={0} max={100} step={1}
                                value={pctDraft}
                                onChange={(e) => setPctDraft(e.target.value)}
                                onBlur={commitPct}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                    if (e.key === 'Escape') { setPctDraft(String(milestone.progress ?? 0)); (e.target as HTMLInputElement).blur() }
                                }}
                                disabled={!onEditProgress}
                                className={cn(
                                    "w-full text-[11px] font-mono outline-none border-0 bg-transparent text-center tabular-nums",
                                    graphPct != null && milestone.progress >= graphPct ? "text-emerald-600"
                                        : graphPct != null ? "text-amber-600"
                                        : "text-slate-700"
                                )}
                            />
                        </div>
                    </>
                )}
                <div
                    className="relative"
                    style={totalWeekCells ? { gridColumn: `span ${totalWeekCells}` } : undefined}
                >
                    {/* Vertical grid lines aligned with the W column boundaries in GridHeader */}
                    {(weekBoundaryPcts ?? []).map((pct, i) => (
                        <div
                            key={i}
                            className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                            style={{ left: `${pct}%` }}
                        />
                    ))}
                    {/* "Today" marker — thin red line at the current week's column */}
                    {(() => {
                        const todayIsoStr = todayIso()
                        const idx = dateToColIdx(todayIsoStr)
                        if (idx == null || !totalWeekCells) return null
                        const pct = (idx / totalWeekCells) * 100
                        if (pct < 0 || pct > 100) return null
                        return (
                            <div
                                className="absolute top-0 bottom-0 pointer-events-none z-10"
                                style={{ left: `${pct}%`, width: '1px', background: '#dc2626' }}
                                title="วันนี้"
                            />
                        )
                    })()}
                    {/* Layer 1 — PLANNED outline: เริ่ม → เริ่ม + ระยะเวลา */}
                    {bar && (
                        <div
                            className="absolute top-2 bottom-2 rounded-md border"
                            style={{
                                left: `${bar.leftPct}%`,
                                width: `${Math.max(bar.widthPct, 1.2)}%`,
                                background: `${color}10`,
                                borderColor: `${color}55`,
                            }}
                        />
                    )}
                    {/* Layer 2 — ACTUAL split into 3 zones, each its own segment.
                        Uses W-snapped dates so the zones land on column boundaries.
                        • EARLY (actual_start_W .. planned_start_W)  → light green
                        • IN-PLAN (overlap with the plan window)      → indigo solid
                        • OVERSHOOT (planned_end_W .. actual_end_W)   → red stripes */}
                    {actualStartWSnap && actualEndWSnap && (() => {
                        const segments: React.ReactNode[] = []
                        const planSW = planStartWeek, planEW = (planStartWeek != null && planWeeks != null) ? planStartWeek + planWeeks : null
                        const actSW = actualStartWeek, actEW = (actualStartWeek != null && actualWeeks != null) ? actualStartWeek + actualWeeks : null

                        // EARLY zone — only if actual started in an earlier W
                        if (planSW != null && actSW != null && actSW < planSW) {
                            const seg = colBar(actualStartWSnap, weekToDateIso(planSW, refYear))
                            if (seg) segments.push(
                                <div key="early" className="absolute top-2 bottom-2 rounded-l-md"
                                    style={{ left: `${seg.leftPct}%`, width: `${Math.max(seg.widthPct, 1.2)}%`, background: '#86efac' }}
                                    title="เริ่มก่อนแผน"
                                />
                            )
                        }

                        // IN-PLAN zone — overlap of [actual_start_W, actual_end_W) with [plan_start_W, plan_end_W)
                        if (planSW != null && planEW != null && actSW != null && actEW != null) {
                            const ovSW = Math.max(actSW, planSW)
                            const ovEW = Math.min(actEW, planEW)
                            if (ovSW < ovEW) {
                                const seg = colBar(weekToDateIso(ovSW, refYear), weekToDateIso(ovEW, refYear))
                                if (seg) segments.push(
                                    <div key="inplan" className="absolute top-2 bottom-2"
                                        style={{ left: `${seg.leftPct}%`, width: `${Math.max(seg.widthPct, 1.2)}%`, background: `linear-gradient(180deg, ${color}, ${color}d9)` }}
                                        title="งานในแผน"
                                    />
                                )
                            }
                        }

                        // OVERSHOOT zone — actual end W exceeds planned end W
                        if (planEW != null && actEW != null && actEW > planEW) {
                            const seg = colBar(weekToDateIso(planEW, refYear), actualEndWSnap)
                            if (seg) segments.push(
                                <div key="overshoot" className="absolute top-2 bottom-2 rounded-r-md"
                                    style={{ left: `${seg.leftPct}%`, width: `${Math.max(seg.widthPct, 1.2)}%`, background: 'repeating-linear-gradient(45deg, #dc2626 0 4px, #ef4444 4px 8px)' }}
                                    title="เกินแผน"
                                />
                            )
                        }

                        return <>{segments}</>
                    })()}
                    {/* % chip — overlay INSIDE the actual bar (falls back to planned bar).
                        Positioned at the right edge of the bar for legibility. */}
                    {(() => {
                        const actualBarLocal = (actualStartWSnap && actualEndWSnap)
                            ? colBar(actualStartWSnap, actualEndWSnap)
                            : null
                        const target = actualBarLocal || bar
                        if (!target) return null
                        const rightPct = target.leftPct + target.widthPct
                        return editingPct ? (
                            <div
                                className="absolute top-1/2 -translate-y-1/2 bg-white text-xs font-bold text-slate-800 px-1.5 py-0.5 rounded inline-flex items-center gap-1 z-20"
                                style={{ left: `calc(${rightPct}% - 50px)`, boxShadow: `0 0 0 1.5px ${color}` }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <input
                                    type="number" min={0} max={100} step={1}
                                    value={pctDraft}
                                    autoFocus
                                    onChange={(e) => setPctDraft(e.target.value)}
                                    onBlur={commitPct}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitPct()
                                        if (e.key === 'Escape') { setPctDraft(String(milestone.progress ?? 0)); setEditingPct(false) }
                                    }}
                                    className="w-12 px-1 py-0 text-xs font-bold tabular-nums outline-none border-0 bg-transparent text-right"
                                />
                                <span className="text-slate-500">%</span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); if (onEditProgress) setEditingPct(true) }}
                                className={cn(
                                    "absolute top-1/2 -translate-y-1/2 z-10 bg-white/95 text-xs font-bold text-slate-800 px-1.5 py-0.5 rounded tabular-nums shadow-sm",
                                    onEditProgress && "hover:bg-white cursor-pointer"
                                )}
                                style={{ left: `calc(${rightPct}% - 44px)`, boxShadow: `0 0 0 1.25px ${color}` }}
                                title={onEditProgress ? "คลิกเพื่อแก้ %" : ""}
                            >
                                {milestone.progress ?? 0}%
                            </button>
                        )
                    })()}
                </div>
            </div>

            {isExpanded && stories.map(s => (
                <StoryRow
                    key={s.id}
                    story={s}
                    tasks={tasks.filter(t => t.story_id === s.id)}
                    rangeStart={rangeStart}
                    totalDays={totalDays}
                    isExpanded={expandedStory.has(s.id)}
                    onToggle={() => onToggleStory(s.id)}
                />
            ))}
        </>
    )
}

interface StoryRowProps {
    story: GanttStoryNode
    tasks: GanttTaskNode[]
    rangeStart: Date
    totalDays: number
    isExpanded: boolean
    onToggle: () => void
}

function StoryRow({ story, tasks, rangeStart, totalDays, isExpanded, onToggle }: StoryRowProps) {
    const bar = computeBarPosition(story.start_date, story.end_date, rangeStart, totalDays)
    const hasChildren = tasks.length > 0
    return (
        <>
            <div
                className={cn(
                    "grid border-b border-slate-50 bg-slate-50/40 relative",
                    hasChildren && "cursor-pointer hover:bg-slate-100/60",
                )}
                style={{ gridTemplateColumns: `${LEFT_W}px ${MID_W}px 1fr`, minHeight: 38 }}
                onClick={hasChildren ? onToggle : undefined}
            >
                <div className="pl-7 pr-2 py-1.5 border-r border-slate-200 flex items-center gap-1.5">
                    {hasChildren ? (
                        isExpanded
                            ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                            : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                    ) : <div className="w-3 shrink-0" />}
                    <span className="text-xs text-slate-700 truncate">
                        {story.story_code && <span className="text-slate-400 font-mono mr-1">{story.story_code}</span>}
                        {story.title}
                    </span>
                </div>
                <div className="px-2 py-1.5 border-r border-slate-200 flex items-center text-xs font-mono text-slate-600">
                    {thShortDate(story.end_date)}
                </div>
                <div className="relative">
                    {bar && (
                        <div
                            className="absolute top-1.5 bottom-1.5 rounded-md overflow-hidden"
                            style={{
                                left: `${bar.leftPct}%`,
                                width: `${Math.max(bar.widthPct, 1.2)}%`,
                                background: 'linear-gradient(180deg, #3b82f61a, #3b82f633)',
                                boxShadow: 'inset 0 0 0 1px #3b82f680, 0 1px 3px #3b82f630',
                            }}
                        >
                            <div
                                className="absolute inset-y-0 left-0 rounded-l-md transition-[width] duration-300"
                                style={{
                                    width: `${story.progress}%`,
                                    background: 'linear-gradient(180deg, #3b82f6, #3b82f6d9)',
                                    boxShadow: 'inset 0 -1px 0 #3b82f666',
                                }}
                            />
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-700 bg-white px-1.5 py-0.5 rounded tabular-nums shadow-sm ring-1 ring-slate-200">
                                {story.progress}%
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && tasks.map(t => (
                <TaskRow key={t.id} task={t} rangeStart={rangeStart} totalDays={totalDays} />
            ))}
        </>
    )
}

interface TaskRowProps {
    task: GanttTaskNode
    rangeStart: Date
    totalDays: number
}

function TaskRow({ task, rangeStart, totalDays }: TaskRowProps) {
    const bar = computeBarPosition(task.start_date, task.end_date, rangeStart, totalDays)
    return (
        <div
            className="grid border-b border-slate-50 bg-white relative"
            style={{ gridTemplateColumns: `${LEFT_W}px ${MID_W}px 1fr`, minHeight: 32 }}
        >
            <div className="pl-12 pr-2 py-1 border-r border-slate-200 flex items-center gap-1.5">
                <div className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    task.status === 'DONE' ? 'bg-emerald-500'
                        : task.status === 'IN_PROGRESS' ? 'bg-blue-500'
                            : 'bg-slate-300'
                )} />
                <span className="text-xs text-slate-600 truncate">
                    {task.task_code && <span className="text-slate-400 font-mono mr-1">{task.task_code}</span>}
                    {task.title}
                </span>
            </div>
            <div className="px-2 py-1 border-r border-slate-200 flex items-center text-xs font-mono text-slate-500">
                {thShortDate(task.end_date)}
            </div>
            <div className="relative">
                {bar && (() => {
                    const taskColor = task.is_overdue ? '#ef4444' : '#64748b'
                    return (
                        <div
                            className="absolute top-1 bottom-1 rounded-md overflow-hidden"
                            style={{
                                left: `${bar.leftPct}%`,
                                width: `${Math.max(bar.widthPct, 1.2)}%`,
                                background: `linear-gradient(180deg, ${taskColor}1a, ${taskColor}33)`,
                                boxShadow: `inset 0 0 0 1px ${taskColor}66, 0 1px 2px ${taskColor}26`,
                            }}
                        >
                            <div
                                className="absolute inset-y-0 left-0 rounded-l-md"
                                style={{
                                    width: `${task.progress}%`,
                                    background: `linear-gradient(180deg, ${taskColor}, ${taskColor}d9)`,
                                }}
                            />
                        </div>
                    )
                })()}
            </div>
        </div>
    )
}

// ============================================================
// HistoryView — per-project tracking entries grouped by date desc
// ============================================================

interface HistoryViewProps {
    entries: ProjectTrackingEntry[] | null
    loading: boolean
    onRefresh: () => void
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    PLANNED:   { label: 'แผน',      color: '#6366f1' },
    DONE:      { label: 'เสร็จ',    color: '#10b981' },
    POSTPONED: { label: 'เลื่อน',   color: '#f59e0b' },
}

function HistoryView({ entries, loading, onRefresh }: HistoryViewProps) {
    if (loading || entries === null) {
        return (
            <div className="flex items-center gap-2 text-xs text-slate-500 p-12 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดประวัติ...
            </div>
        )
    }
    if (entries.length === 0) {
        return (
            <div className="p-12 text-center text-xs text-slate-500">
                ยังไม่มีประวัติการจ่ายงานสำหรับโครงการนี้
                <div className="mt-2">
                    <button onClick={onRefresh} className="text-indigo-600 hover:underline">รีเฟรช</button>
                </div>
            </div>
        )
    }

    // Group by entry_date desc
    const grouped: { date: string; rows: ProjectTrackingEntry[] }[] = []
    for (const e of entries) {
        const last = grouped[grouped.length - 1]
        if (last && last.date === e.entry_date) last.rows.push(e)
        else grouped.push({ date: e.entry_date, rows: [e] })
    }

    return (
        <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                    แสดง <b>{entries.length}</b> รายการ
                </div>
                <button onClick={onRefresh} className="text-xs text-slate-500 hover:text-indigo-600">รีเฟรช</button>
            </div>
            {grouped.map(g => (
                <div key={g.date} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                        {thShortDate(g.date)} <span className="text-slate-400 font-normal ml-1">({g.rows.length})</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {g.rows.map(e => {
                            const st = STATUS_LABEL[e.status || 'PLANNED'] || STATUS_LABEL.PLANNED
                            return (
                                <div key={e.id} className="flex items-start gap-2.5 px-3 py-2 hover:bg-slate-50/50">
                                    <span
                                        className="px-1.5 py-0.5 text-[10px] font-semibold rounded shrink-0 mt-0.5"
                                        style={{ color: st.color, background: st.color + '22' }}
                                    >
                                        {st.label}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
                                            <span className="font-medium text-slate-800">
                                                {e.assignee_name || '— ไม่ระบุผู้รับ —'}
                                            </span>
                                            {e.assignee_code && (
                                                <span className="text-slate-400 font-mono">{e.assignee_code}</span>
                                            )}
                                            {e.milestone_name && (
                                                <span className="text-xs px-1.5 py-0.5 rounded"
                                                    style={{
                                                        color: e.milestone_color || '#64748b',
                                                        background: (e.milestone_color || '#64748b') + '1a',
                                                    }}>
                                                    {e.milestone_name}
                                                </span>
                                            )}
                                        </div>
                                        {e.note && (
                                            <div className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap break-words">
                                                {e.note}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-slate-400 mt-1">
                                            {e.completed_date && <>เสร็จ {thShortDate(e.completed_date)} · </>}
                                            {e.postponed_date && <>เลื่อนไป {thShortDate(e.postponed_date)} · </>}
                                            {e.creator_name && <>โดย {e.creator_name}</>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
