'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Calendar, AlertTriangle, CheckCircle, ListTodo, Search, Clock, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
    getTodoDashboardData,
    completeTask,
    createActionLog,
    getActionTypes,
    getRecentActions,
    SalesTask, ActionLog, TodoDashboardSummary, ActionTypeConfig, TodoFilters
} from '@/lib/actions/sales-action-log-actions'
import { getProjectFilterOptions } from '@/lib/actions/project-actions'
import { getSession } from '@/lib/actions/auth-actions'
import { ActionLogDialog } from '@/components/sales/ActionLogDialog'
import { ProjectDetailDialog } from '@/components/sales/ProjectDetailDialog'
import { toast } from 'sonner'

const priorityStyles: Record<string, string> = {
    HIGH: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-green-100 text-green-700',
}

const ACTION_RESULT_LABELS: Record<string, { label: string; color: string }> = {
    DONE: { label: 'สำเร็จ', color: 'text-green-600' },
    FOLLOW_UP: { label: 'ติดตามต่อ', color: 'text-amber-600' },
    WAITING: { label: 'รอตอบกลับ', color: 'text-blue-600' },
    IN_PROGRESS: { label: 'ดำเนินการ', color: 'text-purple-600' },
}

interface FilterOptions {
    customers: { id: string; code: string; name: string }[]
    managers: { id: string; name: string; name_th: string }[]
    owners: { id: string; name: string; name_th: string; position_code: string }[]
    years: number[]
    statuses: { id: string; code: string; name: string; color: string }[]
    projectTypes: { id: string; code: string; name: string }[]
}

type ActiveSection = 'all' | 'today' | 'overdue' | 'week'

