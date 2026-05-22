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
import { computeBarPosition, thShortDate } from './gantt-grid-utils'

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
type TabId = 'gantt' | 'history'

const LEFT_W = 200
const MID_W = 90

export function ProjectDetailPopup({
    projectId, months, rangeStart, totalDays, weeksPerMonth, onClose,
}: Props) {
    const [data, setData] = React.useState<GanttProjectDetail | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [expandedMs, setExpandedMs] = React.useState<Set<string>>(new Set())
    const [expandedStory, setExpandedStory] = React.useState<Set<string>>(new Set())
    const [winState, setWinState] = React.useState<WindowState>('normal')

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

    React.useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)
        getProjectDetailForGantt(projectId).then(res => {
            if (cancelled) return
            if (res.success) {
                setData(res.data)
                // Default: all milestones collapsed. User clicks to expand.
                setExpandedMs(new Set())
                setExpandedStory(new Set())
            } else {
                setError(res.error)
            }
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [projectId])

    const totalWeekCells = weeksPerMonth.reduce((a, ws) => a + ws.length, 0)
    const projectName = data?.project.name_th || data?.project.name || '—'

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
                    ) : data ? (
                        <div className="min-w-[1000px] bg-white border-x border-slate-200 m-0">
                            <GridHeader
                                months={months}
                                weeksPerMonth={weeksPerMonth}
                                totalWeekCells={totalWeekCells}
                                leftWidth={LEFT_W}
                                midWidth={MID_W}
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
                                        rangeStart={rangeStart}
                                        totalDays={totalDays}
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
}

function MilestoneRow({
    milestone, prevDueDate, stories, tasks, rangeStart, totalDays,
    expandedStory, isExpanded, onToggle, onToggleStory,
}: MilestoneRowProps) {
    // Bar span:
    //   - If milestone has stories: span = stories' earliest_start → latest_end (own work range)
    //   - Otherwise: span = prevDueDate → this.due_date (sequential layout, default for typical projects)
    //   - If prevDueDate is null (first milestone, no project start either): single-day marker at due_date
    const childStartDates = stories.map(s => s.start_date).filter(Boolean) as string[]
    const childEndDates = stories.map(s => s.end_date).filter(Boolean) as string[]
    const start = childStartDates.length
        ? childStartDates.sort()[0]
        : (prevDueDate || milestone.due_date)
    const end = childEndDates.length
        ? childEndDates.sort().slice(-1)[0]
        : milestone.due_date
    const bar = computeBarPosition(start, end, rangeStart, totalDays)
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
                style={{ gridTemplateColumns: `${LEFT_W}px ${MID_W}px 1fr`, minHeight: 44 }}
                onClick={hasChildren ? onToggle : undefined}
            >
                <div className="px-2 py-1.5 border-r border-slate-200 flex items-center gap-1.5">
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
                <div className="px-2 py-1.5 border-r border-slate-200 flex items-center text-xs font-mono text-slate-700">
                    {thShortDate(milestone.due_date)}
                </div>
                <div className="relative">
                    {bar && (
                        <div
                            className="absolute top-2 bottom-2 rounded-md overflow-hidden"
                            style={{
                                left: `${bar.leftPct}%`,
                                width: `${Math.max(bar.widthPct, 1.2)}%`,
                                background: `linear-gradient(180deg, ${color}14, ${color}26)`,
                            }}
                        >
                            <div
                                className="absolute inset-y-0 left-0 rounded-l-md transition-[width] duration-300"
                                style={{
                                    width: `${milestone.progress}%`,
                                    background: `linear-gradient(180deg, ${color}, ${color}d9)`,
                                }}
                            />
                            <div
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/95 text-xs font-bold text-slate-800 px-1.5 py-0.5 rounded tabular-nums"
                                style={{ boxShadow: `0 0 0 1.25px ${color}` }}
                            >
                                {milestone.progress}%
                            </div>
                        </div>
                    )}
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
