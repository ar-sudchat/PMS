'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KPIGauge } from '@/components/kpi'
import {
    getKPIDashboardSummary,
    type KPISummary
} from '@/lib/actions/kpi-actions'
import {
    Clock,
    DollarSign,
    TrendingUp,
    ArrowRight,
    RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface KPIOverviewSectionProps {
    className?: string
}

export function KPIOverviewSection({ className }: KPIOverviewSectionProps) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<KPISummary[]>([])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const result = await getKPIDashboardSummary()
            if (result.success) {
                setData(result.data)
            }
        } catch (error) {
            console.error('Failed to load KPI summary:', error)
        } finally {
            setLoading(false)
        }
    }

    const timeToDelivery = data.find(d => d.kpi_code === 'TIME_TO_DELIVERY')
    const mandayControl = data.find(d => d.kpi_code === 'MANDAY_CONTROL')

    if (loading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            KPI Overview
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="animate-pulse p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="h-4 w-24 bg-slate-200 rounded" />
                                        <div className="h-3 w-16 bg-slate-200 rounded" />
                                    </div>
                                    <div className="h-20 w-20 bg-slate-200 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        KPI Overview
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={loadData}
                            className="h-8 w-8 p-0"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Link href="/reports/kpi">
                            <Button variant="outline" size="sm">
                                View Details
                                <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Time to Delivery */}
                    <div className={cn(
                        'p-4 border rounded-lg',
                        timeToDelivery?.overall_status === 'PASS'
                            ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
                            : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10'
                    )}>
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-100 rounded dark:bg-blue-900/30">
                                        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Time to Delivery
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    Target: {timeToDelivery?.target || 80}%
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge
                                        variant={timeToDelivery?.overall_status === 'PASS' ? 'default' : 'destructive'}
                                    >
                                        {timeToDelivery?.passed_projects || 0}/{timeToDelivery?.total_projects || 0} Pass
                                    </Badge>
                                </div>
                            </div>
                            <KPIGauge
                                title=""
                                score={timeToDelivery?.avg_score || 0}
                                target={timeToDelivery?.target || 80}
                                status={timeToDelivery?.overall_status || 'FAIL'}
                                size="sm"
                                showTarget={false}
                            />
                        </div>
                    </div>

                    {/* Man-day Control */}
                    <div className={cn(
                        'p-4 border rounded-lg',
                        mandayControl?.overall_status === 'PASS'
                            ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
                            : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10'
                    )}>
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-purple-100 rounded dark:bg-purple-900/30">
                                        <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Man-day Control
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    Target: {mandayControl?.target || 85}%
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge
                                        variant={mandayControl?.overall_status === 'PASS' ? 'default' : 'destructive'}
                                    >
                                        {mandayControl?.passed_projects || 0}/{mandayControl?.total_projects || 0} Pass
                                    </Badge>
                                </div>
                            </div>
                            <KPIGauge
                                title=""
                                score={mandayControl?.avg_score || 0}
                                target={mandayControl?.target || 85}
                                status={mandayControl?.overall_status || 'FAIL'}
                                size="sm"
                                showTarget={false}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
