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

interface SalesCashInTableProps {
    data: SalesCashInPlanData | null
    year: number
    onYearChange: (year: number) => void
    onProjectClick: (projectId: string) => void
    onMilestoneClick: (milestone: SalesCashInMilestone, project: SalesCashInProject) => void
    isLoading: boolean
}

export function SalesCashInTable({
    data,
    year,
    onYearChange,
    onProjectClick,
    onMilestoneClick,
    isLoading,
}: SalesCashInTableProps) {
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

    // Year options: current year +/- 2
    const yearOptions = useMemo(() => {
        const current = new Date().getFullYear()
        return [current - 2, current - 1, current, current + 1, current + 2]
    }, [])

    // Build unique milestone colors for legend
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

    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev)
            if (next.has(projectId)) next.delete(projectId)
            else next.add(projectId)
            return next
        })
    }

    const expandAll = () => {
        if (!data) return
        setExpandedProjects(new Set(data.projects.map(p => p.project_id)))
    }

    const collapseAll = () => {
        setExpandedProjects(new Set())
    }

    // Format amount for display
    const fmtAmount = (n: number | null | undefined): string => {
        if (n == null || n === 0) return ''
        return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }

    // Format amount in compact form for header totals
    const fmtCompact = (n: number | null | undefined): string => {
        if (n == null || n === 0) return '-'
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
        return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }

    // Get aggregated cell data for a project row (sum of all milestones in that month)
    const getProjectCellData = (project: SalesCashInProject, month: number, type: 'sales' | 'cashin') => {
        const milestones = project.milestones.filter(m =>
            type === 'sales' ? m.sales_month === month : m.cashin_month === month
        )
        const total = milestones.reduce(
            (sum, m) => sum + (type === 'sales' ? (m.invoice_amount || 0) : (m.payment_amount || 0)),
            0
        )
        const primaryColor = milestones.length > 0 ? milestones[0].milestone_color : null
        return { total, milestones, color: primaryColor }
    }

    const months = Array.from({ length: 12 }, (_, i) => i + 1)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Sticky column left offsets
    const COL_NUM_W = 32
    const COL_PROJECT_W = 220
    const COL_TYPE_W = 120
    const COL_REMARK_W = 90

    return (
        <div className="space-y-3">
            {/* Header: Title + Year selector + Totals */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold">
                        Sales x Cash In (Plan {year})
                    </h2>
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
                    <span>Sales รวม: <strong className="text-blue-600">{fmtCompact(data?.grand_total_sales)}</strong></span>
                    <span>Cash In รวม: <strong className="text-emerald-600">{fmtCompact(data?.grand_total_cashin)}</strong></span>
                </div>
            </div>

            {/* Color Legend */}
            {milestoneLegend.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="text-muted-foreground font-medium">Milestone:</span>
                    {milestoneLegend.map(m => (
                        <span key={m.code} className="flex items-center gap-1.5">
                            <span
                                className="w-3 h-3 rounded-sm border"
                                style={{ backgroundColor: m.color }}
                            />
                            <span>{m.name}</span>
                        </span>
                    ))}
                </div>
            )}

            {/* Scrollable Table */}
            <div className="border rounded-lg overflow-auto" style={{ maxHeight: '72vh' }}>
                <table className="border-collapse text-[11px]" style={{ minWidth: 'max-content' }}>
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
                                รายการ
                            </th>
                            <th
                                rowSpan={2}
                                className="sticky z-30 bg-slate-100 border border-slate-200 px-2 py-1.5 text-left font-semibold"
                                style={{ left: COL_NUM_W + COL_PROJECT_W, width: COL_TYPE_W, minWidth: COL_TYPE_W }}
                            >
                                Type
                            </th>
                            <th
                                rowSpan={2}
                                className="bg-slate-100 border border-slate-200 px-2 py-1.5 text-left font-semibold"
                                style={{ width: COL_REMARK_W, minWidth: COL_REMARK_W }}
                            >
                                Remark
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
                        </tr>
                        {/* Row 2: Sales/Cash In sub-headers */}
                        <tr className="bg-slate-100">
                            {months.map(m => (
                                <Fragment key={m}>
                                    <th
                                        className="bg-blue-50 border border-slate-200 px-1 py-0.5 text-center font-semibold text-blue-700"
                                        style={{ width: 72, minWidth: 72 }}
                                    >
                                        Sales
                                    </th>
                                    <th
                                        className="bg-cyan-50 border border-slate-200 px-1 py-0.5 text-center font-semibold text-cyan-700"
                                        style={{ width: 72, minWidth: 72 }}
                                    >
                                        Cash In
                                    </th>
                                </Fragment>
                            ))}
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
                                const mt = data?.monthly_totals.find(t => t.month === m)
                                return (
                                    <Fragment key={m}>
                                        <td className="bg-blue-50/50 border border-slate-200 px-1 py-1 text-right font-bold text-blue-700">
                                            {fmtAmount(mt?.total_sales)}
                                        </td>
                                        <td className="bg-cyan-50/50 border border-slate-200 px-1 py-1 text-right font-bold text-cyan-700">
                                            {fmtAmount(mt?.total_cashin)}
                                        </td>
                                    </Fragment>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {(!data || data.projects.length === 0) ? (
                            <tr>
                                <td
                                    colSpan={4 + 24}
                                    className="text-center py-12 text-muted-foreground"
                                >
                                    ไม่พบข้อมูลโครงการ
                                </td>
                            </tr>
                        ) : (
                            data.projects.map((project, idx) => {
                                const isExpanded = expandedProjects.has(project.project_id)
                                return (
                                    <Fragment key={project.project_id}>
                                        {/* Project summary row */}
                                        <tr className="hover:bg-slate-50/50 border-b border-slate-200 bg-slate-50/30">
                                            {/* # */}
                                            <td
                                                className="sticky z-10 bg-white border border-slate-200 px-1 py-1.5 text-center text-slate-400 font-medium"
                                                style={{ left: 0, width: COL_NUM_W, minWidth: COL_NUM_W }}
                                            >
                                                {idx + 1}
                                            </td>
                                            {/* Project info */}
                                            <td
                                                className="sticky z-10 bg-white border border-slate-200 px-1 py-1"
                                                style={{ left: COL_NUM_W, width: COL_PROJECT_W, minWidth: COL_PROJECT_W }}
                                            >
                                                <div className="flex items-start gap-1">
                                                    <button
                                                        onClick={() => toggleProject(project.project_id)}
                                                        className="mt-0.5 shrink-0 text-slate-400 hover:text-slate-700"
                                                    >
                                                        {isExpanded
                                                            ? <ChevronDown className="h-3.5 w-3.5" />
                                                            : <ChevronRight className="h-3.5 w-3.5" />
                                                        }
                                                    </button>
                                                    <div className="min-w-0 flex-1">
                                                        <button
                                                            className="text-left hover:text-blue-600 group"
                                                            onClick={() => onProjectClick(project.project_id)}
                                                            title="คลิกเพื่อดู Issues ของโครงการนี้"
                                                        >
                                                            <span className="font-bold text-slate-700 group-hover:text-blue-600">
                                                                {project.project_code}
                                                            </span>
                                                        </button>
                                                        <div className="text-[10px] text-muted-foreground truncate" style={{ maxWidth: COL_PROJECT_W - 30 }}>
                                                            {project.project_name}
                                                        </div>
                                                        {project.customer_name && (
                                                            <div className="text-[9px] text-blue-500 truncate" style={{ maxWidth: COL_PROJECT_W - 30 }}>
                                                                {project.customer_name}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className="text-[9px] text-slate-400">
                                                                {project.milestones.length} milestones
                                                            </span>
                                                            {project.issue_count > 0 && (
                                                                <Badge variant="destructive" className="text-[8px] h-3.5 px-1">
                                                                    {project.issue_count} issue{project.issue_count > 1 ? 's' : ''}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Type / Group */}
                                            <td
                                                className="sticky z-10 bg-white border border-slate-200 px-2 py-1 text-[10px] text-slate-500"
                                                style={{ left: COL_NUM_W + COL_PROJECT_W, width: COL_TYPE_W, minWidth: COL_TYPE_W }}
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
                                            {/* Remark */}
                                            <td className="border border-slate-200 px-2 py-1 text-[10px] text-muted-foreground" style={{ width: COL_REMARK_W, minWidth: COL_REMARK_W }}>
                                                {project.remark || ''}
                                            </td>
                                            {/* Month cells - aggregated from all milestones */}
                                            {months.map(m => {
                                                const sales = getProjectCellData(project, m, 'sales')
                                                const cashin = getProjectCellData(project, m, 'cashin')
                                                return (
                                                    <Fragment key={m}>
                                                        <td
                                                            className="border border-slate-200 px-1 py-1 text-right"
                                                            style={sales.color && sales.total > 0 ? {
                                                                backgroundColor: `${sales.color}20`,
                                                                borderLeft: `3px solid ${sales.color}`,
                                                                width: 72, minWidth: 72,
                                                            } : { width: 72, minWidth: 72 }}
                                                        >
                                                            <span className="font-semibold">
                                                                {fmtAmount(sales.total)}
                                                            </span>
                                                        </td>
                                                        <td
                                                            className="border border-slate-200 px-1 py-1 text-right"
                                                            style={cashin.color && cashin.total > 0 ? {
                                                                backgroundColor: `${cashin.color}15`,
                                                                borderLeft: `3px solid ${cashin.color}`,
                                                                width: 72, minWidth: 72,
                                                            } : { width: 72, minWidth: 72 }}
                                                        >
                                                            <span className="font-semibold">
                                                                {fmtAmount(cashin.total)}
                                                            </span>
                                                        </td>
                                                    </Fragment>
                                                )
                                            })}
                                        </tr>

                                        {/* Milestone sub-rows (expanded) */}
                                        {isExpanded && project.milestones.map(ms => (
                                            <tr
                                                key={ms.milestone_id}
                                                className="hover:bg-blue-50/30 border-b border-slate-100 cursor-pointer"
                                                onClick={() => onMilestoneClick(ms, project)}
                                            >
                                                {/* # - empty for sub-row */}
                                                <td
                                                    className="sticky z-10 bg-white border border-slate-100 px-1 py-0.5"
                                                    style={{ left: 0, width: COL_NUM_W, minWidth: COL_NUM_W }}
                                                />
                                                {/* Milestone name with color indicator */}
                                                <td
                                                    className="sticky z-10 bg-white border border-slate-100 px-1 py-0.5"
                                                    style={{ left: COL_NUM_W, width: COL_PROJECT_W, minWidth: COL_PROJECT_W }}
                                                >
                                                    <div className="flex items-center gap-1.5 pl-5">
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full shrink-0 border"
                                                            style={{ backgroundColor: ms.milestone_color }}
                                                        />
                                                        <span className="text-[10px] font-medium text-slate-600">
                                                            {ms.milestone_name}
                                                        </span>
                                                        {ms.payment_status && ms.payment_status !== 'NOT_INVOICED' && (
                                                            <Badge
                                                                className="text-[7px] h-3 px-1"
                                                                variant={ms.payment_status === 'PAID' ? 'default' : 'secondary'}
                                                            >
                                                                {ms.payment_status === 'PAID' ? 'ชำระแล้ว'
                                                                    : ms.payment_status === 'INVOICED' ? 'วางบิลแล้ว'
                                                                    : ms.payment_status === 'PARTIAL_PAID' ? 'บางส่วน'
                                                                    : ms.payment_status}
                                                            </Badge>
                                                        )}
                                                        <Pencil className="h-2.5 w-2.5 text-slate-300 ml-auto shrink-0" />
                                                    </div>
                                                </td>
                                                {/* Status/info */}
                                                <td
                                                    className="sticky z-10 bg-white border border-slate-100 px-2 py-0.5 text-[9px] text-slate-400"
                                                    style={{ left: COL_NUM_W + COL_PROJECT_W, width: COL_TYPE_W, minWidth: COL_TYPE_W }}
                                                >
                                                    {ms.milestone_status || '-'}
                                                    {ms.invoice_no && (
                                                        <div className="text-[8px] text-blue-500 font-mono">{ms.invoice_no}</div>
                                                    )}
                                                </td>
                                                {/* Notes */}
                                                <td className="border border-slate-100 px-1 py-0.5 text-[9px] text-muted-foreground truncate" style={{ width: COL_REMARK_W, minWidth: COL_REMARK_W, maxWidth: COL_REMARK_W }}>
                                                    {ms.payment_notes || ''}
                                                </td>
                                                {/* Month cells for this milestone */}
                                                {months.map(m => {
                                                    const hasSales = ms.sales_month === m
                                                    const hasCashin = ms.cashin_month === m
                                                    const salesVal = hasSales ? ms.invoice_amount : null
                                                    const cashinVal = hasCashin ? ms.payment_amount : null
                                                    return (
                                                        <Fragment key={m}>
                                                            <td
                                                                className="border border-slate-100 px-1 py-0.5 text-right text-[10px]"
                                                                style={hasSales && salesVal ? {
                                                                    backgroundColor: `${ms.milestone_color}18`,
                                                                    borderLeft: `2px solid ${ms.milestone_color}`,
                                                                    width: 72, minWidth: 72,
                                                                } : { width: 72, minWidth: 72 }}
                                                            >
                                                                {fmtAmount(salesVal)}
                                                            </td>
                                                            <td
                                                                className="border border-slate-100 px-1 py-0.5 text-right text-[10px]"
                                                                style={hasCashin && cashinVal ? {
                                                                    backgroundColor: `${ms.milestone_color}12`,
                                                                    borderLeft: `2px solid ${ms.milestone_color}`,
                                                                    width: 72, minWidth: 72,
                                                                } : { width: 72, minWidth: 72 }}
                                                            >
                                                                {fmtAmount(cashinVal)}
                                                            </td>
                                                        </Fragment>
                                                    )
                                                })}
                                            </tr>
                                        ))}
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
                    <span>ทั้งหมด {data.projects.length} โครงการ</span>
                    <span>
                        Sales รวม: <strong className="text-blue-600">{fmtAmount(data.grand_total_sales)} ฿</strong>
                        {' | '}
                        Cash In รวม: <strong className="text-emerald-600">{fmtAmount(data.grand_total_cashin)} ฿</strong>
                    </span>
                </div>
            )}
        </div>
    )
}
