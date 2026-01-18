'use client'

import React, { useState, useEffect, useCallback } from "react"
import { CheckCircle2, XCircle, RefreshCw, Target, Users, FolderKanban, BarChart3, AlertTriangle, Calculator } from "lucide-react"
import {
    getMandayControlKPI,
    getMandayControlTrend,
    getProjectsFailingKPI,
    MandayControlProject,
    MandayControlSummary
} from "@/lib/actions/department-kpi-actions"
import { toast } from "sonner"

interface MandayControlViewProps {
    embedded?: boolean
}

const PERIODS = [
    { value: 0, label: 'ทั้งปี' },
    { value: 1, label: 'Q1' },
    { value: 2, label: 'Q2' },
    { value: 3, label: 'Q3' },
    { value: 4, label: 'Q4' },
]

export default function MandayControlView({ embedded = false }: MandayControlViewProps) {
    const [data, setData] = useState<MandayControlProject[]>([])
    const [summary, setSummary] = useState<MandayControlSummary | null>(null)
    const [trend, setTrend] = useState<any[]>([])
    const [failingProjects, setFailingProjects] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Filters
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [quarterFilter, setQuarterFilter] = useState<number>(0)

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const [kpiResult, trendResult, failingResult] = await Promise.all([
                getMandayControlKPI({
                    year: yearFilter,
                    period: quarterFilter === 0 ? 'year' : 'quarter',
                    periodValue: quarterFilter || undefined
                }),
                getMandayControlTrend(yearFilter),
                getProjectsFailingKPI('manday-control', yearFilter)
            ])

            if (kpiResult.success) {
                setData(kpiResult.data)
                setSummary(kpiResult.summary)
            }
            if (trendResult.success) {
                setTrend(trendResult.data)
            }
            if (failingResult.success) {
                setFailingProjects(failingResult.data)
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล")
        } finally {
            setIsLoading(false)
        }
    }, [yearFilter, quarterFilter])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    // Score gradient
    const getScoreGradient = (percent: number) => {
        if (percent >= 85) return 'from-emerald-500 via-green-500 to-teal-500'
        if (percent >= 70) return 'from-yellow-500 via-amber-500 to-orange-500'
        return 'from-rose-500 via-red-500 to-pink-500'
    }

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-6 w-full"}>
            {/* Header with Gradient */}
            {!embedded && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-6 shadow-lg">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Calculator size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Man-day Control</h1>
                                <p className="text-orange-100 text-sm mt-1">Planned vs Actual Man-days - Target: &ge; 85%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {summary && (
                                <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                                    <div className="text-white/70 text-xs">Projects Pass</div>
                                    <div className="text-white font-bold text-lg">{summary.passCount}/{summary.totalProjects}</div>
                                </div>
                            )}
                            <button
                                onClick={() => fetchData()}
                                disabled={isLoading}
                                className="p-3 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-all"
                            >
                                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className={`flex flex-wrap items-center gap-4 bg-white/80 backdrop-blur-sm ${embedded ? 'p-3' : 'p-4'} rounded-xl border border-slate-200 shadow-sm`}>
                <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(parseInt(e.target.value))}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 outline-none bg-white font-medium"
                >
                    {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                <select
                    value={quarterFilter}
                    onChange={(e) => setQuarterFilter(parseInt(e.target.value))}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 outline-none bg-white font-medium"
                >
                    {PERIODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Main KPI Card */}
                    <div className={`rounded-2xl shadow-lg overflow-hidden ${summary.isPass
                        ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200'
                        : 'bg-gradient-to-br from-rose-50 via-red-50 to-pink-50 border-2 border-rose-200'
                        }`}>
                        <div className="p-5">
                            <div className="flex items-center gap-2 text-slate-600 mb-3">
                                <Target size={18} className={summary.isPass ? 'text-emerald-600' : 'text-rose-600'} />
                                <span className="text-sm font-semibold">Control Rate</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${getScoreGradient(summary.averagePercent)} p-0.5`}>
                                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                        <span className={`text-2xl font-black ${summary.isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {summary.averagePercent}%
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${summary.isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {summary.isPass ? '✓ Pass' : '✗ Below'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">Target: 85%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total Projects */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                        <div className="flex items-center gap-2 text-slate-600 mb-3">
                            <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg">
                                <FolderKanban size={18} className="text-orange-600" />
                            </div>
                            <span className="text-sm font-semibold">Total Projects</span>
                        </div>
                        <div className="text-4xl font-black text-slate-800">{summary.totalProjects}</div>
                        <div className="text-xs text-slate-500 mt-1">projects measured</div>
                    </div>

                    {/* Planned Man-days */}
                    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 text-blue-600 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users size={18} className="text-blue-600" />
                            </div>
                            <span className="text-sm font-semibold">Planned</span>
                        </div>
                        <div className="text-3xl font-black text-blue-600">{summary.totalPlannedMandays.toLocaleString()}</div>
                        <div className="text-xs text-blue-600 mt-1">man-days</div>
                    </div>

                    {/* Actual Man-days */}
                    <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 text-amber-600 mb-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Calculator size={18} className="text-amber-600" />
                            </div>
                            <span className="text-sm font-semibold">Actual</span>
                        </div>
                        <div className="text-3xl font-black text-amber-600">{summary.totalActualMandays.toLocaleString()}</div>
                        <div className="text-xs text-amber-600 mt-1">man-days used</div>
                    </div>

                    {/* Pass/Fail Count */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                        <div className="flex items-center gap-2 text-slate-600 mb-3">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <BarChart3 size={18} className="text-slate-600" />
                            </div>
                            <span className="text-sm font-semibold">Result</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-black text-emerald-600">{summary.passCount}</div>
                                <div className="text-xs text-emerald-600">Pass</div>
                            </div>
                            <div className="w-px h-10 bg-slate-200" />
                            <div className="text-center">
                                <div className="text-2xl font-black text-rose-600">{summary.failCount}</div>
                                <div className="text-xs text-rose-600">Fail</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Monthly Trend */}
            {quarterFilter === 0 && trend.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-5">
                        <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg">
                            <BarChart3 size={18} className="text-orange-600" />
                        </div>
                        Monthly Trend - {yearFilter}
                    </h3>
                    <div className="flex items-end gap-2 h-40">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                            const item = trend.find(t => t.month === month) || { avg_percent: 0, project_count: 0 }
                            const isPass = item.avg_percent >= 85
                            return (
                                <div key={month} className="flex-1 flex flex-col items-center group">
                                    <div className="relative w-full">
                                        <div
                                            className={`w-full rounded-t-lg transition-all group-hover:scale-105 ${item.project_count === 0
                                                ? 'bg-slate-200'
                                                : isPass
                                                    ? 'bg-gradient-to-t from-emerald-500 to-green-400'
                                                    : 'bg-gradient-to-t from-rose-500 to-red-400'
                                                }`}
                                            style={{ height: `${Math.max((item.avg_percent || 0) * 1.2, 15)}px` }}
                                            title={`${item.avg_percent?.toFixed(1) || 0}% (${item.project_count} projects)`}
                                        />
                                        {item.project_count > 0 && (
                                            <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {item.avg_percent?.toFixed(0)}%
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2 font-medium">
                                        {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][month - 1]}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-5 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-t from-emerald-500 to-green-400 rounded" />
                            <span className="font-medium">Pass (&ge; 85%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-t from-rose-500 to-red-400 rounded" />
                            <span className="font-medium">Fail (&lt; 85%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-slate-200 rounded" />
                            <span className="font-medium">No Data</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Projects Failing KPI */}
            {failingProjects.length > 0 && (
                <div className="rounded-2xl overflow-hidden shadow-sm p-5" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)' }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-rose-200 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-rose-700" />
                        </div>
                        <h3 className="font-bold text-rose-800 text-lg">
                            Projects Below Target (&lt; 85%)
                        </h3>
                        <span className="px-2 py-0.5 bg-rose-200 text-rose-800 rounded-full text-sm font-semibold">{failingProjects.length}</span>
                    </div>
                    <div className="space-y-2">
                        {failingProjects.slice(0, 5).map((proj, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white rounded-xl px-5 py-3 border border-rose-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                                        {proj.project_code?.substring(0, 2) || '?'}
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-800">{proj.project_code}</span>
                                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{proj.project_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="text-xs text-slate-500 text-right">
                                        <div>Plan: {proj.total_planned_mandays?.toFixed(1)} MD</div>
                                        <div>Actual: {proj.total_actual_mandays?.toFixed(1)} MD</div>
                                    </div>
                                    <span className="px-3 py-1.5 bg-rose-500 text-white rounded-full font-bold shadow-sm">{proj.value}%</span>
                                    <span className="text-rose-600 font-bold">-{(85 - proj.value).toFixed(1)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Projects Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FolderKanban size={18} className="text-orange-600" />
                        Project Breakdown
                        <span className="text-sm font-normal text-slate-500 ml-2">({data.length} projects)</span>
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-5 py-3.5 text-sm font-semibold text-slate-600">Project</th>
                                <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Month</th>
                                <th className="text-right px-4 py-3.5 text-sm font-semibold text-slate-600">Planned MD</th>
                                <th className="text-right px-4 py-3.5 text-sm font-semibold text-slate-600">Actual MD</th>
                                <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Control %</th>
                                <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-500">
                                        <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-orange-500" />
                                        <div className="font-medium">Loading...</div>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-500">
                                        <FolderKanban size={28} className="mx-auto mb-3 text-slate-300" />
                                        <div className="font-medium">ไม่มีข้อมูลโปรเจคในช่วงเวลานี้</div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${row.is_pass === 1
                                                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                                                    : 'bg-gradient-to-br from-rose-500 to-red-600'
                                                    }`}>
                                                    {row.project_code?.substring(0, 2) || '?'}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-800">{row.project_code}</span>
                                                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{row.project_name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center px-4 py-4 text-sm text-slate-600">
                                            {['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][row.month]} {row.year}
                                        </td>
                                        <td className="text-right px-4 py-4 text-sm text-blue-600 font-semibold">
                                            {row.total_planned_mandays?.toFixed(1)}
                                        </td>
                                        <td className="text-right px-4 py-4 text-sm text-amber-600 font-semibold">
                                            {row.total_actual_mandays?.toFixed(1)}
                                        </td>
                                        <td className="text-center px-4 py-4">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="w-20 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${row.manday_control_percent >= 85 ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-rose-500 to-red-500'}`}
                                                        style={{ width: `${Math.min(row.manday_control_percent, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={`font-black text-lg ${row.manday_control_percent >= 85 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {row.manday_control_percent}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-center px-4 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-sm ${row.is_pass === 1
                                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                                                : 'bg-gradient-to-r from-rose-500 to-red-500 text-white'
                                                }`}>
                                                {row.is_pass === 1 ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                {row.is_pass === 1 ? 'Pass' : 'Fail'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
