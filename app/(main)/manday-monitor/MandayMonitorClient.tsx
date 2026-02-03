'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { DataTable } from '@/components/shared/DataTable'
import { ColumnDef } from '@tanstack/react-table'
import {
    Clock,
    Target,
    TrendingUp,
    TrendingDown,
    FolderKanban,
    Users,
    RefreshCw,
    Loader2,
    BarChart3,
    PieChart,
    RotateCcw,
    ExternalLink
} from 'lucide-react'
import {
    getMandayDashboardData,
    FilterParams,
    MandaySummary,
    MandayByProject,
    MandayByEmployee,
    MandayTrend,
    ProjectOption,
    ProjectTypeOption,
    OwnerOption
} from '@/lib/actions/manday-monitor-actions'
import { ProjectMandayDetailDialog } from './ProjectMandayDetailDialog'

// Chart imports (recharts)
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'

interface MandayMonitorClientProps {
    initialData: {
        summary?: MandaySummary
        projects: MandayByProject[]
        topProjects: MandayByProject[]
        employees: MandayByEmployee[]
        topEmployees: MandayByEmployee[]
        trend: MandayTrend[]
    }
    filters: FilterParams
    projectOptions: ProjectOption[]
    projectTypeOptions: ProjectTypeOption[]
    ownerOptions: OwnerOption[]
}

