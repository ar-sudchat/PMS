'use client'

import { useState, useEffect } from 'react'
import {
    getEmployeesForReport,
    getEmployeeWorkSummary,
    getEmployeeWeeklyHours,
    getEmployeeTasks,
    getHoursByTaskType,
    getHoursByProject,
    EmployeeForReport,
    EmployeeWorkSummary,
    WeeklyHours,
    TaskRow,
    TaskTypeBreakdown,
    ProjectBreakdown
} from '@/lib/actions/employee-report-actions'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import { cn } from '@/lib/utils'
import { format, addMonths, subMonths } from 'date-fns'
import {
    Clock, CheckCircle2, ListTodo, TrendingUp, ChevronLeft, ChevronRight,
    Loader2, User, Calendar, BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// Summary Card Component
function SummaryCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color
}: {
    title: string
    value: string | number
    subtitle?: string
    icon: React.ElementType
    color: 'blue' | 'green' | 'amber' | 'purple'
}) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        green: 'bg-green-50 text-green-600 border-green-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100'
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", colorClasses[color])}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-900">{value}</div>
                    <div className="text-sm text-slate-500">{title}</div>
                    {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
                </div>
            </div>
        </div>
    )
}

// Weekly Hours Table Component
function WeeklyHoursTable({ weeks }: { weeks: WeeklyHours[] }) {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Weekly Hours
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="text-left text-xs font-medium text-slate-500 p-3">Week</th>
                            {dayNames.map(day => (
                                <th key={day} className="text-center text-xs font-medium text-slate-500 p-3 w-14">{day}</th>
                            ))}
                            <th className="text-center text-xs font-medium text-slate-500 p-3 w-16">Total</th>
                            <th className="text-left text-xs font-medium text-slate-500 p-3 w-32">Progress</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {weeks.map((week, idx) => {
                            const progressPercent = Math.min(Math.round((week.total_hours / week.target_hours) * 100), 100)
                            return (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-3 text-sm text-slate-700">
                                        W{week.week_number}
                                        <span className="text-xs text-slate-400 ml-1">
                                            ({format(new Date(week.week_start), 'd')}-{format(new Date(week.week_end), 'd MMM')})
                                        </span>
                                    </td>
                                    {week.daily_hours.map((hours, i) => (
                                        <td key={i} className={cn(
                                            "text-center p-3 text-sm",
                                            hours > 0 ? "text-slate-700 font-medium" : "text-slate-300"
                                        )}>
                                            {hours > 0 ? hours : '-'}
                                        </td>
                                    ))}
                                    <td className="text-center p-3 text-sm font-semibold text-slate-900">
                                        {week.total_hours}h
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full",
                                                        progressPercent >= 100 ? "bg-green-500" :
                                                            progressPercent >= 70 ? "bg-blue-500" : "bg-amber-500"
                                                    )}
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-500 w-10">{progressPercent}%</span>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// Tasks Table Component
function TasksTable({ tasks }: { tasks: TaskRow[] }) {
    const statusColors: Record<string, string> = {
        done: 'bg-green-100 text-green-700',
        in_progress: 'bg-blue-100 text-blue-700',
        review: 'bg-purple-100 text-purple-700',
        todo: 'bg-slate-100 text-slate-700',
        blocked: 'bg-red-100 text-red-700'
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-slate-400" />
                    Tasks ({tasks.length})
                </h3>
            </div>
            <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th className="text-left text-xs font-medium text-slate-500 p-3">Task</th>
                            <th className="text-left text-xs font-medium text-slate-500 p-3">Project</th>
                            <th className="text-left text-xs font-medium text-slate-500 p-3">Type</th>
                            <th className="text-center text-xs font-medium text-slate-500 p-3">Status</th>
                            <th className="text-center text-xs font-medium text-slate-500 p-3">Est</th>
                            <th className="text-center text-xs font-medium text-slate-500 p-3">Act</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tasks.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                    ไม่พบ Tasks ใน period นี้
                                </td>
                            </tr>
                        ) : (
                            tasks.map((task) => (
                                <tr key={task.task_id} className="hover:bg-slate-50">
                                    <td className="p-3">
                                        <div className="text-xs text-slate-400">{task.task_code}</div>
                                        <div className="text-sm text-slate-700 font-medium truncate max-w-xs">{task.task_title}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="text-xs text-slate-400">{task.project_code}</div>
                                        <div className="text-sm text-slate-600 truncate max-w-32">{task.project_name}</div>
                                    </td>
                                    <td className="p-3 text-sm text-slate-600">{task.task_type}</td>
                                    <td className="p-3 text-center">
                                        <span className={cn(
                                            "text-xs px-2 py-1 rounded-full capitalize",
                                            statusColors[task.status] || 'bg-slate-100 text-slate-600'
                                        )}>
                                            {task.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center text-sm text-slate-600">{task.estimated_hours}h</td>
                                    <td className="p-3 text-center text-sm font-medium text-slate-900">{task.actual_hours}h</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// Simple Bar Chart Component (no external library)
function HorizontalBarChart({
    data,
    title,
    icon: Icon
}: {
    data: { label: string; value: number; percentage: number; color?: string }[]
    title: string
    icon: React.ElementType
}) {
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <Icon className="w-4 h-4 text-slate-400" />
                {title}
            </h3>
            <div className="space-y-3">
                {data.length === 0 ? (
                    <div className="text-center text-slate-400 py-4">ไม่มีข้อมูล</div>
                ) : (
                    data.map((item, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-700">{item.label}</span>
                                <span className="text-slate-500">{item.value}h ({item.percentage}%)</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${item.percentage}%`,
                                        backgroundColor: item.color || colors[idx % colors.length]
                                    }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

// Main Component
export function EmployeeWorkReportView() {
    const [employees, setEmployees] = useState<EmployeeForReport[]>([])
    const [selectedEmployee, setSelectedEmployee] = useState<string>('')
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [loading, setLoading] = useState(false)

    const [summary, setSummary] = useState<EmployeeWorkSummary | null>(null)
    const [weeklyHours, setWeeklyHours] = useState<WeeklyHours[]>([])
    const [tasks, setTasks] = useState<TaskRow[]>([])
    const [taskTypeBreakdown, setTaskTypeBreakdown] = useState<TaskTypeBreakdown[]>([])
    const [projectBreakdown, setProjectBreakdown] = useState<ProjectBreakdown[]>([])

    // Load employees on mount
    useEffect(() => {
        async function loadEmployees() {
            const data = await getEmployeesForReport()
            setEmployees(data)
            if (data.length > 0) {
                setSelectedEmployee(data[0].id)
            }
        }
        loadEmployees()
    }, [])

    // Load report data when employee or date changes
    useEffect(() => {
        if (!selectedEmployee) return

        async function loadReportData() {
            setLoading(true)
            const year = selectedDate.getFullYear()
            const month = selectedDate.getMonth() + 1

            const [summaryData, hoursData, tasksData, typeData, projectData] = await Promise.all([
                getEmployeeWorkSummary(selectedEmployee, year, month),
                getEmployeeWeeklyHours(selectedEmployee, year, month),
                getEmployeeTasks(selectedEmployee, year, month),
                getHoursByTaskType(selectedEmployee, year, month),
                getHoursByProject(selectedEmployee, year, month)
            ])

            setSummary(summaryData)
            setWeeklyHours(hoursData)
            setTasks(tasksData)
            setTaskTypeBreakdown(typeData)
            setProjectBreakdown(projectData)
            setLoading(false)
        }

        loadReportData()
    }, [selectedEmployee, selectedDate])

    const employeeOptions = employees.map(e => ({
        value: e.id,
        label: e.nickname ? `${e.name} (${e.nickname})` : e.name
    }))

    const handleMonthChange = (delta: number) => {
        setSelectedDate(prev => delta > 0 ? addMonths(prev, 1) : subMonths(prev, 1))
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Employee Work Report</h2>
                    <p className="text-sm text-muted-foreground">รายงานการทำงานรายบุคคล</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    {/* Employee Selector */}
                    <div className="w-64">
                        <SmartCombobox
                            value={employeeOptions.find(o => o.value === selectedEmployee)}
                            onChange={(opt) => setSelectedEmployee(opt?.value?.toString() || '')}
                            options={employeeOptions}
                            placeholder="เลือกพนักงาน"
                        />
                    </div>

                    {/* Month Selector */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMonthChange(-1)}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" className="h-7 px-3 text-sm font-medium">
                            {format(selectedDate, 'MMMM yyyy')}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMonthChange(1)}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard
                            title="Total Tasks"
                            value={summary?.total_tasks || 0}
                            subtitle={`In Progress: ${summary?.in_progress_tasks || 0}`}
                            icon={ListTodo}
                            color="blue"
                        />
                        <SummaryCard
                            title="Completed"
                            value={summary?.completed_tasks || 0}
                            subtitle={`Todo: ${summary?.todo_tasks || 0}`}
                            icon={CheckCircle2}
                            color="green"
                        />
                        <SummaryCard
                            title="Hours Logged"
                            value={`${summary?.total_hours_logged || 0}h`}
                            icon={Clock}
                            color="amber"
                        />
                        <SummaryCard
                            title="Completion Rate"
                            value={`${summary?.completion_rate || 0}%`}
                            icon={TrendingUp}
                            color="purple"
                        />
                    </div>

                    {/* Weekly Hours */}
                    <WeeklyHoursTable weeks={weeklyHours} />

                    {/* Tasks + Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Tasks Table */}
                        <div className="lg:col-span-2">
                            <TasksTable tasks={tasks} />
                        </div>

                        {/* Charts */}
                        <div className="space-y-6">
                            <HorizontalBarChart
                                title="Hours by Task Type"
                                icon={BarChart3}
                                data={taskTypeBreakdown.map(t => ({
                                    label: t.task_type_name,
                                    value: t.hours,
                                    percentage: t.percentage
                                }))}
                            />

                            <HorizontalBarChart
                                title="Hours by Project"
                                icon={BarChart3}
                                data={projectBreakdown.map(p => ({
                                    label: `${p.project_code}`,
                                    value: p.hours,
                                    percentage: p.percentage
                                }))}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
