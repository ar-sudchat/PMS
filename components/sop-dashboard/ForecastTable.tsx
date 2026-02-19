'use client'

import { useState, useMemo, Fragment } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { THAI_MONTH_ABBRS, DEFAULT_YEARLY_TARGET } from '@/lib/constants/sop-constants'
import type {
    SalesCashInPlanData,
    SalesCashInProject,
    SalesCashInMilestone,
} from '@/lib/actions/sop-actions'

type ViewMode = 'project' | 'group'
type DataMode = 'forecast' | 'actual'

interface ForecastTableProps {
    data: SalesCashInPlanData | null
    year: number
    onYearChange: (year: number) => void
    mode: DataMode
    viewBy: ViewMode
    onMilestoneClick: (milestone: SalesCashInMilestone, project: SalesCashInProject) => void
    isLoading: boolean
}

interface GroupRow {
    group_name: string
    projects: SalesCashInProject[]
    monthly: { month: number; forecast: number; actual: number }[]
    grand_forecast: number
    grand_actual: number
}

export function ForecastTable({
    data,
    year,
    onYearChange,
    mode,
    viewBy,
    onMilestoneClick,
    isLoading,
}: ForecastTableProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    const modeLabel = mode === 'forecast' ? 'Invoice' : 'Cash In'

    // Year options
    const yearOptions = useMemo(() => {
        const current = new Date().getFullYear()
        return [current - 2, current - 1, current, current + 1, current + 2]
    }, [])

    // Build milestone legend
    const milestoneLegend = useMemo(() => {
        if (!data) return []
        const seen = new Map<string, { code: string; name: string; color: string }>()
        data.projects.forEach(p => {
            p.milestones.forEach(m => {
                if (!seen.has(m.milestone_code)) {
                    seen.set(m.milestone_code, {
                        code: m.milestone_code,
                        name: m.milestone_name,
                        color: m.milestone_color,
                    })
                }
            })
        })
        return Array.from(seen.values())
    }, [data])

    // Get forecast month/value for a milestone based on mode
    const getForecastMonth = (ms: SalesCashInMilestone): number | null => {
        // Invoice Forecast tab: forecast = due_date month (sales_month)
        // Cash In Forecast tab: forecast = payment_due_date month (cashin_forecast_month)
        if (mode === 'forecast') return ms.sales_month
        return ms.cashin_forecast_month
    }

    const getForecastValue = (ms: SalesCashInMilestone): number => {
        // Invoice Forecast tab: forecast value = invoice_amount
        // Cash In Forecast tab: forecast value = invoice_amount (expected amount)
        return ms.invoice_amount || 0
    }

    // Get actual month/value for a milestone based on mode
    const getActualMonth = (ms: SalesCashInMilestone): number | null => {
        // Invoice Forecast tab: actual = invoice_date month (invoice_actual_month)
        // Cash In Forecast tab: actual = payment_received_date month (cashin_actual_month)
        if (mode === 'forecast') return ms.invoice_actual_month
        return ms.cashin_actual_month
    }

    const getActualValue = (ms: SalesCashInMilestone): number => {
        // Invoice Forecast tab: actual value = invoice_amount (same amount, different month)
        // Cash In Forecast tab: actual value = payment_amount
        if (mode === 'forecast') return ms.invoice_amount || 0
        return ms.payment_amount || 0
    }

    // Get forecast cell data for a project in a specific month
    const getProjectForecastCell = (project: SalesCashInProject, month: number) => {
        const milestones = project.milestones.filter(m => getForecastMonth(m) === month)
        const total = milestones.reduce((sum, m) => sum + getForecastValue(m), 0)
        const primaryColor = milestones.length > 0 ? milestones[0].milestone_color : null
        return { total, milestones, color: primaryColor }
    }

    // Get actual cell data for a project in a specific month
    const getProjectActualCell = (project: SalesCashInProject, month: number) => {
        const milestones = project.milestones.filter(m => getActualMonth(m) === month)
        const total = milestones.reduce((sum, m) => sum + getActualValue(m), 0)
        const primaryColor = milestones.length > 0 ? milestones[0].milestone_color : null
        return { total, milestones, color: primaryColor }
    }

    // Get project row totals
    const getProjectForecastTotal = (project: SalesCashInProject): number => {
        return project.milestones
            .filter(m => getForecastMonth(m) !== null)
            .reduce((sum, m) => sum + getForecastValue(m), 0)
    }

    const getProjectActualTotal = (project: SalesCashInProject): number => {
        return project.milestones
            .filter(m => getActualMonth(m) !== null)
            .reduce((sum, m) => sum + getActualValue(m), 0)
    }

    // Group data for "by group" view
    const groupedData = useMemo((): GroupRow[] => {
        if (!data || viewBy !== 'group') return []
        const groups = new Map<string, SalesCashInProject[]>()
        data.projects.forEach(p => {
            const groupName = p.project_group_parent_name
                ? `${p.project_group_parent_name} / ${p.project_group_name}`
                : (p.project_group_name || 'ไม่ระบุกลุ่ม')
            if (!groups.has(groupName)) groups.set(groupName, [])
            groups.get(groupName)!.push(p)
        })
        return Array.from(groups.entries()).map(([name, projects]) => {
            const monthly = Array.from({ length: 12 }, (_, i) => {
                const month = i + 1
                let forecast = 0, actual = 0
                projects.forEach(p => {
                    forecast += getProjectForecastCell(p, month).total
                    actual += getProjectActualCell(p, month).total
                })
                return { month, forecast, actual }
            })
            const grand_forecast = monthly.reduce((s, m) => s + m.forecast, 0)
            const grand_actual = monthly.reduce((s, m) => s + m.actual, 0)
            return { group_name: name, projects, monthly, grand_forecast, grand_actual }
        }).sort((a, b) => b.grand_forecast - a.grand_forecast)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, viewBy, mode])

    // Monthly totals for current mode
    const monthlyTotals = useMemo(() => {
        if (!data) return []
        return data.monthly_totals.map(mt => ({
            month: mt.month,
            forecast: mode === 'forecast' ? mt.invoice_forecast : mt.cashin_forecast,
            actual: mode === 'forecast' ? mt.invoice_actual : mt.cashin_actual,
        }))
    }, [data, mode])

    const grandForecast = useMemo(() => {
        if (!data) return 0
        return mode === 'forecast' ? data.grand_invoice_forecast : data.grand_cashin_forecast
    }, [data, mode])

    const grandActual = useMemo(() => {
        if (!data) return 0
        return mode === 'forecast' ? data.grand_invoice_actual : data.grand_cashin_actual
    }, [data, mode])

    const toggleRow = (key: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const expandAll = () => {
        if (!data) return
        if (viewBy === 'project') {
            setExpandedRows(new Set(data.projects.map(p => p.project_id)))
        } else {
            setExpandedRows(new Set(groupedData.map(g => g.group_name)))
        }
    }

    const collapseAll = () => setExpandedRows(new Set())

    // Format
    const fmtAmount = (n: number | null | undefined): string => {
        if (n == null || n === 0) return ''
        return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }

    const fmtCompact = (n: number | null | undefined): string => {
        if (n == null || n === 0) return '-'
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
        return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }

    const months = Array.from({ length: 12 }, (_, i) => i + 1)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Sticky column widths
    const COL_NUM_W = 32
    const COL_PROJECT_W = 200
    const COL_ACCOUNT_W = 120
    const COL_TYPE_W = 120

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Select value={String(year)} onValueChange={v => onYearChange(Number(v))}>
                        <SelectTrigger className="w-24 h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {yearOptions.map(y => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <button onClick={expandAll} className="text-[10px] text-blue-600 hover:underline">ขยายทั้งหมด</button>
                    <button onClick={collapseAll} className="text-[10px] text-slate-500 hover:underline">ย่อทั้งหมด</button>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <span className="text-red-600 font-bold">
                        Target {((data?.target_amount || DEFAULT_YEARLY_TARGET) / 1_000_000).toFixed(0)} MTHB
                    </span>
                    <span>{modeLabel} Forecast: <strong className="text-blue-600">{fmtCompact(grandForecast)}</strong></span>
                    <span>{modeLabel} Actual: <strong className="text-emerald-600">{fmtCompact(grandActual)}</strong></span>
                </div>
            </div>

            {/* Legend */}
            {milestoneLegend.length > 0 && viewBy === 'project' && (
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="text-muted-foreground font-medium">Milestone:</span>
                    {milestoneLegend.map(m => (
                        <span key={m.code} className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm border" style={{ backgroundColor: m.color }} />
                            <span>{m.name}</span>
                        </span>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="border rounded-lg overflow-auto" style={{ maxHeight: '72vh' }}>
                <table className="border-collapse text-xs" style={{ minWidth: 'max-content' }}>
                    <thead className="sticky top-0 z-20">
                        {/* Row 1: Month groups */}
                        <tr className="bg-slate-100">
                            <th
                                rowSpan={2}
                                className="sticky z-30 bg-slate-100 border border-slate-200 px-1 py-1.5 text-center font-semibold"
                                style={{ left: 0, width: COL_NUM_W, minWidth: COL_NUM_W }}
                            >
                                #
                            </th>
                            <th
                                rowSpan={2}
                                className="sticky z-30 bg-slate-100 border border-slate-200 px-2 py-1.5 text-left font-semibold"
                                style={{ left: COL_NUM_W, width: COL_PROJECT_W, minWidth: COL_PROJECT_W }}
                            >
                                {viewBy === 'project' ? 'รายการ' : 'กลุ่ม'}
                            </th>
                            <th
                                rowSpan={2}
                                className="sticky z-30 bg-slate-100 border border-slate-200 px-2 py-1.5 text-left font-semibold"
                                style={{ left: COL_NUM_W + COL_PROJECT_W, width: COL_ACCOUNT_W, minWidth: COL_ACCOUNT_W }}
                            >
                                Account
                            </th>
                            <th
                                rowSpan={2}
                                className="sticky z-30 bg-slate-100 border border-slate-200 px-2 py-1.5 text-left font-semibold"
                                style={{ left: COL_NUM_W + COL_PROJECT_W + COL_ACCOUNT_W, width: COL_TYPE_W, minWidth: COL_TYPE_W }}
                            >
                                {viewBy === 'project' ? 'Type' : 'จำนวน'}
                            </th>
                            {months.map(m => (
                                <th
                                    key={m}
                                    colSpan={2}
                                    className="bg-slate-200 border border-slate-300 px-1 py-1.5 text-center font-bold"
                                >
                                    {THAI_MONTH_ABBRS[m - 1]}-{String(year).slice(-2)}
                                </th>
                            ))}
                            <th
                                colSpan={2}
                                className="bg-slate-200 border border-slate-300 px-2 py-1.5 text-center font-bold"
                            >
                                รวม
                            </th>
                        </tr>
                        {/* Row 2: Forecast/Actual sub-headers */}
                        <tr className="bg-slate-100">
                            {months.map(m => (
                                <Fragment key={m}>
                                    <th
                                        className="bg-blue-50 border border-slate-200 px-1 py-0.5 text-center font-semibold text-blue-700"
                                        style={{ width: 72, minWidth: 72 }}
                                    >
                                        Forecast
                                    </th>
                                    <th
                                        className="bg-emerald-50 border border-slate-200 px-1 py-0.5 text-center font-semibold text-emerald-700"
                                        style={{ width: 72, minWidth: 72 }}
                                    >
                                        Actual
                                    </th>
                                </Fragment>
                            ))}
                            <th
                                className="bg-blue-50 border border-slate-200 px-1 py-0.5 text-center font-semibold text-blue-700"
                                style={{ width: 72, minWidth: 72 }}
                            >
                                Forecast
                            </th>
                            <th
                                className="bg-emerald-50 border border-slate-200 px-1 py-0.5 text-center font-semibold text-emerald-700"
                                style={{ width: 72, minWidth: 72 }}
                            >
                                Actual
                            </th>
                        </tr>
                        {/* Row 3: Monthly totals */}
                        <tr className="bg-slate-50 font-bold sticky top-[52px] z-20">
                            <td
                                colSpan={4}
                                className="sticky z-30 bg-slate-50 border border-slate-200 px-2 py-1 text-right font-bold text-slate-600"
                                style={{ left: 0 }}
                            >
                                รวมรายเดือน
                            </td>
                            {months.map(m => {
                                const mt = monthlyTotals.find(t => t.month === m)
                                return (
                                    <Fragment key={m}>
                                        <td className="bg-blue-50/50 border border-slate-200 px-1 py-1 text-right font-bold text-blue-700">
                                            {fmtAmount(mt?.forecast)}
                                        </td>
                                        <td className="bg-emerald-50/50 border border-slate-200 px-1 py-1 text-right font-bold text-emerald-700">
                                            {fmtAmount(mt?.actual)}
                                        </td>
                                    </Fragment>
                                )
                            })}
                            <td className="bg-blue-100/50 border border-slate-200 px-1 py-1 text-right font-bold text-blue-700">
                                {fmtAmount(grandForecast)}
                            </td>
                            <td className="bg-emerald-100/50 border border-slate-200 px-1 py-1 text-right font-bold text-emerald-700">
                                {fmtAmount(grandActual)}
                            </td>
                        </tr>
                    </thead>
                    <tbody>
                        {(!data || data.projects.length === 0) ? (
                            <tr>
                                <td colSpan={4 + 24 + 2} className="text-center py-12 text-muted-foreground">
                                    ไม่พบข้อมูลโครงการ
                                </td>
                            </tr>
                        ) : viewBy === 'project' ? (
                            /* ========== BY PROJECT VIEW ========== */
                            data.projects.map((project, idx) => {
                                const isExpanded = expandedRows.has(project.project_id)
                                const forecastTotal = getProjectForecastTotal(project)
                                const actualTotal = getProjectActualTotal(project)
                                return (
                                    <Fragment key={project.project_id}>
                                        <tr className="hover:bg-slate-50/50 border-b border-slate-200 bg-slate-50/30">
                                            <td
                                                className="sticky z-10 bg-white border border-slate-200 px-1 py-1.5 text-center text-slate-400 font-medium"
                                                style={{ left: 0, width: COL_NUM_W, minWidth: COL_NUM_W }}
                                            >
                                                {idx + 1}
                                            </td>
                                            <td
                                                className="sticky z-10 bg-white border border-slate-200 px-1 py-1"
                                                style={{ left: COL_NUM_W, width: COL_PROJECT_W, minWidth: COL_PROJECT_W }}
                                            >
                                                <div className="flex items-start gap-1">
                                                    <button
                                                        onClick={() => toggleRow(project.project_id)}
                                                        className="mt-0.5 shrink-0 text-slate-400 hover:text-slate-700"
                                                    >
                                                        {isExpanded
                                                            ? <ChevronDown className="h-3.5 w-3.5" />
                                                            : <ChevronRight className="h-3.5 w-3.5" />
                                                        }
                                                    </button>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="font-bold text-slate-700">{project.project_code}</span>
                                                        <div className="text-[11px] text-muted-foreground truncate" style={{ maxWidth: COL_PROJECT_W - 30 }}>
                                                            {project.project_name}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td
                                                className="sticky z-10 bg-white border border-slate-200 px-2 py-1"
                                                style={{ left: COL_NUM_W + COL_PROJECT_W, width: COL_ACCOUNT_W, minWidth: COL_ACCOUNT_W }}
                                            >
                                                <div className="text-[11px] text-blue-600 font-medium truncate">
                                                    {project.customer_short_name || project.customer_name || '-'}
                                                </div>
                                            </td>
                                            <td
                                                className="sticky z-10 bg-white border border-slate-200 px-2 py-1 text-[11px] text-slate-500"
                                                style={{ left: COL_NUM_W + COL_PROJECT_W + COL_ACCOUNT_W, width: COL_TYPE_W, minWidth: COL_TYPE_W }}
                                            >
                                                <div>{project.project_type_name || '-'}</div>
                                                {(project.project_group_name || project.project_group_parent_name) && (
                                                    <div className="text-[9px] text-purple-500 truncate">
                                                        {project.project_group_parent_name
                                                            ? `${project.project_group_parent_name} / ${project.project_group_name}`
                                                            : project.project_group_name}
                                                    </div>
                                                )}
                                            </td>
                                            {months.map(m => {
                                                const fc = getProjectForecastCell(project, m)
                                                const ac = getProjectActualCell(project, m)
                                                return (
                                                    <Fragment key={m}>
                                                        <td
                                                            className="border border-slate-200 px-1 py-1 text-right"
                                                            style={fc.color && fc.total > 0 ? {
                                                                backgroundColor: `${fc.color}20`,
                                                                borderLeft: `3px solid ${fc.color}`,
                                                                width: 72, minWidth: 72,
                                                            } : { width: 72, minWidth: 72 }}
                                                        >
                                                            <span className="font-semibold">{fmtAmount(fc.total)}</span>
                                                        </td>
                                                        <td
                                                            className="border border-slate-200 px-1 py-1 text-right"
                                                            style={ac.color && ac.total > 0 ? {
                                                                backgroundColor: `${ac.color}15`,
                                                                borderLeft: `3px solid ${ac.color}`,
                                                                width: 72, minWidth: 72,
                                                            } : { width: 72, minWidth: 72 }}
                                                        >
                                                            <span className="font-semibold">{fmtAmount(ac.total)}</span>
                                                        </td>
                                                    </Fragment>
                                                )
                                            })}
                                            <td className="border border-slate-200 px-1 py-1 text-right font-bold bg-blue-50/30" style={{ width: 72, minWidth: 72 }}>
                                                {fmtAmount(forecastTotal)}
                                            </td>
                                            <td className="border border-slate-200 px-1 py-1 text-right font-bold bg-emerald-50/30" style={{ width: 72, minWidth: 72 }}>
                                                {fmtAmount(actualTotal)}
                                            </td>
                                        </tr>

                                        {/* Milestone sub-rows */}
                                        {isExpanded && project.milestones.map(ms => {
                                            const fcMonth = getForecastMonth(ms)
                                            const fcValue = getForecastValue(ms)
                                            const acMonth = getActualMonth(ms)
                                            const acValue = getActualValue(ms)
                                            return (
                                                <tr
                                                    key={ms.milestone_id}
                                                    className="hover:bg-blue-50/30 border-b border-slate-100 cursor-pointer"
                                                    onClick={() => onMilestoneClick(ms, project)}
                                                >
                                                    <td className="sticky z-10 bg-white border border-slate-100 px-1 py-0.5" style={{ left: 0, width: COL_NUM_W, minWidth: COL_NUM_W }} />
                                                    <td className="sticky z-10 bg-white border border-slate-100 px-1 py-0.5" style={{ left: COL_NUM_W, width: COL_PROJECT_W, minWidth: COL_PROJECT_W }}>
                                                        <div className="flex items-center gap-1.5 pl-5">
                                                            <span className="w-2.5 h-2.5 rounded-full shrink-0 border" style={{ backgroundColor: ms.milestone_color }} />
                                                            <span className="text-[11px] font-medium text-slate-600">{ms.milestone_name}</span>
                                                            {ms.payment_status && ms.payment_status !== 'NOT_INVOICED' && (
                                                                <Badge className="text-[7px] h-3 px-1" variant={ms.payment_status === 'PAID' ? 'default' : 'secondary'}>
                                                                    {ms.payment_status === 'PAID' ? 'ชำระแล้ว'
                                                                        : ms.payment_status === 'INVOICED' ? 'วางบิลแล้ว'
                                                                        : ms.payment_status === 'PARTIAL_PAID' ? 'บางส่วน'
                                                                        : ms.payment_status}
                                                                </Badge>
                                                            )}
                                                            <Pencil className="h-2.5 w-2.5 text-slate-300 ml-auto shrink-0" />
                                                        </div>
                                                    </td>
                                                    <td className="sticky z-10 bg-white border border-slate-100 px-2 py-0.5" style={{ left: COL_NUM_W + COL_PROJECT_W, width: COL_ACCOUNT_W, minWidth: COL_ACCOUNT_W }} />
                                                    <td className="sticky z-10 bg-white border border-slate-100 px-2 py-0.5 text-[10px] text-slate-400" style={{ left: COL_NUM_W + COL_PROJECT_W + COL_ACCOUNT_W, width: COL_TYPE_W, minWidth: COL_TYPE_W }}>
                                                        {ms.milestone_status || '-'}
                                                        {ms.invoice_no && <div className="text-[8px] text-blue-500 font-mono">{ms.invoice_no}</div>}
                                                    </td>
                                                    {months.map(m => {
                                                        const hasForecast = fcMonth === m
                                                        const hasActual = acMonth === m
                                                        return (
                                                            <Fragment key={m}>
                                                                <td
                                                                    className="border border-slate-100 px-1 py-0.5 text-right text-[10px]"
                                                                    style={hasForecast && fcValue ? {
                                                                        backgroundColor: `${ms.milestone_color}18`,
                                                                        borderLeft: `2px solid ${ms.milestone_color}`,
                                                                        width: 72, minWidth: 72,
                                                                    } : { width: 72, minWidth: 72 }}
                                                                >
                                                                    {hasForecast ? fmtAmount(fcValue) : ''}
                                                                </td>
                                                                <td
                                                                    className="border border-slate-100 px-1 py-0.5 text-right text-[10px]"
                                                                    style={hasActual && acValue ? {
                                                                        backgroundColor: `${ms.milestone_color}12`,
                                                                        borderLeft: `2px solid ${ms.milestone_color}`,
                                                                        width: 72, minWidth: 72,
                                                                    } : { width: 72, minWidth: 72 }}
                                                                >
                                                                    {hasActual ? fmtAmount(acValue) : ''}
                                                                </td>
                                                            </Fragment>
                                                        )
                                                    })}
                                                    <td className="border border-slate-100 px-1 py-0.5 text-right text-[10px] bg-blue-50/20" style={{ width: 72, minWidth: 72 }}>
                                                        {fmtAmount(fcValue)}
                                                    </td>
                                                    <td className="border border-slate-100 px-1 py-0.5 text-right text-[10px] bg-emerald-50/20" style={{ width: 72, minWidth: 72 }}>
                                                        {acMonth !== null ? fmtAmount(acValue) : ''}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </Fragment>
                                )
                            })
                        ) : (
                            /* ========== BY GROUP VIEW ========== */
                            groupedData.map((group, gIdx) => {
                                const isExpanded = expandedRows.has(group.group_name)
                                return (
                                    <Fragment key={group.group_name}>
                                        <tr className="hover:bg-slate-50/50 border-b border-slate-200 bg-slate-50/30">
                                            <td
                                                className="sticky z-10 bg-white border border-slate-200 px-1 py-1.5 text-center text-slate-400 font-medium"
                                                style={{ left: 0, width: COL_NUM_W, minWidth: COL_NUM_W }}
                                            >
                                                {gIdx + 1}
                                            </td>
                                            <td
                                                className="sticky z-10 bg-white border border-slate-200 px-1 py-1"
                                                style={{ left: COL_NUM_W, width: COL_PROJECT_W, minWidth: COL_PROJECT_W }}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => toggleRow(group.group_name)}
                                                        className="shrink-0 text-slate-400 hover:text-slate-700"
                                                    >
                                                        {isExpanded
                                                            ? <ChevronDown className="h-3.5 w-3.5" />
                                                            : <ChevronRight className="h-3.5 w-3.5" />
                                                        }
                                                    </button>
                                                    <span className="font-bold text-slate-700">{group.group_name}</span>
                                                </div>
                                            </td>
                                            <td
                                                className="sticky z-10 bg-white border border-slate-200 px-2 py-1"
                                                style={{ left: COL_NUM_W + COL_PROJECT_W, width: COL_ACCOUNT_W, minWidth: COL_ACCOUNT_W }}
                                            />
                                            <td
                                                className="sticky z-10 bg-white border border-slate-200 px-2 py-1 text-[11px] text-slate-500"
                                                style={{ left: COL_NUM_W + COL_PROJECT_W + COL_ACCOUNT_W, width: COL_TYPE_W, minWidth: COL_TYPE_W }}
                                            >
                                                {group.projects.length} โครงการ
                                            </td>
                                            {months.map(m => {
                                                const mt = group.monthly.find(t => t.month === m)
                                                return (
                                                    <Fragment key={m}>
                                                        <td className="border border-slate-200 px-1 py-1 text-right font-semibold text-blue-700" style={{ width: 72, minWidth: 72 }}>
                                                            {fmtAmount(mt?.forecast)}
                                                        </td>
                                                        <td className="border border-slate-200 px-1 py-1 text-right font-semibold text-emerald-700" style={{ width: 72, minWidth: 72 }}>
                                                            {fmtAmount(mt?.actual)}
                                                        </td>
                                                    </Fragment>
                                                )
                                            })}
                                            <td className="border border-slate-200 px-1 py-1 text-right font-bold bg-blue-50/30 text-blue-700" style={{ width: 72, minWidth: 72 }}>
                                                {fmtAmount(group.grand_forecast)}
                                            </td>
                                            <td className="border border-slate-200 px-1 py-1 text-right font-bold bg-emerald-50/30 text-emerald-700" style={{ width: 72, minWidth: 72 }}>
                                                {fmtAmount(group.grand_actual)}
                                            </td>
                                        </tr>

                                        {/* Projects in group (expanded) */}
                                        {isExpanded && group.projects.map(project => {
                                            const forecastTotal = getProjectForecastTotal(project)
                                            const actualTotal = getProjectActualTotal(project)
                                            return (
                                                <tr key={project.project_id} className="hover:bg-blue-50/30 border-b border-slate-100">
                                                    <td className="sticky z-10 bg-white border border-slate-100 px-1 py-0.5" style={{ left: 0, width: COL_NUM_W, minWidth: COL_NUM_W }} />
                                                    <td className="sticky z-10 bg-white border border-slate-100 px-1 py-0.5" style={{ left: COL_NUM_W, width: COL_PROJECT_W, minWidth: COL_PROJECT_W }}>
                                                        <div className="pl-5">
                                                            <span className="font-semibold text-slate-600 text-[11px]">{project.project_code}</span>
                                                            <span className="text-[11px] text-muted-foreground ml-1 truncate">{project.project_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="sticky z-10 bg-white border border-slate-100 px-2 py-0.5 text-[10px] text-blue-600" style={{ left: COL_NUM_W + COL_PROJECT_W, width: COL_ACCOUNT_W, minWidth: COL_ACCOUNT_W }}>
                                                        {project.customer_short_name || project.customer_name || '-'}
                                                    </td>
                                                    <td className="sticky z-10 bg-white border border-slate-100 px-2 py-0.5 text-[10px] text-slate-400" style={{ left: COL_NUM_W + COL_PROJECT_W + COL_ACCOUNT_W, width: COL_TYPE_W, minWidth: COL_TYPE_W }}>
                                                        {project.project_type_name || '-'}
                                                    </td>
                                                    {months.map(m => {
                                                        const fc = getProjectForecastCell(project, m)
                                                        const ac = getProjectActualCell(project, m)
                                                        return (
                                                            <Fragment key={m}>
                                                                <td
                                                                    className="border border-slate-100 px-1 py-0.5 text-right text-[10px]"
                                                                    style={fc.color && fc.total > 0 ? {
                                                                        backgroundColor: `${fc.color}18`,
                                                                        borderLeft: `2px solid ${fc.color}`,
                                                                        width: 72, minWidth: 72,
                                                                    } : { width: 72, minWidth: 72 }}
                                                                >
                                                                    {fmtAmount(fc.total)}
                                                                </td>
                                                                <td
                                                                    className="border border-slate-100 px-1 py-0.5 text-right text-[10px]"
                                                                    style={ac.color && ac.total > 0 ? {
                                                                        backgroundColor: `${ac.color}12`,
                                                                        borderLeft: `2px solid ${ac.color}`,
                                                                        width: 72, minWidth: 72,
                                                                    } : { width: 72, minWidth: 72 }}
                                                                >
                                                                    {fmtAmount(ac.total)}
                                                                </td>
                                                            </Fragment>
                                                        )
                                                    })}
                                                    <td className="border border-slate-100 px-1 py-0.5 text-right text-[10px] font-semibold bg-blue-50/20" style={{ width: 72, minWidth: 72 }}>
                                                        {fmtAmount(forecastTotal)}
                                                    </td>
                                                    <td className="border border-slate-100 px-1 py-0.5 text-right text-[10px] font-semibold bg-emerald-50/20" style={{ width: 72, minWidth: 72 }}>
                                                        {fmtAmount(actualTotal)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </Fragment>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bottom summary */}
            {data && data.projects.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>ทั้งหมด {viewBy === 'project' ? `${data.projects.length} โครงการ` : `${groupedData.length} กลุ่ม`}</span>
                    <span>
                        {modeLabel} Forecast: <strong className="text-blue-600">{fmtAmount(grandForecast)} ฿</strong>
                        {' | '}
                        {modeLabel} Actual: <strong className="text-emerald-600">{fmtAmount(grandActual)} ฿</strong>
                    </span>
                </div>
            )}
        </div>
    )
}
