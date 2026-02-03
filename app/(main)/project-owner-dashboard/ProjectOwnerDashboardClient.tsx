'use client'

import { useState, useTransition, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SmartCombobox, type Option } from '@/components/shared/SmartCombobox'
import {
    FolderKanban, CheckCircle, ChevronRight, ChevronDown,
    AlertCircle, AlertTriangle, RefreshCw,
    Clock, Users, DollarSign, TrendingUp,
    Loader2, Calendar, Target, Zap
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
    getOwnerDashboardDataWithFilters,
    type ProjectSummary,
    type DashboardStats,
    type AttentionItem,
    type UpcomingMilestone,
    type OwnerOption,
    type ProjectWithMilestones,
    type ProjectMilestone,
    type ProjectTypeOption,
    type ProjectStatusOption
} from '@/lib/actions/project-owner-dashboard-actions'

interface ProjectOwnerDashboardClientProps {
    initialData: {
        stats: DashboardStats | null
        projects: ProjectSummary[]
        projectsWithMilestones: ProjectWithMilestones[]
        attention: AttentionItem[]
        upcomingMilestones: UpcomingMilestone[]
    }
    ownerOptions: OwnerOption[]
    projectTypeOptions: ProjectTypeOption[]
    projectStatusOptions: ProjectStatusOption[]
    currentUser: {
        id: string
        name: string
        nameTh?: string
    }
    initialSelectedOwner: Option
}

