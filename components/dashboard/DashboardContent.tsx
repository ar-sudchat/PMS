'use client'

import { DashboardData } from '@/lib/actions/dashboard-actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { KPIOverviewSection } from './KPIOverviewSection'
import {
    FolderKanban,
    ListTodo,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Calendar,
    Target,
    ChevronRight,
    Plus,
    TrendingUp,
    Users
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface DashboardContentProps {
    data: DashboardData
}

export function DashboardContent({ data }: DashboardContentProps) {
    const isManager = data.user.role === 'admin' || data.user.role === 'manager'
    const greeting = getGreeting()

    return (
        <div className="pt-6">
            {/* Welcome Section */}
            <div className="mb-8 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-extrabold mb-2">
                            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {greeting}, {data.user.nickname || data.user.name}!
                            </span>{' '}
                            <span className="inline-block animate-bounce">👋</span>
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Here's what's happening with your projects today
                        </p>
                    </div>
                    <Button variant="outline" size="sm" className="hidden sm:flex shadow-sm hover:shadow-md transition-shadow">
                        <Clock className="h-4 w-4 mr-2" />
                        Today
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <SummaryCard
                    label="Total Tasks"
                    value={data.summary?.total_tasks || 0}
                    subtitle={`${data.summary?.in_progress_tasks || 0} in progress`}
                    icon={<ListTodo className="h-5 w-5" />}
                    gradientFrom="#6366F1"
                    gradientTo="#8B5CF6"
                />
                <SummaryCard
                    label="Overdue"
                    value={data.summary?.overdue_tasks || 0}
                    subtitle="Need action"
                    icon={<AlertTriangle className="h-5 w-5" />}
                    gradientFrom="#F59E0B"
                    gradientTo="#EF4444"
                    isAlert={(data.summary?.overdue_tasks || 0) > 0}
                />
                <SummaryCard
                    label="Due Today"
                    value={data.summary?.due_today_tasks || 0}
                    subtitle="Complete!"
                    icon={<Calendar className="h-5 w-5" />}
                    gradientFrom="#06B6D4"
                    gradientTo="#3B82F6"
                />
                <SummaryCard
                    label="My Projects"
                    value={data.myProjects.length}
                    subtitle="Active"
                    icon={<FolderKanban className="h-5 w-5" />}
                    gradientFrom="#10B981"
                    gradientTo="#059669"
                />
            </div>

            {/* Manager Stats (if applicable) */}
            {isManager && data.teamOverview && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <TeamStatCard
                        label="Team Members"
                        value={data.teamOverview.total_employees}
                        icon={<Users />}
                        color="blue"
                    />
                    <TeamStatCard
                        label="Active Projects"
                        value={data.teamOverview.active_projects}
                        icon={<FolderKanban />}
                        color="purple"
                    />
                    <TeamStatCard
                        label="At Risk"
                        value={data.teamOverview.at_risk_projects}
                        icon={<AlertTriangle />}
                        color="amber"
                    />
                    <TeamStatCard
                        label="Pending Approval"
                        value={data.teamOverview.pending_timesheet_approvals}
                        icon={<CheckCircle2 />}
                        color="green"
                    />
                </div>
            )}

            {/* KPI Overview (Manager/Admin only) */}
            {isManager && <KPIOverviewSection className="mb-8" />}

            {/* Overdue Tasks Alert */}
            {data.overdueTasks.length > 0 && (
                <div className="mb-8 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h3 className="font-semibold text-red-700">
                            {data.overdueTasks.length} Overdue Tasks
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {data.overdueTasks.slice(0, 3).map((task) => (
                            <Link
                                key={task.id}
                                href={`/my-tasks?task=${task.id}`}
                                className="flex items-center justify-between bg-white rounded-lg p-3 hover:shadow-md transition-shadow"
                            >
                                <div>
                                    <p className="font-medium text-sm">{task.task_title}</p>
                                    <p className="text-xs text-slate-500">{task.project_code}</p>
                                </div>
                                <span className="text-xs text-red-600 font-medium">
                                    {task.days_overdue} days late
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Today's Tasks */}
                <div className="lg:col-span-2">
                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-amber-500" />
                                Today's Tasks ({data.todayTasks.length})
                            </h3>
                            <Link href="/my-tasks">
                                <Button variant="ghost" size="sm">View All →</Button>
                            </Link>
                        </div>
                        {data.todayTasks.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-300" />
                                <p>No tasks due today! 🎉</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {data.todayTasks.map((task) => (
                                    <Link
                                        key={task.id}
                                        href={`/my-tasks?task=${task.id}`}
                                        className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{task.task_title}</p>
                                            <p className="text-xs text-slate-500">{task.project_code}</p>
                                        </div>
                                        <span className="text-sm text-slate-500">{task.estimated_hours}h</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Timesheet Today */}
                <div>
                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-500" />
                                My Timesheet Today
                            </h3>
                        </div>
                        <div className="text-center mb-4">
                            <p className="text-3xl font-bold">
                                {data.timesheetToday?.total_hours_today || 0}h
                                <span className="text-slate-300 mx-1">/</span>
                                {data.timesheetToday?.target_hours || 8}h
                            </p>
                            <div className="w-full h-3 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all",
                                        (data.timesheetToday?.completion_percent || 0) >= 100
                                            ? "bg-green-500"
                                            : "bg-blue-500"
                                    )}
                                    style={{ width: `${Math.min(data.timesheetToday?.completion_percent || 0, 100)}%` }}
                                />
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                                {data.timesheetToday?.completion_percent || 0}% Complete
                            </p>
                        </div>
                        <Link href="/timesheet">
                            <Button className="w-full" size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Log Time
                            </Button>
                        </Link>
                    </Card>
                </div>
            </div>

            {/* Projects */}
            {data.myProjects.length > 0 && (
                <Card className="p-4 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <FolderKanban className="w-5 h-5 text-purple-500" />
                            My Projects ({data.myProjects.length})
                        </h3>
                        <Link href="/projects">
                            <Button variant="ghost" size="sm">View All →</Button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.myProjects.slice(0, 6).map((project) => {
                            const progress = project.total_tasks > 0
                                ? Math.round((project.completed_tasks / project.total_tasks) * 100)
                                : 0

                            const healthColors = {
                                on_track: 'bg-green-100 text-green-700',
                                at_risk: 'bg-amber-100 text-amber-700',
                                overdue: 'bg-red-100 text-red-700'
                            }

                            return (
                                <Link
                                    key={project.project_id}
                                    href={`/projects/${project.project_id}`}
                                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-medium text-sm">{project.project_name}</p>
                                            <p className="text-xs text-slate-500">{project.customer_name}</p>
                                        </div>
                                        <span className={cn("px-2 py-0.5 text-xs rounded", healthColors[project.health_status])}>
                                            {project.health_status}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>Tasks: {project.completed_tasks}/{project.total_tasks}</span>
                                        <span>MD: {project.used_mandays?.toFixed(1)}/{project.sold_mandays}</span>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </Card>
            )}

            {/* Upcoming Milestones */}
            {data.upcomingMilestones.length > 0 && (
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Target className="w-5 h-5 text-indigo-500" />
                            Upcoming Milestones ({data.upcomingMilestones.length})
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {data.upcomingMilestones.slice(0, 5).map((milestone) => (
                            <div
                                key={milestone.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-1 h-10 rounded-full"
                                        style={{ backgroundColor: milestone.milestone_color || '#6366f1' }}
                                    />
                                    <div>
                                        <p className="font-medium text-sm">{milestone.milestone_name}</p>
                                        <p className="text-xs text-slate-500">{milestone.project_name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm">
                                        {new Date(milestone.due_date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </p>
                                    <p className={cn(
                                        "text-xs",
                                        milestone.days_until_due <= 3 ? "text-red-500 font-medium" : "text-slate-500"
                                    )}>
                                        {milestone.days_until_due} days left
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}

interface SummaryCardProps {
    label: string
    value: number
    subtitle: string
    icon: React.ReactNode
    gradientFrom: string
    gradientTo: string
    isAlert?: boolean
}

function SummaryCard({ label, value, subtitle, icon, gradientFrom, gradientTo, isAlert }: SummaryCardProps) {
    return (
        <Card className={cn("p-4 relative overflow-hidden", isAlert && "border-red-200 animate-pulse")}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                    <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
                </div>
                <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${gradientFrom}20` }}
                >
                    <div style={{ color: gradientFrom }}>
                        {icon}
                    </div>
                </div>
            </div>
            <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` }}
            />
        </Card>
    )
}

interface TeamStatCardProps {
    label: string
    value: number
    icon: React.ReactNode
    color: 'blue' | 'purple' | 'amber' | 'green'
}

function TeamStatCard({ label, value, icon, color }: TeamStatCardProps) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
        green: 'bg-green-50 text-green-600'
    }

    return (
        <Card className="p-4 text-center">
            <div className={cn("w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center", colors[color])}>
                {icon}
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
        </Card>
    )
}
