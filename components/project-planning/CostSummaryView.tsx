'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Banknote, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { PlanningCostItem } from '@/lib/actions/project-planning-actions'

// ============================================
// Types
// ============================================

interface CostSummaryViewProps {
    cost: {
        total_sold_mandays: number
        total_planned_mandays: number
        total_actual_mandays: number
        manday_rate: number
        total_budget: number
        planned_cost: number
        actual_cost: number
        budget_variance: number
        items: PlanningCostItem[]
    }
}

// ============================================
// Helper functions
// ============================================

function formatCurrency(value: number): string {
    return '฿' + value.toLocaleString('th-TH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })
}

function formatMandays(value: number): string {
    if (Number.isInteger(value)) {
        return value.toLocaleString('th-TH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })
    }
    return value.toLocaleString('th-TH', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })
}

function formatPercent(value: number): string {
    return value.toLocaleString('th-TH', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }) + '%'
}

function getVarianceColor(value: number): string {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-slate-600'
}

function getVarianceBgColor(value: number): string {
    if (value > 0) return 'bg-green-50'
    if (value < 0) return 'bg-red-50'
    return 'bg-slate-50'
}

function getMandayProgress(actual: number, sold: number): number {
    if (sold === 0) return 0
    return Math.min(Math.round((actual / sold) * 100), 100)
}

function getProgressColor(percent: number): string {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 70) return 'bg-yellow-500'
    return 'bg-blue-500'
}

// ============================================
// Component
// ============================================

