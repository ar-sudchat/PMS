'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { KPISummaryCards, KPIProjectTable } from '@/components/kpi'
import {
    getAllKPIData,
    getProjectKPIDetail,
    getKPIFilterOptions,
    type KPISummary,
    type TimeToDeliveryKPI,
    type MandayControlKPI,
    type MilestoneKPIDetail,
    type KPIYearlySummary
} from '@/lib/actions/kpi-actions'
import {
    RefreshCw,
    Download,
    Filter,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function KPIDashboardPage() {
    // State
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState<KPISummary[]>([])
    const [timeToDelivery, setTimeToDelivery] = useState<TimeToDeliveryKPI[]>([])
    const [mandayControl, setMandayControl] = useState<MandayControlKPI[]>([])
    const [yearlySummary, setYearlySummary] = useState<KPIYearlySummary[]>([])

    // Filters
    const [filterOptions, setFilterOptions] = useState<{
        years: number[]
        customers: { id: string; name: string }[]
        managers: { id: string; name: string }[]
    }>({ years: [], customers: [], managers: [] })

    const [filters, setFilters] = useState<{
        year?: number
        customerId?: string
        managerId?: string
    }>({})

    // Load data
    useEffect(() => {
        loadData()
        loadFilterOptions()
    }, [])

    useEffect(() => {
        loadData()
    }, [filters])

    const loadData = async () => {
        setLoading(true)
        try {
            const result = await getAllKPIData(filters)
            if (result.success) {
                setSummary(result.summary)
                setTimeToDelivery(result.timeToDelivery)
                setMandayControl(result.mandayControl)
                setYearlySummary(result.yearlySummary)
            }
        } catch (error) {
            console.error('Failed to load KPI data:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadFilterOptions = async () => {
        try {
            const result = await getKPIFilterOptions()
            if (result.success) {
                setFilterOptions({
                    years: result.years,
                    customers: result.customers,
                    managers: result.managers
                })
            }
        } catch (error) {
            console.error('Failed to load filter options:', error)
        }
    }

    const handleLoadMilestones = async (projectId: string): Promise<MilestoneKPIDetail[]> => {
        const result = await getProjectKPIDetail(projectId)
        return result.success ? result.data : []
    }

    const clearFilters = () => {
        setFilters({})
    }

    const hasFilters = filters.year || filters.customerId || filters.managerId

    return (
        <div className="pt-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="h-7 w-7 text-blue-600" />
                        KPI Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Time to Delivery & Man-day Control Performance
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        disabled={loading}
                    >
                        <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Filters:
                            </span>
                        </div>

                        {/* Year Filter */}
                        <Select
                            value={filters.year?.toString() || 'all'}
                            onValueChange={(value) => setFilters(prev => ({
                                ...prev,
                                year: value === 'all' ? undefined : parseInt(value)
                            }))}
                        >
                            <SelectTrigger className="w-32">
                                <Calendar className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Years</SelectItem>
                                {filterOptions.years.map((year) => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Customer Filter */}
                        <Select
                            value={filters.customerId || 'all'}
                            onValueChange={(value) => setFilters(prev => ({
                                ...prev,
                                customerId: value === 'all' ? undefined : value
                            }))}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Customer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Customers</SelectItem>
                                {filterOptions.customers.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                        {customer.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Manager Filter */}
                        <Select
                            value={filters.managerId || 'all'}
                            onValueChange={(value) => setFilters(prev => ({
                                ...prev,
                                managerId: value === 'all' ? undefined : value
                            }))}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Manager" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Managers</SelectItem>
                                {filterOptions.managers.map((manager) => (
                                    <SelectItem key={manager.id} value={manager.id}>
                                        {manager.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {hasFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-slate-500"
                            >
                                Clear filters
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* KPI Summary Cards */}
            <KPISummaryCards data={summary} loading={loading} />

            {/* Yearly Trend */}
            {yearlySummary.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            Yearly KPI Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Time to Delivery Yearly */}
                            <div>
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                    Time to Delivery by Year
                                </h4>
                                <div className="space-y-3">
                                    {yearlySummary
                                        .filter(y => y.kpi_code === 'TIME_TO_DELIVERY')
                                        .map((year) => (
                                            <div key={year.project_year} className="flex items-center gap-4">
                                                <span className="w-12 text-sm font-medium text-slate-600">
                                                    {year.project_year}
                                                </span>
                                                <div className="flex-1">
                                                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                'h-full rounded-full transition-all',
                                                                year.avg_score >= year.target
                                                                    ? 'bg-green-500'
                                                                    : year.avg_score >= year.target - 10
                                                                        ? 'bg-yellow-500'
                                                                        : 'bg-red-500'
                                                            )}
                                                            style={{ width: `${Math.min(year.avg_score, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 w-32">
                                                    <span className={cn(
                                                        'font-bold',
                                                        year.avg_score >= year.target ? 'text-green-600' : 'text-red-600'
                                                    )}>
                                                        {year.avg_score.toFixed(1)}%
                                                    </span>
                                                    <Badge
                                                        variant={year.avg_score >= year.target ? 'default' : 'destructive'}
                                                        className="text-xs"
                                                    >
                                                        {year.passed_projects}/{year.total_projects}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Man-day Control Yearly */}
                            <div>
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                    Man-day Control by Year
                                </h4>
                                <div className="space-y-3">
                                    {yearlySummary
                                        .filter(y => y.kpi_code === 'MANDAY_CONTROL')
                                        .map((year) => (
                                            <div key={year.project_year} className="flex items-center gap-4">
                                                <span className="w-12 text-sm font-medium text-slate-600">
                                                    {year.project_year}
                                                </span>
                                                <div className="flex-1">
                                                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                'h-full rounded-full transition-all',
                                                                year.avg_score >= year.target
                                                                    ? 'bg-green-500'
                                                                    : year.avg_score >= year.target - 10
                                                                        ? 'bg-yellow-500'
                                                                        : 'bg-red-500'
                                                            )}
                                                            style={{ width: `${Math.min(year.avg_score, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 w-32">
                                                    <span className={cn(
                                                        'font-bold',
                                                        year.avg_score >= year.target ? 'text-green-600' : 'text-red-600'
                                                    )}>
                                                        {year.avg_score.toFixed(1)}%
                                                    </span>
                                                    <Badge
                                                        variant={year.avg_score >= year.target ? 'default' : 'destructive'}
                                                        className="text-xs"
                                                    >
                                                        {year.passed_projects}/{year.total_projects}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Project KPI Table */}
            <KPIProjectTable
                timeToDelivery={timeToDelivery}
                mandayControl={mandayControl}
                onLoadMilestones={handleLoadMilestones}
                loading={loading}
            />
        </div>
    )
}
