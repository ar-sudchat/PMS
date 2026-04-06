'use client'

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { RefreshCw, Target, Bug, FolderKanban, BarChart3, AlertTriangle, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react"
import {
    getDefectRatioKPI,
    getDefectRatioTrend,
    getProjectsFailingKPI,
    DefectRatioProject,
    DefectRatioSummary
} from "@/lib/actions/department-kpi-actions"
import { toast } from "sonner"

interface DefectRatioViewProps {
    embedded?: boolean
}

const PERIODS = [
    { value: 0, label: 'ทั้งปี' },
    { value: 1, label: 'Q1' },
    { value: 2, label: 'Q2' },
    { value: 3, label: 'Q3' },
    { value: 4, label: 'Q4' },
]

export default function DefectRatioView({ embedded = false }: DefectRatioViewProps) {
    const [data, setData] = useState<DefectRatioProject[]>([])
    const [summary, setSummary] = useState<DefectRatioSummary | null>(null)
    const [trend, setTrend] = useState<any[]>([])
    const [failingProjects, setFailingProjects] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Filters
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [quarterFilter, setQuarterFilter] = useState<number>(0)

    // Selected month from trend cards
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 10

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            // Determine period based on selectedMonth or quarterFilter
            let period: 'month' | 'quarter' | 'year' = 'year'
            let periodValue: number | undefined = undefined
            if (selectedMonth) {
                period = 'month'
                periodValue = selectedMonth
            } else if (quarterFilter !== 0) {
                period = 'quarter'
                periodValue = quarterFilter
            }

            const [kpiResult, trendResult, failingResult] = await Promise.all([
                getDefectRatioKPI({
                    year: yearFilter,
                    period,
                    periodValue
                }),
                getDefectRatioTrend(yearFilter),
                getProjectsFailingKPI('defect-ratio', yearFilter, selectedMonth || undefined)
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
    }, [yearFilter, quarterFilter, selectedMonth])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Reset selectedMonth and page when filters change
    useEffect(() => {
        setSelectedMonth(null)
        setCurrentPage(1)
    }, [yearFilter, quarterFilter])

    // Reset page when selectedMonth changes
    useEffect(() => {
        setCurrentPage(1)
    }, [selectedMonth])

    // Pagination logic
    const totalPages = Math.ceil(data.length / pageSize)
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return data.slice(start, start + pageSize)
    }, [data, currentPage, pageSize])

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    // Score gradient - For defect ratio, lower is better
    const getScoreGradient = (percent: number) => {
        if (percent <= 15) return 'from-emerald-500 via-green-500 to-teal-500'
        if (percent <= 25) return 'from-yellow-500 via-amber-500 to-orange-500'
        return 'from-rose-500 via-red-500 to-pink-500'
    }

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-6 w-full"}>
            {/* Header with Gradient */}
            {!embedded && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-red-500 to-pink-500 p-6 shadow-lg">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Bug size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Defect Ratio</h1>
                                <p className="text-rose-100 text-sm mt-1">Defect Man-days / Total Man-days - Target: &le; 15%</p>
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
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-rose-500 outline-none bg-white font-medium"
                >
                    {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                <select
                    value={quarterFilter}
                    onChange={(e) => setQuarterFilter(parseInt(e.target.value))}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-rose-500 outline-none bg-white font-medium"
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
                                <span className="text-sm font-semibold">Defect Rate</span>
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
                                        {summary.isPass ? '✓ Pass' : '✗ Exceed'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">Target: &le; 15%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total Projects */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                        <div className="flex items-center gap-2 text-slate-600 mb-3">
                            <div className="p-2 bg-gradient-to-br from-rose-100 to-pink-100 rounded-lg">
                                <FolderKanban size={18} className="text-rose-600" />
                            </div>
                            <span className="text-sm font-semibold">Total Projects</span>
                        </div>
                        <div className="text-4xl font-black text-slate-800">{summary.totalProjects}</div>
                        <div className="text-xs text-slate-500 mt-1">projects measured</div>
                    </div>

                    {/* Total Man-days */}
                    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 text-blue-600 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <BarChart3 size={18} className="text-blue-600" />
                            </div>
                            <span className="text-sm font-semibold">Total MD</span>
                        </div>
                        <div className="text-3xl font-black text-blue-600">{summary.totalMandays.toLocaleString()}</div>
                        <div className="text-xs text-blue-600 mt-1">man-days total</div>
                    </div>

                    {/* Defect Man-days */}
                    <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 text-rose-600 mb-3">
                            <div className="p-2 bg-rose-100 rounded-lg">
                                <Bug size={18} className="text-rose-600" />
                            </div>
                            <span className="text-sm font-semibold">Defect MD</span>
                        </div>
                        <div className="text-3xl font-black text-rose-600">{summary.totalDefectMandays.toLocaleString()}</div>
                        <div className="text-xs text-rose-600 mt-1">man-days for defects</div>
                    </div>

                    {/* Pass/Fail Count */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                        <div className="flex items-center gap-2 text-slate-600 mb-3">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <TrendingDown size={18} className="text-slate-600" />
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
                                <div className="text-xs text-rose-600">Exceed</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Monthly Trend */}
            {quarterFilter === 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-5">
                        <div className="p-2 bg-gradient-to-br from-rose-100 to-pink-100 rounded-lg">
                            <BarChart3 size={18} className="text-rose-600" />
                        </div>
                        Monthly Trend - {yearFilter}
                        <span className="text-sm font-normal text-slate-500 ml-2">(Lower is better)</span>
                    </h3>
                    <div className="grid grid-cols-12 gap-2">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                            const monthData = trend.find(t => t.month === month)
                            const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

                            const isSelected = selectedMonth === month

                            if (!monthData || monthData.project_count === 0) {
                                return (
                                    <div key={month} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center opacity-60">
                                        <div className="text-xs font-medium text-slate-400 mb-1">{monthNames[month - 1]}</div>
                                        <div className="text-sm font-bold text-slate-300">-</div>
                                        <div className="text-xs text-slate-300">No data</div>
                                    </div>
                                )
                            }

                            const totalDefect = monthData.total_defect || 0
                            const totalMandays = monthData.total_mandays || 0
                            const ratio = totalMandays > 0 ? (totalDefect / totalMandays) * 100 : 0
                            const isPass = ratio <= 15
                            return (
                                <div
                                    key={month}
                                    onClick={() => setSelectedMonth(isSelected ? null : month)}
                                    className={`rounded-lg p-2 text-center border cursor-pointer transition-all ${
                                        isSelected
                                            ? 'ring-2 ring-rose-500 shadow-lg scale-105'
                                            : 'hover:shadow-md hover:scale-102'
                                    } ${
                                        isPass
                                            ? 'bg-emerald-50 border-emerald-200'
                                            : 'bg-rose-50 border-rose-200'
                                    }`}
                                >
                                    <div className={`text-xs font-medium mb-1 ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {monthNames[month - 1]}
                                    </div>
                                    <div className={`text-sm font-bold ${isPass ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {ratio.toFixed(2)}%
                                    </div>
                                    <div className={`text-xs ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {totalDefect.toFixed(0)}/{totalMandays.toFixed(0)}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {selectedMonth && (
                        <div className="flex items-center justify-center mt-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-full text-sm font-medium">
                                <span>กำลังแสดงข้อมูลเดือน: {['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][selectedMonth]}</span>
                                <button onClick={() => setSelectedMonth(null)} className="ml-1 p-0.5 hover:bg-rose-200 rounded-full transition-colors">✕</button>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-center gap-6 mt-5 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-emerald-100 border border-emerald-300 rounded" />
                            <span className="font-medium">Pass (≤ 15%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-rose-100 border border-rose-300 rounded" />
                            <span className="font-medium">Exceed (&gt; 15%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-slate-50 border border-slate-200 rounded" />
                            <span className="font-medium">No Data</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Projects Exceeding Target */}
            {failingProjects.length > 0 && (
                <div className="rounded-2xl overflow-hidden shadow-sm p-5" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)' }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-rose-200 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-rose-700" />
                        </div>
                        <h3 className="font-bold text-rose-800 text-lg">
                            Projects Exceeding Target (&gt; 15%)
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
                                        <div>Defect: {proj.defect_mandays?.toFixed(1)} MD</div>
                                        <div>Total: {proj.total_mandays?.toFixed(1)} MD</div>
                                    </div>
                                    <span className="px-3 py-1.5 bg-rose-500 text-white rounded-full font-bold shadow-sm">{proj.value}%</span>
                                    <span className="text-rose-600 font-bold">+{(proj.value - 15).toFixed(1)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Projects Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FolderKanban size={18} className="text-rose-600" />
                        Project Breakdown
                        <span className="text-sm font-normal text-slate-500 ml-2">({data.length} projects)</span>
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">Project</th>
                                <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Month</th>
                                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Total MD</th>
                                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Defect MD</th>
                                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Defect %</th>
                                <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-500">
                                        <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-rose-500" />
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
                                paginatedData.map((row, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="font-semibold text-slate-800">{row.project_code}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-[250px]">{row.project_name}</div>
                                        </td>
                                        <td className="text-center px-4 py-3 text-sm text-slate-600">
                                            {['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][row.month]} {row.year}
                                        </td>
                                        <td className="text-right px-4 py-3 text-sm text-slate-700">
                                            {row.total_mandays?.toFixed(1)}
                                        </td>
                                        <td className="text-right px-4 py-3 text-sm text-slate-700">
                                            {row.defect_mandays?.toFixed(1)}
                                        </td>
                                        <td className="text-right px-4 py-3 text-sm font-semibold">
                                            <span className={row.defect_ratio_percent <= 15 ? 'text-emerald-600' : 'text-rose-600'}>
                                                {row.defect_ratio_percent}%
                                            </span>
                                        </td>
                                        <td className="text-center px-4 py-3">
                                            <span className={`px-3 py-1 rounded text-xs font-medium ${row.is_pass === 1
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                {row.is_pass === 1 ? 'Pass' : 'Exceed'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {!isLoading && data.length > 0 && totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
                        <div className="text-sm text-slate-600">
                            แสดง {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, data.length)} จาก {data.length} รายการ
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page => {
                                        // Show first, last, current, and neighbors
                                        return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
                                    })
                                    .reduce((acc: (number | string)[], page, idx, arr) => {
                                        if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                                            acc.push('...')
                                        }
                                        acc.push(page)
                                        return acc
                                    }, [])
                                    .map((page, idx) => (
                                        page === '...' ? (
                                            <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">...</span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page as number)}
                                                className={`w-8 h-8 rounded text-sm font-medium ${currentPage === page
                                                    ? 'bg-rose-500 text-white'
                                                    : 'border border-slate-200 hover:bg-white text-slate-700'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    ))
                                }
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
