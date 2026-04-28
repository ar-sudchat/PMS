'use client'

import { useState, useEffect } from 'react'
import { getDevCapacityOverview, type DevCapacityPayload } from '@/lib/actions/dev-capacity-actions'
import { Loader2, Download, Copy, RefreshCw, AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

const BUDGET_BADGE: Record<string, string> = {
    NORMAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
    OVER: 'bg-rose-50 text-rose-700 border-rose-200',
    NO_BUDGET: 'bg-slate-50 text-slate-600 border-slate-200',
}

export default function DevCapacityPage() {
    const [data, setData] = useState<DevCapacityPayload | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showJson, setShowJson] = useState(false)

    const load = async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await getDevCapacityOverview()
            if (result.success && result.data) {
                setData(result.data)
            } else {
                setError(result.error || 'Failed to load')
            }
        } catch (e: any) {
            setError(e.message || 'Unexpected error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const handleCopyJson = async () => {
        if (!data) return
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
        toast.success('Copied JSON to clipboard')
    }

    const handleDownloadJson = () => {
        if (!data) return
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dev-capacity-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleDownloadMd = () => {
        if (!data) return
        const md = buildMarkdown(data)
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dev-capacity-${new Date().toISOString().slice(0, 10)}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleDownloadCsv = () => {
        if (!data) return
        const headers = [
            'project_code', 'project_name', 'customer_name', 'pm_name', 'status_code',
            'current_milestone_code', 'sold_mandays', 'actual_mandays', 'remaining_mandays',
            'percent_used', 'budget_status', 'assigned_employee_count',
            'total_tasks', 'done_tasks', 'in_progress_tasks', 'blocked_tasks', 'overdue_tasks', 'progress_percent'
        ]
        const rows = data.projects.map(p => headers.map(h => {
            const v = (p as any)[h]
            if (v === null || v === undefined) return ''
            const s = String(v)
            return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
        }).join(','))
        const csv = [headers.join(','), ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dev-capacity-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800">Dev Capacity Overview</h1>
                    <p className="text-sm text-slate-500">โครงการ DEV onhand · sold vs actual mandays · กำลังคน · งานคงค้าง</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        disabled={loading}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={handleCopyJson}
                        disabled={!data}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                        <Copy className="w-4 h-4" /> Copy JSON
                    </button>
                    <button
                        onClick={handleDownloadJson}
                        disabled={!data}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                        <Download className="w-4 h-4" /> JSON
                    </button>
                    <button
                        onClick={handleDownloadCsv}
                        disabled={!data}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                        <Download className="w-4 h-4" /> CSV
                    </button>
                    <button
                        onClick={handleDownloadMd}
                        disabled={!data}
                        className="px-3 py-2 text-sm border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                        <Download className="w-4 h-4" /> Markdown
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
                    {error}
                </div>
            )}

            {loading && !data && (
                <div className="flex items-center justify-center py-20 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    กำลังโหลดข้อมูล...
                </div>
            )}

            {data && (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <SummaryCard label="โครงการ DEV" value={data.summary.project_count.toString()} icon={<CheckCircle2 className="w-4 h-4 text-blue-500" />} />
                        <SummaryCard label="Sold Mandays" value={data.summary.total_sold_mandays.toLocaleString(undefined, { maximumFractionDigits: 1 })} icon={<Clock className="w-4 h-4 text-slate-500" />} />
                        <SummaryCard label="Actual Mandays" value={data.summary.total_actual_mandays.toLocaleString(undefined, { maximumFractionDigits: 1 })} icon={<Clock className="w-4 h-4 text-amber-500" />} />
                        <SummaryCard label="Avg Utilization" value={`${data.summary.avg_utilization_percent}%`} icon={<Clock className="w-4 h-4 text-emerald-500" />} />
                        <SummaryCard label="Over Budget" value={data.summary.over_budget_count.toString()} icon={<AlertTriangle className="w-4 h-4 text-rose-500" />} accent={data.summary.over_budget_count > 0 ? 'rose' : undefined} />
                        <SummaryCard label="Overdue Tasks" value={data.summary.overdue_task_count.toString()} icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} accent={data.summary.overdue_task_count > 0 ? 'amber' : undefined} />
                    </div>

                    {/* Projects table */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">Code</th>
                                        <th className="px-3 py-2 text-left font-medium">Project / Customer</th>
                                        <th className="px-3 py-2 text-left font-medium">PM</th>
                                        <th className="px-3 py-2 text-left font-medium">Milestone</th>
                                        <th className="px-3 py-2 text-right font-medium">Sold</th>
                                        <th className="px-3 py-2 text-right font-medium">Actual</th>
                                        <th className="px-3 py-2 text-right font-medium">Remain</th>
                                        <th className="px-3 py-2 text-center font-medium">Used</th>
                                        <th className="px-3 py-2 text-center font-medium">Budget</th>
                                        <th className="px-3 py-2 text-center font-medium"><Users className="w-3.5 h-3.5 inline" /></th>
                                        <th className="px-3 py-2 text-center font-medium">Tasks</th>
                                        <th className="px-3 py-2 text-center font-medium">Done</th>
                                        <th className="px-3 py-2 text-center font-medium">Block</th>
                                        <th className="px-3 py-2 text-center font-medium">Overdue</th>
                                        <th className="px-3 py-2 text-center font-medium">Prog</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.projects.map((p) => (
                                        <tr key={p.project_id} className="hover:bg-slate-50">
                                            <td className="px-3 py-2 font-mono text-xs text-slate-600">{p.project_code}</td>
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-slate-800 truncate max-w-[280px]" title={p.project_name}>{p.project_name}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-[280px]" title={p.customer_name}>{p.customer_name}</div>
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 truncate max-w-[140px]" title={p.pm_name}>{p.pm_name}</td>
                                            <td className="px-3 py-2 text-xs">
                                                {p.current_milestone_code ? (
                                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">{p.current_milestone_code}</span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">{p.sold_mandays.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{p.actual_mandays.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                                            <td className={`px-3 py-2 text-right tabular-nums ${p.remaining_mandays < 0 ? 'text-rose-600 font-semibold' : 'text-slate-700'}`}>
                                                {p.remaining_mandays.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                            </td>
                                            <td className="px-3 py-2 text-center tabular-nums">{p.percent_used}%</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`px-2 py-0.5 text-xs rounded border ${BUDGET_BADGE[p.budget_status] || BUDGET_BADGE.NO_BUDGET}`}>
                                                    {p.budget_status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center tabular-nums">{p.assigned_employee_count}</td>
                                            <td className="px-3 py-2 text-center tabular-nums">{p.total_tasks}</td>
                                            <td className="px-3 py-2 text-center tabular-nums text-emerald-700">{p.done_tasks}</td>
                                            <td className={`px-3 py-2 text-center tabular-nums ${p.blocked_tasks > 0 ? 'text-amber-700 font-medium' : 'text-slate-400'}`}>{p.blocked_tasks}</td>
                                            <td className={`px-3 py-2 text-center tabular-nums ${p.overdue_tasks > 0 ? 'text-rose-700 font-medium' : 'text-slate-400'}`}>{p.overdue_tasks}</td>
                                            <td className="px-3 py-2 text-center tabular-nums">{p.progress_percent}%</td>
                                        </tr>
                                    ))}
                                    {data.projects.length === 0 && (
                                        <tr>
                                            <td colSpan={15} className="px-3 py-8 text-center text-slate-400">ไม่พบโครงการ DEV onhand</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-3 py-2 text-xs text-slate-500 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <span>Generated: {new Date(data.generated_at).toLocaleString('th-TH')}</span>
                            <button
                                onClick={() => setShowJson(s => !s)}
                                className="text-blue-600 hover:underline"
                            >
                                {showJson ? 'ซ่อน JSON' : 'ดู JSON ดิบ'}
                            </button>
                        </div>
                    </div>

                    {showJson && (
                        <div className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-auto max-h-[60vh]">
                            <pre className="text-xs font-mono whitespace-pre">{JSON.stringify(data, null, 2)}</pre>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

function escapeMd(s: string | null | undefined): string {
    if (s === null || s === undefined) return '-'
    return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function buildMarkdown(data: DevCapacityPayload): string {
    const s = data.summary
    const lines: string[] = []
    lines.push('# Dev Capacity Overview')
    lines.push('')
    lines.push(`*Generated: ${new Date(data.generated_at).toLocaleString('th-TH')}*`)
    lines.push('')
    lines.push('## Summary')
    lines.push('')
    lines.push('| Metric | Value |')
    lines.push('|---|---:|')
    lines.push(`| โครงการ DEV onhand | ${s.project_count} |`)
    lines.push(`| Sold Mandays รวม | ${s.total_sold_mandays.toLocaleString(undefined, { maximumFractionDigits: 1 })} |`)
    lines.push(`| Actual Mandays รวม | ${s.total_actual_mandays.toLocaleString(undefined, { maximumFractionDigits: 1 })} |`)
    lines.push(`| Remaining Mandays รวม | ${s.total_remaining_mandays.toLocaleString(undefined, { maximumFractionDigits: 1 })} |`)
    lines.push(`| Avg Utilization | ${s.avg_utilization_percent}% |`)
    lines.push(`| พนักงานที่ Assigned (sum) | ${s.total_assigned_employees} |`)
    lines.push(`| Over Budget | ${s.over_budget_count} |`)
    lines.push(`| Warning (>90%) | ${s.warning_count} |`)
    lines.push(`| Blocked Tasks รวม | ${s.blocked_task_count} |`)
    lines.push(`| Overdue Tasks รวม | ${s.overdue_task_count} |`)
    lines.push('')
    lines.push('## Projects')
    lines.push('')
    lines.push('| Code | Project | Customer | PM | Status | Milestone | Sold | Actual | Remain | Used % | Budget | Emp | Tasks | Done | Block | Overdue | Prog % |')
    lines.push('|---|---|---|---|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|')
    for (const p of data.projects) {
        lines.push([
            escapeMd(p.project_code),
            escapeMd(p.project_name),
            escapeMd(p.customer_name),
            escapeMd(p.pm_name),
            escapeMd(p.status_code),
            escapeMd(p.current_milestone_code),
            p.sold_mandays.toLocaleString(undefined, { maximumFractionDigits: 1 }),
            p.actual_mandays.toLocaleString(undefined, { maximumFractionDigits: 1 }),
            p.remaining_mandays.toLocaleString(undefined, { maximumFractionDigits: 1 }),
            `${p.percent_used}%`,
            p.budget_status,
            p.assigned_employee_count,
            p.total_tasks,
            p.done_tasks,
            p.blocked_tasks,
            p.overdue_tasks,
            `${p.progress_percent}%`,
        ].map(v => `${v}`).join(' | ').replace(/^/, '| ').replace(/$/, ' |'))
    }
    if (data.projects.length === 0) {
        lines.push('| _ไม่พบโครงการ DEV onhand_ |||||||||||||||||')
    }
    lines.push('')
    return lines.join('\n')
}

function SummaryCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: 'rose' | 'amber' }) {
    const ring = accent === 'rose' ? 'ring-rose-200' : accent === 'amber' ? 'ring-amber-200' : 'ring-slate-200'
    return (
        <div className={`bg-white border border-slate-200 rounded-xl p-3 ring-1 ${ring}`}>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                {icon}
                <span>{label}</span>
            </div>
            <div className="text-xl font-semibold text-slate-800 tabular-nums">{value}</div>
        </div>
    )
}