// Health Status Config
const healthConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; dotColor: string }> = {
    ON_TRACK: { label: 'On Track', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-400', dotColor: 'bg-emerald-500' },
    AT_RISK: { label: 'At Risk', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-400', dotColor: 'bg-amber-500' },
    DELAYED: { label: 'Delayed', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-400', dotColor: 'bg-red-500' },
    OVER_BUDGET: { label: 'Over Budget', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-400', dotColor: 'bg-red-500' },
    COMPLETED: { label: 'Completed', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-400', dotColor: 'bg-blue-500' },
    CANCELLED: { label: 'Cancelled', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-300', dotColor: 'bg-gray-400' }
}

// Milestone Status Config
const milestoneStatusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    completed: { label: 'Done', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: <CheckCircle className="h-3.5 w-3.5" /> },
    in_progress: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <Zap className="h-3.5 w-3.5" /> },
    pending: { label: 'Pending', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: <Clock className="h-3.5 w-3.5" /> }
}

export function ProjectOwnerDashboardClient({
    initialData,
    ownerOptions,
    projectTypeOptions,
    projectStatusOptions,
    currentUser,
    initialSelectedOwner
}: ProjectOwnerDashboardClientProps) {
    const [isPending, startTransition] = useTransition()
    const [data, setData] = useState(initialData)
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

    const { stats, projectsWithMilestones, attention, upcomingMilestones } = data

    // Create current user label
    const currentUserLabel = currentUser.nameTh || currentUser.name || 'User'

    // Default options - stable objects
    const defaultTypeOption: Option = { value: '', label: 'All Types' }
    const defaultStatusOption: Option = { value: '', label: 'ทุกสถานะ' }

    // Initialize selected values - use props from server for owner
    const [selectedOwner, setSelectedOwner] = useState<Option>(initialSelectedOwner)
    const [selectedType, setSelectedType] = useState<Option>(defaultTypeOption)
    const [selectedStatus, setSelectedStatus] = useState<Option>(defaultStatusOption)

    // Owner options for combobox - add current user if not in list
    const ownerComboOptions: Option[] = useMemo(() => {
        const options = ownerOptions.map(o => ({
            value: o.id,
            label: `${o.name}${o.position_code ? ` (${o.position_code})` : ''} - ${o.project_count} โครงการ`
        }))

        // Add current user if not already in list
        if (!ownerOptions.find(o => o.id === currentUser.id)) {
            options.unshift({
                value: currentUser.id,
                label: `${currentUserLabel} - 0 โครงการ`
            })
        }

        return options
    }, [ownerOptions, currentUser.id, currentUserLabel])

    // Project Type options
    const typeComboOptions: Option[] = useMemo(() => [
        defaultTypeOption,
        ...projectTypeOptions.map(t => ({
            value: t.id,
            label: `${t.name} (${t.project_count})`
        }))
    ], [projectTypeOptions])

    // Project Status options - exclude CANCELLED
    const statusComboOptions: Option[] = useMemo(() => [
        defaultStatusOption,
        ...projectStatusOptions
            .filter(s => s.code !== 'CANCELLED')
            .map(s => ({
                value: s.id,
                label: `${s.name} (${s.project_count})`
            }))
    ], [projectStatusOptions])

    // Fetch data with filters
    const fetchData = (ownerId: string, typeId?: string, statusId?: string) => {
        startTransition(async () => {
            const newData = await getOwnerDashboardDataWithFilters({
                ownerId,
                projectTypeId: typeId || undefined,
                statusId: statusId || undefined,
                excludeCancelled: true
            })
            setData(newData)
            setExpandedProjects(new Set())
        })
    }

    // Handle owner change
    const handleOwnerChange = (option: Option | null) => {
        if (option) {
            setSelectedOwner(option)
            fetchData(
                option.value as string,
                selectedType.value as string,
                selectedStatus.value as string
            )
        }
    }

    // Handle type change
    const handleTypeChange = (option: Option | null) => {
        if (option) {
            setSelectedType(option)
            fetchData(
                selectedOwner.value as string,
                option.value as string,
                selectedStatus.value as string
            )
        }
    }

    // Handle status change
    const handleStatusChange = (option: Option | null) => {
        if (option) {
            setSelectedStatus(option)
            fetchData(
                selectedOwner.value as string,
                selectedType.value as string,
                option.value as string
            )
        }
    }

    // Refresh data
    const handleRefresh = () => {
        fetchData(
            selectedOwner.value as string,
            selectedType.value as string,
            selectedStatus.value as string
        )
    }

    // Toggle project expansion
    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const newSet = new Set(prev)
            if (newSet.has(projectId)) {
                newSet.delete(projectId)
            } else {
                newSet.add(projectId)
            }
            return newSet
        })
    }

    // Progress color helper
    const getProgressColor = (percent: number) => {
        if (percent > 100) return '[&>div]:bg-red-500'
        if (percent > 90) return '[&>div]:bg-amber-500'
        return '[&>div]:bg-emerald-500'
    }

    const getStatusColor = (percent: number) => {
        if (percent > 100) return 'text-red-600'
        if (percent > 90) return 'text-amber-600'
        return 'text-emerald-600'
    }

    // Format date
    const formatDate = (date: string | null) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    }

    return (
        <div className="space-y-4">
            {/* Header - Compact */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <FolderKanban className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">My Projects Dashboard</h1>
                            <p className="text-indigo-200 text-sm">ติดตามสถานะโครงการและ Milestone</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="w-56">
                            <SmartCombobox
                                options={ownerComboOptions}
                                value={selectedOwner}
                                onChange={handleOwnerChange}
                                placeholder="เลือก Owner..."
                                disabled={isPending}
                            />
                        </div>
                        <div className="w-40">
                            <SmartCombobox
                                options={typeComboOptions}
                                value={selectedType}
                                onChange={handleTypeChange}
                                placeholder="Project Type"
                                disabled={isPending}
                                searchable={false}
                            />
                        </div>
                        <div className="w-40">
                            <SmartCombobox
                                options={statusComboOptions}
                                value={selectedStatus}
                                onChange={handleStatusChange}
                                placeholder="Status"
                                disabled={isPending}
                                searchable={false}
                            />
                        </div>
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={isPending}
                            className="bg-white/20 hover:bg-white/30 text-white border-0 h-9 w-9"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Cards - Compact */}
            {stats && (
                <div className="grid grid-cols-5 gap-3">
                    <div className="bg-white rounded-xl p-3 shadow border border-gray-100">
                        <div className="text-gray-500 text-xs">Total</div>
                        <div className="text-2xl font-bold text-gray-900">{stats.total_projects}</div>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 shadow border border-emerald-100">
                        <div className="text-emerald-600 text-xs">On Track</div>
                        <div className="text-2xl font-bold text-emerald-700">{stats.on_track_count}</div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 shadow border border-amber-100">
                        <div className="text-amber-600 text-xs">At Risk</div>
                        <div className="text-2xl font-bold text-amber-700">{stats.at_risk_count}</div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 shadow border border-red-100">
                        <div className="text-red-600 text-xs">Delayed</div>
                        <div className="text-2xl font-bold text-red-700">{stats.delayed_count}</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 shadow border border-blue-100">
                        <div className="text-blue-600 text-xs">Completed</div>
                        <div className="text-2xl font-bold text-blue-700">{stats.completed_count}</div>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {isPending && (
                <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                        <span className="text-gray-700 font-medium">กำลังโหลดข้อมูล...</span>
                    </div>
                </div>
            )}

            {/* Man-day & Budget Summary */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-indigo-50/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Users className="h-4 w-4 text-indigo-600" />
                                </div>
                                Man-day Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between mb-3">
                                <div>
                                    <span className="text-3xl font-bold text-gray-900">{Math.round(stats.total_actual_mandays)}</span>
                                    <span className="text-gray-500 ml-1">/ {Math.round(stats.total_planned_mandays)} MD</span>
                                </div>
                                <span className={cn("text-2xl font-bold", getStatusColor(stats.overall_manday_percent))}>
                                    {Math.round(stats.overall_manday_percent)}%
                                </span>
                            </div>
                            <Progress
                                value={Math.min(stats.overall_manday_percent, 100)}
                                className={cn("h-3 rounded-full", getProgressColor(stats.overall_manday_percent))}
                            />
                            <div className="flex justify-between mt-3 text-sm">
                                <span className={cn("font-medium", stats.total_remaining_mandays < 0 ? 'text-red-600' : 'text-gray-600')}>
                                    Remaining: {Math.round(stats.total_remaining_mandays)} MD
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                </div>
                                Budget Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between mb-3">
                                <div>
                                    <span className="text-3xl font-bold text-gray-900">{(stats.total_actual_budget / 1000000).toFixed(1)}M</span>
                                    <span className="text-gray-500 ml-1">/ {(stats.total_planned_budget / 1000000).toFixed(1)}M</span>
                                </div>
                                <span className="text-2xl font-bold text-gray-700">
                                    {stats.total_planned_budget > 0 ? Math.round((stats.total_actual_budget / stats.total_planned_budget) * 100) : 0}%
                                </span>
                            </div>
                            <Progress
                                value={stats.total_planned_budget > 0 ? Math.min((stats.total_actual_budget / stats.total_planned_budget) * 100, 100) : 0}
                                className="h-3 rounded-full [&>div]:bg-emerald-500"
                            />
                            <div className="flex justify-between mt-3 text-sm">
                                <span className="font-medium text-gray-600">
                                    Remaining: {((stats.total_planned_budget - stats.total_actual_budget) / 1000000).toFixed(1)}M
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Attention Required */}
            {attention.length > 0 && (
                <Card className="border-0 shadow-lg bg-gradient-to-r from-red-50 to-orange-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-red-700 flex items-center gap-2">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            Attention Required
                            <Badge variant="destructive" className="ml-2">{attention.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {attention.slice(0, 5).map((item, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border bg-white",
                                        item.severity === 'HIGH' ? 'border-red-200' :
                                            item.severity === 'MEDIUM' ? 'border-amber-200' : 'border-blue-200'
                                    )}
                                >
                                    <div className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        item.severity === 'HIGH' ? 'bg-red-500' :
                                            item.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'
                                    )} />
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            href={`/projects/${item.project_id}`}
                                            className="font-medium hover:text-indigo-600 text-gray-900"
                                        >
                                            {item.project_code}
                                        </Link>
                                        <span className="text-gray-500 mx-2">-</span>
                                        <span className="text-gray-600 text-sm">{item.issue_description}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Projects with Milestones */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <FolderKanban className="h-5 w-5 text-indigo-600" />
                                </div>
                                My Projects
                            </CardTitle>
                            <CardDescription className="mt-1">
                                {projectsWithMilestones.length} โครงการ - คลิกเพื่อดู Milestone
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {projectsWithMilestones.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <FolderKanban className="h-16 w-16 mx-auto mb-4 text-gray-200" />
                            <p className="text-lg">ไม่มีโครงการที่รับผิดชอบ</p>
                        </div>
                    ) : (
                        projectsWithMilestones.map((project) => {
                            const health = healthConfig[project.health_status] || healthConfig.ON_TRACK
                            const isExpanded = expandedProjects.has(project.project_id)

                            return (
                                <div
                                    key={project.project_id}
                                    className={cn(
                                        "border-2 rounded-2xl overflow-hidden transition-all duration-300",
                                        health.borderColor,
                                        isExpanded ? 'shadow-lg' : 'shadow-sm hover:shadow-md'
                                    )}
                                >
                                    {/* Project Header */}
                                    <div
                                        className={cn(
                                            "p-4 cursor-pointer transition-colors",
                                            isExpanded ? health.bgColor : 'bg-white hover:bg-gray-50'
                                        )}
                                        onClick={() => toggleProject(project.project_id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-3 h-3 rounded-full", health.dotColor)} />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/projects/${project.project_id}`}
                                                            className="font-bold text-gray-900 hover:text-indigo-600"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            {project.project_code}
                                                        </Link>
                                                        <span className="text-gray-400">|</span>
                                                        <span className="text-gray-700">{project.project_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                                        <span>{project.customer_name || '-'}</span>
                                                        <span className="flex items-center gap-1">
                                                            <Target className="h-3.5 w-3.5" />
                                                            {project.milestones.length} Milestones
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className={cn("text-lg font-bold", getStatusColor(project.manday_percent))}>
                                                        {Math.round(project.actual_mandays)}/{Math.round(project.planned_mandays)} MD
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {Math.round(project.manday_percent)}% used
                                                    </div>
                                                </div>
                                                <Badge className={cn(health.bgColor, health.color, "border-0 px-3 py-1")}>
                                                    {health.label}
                                                </Badge>
                                                <ChevronDown className={cn(
                                                    "h-5 w-5 text-gray-400 transition-transform",
                                                    isExpanded && "rotate-180"
                                                )} />
                                            </div>
                                        </div>

                                        {/* Mini Progress */}
                                        <div className="mt-3">
                                            <Progress
                                                value={Math.min(project.manday_percent, 100)}
                                                className={cn("h-1.5 rounded-full", getProgressColor(project.manday_percent))}
                                            />
                                        </div>
                                    </div>

                                    {/* Milestones Section */}
                                    {isExpanded && project.milestones.length > 0 && (
                                        <div className="bg-gray-50 p-4 border-t">
                                            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Milestone Timeline
                                            </div>
                                            <div className="space-y-2">
                                                {project.milestones.map((ms, idx) => {
                                                    const msStatus = milestoneStatusConfig[ms.status] || milestoneStatusConfig.pending
                                                    const isOverdue = ms.days_overdue > 0
                                                    const mandayPercent = ms.planned_mandays > 0 ? (ms.actual_mandays / ms.planned_mandays) * 100 : 0

                                                    return (
                                                        <div
                                                            key={ms.milestone_id}
                                                            className={cn(
                                                                "flex items-center gap-4 p-3 bg-white rounded-xl border",
                                                                ms.status === 'completed' ? 'border-emerald-200' :
                                                                    isOverdue ? 'border-red-200' : 'border-gray-200'
                                                            )}
                                                        >
                                                            {/* Milestone Number */}
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                                                                ms.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                                                                    ms.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                                                                        'bg-gray-100 text-gray-500'
                                                            )}>
                                                                {idx + 1}
                                                            </div>

                                                            {/* Milestone Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-gray-900">{ms.milestone_name}</span>
                                                                    <Badge className={cn(msStatus.bgColor, msStatus.color, "border-0 text-xs")}>
                                                                        {msStatus.icon}
                                                                        <span className="ml-1">{msStatus.label}</span>
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-4 mt-1 text-sm">
                                                                    <span className={cn(
                                                                        "flex items-center gap-1",
                                                                        isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                                                                    )}>
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        {ms.status === 'completed'
                                                                            ? `Done: ${formatDate(ms.completed_date)}`
                                                                            : isOverdue
                                                                                ? `เกิน ${ms.days_overdue} วัน`
                                                                                : ms.days_until_due === 0
                                                                                    ? 'วันนี้'
                                                                                    : ms.days_until_due > 0
                                                                                        ? `อีก ${ms.days_until_due} วัน`
                                                                                        : formatDate(ms.due_date)
                                                                        }
                                                                    </span>
                                                                    <span className="text-gray-400">|</span>
                                                                    <span className="text-gray-500">
                                                                        Due: {formatDate(ms.due_date)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Man-day */}
                                                            <div className="text-right shrink-0 w-32">
                                                                <div className={cn(
                                                                    "font-bold",
                                                                    mandayPercent > 100 ? 'text-red-600' :
                                                                        mandayPercent > 90 ? 'text-amber-600' : 'text-gray-700'
                                                                )}>
                                                                    {ms.actual_mandays.toFixed(1)} / {ms.planned_mandays.toFixed(1)} MD
                                                                </div>
                                                                <Progress
                                                                    value={Math.min(mandayPercent, 100)}
                                                                    className={cn("h-1.5 mt-1 rounded-full", getProgressColor(mandayPercent))}
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </CardContent>
            </Card>

            {/* Upcoming Milestones */}
            {upcomingMilestones.length > 0 && (
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Clock className="h-5 w-5 text-amber-600" />
                            </div>
                            Upcoming Milestones
                            <Badge variant="secondary" className="ml-2">{upcomingMilestones.length}</Badge>
                        </CardTitle>
                        <CardDescription>Milestones ที่จะถึงใน 30 วัน</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {upcomingMilestones.map((ms, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all hover:shadow-md",
                                        ms.urgency === 'OVERDUE' ? 'border-red-300 bg-red-50' :
                                            ms.urgency === 'THIS_WEEK' ? 'border-orange-300 bg-orange-50' :
                                                ms.urgency === 'NEXT_WEEK' ? 'border-amber-300 bg-amber-50' :
                                                    'border-gray-200 bg-white'
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <Badge variant={
                                            ms.urgency === 'OVERDUE' ? 'destructive' :
                                                ms.urgency === 'THIS_WEEK' ? 'default' : 'secondary'
                                        }>
                                            {ms.days_until_due < 0
                                                ? `เกิน ${Math.abs(ms.days_until_due)} วัน`
                                                : ms.days_until_due === 0
                                                    ? 'วันนี้'
                                                    : `อีก ${ms.days_until_due} วัน`
                                            }
                                        </Badge>
                                        <span className="text-xs text-gray-500">
                                            {formatDate(ms.planned_date)}
                                        </span>
                                    </div>
                                    <div className="font-medium text-gray-900">{ms.milestone_name}</div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        {ms.project_code}: {ms.project_name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
