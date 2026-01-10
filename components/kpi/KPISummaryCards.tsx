'use client'

import { Card, CardContent } from '@/components/ui/card'
import { KPIGauge } from './KPIGauge'
import { Clock, DollarSign, TrendingUp, TrendingDown, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPISummary {
    kpi_code: string
    kpi_name: string
    total_projects: number
    passed_projects: number
    failed_projects: number
    avg_score: number
    target: number
    overall_status: 'PASS' | 'FAIL'
}

interface KPISummaryCardsProps {
    data: KPISummary[]
    loading?: boolean
    className?: string
}

export function KPISummaryCards({ data, loading = false, className }: KPISummaryCardsProps) {
    if (loading) {
        return (
            <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-6', className)}>
                {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-3">
                                    <div className="h-4 w-32 bg-slate-200 rounded" />
                                    <div className="h-8 w-20 bg-slate-200 rounded" />
                                    <div className="h-3 w-24 bg-slate-200 rounded" />
                                </div>
                                <div className="h-32 w-32 bg-slate-200 rounded-full" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    const timeToDelivery = data.find(d => d.kpi_code === 'TIME_TO_DELIVERY')
    const mandayControl = data.find(d => d.kpi_code === 'MANDAY_CONTROL')

    return (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-6', className)}>
            {/* Time to Delivery Card */}
            <Card className="overflow-hidden">
                <div className={cn(
                    'h-1',
                    timeToDelivery?.overall_status === 'PASS' ? 'bg-green-500' : 'bg-red-500'
                )} />
                <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                        Time to Delivery
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        On-time delivery rate
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        {timeToDelivery?.passed_projects || 0} projects passed
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        {timeToDelivery?.failed_projects || 0} projects failed
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                {(timeToDelivery?.avg_score || 0) >= (timeToDelivery?.target || 80) ? (
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                ) : (
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {timeToDelivery?.total_projects || 0} total projects
                                </span>
                            </div>
                        </div>

                        <KPIGauge
                            title=""
                            score={timeToDelivery?.avg_score || 0}
                            target={timeToDelivery?.target || 80}
                            status={timeToDelivery?.overall_status || 'FAIL'}
                            size="md"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Man-day Control Card */}
            <Card className="overflow-hidden">
                <div className={cn(
                    'h-1',
                    mandayControl?.overall_status === 'PASS' ? 'bg-green-500' : 'bg-red-500'
                )} />
                <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30">
                                    <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                        Man-day Control
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Budget utilization rate
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        {mandayControl?.passed_projects || 0} projects within budget
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        {mandayControl?.failed_projects || 0} projects over budget
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                {(mandayControl?.avg_score || 0) >= (mandayControl?.target || 85) ? (
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                ) : (
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {mandayControl?.total_projects || 0} total projects
                                </span>
                            </div>
                        </div>

                        <KPIGauge
                            title=""
                            score={mandayControl?.avg_score || 0}
                            target={mandayControl?.target || 85}
                            status={mandayControl?.overall_status || 'FAIL'}
                            size="md"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
