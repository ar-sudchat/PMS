'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    ExternalLink,
    AlertTriangle,
    CheckCircle,
    CalendarX,
    Calendar,
    Search,
    AlertCircle
} from 'lucide-react'
import {
    getMandayDashboardData,
    getMissingTimesheet,
    FilterParams,
    MandaySummary,
    MandayByProject,
    MandayByEmployee,
    MandayTrend,
    ProjectOption,
    ProjectTypeOption,
    OwnerOption,
    MissingTimesheetResult,
    MissingTimesheetEmployee
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
    const [activeTab, setActiveTab] = useState<'projects' | 'breakdown' | 'timesheet' | 'employees'>('projects')
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [detailDialogOpen, setDetailDialogOpen] = useState(false)
    const [missingData, setMissingData] = useState<MissingTimesheetResult | null>(null)
    const [isMissingLoading, setIsMissingLoading] = useState(false)
    const [selectedMissingEmployee, setSelectedMissingEmployee] = useState<MissingTimesheetEmployee | null>(null)
    const [missingDetailDialogOpen, setMissingDetailDialogOpen] = useState(false)
    const [breakdownFilter, setBreakdownFilter] = useState<'all' | 'OVER' | 'WARNING' | 'NORMAL' | 'NO_BUDGET'>('all')
    const [projectFilter, setProjectFilter] = useState<'all' | 'OVER' | 'WARNING' | 'NORMAL' | 'NO_BUDGET' | 'MS_OVER'>('all')

    // Missing timesheet date range
    const getDefaultDateRange = () => {
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        const today = now
        return {
            start: firstDay.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0]
        }
    }
    const defaultDates = getDefaultDateRange()
    const [missingStartDate, setMissingStartDate] = useState(defaultDates.start)
    const [missingEndDate, setMissingEndDate] = useState(defaultDates.end)

    // Sync local data with initialData when filters change (via URL)
    useEffect(() => {
        setData(initialData)
    }, [initialData])

    // Load missing timesheet data
    const loadMissingData = async () => {
        if (!missingStartDate || !missingEndDate) return
        setIsMissingLoading(true)
        try {
            const result = await getMissingTimesheet(missingStartDate, missingEndDate)
            if (result.success && result.data) {
                setMissingData(result.data)
            }
        } finally {
            setIsMissingLoading(false)
        }
    }

    // Auto-load missing timesheet data on mount
    useEffect(() => {
        if (!missingData) {
            loadMissingData()
        }
    }, [])

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

    // Period label
    const periodLabel = useMemo(() => {
        if (filters.periodType === 'month' && filters.month) {
            return `เดือน${MONTH_NAMES[filters.month - 1]} ${filters.year}`
        }
        if (filters.periodType === 'quarter' && filters.quarter) {
            return `ไตรมาส ${filters.quarter}/${filters.year}`
        }
        return `ปี ${filters.year}`
    }, [filters])

    // Manday breakdown data
    const breakdownData = useMemo(() => {
        const withManday = data.projects
            .filter(p => p.actual_mandays > 0)
            .sort((a, b) => b.actual_mandays - a.actual_mandays)

        const totalUsed = withManday.reduce((s, p) => s + p.actual_mandays, 0)
        const avg = withManday.length > 0 ? Math.round((totalUsed / withManday.length) * 10) / 10 : 0
        const overCount = withManday.filter(p => p.budget_status === 'OVER').length

        return { withManday, totalUsed, avg, overCount }
    }, [data.projects])

    // Filtered breakdown data
    const filteredBreakdown = useMemo(() => {
        if (breakdownFilter === 'all') return breakdownData.withManday
        return breakdownData.withManday.filter(p => p.budget_status === breakdownFilter)
    }, [breakdownData.withManday, breakdownFilter])

    const breakdownMaxMD = useMemo(() => {
        return filteredBreakdown.length > 0
            ? Math.max(...filteredBreakdown.map(p => p.actual_mandays))
            : 1
    }, [filteredBreakdown])

    // Bar gradient colors by status
    const getBarStyle = (status: string) => {
        switch (status) {
            case 'OVER': return 'bg-gradient-to-r from-red-400 to-red-500'
            case 'WARNING': return 'bg-gradient-to-r from-amber-400 to-amber-500'
            case 'NO_BUDGET': return 'bg-gradient-to-r from-gray-400 to-gray-500'
            default: return 'bg-gradient-to-r from-blue-400 to-blue-500'
        }
    }

    const getBarGlow = (status: string) => {
        switch (status) {
            case 'OVER': return 'shadow-red-200'
            case 'WARNING': return 'shadow-amber-200'
            case 'NO_BUDGET': return 'shadow-gray-200'
            default: return 'shadow-blue-200'
        }
    }

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
                <div className="text-center flex items-center justify-center gap-1.5">
                    <Badge className={getStatusColor(row.original.budget_status)}>
                        {row.original.budget_status === 'OVER' ? 'Over' :
                            row.original.budget_status === 'WARNING' ? 'Warning' :
                                row.original.budget_status === 'NO_BUDGET' ? 'No Budget' : 'OK'}
                    </Badge>
                    {row.original.has_milestone_over && (
                        <span title={`${row.original.over_milestone_count} milestone เกินงบ`} className="text-orange-500">
                            <AlertTriangle className="h-4 w-4" />
                        </span>
                    )}
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

    // Handle click on missing timesheet employee
    const handleMissingEmployeeClick = (employee: MissingTimesheetEmployee) => {
        setSelectedMissingEmployee(employee)
        setMissingDetailDialogOpen(true)
    }

    // Missing Timesheet Table Columns
    const missingTimesheetColumns: ColumnDef<MissingTimesheetEmployee>[] = useMemo(() => [
        {
            accessorKey: 'employee_name',
            header: 'พนักงาน',
            cell: ({ row }) => {
                const hasIssue = row.original.missing_count > 0 || row.original.low_hours_count > 0
                return (
                    <div className="flex items-center gap-2">
                        {!hasIssue ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                        ) : row.original.missing_count >= 5 ? (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                        )}
                        <span className="font-medium">{row.original.employee_name}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: 'position_code',
            header: 'ตำแหน่ง',
            cell: ({ row }) => (
                <Badge variant="outline">{row.original.position_code || '-'}</Badge>
            ),
        },
        {
            accessorKey: 'logged_count',
            header: () => <div className="text-center">คีย์แล้ว</div>,
            cell: ({ row }) => (
                <div className="text-center">
                    <span className="font-medium">{row.original.logged_count}</span>
                    <span className="text-gray-400">/{row.original.total_working_days}</span>
                </div>
            ),
        },
        {
            accessorKey: 'missing_count',
            header: () => <div className="text-center">ไม่คีย์</div>,
            cell: ({ row }) => {
                const count = row.original.missing_count
                if (count === 0) {
                    return <div className="text-center text-gray-400">-</div>
                }
                return (
                    <div className="text-center">
                        <Badge className={count >= 5 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-orange-100 text-orange-700 border-orange-300'}>
                            {count} วัน
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: 'low_hours_count',
            header: () => <div className="text-center">&lt;5 ชม.</div>,
            cell: ({ row }) => {
                const count = row.original.low_hours_count
                if (count === 0) {
                    return <div className="text-center text-gray-400">-</div>
                }
                return (
                    <div className="text-center">
                        <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                            {count} วัน
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: 'missing_dates',
            header: 'วันที่ไม่คีย์',
            cell: ({ row }) => {
                const dates = row.original.missing_dates
                if (dates.length === 0) {
                    return <span className="text-gray-400">-</span>
                }
                return (
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {dates.slice(0, 3).map(date => (
                            <Badge key={date} variant="secondary" className="text-xs bg-red-50 text-red-700">
                                {new Date(date).toLocaleDateString('th-TH', {
                                    day: 'numeric',
                                    month: 'short'
                                })}
                            </Badge>
                        ))}
                        {dates.length > 3 && (
                            <Badge variant="secondary" className="text-xs bg-gray-200">
                                +{dates.length - 3}
                            </Badge>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: 'low_hours_dates',
            header: 'วันที่ <5 ชม.',
            cell: ({ row }) => {
                const entries = row.original.low_hours_dates
                if (!entries || entries.length === 0) {
                    return <span className="text-gray-400">-</span>
                }
                return (
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {entries.slice(0, 3).map(entry => (
                            <Badge key={entry.date} variant="secondary" className="text-xs bg-amber-50 text-amber-700">
                                {new Date(entry.date).toLocaleDateString('th-TH', {
                                    day: 'numeric',
                                    month: 'short'
                                })} ({entry.hours}h)
                            </Badge>
                        ))}
                        {entries.length > 3 && (
                            <Badge variant="secondary" className="text-xs bg-gray-200">
                                +{entries.length - 3}
                            </Badge>
                        )}
                    </div>
                )
            },
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
                                    formatter={(value, name) => [
                                        `${value ?? 0} MD`,
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

<<<<<<< HEAD
            {/* Monthly Manday Breakdown */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 rounded-lg">
                            <BarChart3 className="h-4 w-4 text-indigo-600" />
                        </div>
                        การใช้ Man-day {periodLabel}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {breakdownData.withManday.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">ไม่พบข้อมูลการใช้ Man-day ในช่วงนี้</p>
                    ) : (
                        <div className="space-y-6">
                            {/* Mini Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                    <div className="text-xs text-blue-600 font-medium">โครงการที่ใช้ MD</div>
                                    <div className="text-2xl font-bold text-blue-900">{breakdownData.withManday.length}</div>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-3 text-center">
                                    <div className="text-xs text-purple-600 font-medium">MD รวม</div>
                                    <div className="text-2xl font-bold text-purple-900">{formatNumber(breakdownData.totalUsed)}</div>
                                </div>
                                <div className="bg-amber-50 rounded-lg p-3 text-center">
                                    <div className="text-xs text-amber-600 font-medium">เฉลี่ย/โครงการ</div>
                                    <div className="text-2xl font-bold text-amber-900">{breakdownData.avg}</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3 text-center">
                                    <div className="text-xs text-red-600 font-medium">เกินงบ</div>
                                    <div className="text-2xl font-bold text-red-900">{breakdownData.overCount}</div>
                                </div>
                            </div>

                            {/* Horizontal Bar Chart */}
                            {breakdownData.chartData.length > 0 && (
                                <div style={{ height: Math.max(200, breakdownData.chartData.length * 36) }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={breakdownData.chartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 11 }} />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                width={70}
                                                tick={{ fontSize: 11 }}
                                            />
                                            <Tooltip
                                                formatter={(value?: number, name?: string) => [
                                                    `${value} MD`,
                                                    name === 'mandays' ? 'ใช้ไป' : 'Budget'
                                                ]}
                                                labelFormatter={(label) => {
                                                    const item = breakdownData.chartData.find(d => d.name === label)
                                                    return item?.fullName || label
                                                }}
                                            />
                                            <Bar dataKey="mandays" name="mandays" radius={[0, 4, 4, 0]} barSize={20}>
                                                {breakdownData.chartData.map((entry, idx) => (
                                                    <Cell key={idx} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Compact Table */}
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="w-10 text-center">#</TableHead>
                                            <TableHead>โครงการ</TableHead>
                                            <TableHead className="text-right w-24">MD ใช้ไป</TableHead>
                                            <TableHead className="text-right w-24">Budget</TableHead>
                                            <TableHead className="text-right w-16">%</TableHead>
                                            <TableHead className="text-center w-24">สถานะ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {breakdownData.withManday.map((p, i) => (
                                            <TableRow
                                                key={p.project_id}
                                                className="cursor-pointer hover:bg-blue-50/50"
                                                onClick={() => handleProjectClick(p.project_id)}
                                            >
                                                <TableCell className="text-center text-gray-500 text-sm">{i + 1}</TableCell>
                                                <TableCell>
                                                    <span className="font-medium">{p.project_code}</span>
                                                    <span className="text-gray-500 ml-2 text-sm">{p.project_name}</span>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{p.actual_mandays}</TableCell>
                                                <TableCell className="text-right text-gray-500">{p.budget_mandays || '—'}</TableCell>
                                                <TableCell className="text-right text-sm">
                                                    {p.budget_mandays > 0 ? `${p.percent_used}%` : '—'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={getStatusColor(p.budget_status)}>
                                                        {p.budget_status === 'OVER' ? 'Over' :
                                                            p.budget_status === 'WARNING' ? 'Warning' :
                                                                p.budget_status === 'NO_BUDGET' ? 'No Budget' : 'OK'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
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

            {/* ตรวจสอบการคีย์เวลา - Standalone Section */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-100 rounded-lg">
                            <CalendarX className="h-4 w-4 text-orange-600" />
                        </div>
                        ตรวจสอบการคีย์เวลา
                        {missingData && missingData.summary.employees_with_missing > 0 && (
                            <Badge variant="destructive">{missingData.summary.employees_with_missing}</Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Date Range Search */}
                        <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="space-y-1">
                                <Label className="text-sm flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    วันที่เริ่มต้น
                                </Label>
                                <Input
                                    type="date"
                                    value={missingStartDate}
                                    onChange={(e) => setMissingStartDate(e.target.value)}
                                    className="w-[160px]"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    วันที่สิ้นสุด
                                </Label>
                                <Input
                                    type="date"
                                    value={missingEndDate}
                                    onChange={(e) => setMissingEndDate(e.target.value)}
                                    className="w-[160px]"
                                />
                            </div>
                            <Button
                                onClick={loadMissingData}
                                disabled={isMissingLoading || !missingStartDate || !missingEndDate}
                                className="gap-2"
                            >
                                {isMissingLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Search className="h-4 w-4" />
                                )}
                                ค้นหา
                            </Button>
                        </div>

                        {isMissingLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                <span className="ml-2 text-gray-500">กำลังโหลด...</span>
                            </div>
                        ) : missingData ? (
                            <div className="space-y-4">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <div className="text-sm text-blue-600">พนักงาน SA/BA/PG</div>
                                        <div className="text-2xl font-bold text-blue-900">{missingData.summary.total_employees}</div>
                                    </div>
                                    <div className="bg-red-50 rounded-lg p-4">
                                        <div className="text-sm text-red-600">ไม่คีย์</div>
                                        <div className="text-2xl font-bold text-red-900">{missingData.summary.employees_with_missing}</div>
                                        <div className="text-xs text-red-500">({missingData.summary.total_missing_entries} วัน)</div>
                                    </div>
                                    <div className="bg-amber-50 rounded-lg p-4">
                                        <div className="text-sm text-amber-600">&lt;5 ชม.</div>
                                        <div className="text-2xl font-bold text-amber-900">{missingData.summary.employees_with_low_hours}</div>
                                        <div className="text-xs text-amber-500">({missingData.summary.total_low_hours_entries} วัน)</div>
                                    </div>
                                    <div className="bg-emerald-50 rounded-lg p-4">
                                        <div className="text-sm text-emerald-600">คีย์ครบ</div>
                                        <div className="text-2xl font-bold text-emerald-900">
                                            {missingData.summary.total_employees - missingData.summary.employees_with_missing - missingData.summary.employees_with_low_hours +
                                                missingData.employees.filter(e => e.missing_count > 0 && e.low_hours_count > 0).length}
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 rounded-lg p-4">
                                        <div className="text-sm text-purple-600">วันหยุด</div>
                                        <div className="text-2xl font-bold text-purple-900">{missingData.summary.holidays.length}</div>
                                        <div className="text-xs text-purple-500">ไม่มีใครคีย์</div>
                                    </div>
                                </div>

                                {/* Holidays Display */}
                                {missingData.summary.holidays.length > 0 && (
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-sm font-medium text-purple-700 mb-2">
                                            <CalendarX className="h-4 w-4" />
                                            วันหยุด (ไม่มี SA/BA/PG คนใดคีย์เวลา)
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {missingData.summary.holidays.map(date => (
                                                <Badge key={date} className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                                                    {new Date(date).toLocaleDateString('th-TH', {
                                                        weekday: 'short',
                                                        day: 'numeric',
                                                        month: 'short'
                                                    })}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Period Info */}
                                <div className="text-sm text-gray-500">
                                    ตรวจสอบช่วง: {missingData.summary.period_start} - {missingData.summary.period_end}
                                    <span className="ml-2 text-gray-400">(ไม่รวมวันเสาร์-อาทิตย์ และวันหยุด)</span>
                                </div>

                                {/* Employee Table */}
                                <DataTable
                                    columns={missingTimesheetColumns}
                                    data={missingData.employees}
                                    pageSize={15}
                                    showPagination={true}
                                    showPageSizeSelector={true}
                                    emptyMessage="ไม่พบข้อมูลพนักงาน"
                                    onRowClick={handleMissingEmployeeClick}
                                />

                                {/* Legend */}
                                <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                                        คีย์ครบแล้ว
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3 text-orange-600" />
                                        มีปัญหา
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3 text-red-600" />
                                        ขาด 5+ วัน
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Badge className="h-4 bg-red-50 text-red-700 text-[10px]">ไม่คีย์</Badge>
                                        วันที่ไม่ได้คีย์เลย
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Badge className="h-4 bg-amber-50 text-amber-700 text-[10px]">&lt;5h</Badge>
                                        คีย์ไม่ครบ 5 ชม.
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-8">
                                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                <p>เลือกช่วงวันที่แล้วกด "ค้นหา"</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Project & Employee Tabs */}
=======
            {/* Project & Employee & Timesheet Tabs */}
>>>>>>> origin/maclab-ag
            <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg flex-wrap">
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
                                onClick={() => setActiveTab('breakdown')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    activeTab === 'breakdown'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <BarChart3 className="h-4 w-4" />
                                การใช้ Man-day
                                <Badge variant="secondary" className="ml-1">{breakdownData.withManday.length}</Badge>
                            </button>
                            <button
                                onClick={() => setActiveTab('timesheet')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    activeTab === 'timesheet'
                                        ? 'bg-white text-orange-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <CalendarX className="h-4 w-4" />
                                ตรวจสอบการคีย์เวลา
                                {missingData && missingData.summary.employees_with_missing > 0 && (
                                    <Badge variant="destructive" className="ml-1">{missingData.summary.employees_with_missing}</Badge>
                                )}
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
                    {/* Manday Breakdown Tab */}
                    {activeTab === 'breakdown' && (
                        breakdownData.withManday.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">ไม่พบข้อมูลการใช้ Man-day ในช่วงนี้</p>
                        ) : (
                            <div className="space-y-6">
                                {/* KPI Strip */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 text-center border border-blue-100">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
                                        <div className="text-2xl mb-1">📋</div>
                                        <div className="text-[11px] text-blue-600 font-medium uppercase tracking-wider">โครงการที่ใช้ MD</div>
                                        <div className="text-3xl font-bold text-blue-900 mt-1">{breakdownData.withManday.length}</div>
                                        <div className="text-[10px] text-blue-500 mt-1">โครงการ</div>
                                    </div>
                                    <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 text-center border border-purple-100">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
                                        <div className="text-2xl mb-1">⏱️</div>
                                        <div className="text-[11px] text-purple-600 font-medium uppercase tracking-wider">MD รวม</div>
                                        <div className="text-3xl font-bold text-purple-900 mt-1">{formatNumber(breakdownData.totalUsed)}</div>
                                        <div className="text-[10px] text-purple-500 mt-1">วัน</div>
                                    </div>
                                    <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 text-center border border-amber-100">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
                                        <div className="text-2xl mb-1">📊</div>
                                        <div className="text-[11px] text-amber-600 font-medium uppercase tracking-wider">เฉลี่ย / โครงการ</div>
                                        <div className="text-3xl font-bold text-amber-900 mt-1">{breakdownData.avg}</div>
                                        <div className="text-[10px] text-amber-500 mt-1">วัน / โครงการ</div>
                                    </div>
                                    <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-4 text-center border border-red-100">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent"></div>
                                        <div className="text-2xl mb-1">⚠️</div>
                                        <div className="text-[11px] text-red-600 font-medium uppercase tracking-wider">เกินงบประมาณ</div>
                                        <div className="text-3xl font-bold text-red-900 mt-1">{breakdownData.overCount}</div>
                                        <div className="text-[10px] text-red-500 mt-1">โครงการ</div>
                                    </div>
                                </div>

                                {/* Filter Pills & Legend */}
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex gap-2">
                                        {[
                                            { key: 'all' as const, label: 'ทั้งหมด', count: breakdownData.withManday.length },
                                            { key: 'OVER' as const, label: 'เกินงบ', count: breakdownData.withManday.filter(p => p.budget_status === 'OVER').length },
                                            { key: 'NORMAL' as const, label: 'ปกติ', count: breakdownData.withManday.filter(p => p.budget_status === 'NORMAL').length },
                                            { key: 'WARNING' as const, label: 'ใกล้เต็ม', count: breakdownData.withManday.filter(p => p.budget_status === 'WARNING').length },
                                            { key: 'NO_BUDGET' as const, label: 'ไม่มีงบ', count: breakdownData.withManday.filter(p => p.budget_status === 'NO_BUDGET').length },
                                        ].filter(f => f.key === 'all' || f.count > 0).map(f => (
                                            <button
                                                key={f.key}
                                                onClick={() => setBreakdownFilter(f.key)}
                                                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                                    breakdownFilter === f.key
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                {f.label}
                                                <span className={`ml-1.5 ${breakdownFilter === f.key ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                    {f.count}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-4 text-[11px] text-gray-500">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-3 h-1.5 rounded-sm bg-gradient-to-r from-red-400 to-red-500"></span>
                                            เกินงบ
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-3 h-1.5 rounded-sm bg-gradient-to-r from-blue-400 to-blue-500"></span>
                                            ปกติ
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-3 h-1.5 rounded-sm bg-gradient-to-r from-amber-400 to-amber-500"></span>
                                            ใกล้เต็ม
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-3 h-1.5 rounded-sm bg-gradient-to-r from-gray-400 to-gray-500"></span>
                                            ไม่มีงบ
                                        </span>
                                    </div>
                                </div>

                                {/* Horizontal Bar Rows */}
                                <div className="border rounded-xl overflow-hidden">
                                <div className="max-h-[480px] overflow-y-auto space-y-0 divide-y divide-gray-100">
                                    {filteredBreakdown.map((p, i) => {
                                        const barWidth = breakdownMaxMD > 0 ? (p.actual_mandays / breakdownMaxMD) * 100 : 0
                                        const remain = p.budget_mandays > 0 ? Math.round((p.budget_mandays - p.actual_mandays) * 100) / 100 : 0

                                        return (
                                            <button
                                                key={p.project_id}
                                                onClick={() => handleProjectClick(p.project_id)}
                                                className="w-full grid grid-cols-[280px_1fr_64px] items-center gap-5 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                                            >
                                                {/* Project Info */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className={`text-sm font-semibold min-w-[22px] text-right ${i < 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                        {i + 1}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                                                                {p.project_name}
                                                            </span>
                                                            {p.budget_status === 'OVER' && (
                                                                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                                                                    เกินงบ
                                                                </span>
                                                            )}
                                                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity shrink-0" />
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 font-mono">#{p.project_code}</div>
                                                    </div>
                                                </div>

                                                {/* Bar */}
                                                <div className="relative h-7 bg-gray-100 rounded-md overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-md ${getBarStyle(p.budget_status)} shadow-sm ${getBarGlow(p.budget_status)} transition-all duration-700 ease-out relative overflow-hidden`}
                                                        style={{ width: `${Math.min(barWidth, 100)}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_3s_ease-in-out_infinite]"></div>
                                                        {barWidth > 20 && (
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-white drop-shadow-sm">
                                                                {p.actual_mandays.toFixed(2)} MD
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Budget marker line */}
                                                    {p.budget_mandays > 0 && breakdownMaxMD > 0 && (
                                                        <div
                                                            className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-gray-400/50"
                                                            style={{ left: `${Math.min((p.budget_mandays / breakdownMaxMD) * 100, 100)}%` }}
                                                            title={`Budget: ${p.budget_mandays} MD`}
                                                        ></div>
                                                    )}
                                                </div>

                                                {/* Value */}
                                                <div className="text-right">
                                                    <div className={`text-base font-bold ${
                                                        p.budget_status === 'OVER' ? 'text-red-600' :
                                                        p.budget_status === 'WARNING' ? 'text-amber-600' :
                                                        p.budget_status === 'NO_BUDGET' ? 'text-gray-500' :
                                                        'text-blue-600'
                                                    }`}>
                                                        {p.actual_mandays.toFixed(2)}
                                                    </div>
                                                    {p.budget_mandays > 0 && (
                                                        <div className={`text-[10px] ${remain < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                            {remain > 0 ? '+' : ''}{remain.toFixed(2)} MD
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                                </div>

                                {/* Footer note */}
                                <p className="text-xs text-gray-400 text-center">
                                    ข้อมูล {periodLabel} — แสดงเฉพาะโครงการที่มีการใช้ Man-day | เส้นประ = งบประมาณ MD
                                </p>
                            </div>
                        )
                    )}

                    {/* Project Budget Tab */}
                    {activeTab === 'projects' && (
                        <div className="space-y-6">
                            {/* KPI Summary Cards */}
                            {(() => {
                                const total = data.projects.length
                                const overCount = data.projects.filter(p => p.budget_status === 'OVER').length
                                const warningCount = data.projects.filter(p => p.budget_status === 'WARNING').length
                                const normalCount = data.projects.filter(p => p.budget_status === 'NORMAL').length
                                const noBudgetCount = data.projects.filter(p => p.budget_status === 'NO_BUDGET').length
                                const totalBudget = data.projects.reduce((s, p) => s + p.budget_mandays, 0)
                                const totalUsed = data.projects.reduce((s, p) => s + p.actual_mandays, 0)
                                const totalRemain = Math.round((totalBudget - totalUsed) * 100) / 100

                                const msOverCount = data.projects.filter(p => p.has_milestone_over).length

                                const cards: { key: 'all' | 'OVER' | 'WARNING' | 'NORMAL' | 'NO_BUDGET' | 'MS_OVER'; label: string; count: number; icon: React.ReactNode; colors: string; border: string; activeRing: string }[] = [
                                    { key: 'all', label: 'โครงการทั้งหมด', count: total, icon: <FolderKanban className="h-5 w-5 text-blue-500 mx-auto mb-1" />, colors: 'from-blue-50 to-blue-100/50', border: 'border-blue-100', activeRing: 'ring-blue-400' },
                                    { key: 'OVER', label: 'เกินงบ (รวม)', count: overCount, icon: <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />, colors: 'from-red-50 to-red-100/50', border: 'border-red-100', activeRing: 'ring-red-400' },
                                    { key: 'MS_OVER', label: 'MS เกินงบ', count: msOverCount, icon: <AlertTriangle className="h-5 w-5 text-orange-500 mx-auto mb-1" />, colors: 'from-orange-50 to-orange-100/50', border: 'border-orange-100', activeRing: 'ring-orange-400' },
                                    { key: 'WARNING', label: 'ใกล้เต็ม', count: warningCount, icon: <AlertCircle className="h-5 w-5 text-amber-500 mx-auto mb-1" />, colors: 'from-amber-50 to-amber-100/50', border: 'border-amber-100', activeRing: 'ring-amber-400' },
                                    { key: 'NORMAL', label: 'ปกติ', count: normalCount, icon: <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />, colors: 'from-emerald-50 to-emerald-100/50', border: 'border-emerald-100', activeRing: 'ring-emerald-400' },
                                    { key: 'NO_BUDGET', label: 'ไม่มีงบ', count: noBudgetCount, icon: <Target className="h-5 w-5 text-gray-500 mx-auto mb-1" />, colors: 'from-gray-50 to-gray-100/50', border: 'border-gray-200', activeRing: 'ring-gray-400' },
                                ]

                                return (
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                        {cards.map(c => (
                                            <button
                                                key={c.key}
                                                onClick={() => setProjectFilter(prev => prev === c.key ? 'all' : c.key)}
                                                className={`relative overflow-hidden bg-gradient-to-br ${c.colors} rounded-xl p-4 text-center border ${c.border} transition-all cursor-pointer hover:scale-[1.03] hover:shadow-md ${
                                                    projectFilter === c.key ? `ring-2 ${c.activeRing} shadow-lg scale-[1.03]` : ''
                                                }`}
                                            >
                                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent"></div>
                                                {c.icon}
                                                <div className="text-[11px] font-medium uppercase tracking-wider">{c.label}</div>
                                                <div className="text-2xl font-bold mt-1">{c.count}</div>
                                            </button>
                                        ))}
                                        <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 text-center border border-purple-100">
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
                                            <Clock className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                                            <div className="text-[11px] text-purple-600 font-medium uppercase tracking-wider">MD คงเหลือรวม</div>
                                            <div className={`text-2xl font-bold mt-1 ${totalRemain < 0 ? 'text-red-600' : 'text-purple-900'}`}>
                                                {totalRemain.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Filter indicator */}
                            {projectFilter !== 'all' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">กรอง:</span>
                                    <Badge className={projectFilter === 'MS_OVER' ? 'bg-orange-100 text-orange-700 border-orange-300' : getStatusColor(projectFilter)}>
                                        {projectFilter === 'OVER' ? 'เกินงบ (รวม)' : projectFilter === 'MS_OVER' ? 'MS เกินงบ' : projectFilter === 'WARNING' ? 'ใกล้เต็ม' : projectFilter === 'NORMAL' ? 'ปกติ' : 'ไม่มีงบ'}
                                    </Badge>
                                    <button
                                        onClick={() => setProjectFilter('all')}
                                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                                    >
                                        ล้างตัวกรอง
                                    </button>
                                </div>
                            )}

                            {/* Full Project Table */}
                            <DataTable
                                columns={projectColumns}
                                data={
                                    projectFilter === 'all' ? data.projects :
                                    projectFilter === 'MS_OVER' ? data.projects.filter(p => p.has_milestone_over) :
                                    data.projects.filter(p => p.budget_status === projectFilter)
                                }
                                pageSize={10}
                                showPagination={true}
                                showPageSizeSelector={true}
                                emptyMessage="ไม่พบข้อมูลโครงการ"
                            />
                        </div>
                    )}

                    {/* Timesheet Check Tab */}
                    {activeTab === 'timesheet' && (
                        <div className="space-y-4">
                            {/* Date Range Search */}
                            <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg">
                                <div className="space-y-1">
                                    <Label className="text-sm flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        วันที่เริ่มต้น
                                    </Label>
                                    <Input
                                        type="date"
                                        value={missingStartDate}
                                        onChange={(e) => setMissingStartDate(e.target.value)}
                                        className="w-[160px]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        วันที่สิ้นสุด
                                    </Label>
                                    <Input
                                        type="date"
                                        value={missingEndDate}
                                        onChange={(e) => setMissingEndDate(e.target.value)}
                                        className="w-[160px]"
                                    />
                                </div>
                                <Button
                                    onClick={loadMissingData}
                                    disabled={isMissingLoading || !missingStartDate || !missingEndDate}
                                    className="gap-2"
                                >
                                    {isMissingLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="h-4 w-4" />
                                    )}
                                    ค้นหา
                                </Button>
                            </div>

                            {isMissingLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                    <span className="ml-2 text-gray-500">กำลังโหลด...</span>
                                </div>
                            ) : missingData ? (
                                <div className="space-y-4">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="bg-blue-50 rounded-lg p-4">
                                            <div className="text-sm text-blue-600">พนักงาน SA/BA/PG</div>
                                            <div className="text-2xl font-bold text-blue-900">{missingData.summary.total_employees}</div>
                                        </div>
                                        <div className="bg-red-50 rounded-lg p-4">
                                            <div className="text-sm text-red-600">ไม่คีย์</div>
                                            <div className="text-2xl font-bold text-red-900">{missingData.summary.employees_with_missing}</div>
                                            <div className="text-xs text-red-500">({missingData.summary.total_missing_entries} วัน)</div>
                                        </div>
                                        <div className="bg-amber-50 rounded-lg p-4">
                                            <div className="text-sm text-amber-600">&lt;5 ชม.</div>
                                            <div className="text-2xl font-bold text-amber-900">{missingData.summary.employees_with_low_hours}</div>
                                            <div className="text-xs text-amber-500">({missingData.summary.total_low_hours_entries} วัน)</div>
                                        </div>
                                        <div className="bg-emerald-50 rounded-lg p-4">
                                            <div className="text-sm text-emerald-600">คีย์ครบ</div>
                                            <div className="text-2xl font-bold text-emerald-900">
                                                {missingData.summary.total_employees - missingData.summary.employees_with_missing - missingData.summary.employees_with_low_hours +
                                                    missingData.employees.filter(e => e.missing_count > 0 && e.low_hours_count > 0).length}
                                            </div>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-4">
                                            <div className="text-sm text-purple-600">วันหยุด</div>
                                            <div className="text-2xl font-bold text-purple-900">{missingData.summary.holidays.length}</div>
                                            <div className="text-xs text-purple-500">ไม่มีใครคีย์</div>
                                        </div>
                                    </div>

                                    {/* Holidays Display */}
                                    {missingData.summary.holidays.length > 0 && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                            <div className="flex items-center gap-2 text-sm font-medium text-purple-700 mb-2">
                                                <CalendarX className="h-4 w-4" />
                                                วันหยุด (ไม่มี SA/BA/PG คนใดคีย์เวลา)
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {missingData.summary.holidays.map(date => (
                                                    <Badge key={date} className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                                                        {new Date(date).toLocaleDateString('th-TH', {
                                                            weekday: 'short',
                                                            day: 'numeric',
                                                            month: 'short'
                                                        })}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Period Info */}
                                    <div className="text-sm text-gray-500">
                                        ตรวจสอบช่วง: {missingData.summary.period_start} - {missingData.summary.period_end}
                                        <span className="ml-2 text-gray-400">(ไม่รวมวันเสาร์-อาทิตย์ และวันหยุด)</span>
                                    </div>

                                    {/* Employee Table */}
                                    <DataTable
                                        columns={missingTimesheetColumns}
                                        data={missingData.employees}
                                        pageSize={15}
                                        showPagination={true}
                                        showPageSizeSelector={true}
                                        emptyMessage="ไม่พบข้อมูลพนักงาน"
                                        onRowClick={handleMissingEmployeeClick}
                                    />

                                    {/* Legend */}
                                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                                            คีย์ครบแล้ว
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 text-orange-600" />
                                            มีปัญหา
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3 text-red-600" />
                                            ขาด 5+ วัน
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Badge className="h-4 bg-red-50 text-red-700 text-[10px]">ไม่คีย์</Badge>
                                            วันที่ไม่ได้คีย์เลย
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Badge className="h-4 bg-amber-50 text-amber-700 text-[10px]">&lt;5h</Badge>
                                            คีย์ไม่ครบ 5 ชม.
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                    <p>เลือกช่วงวันที่แล้วกด &quot;ค้นหา&quot;</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Employee Workload Tab */}
                    {activeTab === 'employees' && (
                        <div className="space-y-6">
                            {/* Top Employees */}
                            {data.topEmployees.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {data.topEmployees.map((emp, idx) => (
                                        <div key={emp.employee_id} className="space-y-2 p-3 rounded-lg border">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-sm font-bold text-gray-400">{idx + 1}</span>
                                                    <span className="font-medium truncate">{emp.employee_name}</span>
                                                    {emp.position_code && (
                                                        <Badge variant="outline" className="text-xs shrink-0">
                                                            {emp.position_code}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <Badge variant="secondary" className="shrink-0">
                                                    {emp.total_mandays} MD
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Progress
                                                    value={Math.min(emp.workload_percent, 100)}
                                                    className={`h-1.5 flex-1 ${getProgressColor(emp.workload_percent)}`}
                                                />
                                                <span className={`text-xs w-10 text-right ${getWorkloadColor(emp.workload_percent)}`}>
                                                    {emp.workload_percent}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {emp.project_count} โครงการ | {emp.working_days} วันทำงาน
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Full Employee Table */}
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

            {/* Missing Timesheet Detail Dialog */}
            <Dialog open={missingDetailDialogOpen} onOpenChange={setMissingDetailDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarX className="h-5 w-5 text-orange-600" />
                            รายละเอียดการคีย์เวลา
                        </DialogTitle>
                    </DialogHeader>

                    {selectedMissingEmployee && (
                        <div className="space-y-6">
                            {/* Employee Info */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-lg">{selectedMissingEmployee.employee_name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Badge variant="outline">{selectedMissingEmployee.position_code}</Badge>
                                        {selectedMissingEmployee.department_name && (
                                            <span>{selectedMissingEmployee.department_name}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">คีย์แล้ว</div>
                                    <div className="font-bold text-lg">
                                        {selectedMissingEmployee.logged_count}/{selectedMissingEmployee.total_working_days} วัน
                                    </div>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`p-4 rounded-lg ${selectedMissingEmployee.missing_count > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                    <div className={`text-sm ${selectedMissingEmployee.missing_count > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        วันที่ไม่ได้คีย์
                                    </div>
                                    <div className={`text-2xl font-bold ${selectedMissingEmployee.missing_count > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                        {selectedMissingEmployee.missing_count} วัน
                                    </div>
                                </div>
                                <div className={`p-4 rounded-lg ${selectedMissingEmployee.low_hours_count > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                                    <div className={`text-sm ${selectedMissingEmployee.low_hours_count > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        วันที่คีย์น้อยกว่า 5 ชม.
                                    </div>
                                    <div className={`text-2xl font-bold ${selectedMissingEmployee.low_hours_count > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                        {selectedMissingEmployee.low_hours_count} วัน
                                    </div>
                                </div>
                            </div>

                            {/* Missing Dates Table */}
                            {selectedMissingEmployee.missing_count > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-medium text-red-700 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        วันที่ไม่ได้คีย์เวลา ({selectedMissingEmployee.missing_count} วัน)
                                    </h4>
                                    <div className="border border-red-200 rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-red-50">
                                                    <TableHead className="w-12 text-center">#</TableHead>
                                                    <TableHead>วัน</TableHead>
                                                    <TableHead>วันที่</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedMissingEmployee.missing_dates.map((date, idx) => {
                                                    const d = new Date(date)
                                                    return (
                                                        <TableRow key={date} className="hover:bg-red-50/50">
                                                            <TableCell className="text-center text-gray-500">{idx + 1}</TableCell>
                                                            <TableCell>
                                                                {d.toLocaleDateString('th-TH', { weekday: 'long' })}
                                                            </TableCell>
                                                            <TableCell>
                                                                {d.toLocaleDateString('th-TH', {
                                                                    day: 'numeric',
                                                                    month: 'long',
                                                                    year: 'numeric'
                                                                })}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            {/* Low Hours Dates Table */}
                            {selectedMissingEmployee.low_hours_count > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-medium text-amber-700 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        วันที่คีย์น้อยกว่า 5 ชม. ({selectedMissingEmployee.low_hours_count} วัน)
                                    </h4>
                                    <div className="border border-amber-200 rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-amber-50">
                                                    <TableHead className="w-12 text-center">#</TableHead>
                                                    <TableHead>วัน</TableHead>
                                                    <TableHead>วันที่</TableHead>
                                                    <TableHead className="text-right">ชั่วโมง</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedMissingEmployee.low_hours_dates.map((entry, idx) => {
                                                    const d = new Date(entry.date)
                                                    return (
                                                        <TableRow key={entry.date} className="hover:bg-amber-50/50">
                                                            <TableCell className="text-center text-gray-500">{idx + 1}</TableCell>
                                                            <TableCell>
                                                                {d.toLocaleDateString('th-TH', { weekday: 'long' })}
                                                            </TableCell>
                                                            <TableCell>
                                                                {d.toLocaleDateString('th-TH', {
                                                                    day: 'numeric',
                                                                    month: 'long',
                                                                    year: 'numeric'
                                                                })}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                                                                    {entry.hours} ชม.
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            {/* All Good */}
                            {selectedMissingEmployee.missing_count === 0 && selectedMissingEmployee.low_hours_count === 0 && (
                                <div className="p-6 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                                    <CheckCircle className="h-12 w-12 mx-auto text-emerald-600 mb-2" />
                                    <h4 className="font-medium text-emerald-700">คีย์เวลาครบถ้วน</h4>
                                    <p className="text-sm text-emerald-600">ไม่มีวันที่มีปัญหา</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