export default function SalesTodoDashboard() {
    const [initialLoading, setInitialLoading] = useState(true)
    const [summary, setSummary] = useState<TodoDashboardSummary>({
        today_count: 0, overdue_count: 0, this_week_count: 0,
        pending_count: 0, completed_today_count: 0, no_activity_count: 0
    })
    const [todayTasks, setTodayTasks] = useState<SalesTask[]>([])
    const [overdueTasks, setOverdueTasks] = useState<SalesTask[]>([])
    const [thisWeekTasks, setThisWeekTasks] = useState<SalesTask[]>([])
    const [recentActions, setRecentActions] = useState<ActionLog[]>([])

    // Active section filter
    const [activeSection, setActiveSection] = useState<ActiveSection>('all')

    // Filter state
    const [filters, setFilters] = useState<TodoFilters>({
        year: new Date().getFullYear(),
        projectTypeId: '',
        customerId: '',
        statusId: '',
        search: '',
        healthDays: 0,
    })
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        customers: [], managers: [], owners: [], years: [], statuses: [], projectTypes: []
    })
    const [filtersReady, setFiltersReady] = useState(false)

    // Action Log Dialog state
    const [actionTypes, setActionTypes] = useState<ActionTypeConfig[]>([])
    const [showLogDialog, setShowLogDialog] = useState(false)
    const [selectedProjectId, setSelectedProjectId] = useState<string>('')
    const [selectedActionType, setSelectedActionType] = useState<string>('CALL')

    // Project Detail Dialog state
    const [showDetailDialog, setShowDetailDialog] = useState(false)
    const [detailProject, setDetailProject] = useState<{ id: string; code: string; name: string }>({ id: '', code: '', name: '' })
    const [currentUserId, setCurrentUserId] = useState<string>('')

    const isFirstLoad = useRef(true)

    const loadData = useCallback(async (currentFilters: TodoFilters) => {
        try {
            const [data, actions] = await Promise.all([
                getTodoDashboardData(currentFilters),
                getRecentActions(currentFilters, 20),
            ])
            if (data) {
                setSummary(data.summary)
                setTodayTasks(data.todayTasks)
                setOverdueTasks(data.overdueTasks)
                setThisWeekTasks(data.thisWeekTasks)
            }
            setRecentActions(actions)
        } catch (error) {
            console.error('Failed to load dashboard:', error)
        } finally {
            if (isFirstLoad.current) {
                setInitialLoading(false)
                isFirstLoad.current = false
            }
        }
    }, [])

    // Load filter options on mount
    useEffect(() => {
        const init = async () => {
            try {
                const [filterResult, types, session] = await Promise.all([
                    getProjectFilterOptions(),
                    getActionTypes(),
                    getSession()
                ])
                if (types) setActionTypes(types)
                if (session) setCurrentUserId(session.id)
                if (filterResult.success && filterResult.data) {
                    setFilterOptions(filterResult.data as FilterOptions)

                    const updatedFilters = { ...filters }
                    const activeStatus = filterResult.data.statuses?.find(
                        (s: any) => s.code?.toLowerCase() === 'active' || s.name?.toLowerCase() === 'active'
                    )
                    if (activeStatus) {
                        updatedFilters.statusId = activeStatus.id
                    }
                    const mktType = filterResult.data.projectTypes?.find(
                        (t: any) => t.code === 'MKT'
                    )
                    if (mktType) {
                        updatedFilters.projectTypeId = mktType.id
                    }
                    setFilters(updatedFilters)
                    setFiltersReady(true)
                } else {
                    setFiltersReady(true)
                }
            } catch (error) {
                console.error('Failed to load filter options:', error)
                setFiltersReady(true)
            }
        }
        init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Load data when filters change
    useEffect(() => {
        if (filtersReady) {
            loadData(filters)
        }
    }, [filtersReady, filters, loadData])

    const handleFilterChange = (key: keyof TodoFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const handleComplete = async (taskId: string) => {
        const result = await completeTask(taskId)
        if (result.success) {
            toast.success('เสร็จสิ้น')
            loadData(filters)
        }
    }

    const handleSaveLog = async (data: any) => {
        const result = await createActionLog({ ...data, projectId: selectedProjectId })
        if (result.success) {
            loadData(filters)
        }
        return result
    }

    const handleLogDialogClose = () => {
        setShowLogDialog(false)
        setSelectedProjectId('')
    }

    const handleOpenDetail = (project: { id: string; code: string; name: string }) => {
        setDetailProject(project)
        setShowDetailDialog(true)
    }

    const handleDetailClose = () => {
        setShowDetailDialog(false)
    }

    const formatDate = (dateStr: string) => {
        try { return format(new Date(dateStr), 'd MMM yyyy', { locale: th }) }
        catch { return dateStr || '-' }
    }

    // Filter tasks based on active section
    const showToday = activeSection === 'all' || activeSection === 'today'
    const showOverdue = activeSection === 'all' || activeSection === 'overdue'
    const showWeek = activeSection === 'all' || activeSection === 'week'

    if (initialLoading) {
        return <div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</div>
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Sales To-do List</h1>
                <p className="text-slate-500">วันนี้: {format(new Date(), 'd MMMM yyyy', { locale: th })}</p>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-end gap-4 flex-wrap">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Fiscal Year</label>
                        <select
                            value={filters.year || ''}
                            onChange={(e) => handleFilterChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[100px] bg-white"
                        >
                            <option value="">All Years</option>
                            {filterOptions.years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Project Type</label>
                        <select
                            value={filters.projectTypeId || ''}
                            onChange={(e) => handleFilterChange('projectTypeId', e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[120px] bg-white"
                        >
                            <option value="">All Types</option>
                            {filterOptions.projectTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Customer</label>
                        <select
                            value={filters.customerId || ''}
                            onChange={(e) => handleFilterChange('customerId', e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[180px] bg-white"
                        >
                            <option value="">All Customers</option>
                            {filterOptions.customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Status</label>
                        <select
                            value={filters.statusId || ''}
                            onChange={(e) => handleFilterChange('statusId', e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[120px] bg-white"
                        >
                            <option value="">All Status</option>
                            {filterOptions.statuses.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-slate-500 mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={filters.search || ''}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                placeholder="ค้นหาโครงการ / งาน..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards - Clickable */}
            <div className="grid grid-cols-4 gap-4">
                <SummaryCard
                    icon={<Calendar className="h-5 w-5 text-blue-600" />}
                    label="งานวันนี้"
                    value={summary.today_count}
                    color="blue"
                    active={activeSection === 'today'}
                    onClick={() => setActiveSection(activeSection === 'today' ? 'all' : 'today')}
                />
                <SummaryCard
                    icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
                    label="เลยกำหนด"
                    value={summary.overdue_count}
                    color="red"
                    active={activeSection === 'overdue'}
                    onClick={() => setActiveSection(activeSection === 'overdue' ? 'all' : 'overdue')}
                />
                <SummaryCard
                    icon={<ListTodo className="h-5 w-5 text-amber-600" />}
                    label="สัปดาห์นี้"
                    value={summary.this_week_count}
                    color="amber"
                    active={activeSection === 'week'}
                    onClick={() => setActiveSection(activeSection === 'week' ? 'all' : 'week')}
                />
                <SummaryCard
                    icon={<Clock className="h-5 w-5 text-green-600" />}
                    label="เสร็จวันนี้"
                    value={summary.completed_today_count}
                    color="green"
                />
            </div>

            {/* Overdue Tasks */}
            {showOverdue && overdueTasks.length > 0 && (
                <Section title={`เลยกำหนดแล้ว (${overdueTasks.length})`} icon={<AlertTriangle className="h-5 w-5 text-red-600" />}>
                    {overdueTasks.map(task => (
                        <TaskRow key={task.task_id} task={task} onComplete={handleComplete} formatDate={formatDate} onProjectClick={handleOpenDetail} showOverdue />
                    ))}
                </Section>
            )}

            {/* Today's Tasks */}
            {showToday && (
                <Section title={`งานวันนี้ (${todayTasks.length})`} icon={<Calendar className="h-5 w-5 text-blue-600" />}>
                    {todayTasks.length === 0 ? (
                        <EmptyState text="ไม่มีงานวันนี้" />
                    ) : (
                        todayTasks.map(task => (
                            <TaskRow key={task.task_id} task={task} onComplete={handleComplete} formatDate={formatDate} onProjectClick={handleOpenDetail} />
                        ))
                    )}
                </Section>
            )}

            {/* This Week */}
            {showWeek && thisWeekTasks.length > 0 && (
                <Section title={`สัปดาห์นี้ (${thisWeekTasks.length})`} icon={<Calendar className="h-5 w-5 text-amber-600" />}>
                    {thisWeekTasks.map(task => (
                        <TaskRow key={task.task_id} task={task} onComplete={handleComplete} formatDate={formatDate} onProjectClick={handleOpenDetail} />
                    ))}
                </Section>
            )}

            {/* Show empty state when filtering and no results */}
            {activeSection !== 'all' && (
                (activeSection === 'today' && todayTasks.length === 0) ||
                (activeSection === 'overdue' && overdueTasks.length === 0) ||
                (activeSection === 'week' && thisWeekTasks.length === 0)
            ) && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <EmptyState text="ไม่มีรายการในหมวดนี้" />
                </div>
            )}

            {/* Recent Actions */}
            {recentActions.length > 0 && (
                <Section title={`Action/Todo ล่าสุด (${recentActions.length})`} icon={<MessageSquarePlus className="h-5 w-5 text-indigo-600" />}>
                    {recentActions.map(action => (
                        <ActionRow key={action.log_id} action={action} formatDate={formatDate} onProjectClick={handleOpenDetail} />
                    ))}
                </Section>
            )}

            {/* Action Log Dialog */}
            <ActionLogDialog
                open={showLogDialog}
                onClose={handleLogDialogClose}
                onSave={handleSaveLog}
                actionTypes={actionTypes}
                editData={null}
                defaultActionType={selectedActionType}
            />

            {/* Project Detail Dialog */}
            <ProjectDetailDialog
                open={showDetailDialog}
                onClose={handleDetailClose}
                projectId={detailProject.id}
                projectCode={detailProject.code}
                projectName={detailProject.name}
                currentUserId={currentUserId}
            />
        </div>
    )
}

// Sub-components
function SummaryCard({ icon, label, value, color, active, onClick }: {
    icon: React.ReactNode; label: string; value: number; color: string; active?: boolean; onClick?: () => void
}) {
    const bgMap: Record<string, string> = { blue: 'bg-blue-50', red: 'bg-red-50', amber: 'bg-amber-50', orange: 'bg-orange-50', green: 'bg-green-50' }
    const activeRingMap: Record<string, string> = { blue: 'ring-blue-400', red: 'ring-red-400', amber: 'ring-amber-400', orange: 'ring-orange-400', green: 'ring-green-400' }
    return (
        <div
            className={`rounded-xl p-4 ${bgMap[color] || 'bg-gray-50'} border border-gray-100 transition-all ${
                onClick ? 'cursor-pointer hover:shadow-md' : ''
            } ${active ? `ring-2 ${activeRingMap[color]} shadow-md` : ''}`}
            onClick={onClick}
        >
            <div className="flex items-center gap-3">
                {icon}
                <div>
                    <p className="text-2xl font-bold text-slate-800">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                </div>
            </div>
        </div>
    )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            </div>
            <div className="space-y-2">{children}</div>
        </div>
    )
}

function EmptyState({ text }: { text: string }) {
    return <div className="text-center py-6 text-slate-400 text-sm rounded-lg border border-dashed border-gray-200">{text}</div>
}

function TaskRow({ task, onComplete, formatDate, showOverdue, onProjectClick }: {
    task: SalesTask; onComplete: (id: string) => void; formatDate: (d: string) => string;
    showOverdue?: boolean; onProjectClick?: (project: { id: string; code: string; name: string }) => void
}) {
    return (
        <div className={`p-3 rounded-lg border flex items-center gap-3 ${showOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-slate-50/50'}`}>
            <button
                onClick={() => onComplete(task.task_id)}
                className="w-5 h-5 rounded border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center flex-shrink-0"
                title="ทำเสร็จแล้ว"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {task.due_time && <span className="text-xs font-mono text-slate-500">{task.due_time.slice(0, 5)}</span>}
                    <span className="text-sm font-medium text-slate-800 truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <button
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                        onClick={(e) => {
                            e.stopPropagation()
                            onProjectClick?.({ id: task.project_id, code: task.project_code, name: task.project_name })
                        }}
                    >
                        {task.project_code}: {task.project_name}
                    </button>
                    {task.contact_person && <span>| {task.contact_person}</span>}
                </div>
            </div>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${priorityStyles[task.priority] || ''}`}>
                {task.priority}
            </span>
            {showOverdue && (
                <span className="text-xs text-red-500 font-medium whitespace-nowrap">
                    เลย {Math.abs(task.days_until_due)} วัน
                </span>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-50 flex-shrink-0"
                onClick={() => onComplete(task.task_id)} title="Done">
                <CheckCircle className="h-4 w-4" />
            </Button>
        </div>
    )
}

function ActionRow({ action, formatDate, onProjectClick }: {
    action: ActionLog; formatDate: (d: string) => string;
    onProjectClick?: (project: { id: string; code: string; name: string }) => void
}) {
    const resultInfo = ACTION_RESULT_LABELS[action.new_status]
    return (
        <div className="p-3 rounded-lg border border-gray-100 bg-slate-50/50 flex items-center gap-3">
            <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: action.action_color || '#6B7280' }}
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ backgroundColor: (action.action_color || '#6B7280') + '20', color: action.action_color || '#6B7280' }}
                    >
                        {action.action_type_name || action.action_type}
                    </span>
                    <span className="text-sm font-medium text-slate-800 truncate">{action.title}</span>
                    {resultInfo && (
                        <span className={`text-[10px] font-medium ${resultInfo.color}`}>
                            {resultInfo.label}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <button
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                        onClick={(e) => {
                            e.stopPropagation()
                            onProjectClick?.({ id: action.project_id, code: action.project_code, name: action.project_name })
                        }}
                    >
                        {action.project_code}: {action.project_name}
                    </button>
                    {action.contact_person && <span>| {action.contact_person}</span>}
                    <span>| {formatDate(action.action_date)}</span>
                    <span>โดย {action.created_by_name}</span>
                </div>
            </div>
        </div>
    )
}