export function CostSummaryView({ cost }: CostSummaryViewProps) {
    const mandayProgress = getMandayProgress(cost.total_actual_mandays, cost.total_sold_mandays)
    const progressColor = getProgressColor(mandayProgress)

    // Calculate totals from items for the table footer
    const totalPlannedCost = cost.items.reduce((sum, item) => sum + item.planned_cost, 0)
    const totalActualCost = cost.items.reduce((sum, item) => sum + item.actual_cost, 0)
    const totalPlannedMD = cost.items.reduce((sum, item) => sum + item.planned_mandays, 0)
    const totalActualMD = cost.items.reduce((sum, item) => sum + item.actual_mandays, 0)
    const totalVariance = cost.items.reduce((sum, item) => sum + item.variance, 0)

    return (
        <div className="space-y-4">
            {/* ============================================ */}
            {/* Overview cards */}
            {/* ============================================ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Budget card */}
                <Card>
                    <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 p-2">
                                <Banknote className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">งบประมาณ</p>
                                <p className="text-lg font-semibold">{formatCurrency(cost.total_budget)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actual cost card */}
                <Card>
                    <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-orange-50 p-2">
                                {cost.actual_cost > cost.total_budget ? (
                                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                                ) : (
                                    <TrendingUp className="h-5 w-5 text-orange-600" />
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">ค่าใช้จ่ายจริง</p>
                                <p className="text-lg font-semibold">{formatCurrency(cost.actual_cost)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Remaining card */}
                <Card>
                    <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-center gap-3">
                            <div className={`rounded-lg p-2 ${cost.budget_variance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                {cost.budget_variance >= 0 ? (
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                ) : (
                                    <TrendingDown className="h-5 w-5 text-red-600" />
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">คงเหลือ</p>
                                <p className={`text-lg font-semibold ${cost.budget_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(cost.budget_variance)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ============================================ */}
            {/* Mandays overview */}
            {/* ============================================ */}
            <Card>
                <CardContent className="pt-4 pb-4 px-4">
                    <p className="text-sm font-semibold mb-3">Man-Days Overview</p>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="text-center rounded-md bg-blue-50 px-3 py-2">
                            <p className="text-[10px] text-muted-foreground">Sold MD</p>
                            <p className="text-base font-semibold text-blue-700">
                                {formatMandays(cost.total_sold_mandays)}
                            </p>
                        </div>
                        <div className="text-center rounded-md bg-purple-50 px-3 py-2">
                            <p className="text-[10px] text-muted-foreground">Planned MD</p>
                            <p className="text-base font-semibold text-purple-700">
                                {formatMandays(cost.total_planned_mandays)}
                            </p>
                        </div>
                        <div className="text-center rounded-md bg-orange-50 px-3 py-2">
                            <p className="text-[10px] text-muted-foreground">Actual MD</p>
                            <p className="text-base font-semibold text-orange-700">
                                {formatMandays(cost.total_actual_mandays)}
                            </p>
                        </div>
                    </div>

                    {/* Progress bar: actual / sold */}
                    <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Actual / Sold</span>
                            <span className="font-medium">
                                {formatMandays(cost.total_actual_mandays)} / {formatMandays(cost.total_sold_mandays)} MD ({mandayProgress}%)
                            </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${progressColor}`}
                                style={{ width: `${mandayProgress}%` }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ============================================ */}
            {/* Cost breakdown table */}
            {/* ============================================ */}
            <Card>
                <CardContent className="pt-4 pb-4 px-4">
                    <p className="text-sm font-semibold mb-3">รายละเอียดต้นทุนตาม Milestone</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50">
                                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Milestone</th>
                                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Planned MD</th>
                                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Actual MD</th>
                                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Planned Cost</th>
                                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Actual Cost</th>
                                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Variance</th>
                                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Variance %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cost.items.map((item) => (
                                    <tr key={item.milestone_code} className="border-b last:border-b-0 hover:bg-slate-50/50">
                                        <td className="py-2 px-3">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: item.milestone_color || '#94a3b8' }}
                                                />
                                                <span className="truncate">{item.milestone_name}</span>
                                            </div>
                                        </td>
                                        <td className="text-right py-2 px-3 tabular-nums">
                                            {formatMandays(item.planned_mandays)}
                                        </td>
                                        <td className="text-right py-2 px-3 tabular-nums">
                                            {formatMandays(item.actual_mandays)}
                                        </td>
                                        <td className="text-right py-2 px-3 tabular-nums">
                                            {formatCurrency(item.planned_cost)}
                                        </td>
                                        <td className="text-right py-2 px-3 tabular-nums">
                                            {formatCurrency(item.actual_cost)}
                                        </td>
                                        <td className={`text-right py-2 px-3 tabular-nums font-medium ${getVarianceColor(item.variance)}`}>
                                            {formatCurrency(item.variance)}
                                        </td>
                                        <td className="text-right py-2 px-3 tabular-nums">
                                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getVarianceBgColor(item.variance_percent)} ${getVarianceColor(item.variance_percent)}`}>
                                                {item.variance_percent > 0 ? '+' : ''}{formatPercent(item.variance_percent)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {/* Total row */}
                            <tfoot>
                                <tr className="border-t-2 bg-slate-50 font-semibold">
                                    <td className="py-2 px-3">รวมทั้งหมด</td>
                                    <td className="text-right py-2 px-3 tabular-nums">
                                        {formatMandays(totalPlannedMD)}
                                    </td>
                                    <td className="text-right py-2 px-3 tabular-nums">
                                        {formatMandays(totalActualMD)}
                                    </td>
                                    <td className="text-right py-2 px-3 tabular-nums">
                                        {formatCurrency(totalPlannedCost)}
                                    </td>
                                    <td className="text-right py-2 px-3 tabular-nums">
                                        {formatCurrency(totalActualCost)}
                                    </td>
                                    <td className={`text-right py-2 px-3 tabular-nums ${getVarianceColor(totalVariance)}`}>
                                        {formatCurrency(totalVariance)}
                                    </td>
                                    <td className="text-right py-2 px-3 tabular-nums">
                                        {totalPlannedCost > 0 ? (
                                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getVarianceBgColor(totalVariance)} ${getVarianceColor(totalVariance)}`}>
                                                {totalVariance > 0 ? '+' : ''}
                                                {formatPercent(totalPlannedCost !== 0 ? (totalVariance / totalPlannedCost) * 100 : 0)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