const MONTH_NAMES = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export function MandayMonitorClient({
    initialData,
    filters,
    projectOptions,
    projectTypeOptions,
    ownerOptions
}: MandayMonitorClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [data, setData] = useState(initialData)
    const [activeTab, setActiveTab] = useState<'projects' | 'employees'>('projects')
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [detailDialogOpen, setDetailDialogOpen] = useState(false)

    const handleProjectClick = (projectId: string) => {
        setSelectedProjectId(projectId)
        setDetailDialogOpen(true)
    }

    // Build filter URL params
    const updateFilters = (updates: Partial<FilterParams>) => {
        const newFilters = { ...filters, ...updates }
        const params = new URLSearchParams()

        params.set('period', newFilters.periodType)
        params.set('year', newFilters.year.toString())

        if (newFilters.periodType === 'month' && newFilters.month) {
            params.set('month', newFilters.month.toString())
        }
        if (newFilters.periodType === 'quarter' && newFilters.quarter) {
            params.set('quarter', newFilters.quarter.toString())
        }
        if (newFilters.projectId) {
            params.set('project', newFilters.projectId)
        }
        if (newFilters.projectTypeCode) {
            params.set('projectType', newFilters.projectTypeCode)
        }
        if (newFilters.ownerId) {
            params.set('owner', newFilters.ownerId)
        }

        router.push(`/manday-monitor?${params.toString()}`)
    }

    const clearFilters = () => {
        const now = new Date()
        const quarter = Math.ceil((now.getMonth() + 1) / 3)
        router.push(`/manday-monitor?period=quarter&year=${now.getFullYear()}&quarter=${quarter}`)
    }

    const refreshData = () => {
        startTransition(async () => {
            const newData = await getMandayDashboardData(filters)
            setData(newData)
        })
    }

    // Prepare chart data
    const trendChartData = data.trend.map(t => ({
        ...t,
        monthName: MONTH_NAMES[t.month - 1]
    }))

    // Helper functions
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OVER': return 'bg-red-100 text-red-700 border-red-300'
            case 'WARNING': return 'bg-amber-100 text-amber-700 border-amber-300'
            case 'NO_BUDGET': return 'bg-gray-100 text-gray-600 border-gray-300'
            default: return 'bg-emerald-100 text-emerald-700 border-emerald-300'
        }
    }

    const getProgressColor = (percent: number) => {
        if (percent > 100) return '[&>div]:bg-red-500'
        if (percent > 90) return '[&>div]:bg-amber-500'
        return '[&>div]:bg-emerald-500'
    }

    const getWorkloadColor = (percent: number) => {
        if (percent > 100) return 'text-red-600'
        if (percent >= 80) return 'text-emerald-600'
        if (percent >= 50) return 'text-amber-600'
        return 'text-gray-500'
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('th-TH').format(num)
    }

    // Project Table Columns
    const projectColumns: ColumnDef<MandayByProject>[] = useMemo(() => [
        {
            accessorKey: 'project_code',
            header: 'Project',
            cell: ({ row }) => (
                <button
                    onClick={() => handleProjectClick(row.original.project_id)}
                    className="text-left hover:text-blue-600 transition-colors group"
                >
                    <span className="font-medium group-hover:underline">{row.original.project_code}</span>
                    <span className="text-gray-500 ml-2 text-sm">{row.original.project_name}</span>
                    <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            ),
        },
        {
            accessorKey: 'budget_mandays',
            header: () => <div className="text-right">Budget</div>,
            cell: ({ row }) => <div className="text-right">{row.original.budget_mandays} MD</div>,
        },
        {
            accessorKey: 'actual_mandays',
            header: () => <div className="text-right">Used</div>,
            cell: ({ row }) => <div className="text-right font-medium">{row.original.actual_mandays} MD</div>,
        },
        {
            accessorKey: 'remaining_mandays',
            header: () => <div className="text-right">Remain</div>,
            cell: ({ row }) => (
                <div className={`text-right ${row.original.remaining_mandays < 0 ? 'text-red-600' : ''}`}>
                    {row.original.remaining_mandays} MD
                </div>
            ),
        },
        {
            accessorKey: 'percent_used',
            header: 'Progress',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 min-w-[180px]">
                    <Progress
                        value={Math.min(row.original.percent_used, 100)}
                        className={`h-2 flex-1 ${getProgressColor(row.original.percent_used)}`}
                    />
                    <span className="text-sm w-12 text-right">{row.original.percent_used}%</span>
                </div>
            ),
        },
        {
            accessorKey: 'budget_status',
            header: () => <div className="text-center">Status</div>,
            cell: ({ row }) => (
                <div className="text-center">
                    <Badge className={getStatusColor(row.original.budget_status)}>
                        {row.original.budget_status === 'OVER' ? 'Over' :
                            row.original.budget_status === 'WARNING' ? 'Warning' :
                                row.original.budget_status === 'NO_BUDGET' ? 'No Budget' : 'OK'}
                    </Badge>
                </div>
            ),
        },
    ], [])

    // Employee Table Columns
    const employeeColumns: ColumnDef<MandayByEmployee>[] = useMemo(() => [
        {
            accessorKey: 'employee_name',
            header: 'Employee',
            cell: ({ row }) => <span className="font-medium">{row.original.employee_name}</span>,
        },
        {
            accessorKey: 'position_code',
            header: 'Position',
            cell: ({ row }) => (
                <Badge variant="outline">{row.original.position_code || '-'}</Badge>
            ),
        },
        {
            accessorKey: 'project_count',
            header: () => <div className="text-right">Projects</div>,
            cell: ({ row }) => <div className="text-right">{row.original.project_count}</div>,
        },
        {
            accessorKey: 'total_mandays',
            header: () => <div className="text-right">Man-day</div>,
            cell: ({ row }) => <div className="text-right font-medium">{row.original.total_mandays} MD</div>,
        },
        {
            accessorKey: 'avg_manday_per_day',
            header: () => <div className="text-right">Avg/Day</div>,
            cell: ({ row }) => <div className="text-right">{row.original.avg_manday_per_day}</div>,
        },
        {
            accessorKey: 'workload_percent',
            header: 'Workload',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 min-w-[180px]">
                    <Progress
                        value={Math.min(row.original.workload_percent, 100)}
                        className={`h-2 flex-1 ${getProgressColor(row.original.workload_percent)}`}
                    />
                    <span className={`text-sm w-12 text-right ${getWorkloadColor(row.original.workload_percent)}`}>
                        {row.original.workload_percent}%
                    </span>
                </div>
            ),
        },
    ], [])

    return (
        <div className="space-y-6">
            {/* Loading Overlay */}
            {isPending && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                        <span>กำลังโหลด...</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <BarChart3 className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Man-day Monitor</h1>
                            <p className="text-white/80 text-sm">ติดตาม Man-day โครงการและพนักงาน</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Period Type */}
                        <Select
                            value={filters.periodType}
                            onValueChange={(v) => updateFilters({ periodType: v as FilterParams['periodType'] })}
                        >
                            <SelectTrigger className="w-[130px] bg-white/20 border-white/30 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="month">รายเดือน</SelectItem>
                                <SelectItem value="quarter">รายไตรมาส</SelectItem>
                                <SelectItem value="year">รายปี</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Month Selector */}
                        {filters.periodType === 'month' && (
                            <Select
                                value={filters.month?.toString()}
                                onValueChange={(v) => updateFilters({ month: parseInt(v) })}
                            >
                                <SelectTrigger className="w-[90px] bg-white/20 border-white/30 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTH_NAMES.map((name, idx) => (
                                        <SelectItem key={idx} value={(idx + 1).toString()}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Quarter Selector */}
                        {filters.periodType === 'quarter' && (
                            <Select
                                value={filters.quarter?.toString()}
                                onValueChange={(v) => updateFilters({ quarter: parseInt(v) })}
                            >
                                <SelectTrigger className="w-[80px] bg-white/20 border-white/30 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Q1</SelectItem>
                                    <SelectItem value="2">Q2</SelectItem>
                                    <SelectItem value="3">Q3</SelectItem>
                                    <SelectItem value="4">Q4</SelectItem>
                                </SelectContent>
                            </Select>
                        )}

                        {/* Year Selector */}
                        <Select
                            value={filters.year.toString()}
                            onValueChange={(v) => updateFilters({ year: parseInt(v) })}
                        >
                            <SelectTrigger className="w-[90px] bg-white/20 border-white/30 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[2024, 2025, 2026, 2027].map(year => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Project Filter */}
                        <div className="w-[300px]">
                            <SmartCombobox
                                placeholder="โครงการ..."
                                options={projectOptions.map(p => ({
                                    value: p.id,
                                    label: `${p.project_code} - ${p.name}`
                                }))}
                                value={filters.projectId ? {
                                    value: filters.projectId,
                                    label: (() => {
                                        const project = projectOptions.find(p => p.id === filters.projectId)
                                        return project ? `${project.project_code} - ${project.name}` : ''
                                    })()
                                } : null}
                                onChange={(opt) => updateFilters({ projectId: opt?.value as string || undefined })}
                            />
                        </div>

                        {/* Owner Filter */}
                        <div className="w-[200px]">
                            <SmartCombobox
                                placeholder="Owner..."
                                options={ownerOptions.map(o => ({
                                    value: o.id,
                                    label: o.name
                                }))}
                                value={filters.ownerId ? {
                                    value: filters.ownerId,
                                    label: ownerOptions.find(o => o.id === filters.ownerId)?.name || ''
                                } : null}
                                onChange={(opt) => updateFilters({ ownerId: opt?.value as string || undefined })}
                            />
                        </div>

                        {/* Clear & Refresh */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={clearFilters}
                            className="text-white hover:bg-white/20"
                            title="ล้างตัวกรอง"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={refreshData}
                            disabled={isPending}
                            className="text-white hover:bg-white/20"
                        >
                            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Total Used */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-0 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Total Used
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">
                            {formatNumber(data.summary?.total_manday_used || 0)}
                        </div>
                        <p className="text-sm text-blue-600 flex items-center gap-1">
                            Man-day
                            {data.summary?.change_percent !== 0 && (
                                <span className={`flex items-center text-xs ${data.summary?.change_percent && data.summary.change_percent > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {data.summary?.change_percent && data.summary.change_percent > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {Math.abs(data.summary?.change_percent || 0)}%
                                </span>
                            )}
                        </p>
                    </CardContent>
                </Card>

                {/* Total Budget */}
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-0 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-purple-700 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Total Budget
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">
                            {formatNumber(data.summary?.total_budget || 0)}
                        </div>
                        <p className="text-sm text-purple-600">Man-day</p>
                    </CardContent>
                </Card>

                {/* Remaining */}
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-0 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-emerald-700 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Remaining
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${(data.summary?.total_remaining || 0) < 0 ? 'text-red-600' : 'text-emerald-900'}`}>
                            {formatNumber(data.summary?.total_remaining || 0)}
                        </div>
                        <p className="text-sm text-emerald-600">
                            {data.summary?.total_budget && data.summary.total_budget > 0
                                ? `${Math.round(((data.summary?.total_remaining || 0) / data.summary.total_budget) * 100)}% left`
                                : '0% left'
                            }
                        </p>
                    </CardContent>
                </Card>

                {/* Utilization */}
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-0 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
                            <PieChart className="h-4 w-4" />
                            Utilization
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-900">
                            {data.summary?.utilization_percent || 0}%
                        </div>
                        <p className="text-sm">
                            {(data.summary?.utilization_percent || 0) >= 80
                                ? <span className="text-emerald-600">Good</span>
                                : (data.summary?.utilization_percent || 0) >= 60
                                    ? <span className="text-amber-600">Moderate</span>
                                    : <span className="text-red-600">Low</span>
                            }
                        </p>
                    </CardContent>
                </Card>

                {/* Projects */}
                <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-0 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-indigo-700 flex items-center gap-2">
                            <FolderKanban className="h-4 w-4" />
                            Projects
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-900">
                            {data.summary?.active_projects || 0}
                        </div>
                        <p className="text-sm text-indigo-600">Active</p>
                    </CardContent>
                </Card>
            </div>

            {/* Trend Chart */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                        Man-day Trend ({filters.year})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="monthName" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value: number, name: string) => [
                                        `${value} MD`,
                                        name === 'actual_mandays' ? 'Actual' : 'Target'
                                    ]}
                                    labelFormatter={(label) => `เดือน ${label}`}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="target_mandays"
                                    name="Target (SA/BA/PG)"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={{ fill: '#10B981' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="actual_mandays"
                                    name="Actual"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3B82F6' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        Target = วันทำงาน × จำนวนพนักงาน (SA, BA, PG)
                    </p>
                </CardContent>
            </Card>

            {/* Top Projects & Employees */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Projects */}
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <div className="p-1.5 bg-purple-100 rounded-lg">
                                <FolderKanban className="h-4 w-4 text-purple-600" />
                            </div>
                            Top Projects by Man-day
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data.topProjects.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">ไม่พบข้อมูล</p>
                        ) : (
                            data.topProjects.map((project, idx) => (
                                <button
                                    key={project.project_id}
                                    onClick={() => handleProjectClick(project.project_id)}
                                    className="w-full text-left space-y-2 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-500">{idx + 1}.</span>
                                            <span className="font-medium group-hover:text-blue-600">{project.project_code}</span>
                                            <span className="text-sm text-gray-600 truncate max-w-[150px]">{project.project_name}</span>
                                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                                        </div>
                                        <Badge className={getStatusColor(project.budget_status)}>
                                            {project.actual_mandays} MD
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Progress
                                            value={Math.min(project.percent_used, 100)}
                                            className={`h-2 flex-1 ${getProgressColor(project.percent_used)}`}
                                        />
                                        <span className="text-sm text-gray-500 w-16 text-right">
                                            {project.percent_used}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Budget: {project.budget_mandays} MD | Remaining: {project.remaining_mandays} MD
                                    </p>
                                </button>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Top Employees */}
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 rounded-lg">
                                <Users className="h-4 w-4 text-emerald-600" />
                            </div>
                            Top Employees
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data.topEmployees.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">ไม่พบข้อมูล</p>
                        ) : (
                            data.topEmployees.map((emp, idx) => (
                                <div key={emp.employee_id} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-500">{idx + 1}.</span>
                                            <span className="font-medium">{emp.employee_name}</span>
                                            {emp.position_code && (
                                                <Badge variant="outline" className="text-xs">
                                                    {emp.position_code}
                                                </Badge>
                                            )}
                                        </div>
                                        <Badge variant="secondary">
                                            {emp.total_mandays} MD
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Progress
                                            value={Math.min(emp.workload_percent, 100)}
                                            className={`h-2 flex-1 ${getProgressColor(emp.workload_percent)}`}
                                        />
                                        <span className={`text-sm w-16 text-right ${getWorkloadColor(emp.workload_percent)}`}>
                                            {emp.workload_percent}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {emp.project_count} โครงการ | {emp.working_days} วันทำงาน
                                    </p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Project & Employee Tabs */}
            <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                            <button
                                onClick={() => setActiveTab('projects')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    activeTab === 'projects'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <FolderKanban className="h-4 w-4" />
                                Project Budget Status
                                <Badge variant="secondary" className="ml-1">{data.projects.length}</Badge>
                            </button>
                            <button
                                onClick={() => setActiveTab('employees')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    activeTab === 'employees'
                                        ? 'bg-white text-emerald-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Users className="h-4 w-4" />
                                Employee Workload
                                <Badge variant="secondary" className="ml-1">{data.employees.length}</Badge>
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Project Budget Tab */}
                    {activeTab === 'projects' && (
                        <DataTable
                            columns={projectColumns}
                            data={data.projects}
                            pageSize={10}
                            showPagination={true}
                            showPageSizeSelector={true}
                            emptyMessage="ไม่พบข้อมูลโครงการ"
                        />
                    )}

                    {/* Employee Workload Tab */}
                    {activeTab === 'employees' && (
                        <div>
                            <DataTable
                                columns={employeeColumns}
                                data={data.employees}
                                pageSize={10}
                                showPagination={true}
                                showPageSizeSelector={true}
                                emptyMessage="ไม่พบข้อมูลพนักงาน"
                            />
                            <div className="mt-4 flex gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                                    80-100% Good
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-amber-500 rounded"></div>
                                    50-79% Moderate
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-gray-400 rounded"></div>
                                    &lt;50% Low
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                                    &gt;100% Over
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Project Detail Dialog */}
            <ProjectMandayDetailDialog
                open={detailDialogOpen}
                onOpenChange={setDetailDialogOpen}
                projectId={selectedProjectId}
                filters={filters}
            />
        </div>
    )
}
