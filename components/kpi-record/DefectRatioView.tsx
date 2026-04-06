'use client'

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, XCircle, RefreshCw, Bug, FolderKanban, ExternalLink } from "lucide-react"
import {
    getDefectRatioKPI,
    getDefectRatioTrend,
    DefectRatioProject,
    DefectRatioSummary
} from "@/lib/actions/department-kpi-actions"
import { getProjectById } from "@/lib/actions/project-actions"
import { ProjectModal } from "@/components/modals/ProjectModal"
import { toast } from "sonner"

interface DefectRatioViewProps {
    embedded?: boolean
}

const MONTHS = [
    { value: 1, label: 'ม.ค.' },
    { value: 2, label: 'ก.พ.' },
    { value: 3, label: 'มี.ค.' },
    { value: 4, label: 'เม.ย.' },
    { value: 5, label: 'พ.ค.' },
    { value: 6, label: 'มิ.ย.' },
    { value: 7, label: 'ก.ค.' },
    { value: 8, label: 'ส.ค.' },
    { value: 9, label: 'ก.ย.' },
    { value: 10, label: 'ต.ค.' },
    { value: 11, label: 'พ.ย.' },
    { value: 12, label: 'ธ.ค.' },
]

export default function DefectRatioView({ embedded = false }: DefectRatioViewProps) {
    const [data, setData] = useState<DefectRatioProject[]>([])
    const [summary, setSummary] = useState<DefectRatioSummary | null>(null)
    const [trend, setTrend] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [monthFilter, setMonthFilter] = useState<string>("all")

    // Edit Project Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<any>(null)

    const handleEditProject = async (projectId: string) => {
        try {
            const result = await getProjectById(projectId)
            if (result.success && result.data) {
                setSelectedProject(result.data)
                setIsEditModalOpen(true)
            } else {
                toast.error("ไม่สามารถโหลดข้อมูลโครงการได้")
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด")
        }
    }

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = {
                year: yearFilter,
                period: monthFilter === "all" ? 'year' as const : 'month' as const,
                periodValue: monthFilter === "all" ? undefined : parseInt(monthFilter)
            }

            const [kpiResult, trendResult] = await Promise.all([
                getDefectRatioKPI(params),
                getDefectRatioTrend(yearFilter),
            ])

            if (kpiResult.success) {
                setData(kpiResult.data)
                setSummary(kpiResult.summary)
            }
            if (trendResult.success) {
                setTrend(trendResult.data)
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล")
        } finally {
            setIsLoading(false)
        }
    }, [yearFilter, monthFilter])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    // Summary totals
    const totalDefect = summary?.totalDefectMandays || 0
    const totalMD = summary?.totalMandays || 0
    const overallRate = summary?.averagePercent || 0
    const passCount = summary?.passCount || 0
    const totalProjects = summary?.totalProjects || 0

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-4 w-full bg-slate-50 min-h-screen"}>
            {/* Compact Header Bar */}
            {!embedded && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    {/* Top: Title + Score + Filters */}
                    <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-rose-100 rounded-lg">
                                <Bug size={18} className="text-rose-600" />
                            </div>
                            <h1 className="text-lg font-bold text-slate-800">Defect Ratio</h1>
                        </div>

                        <div className="h-6 w-px bg-slate-200" />

                        {summary && (
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${summary.isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {summary.isPass ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                    {overallRate}%
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>{totalProjects} โปรเจค</span>
                                    <span className="text-emerald-600 font-medium">{passCount} ผ่าน</span>
                                    <span className="text-rose-600 font-medium">{summary.failCount} เกิน</span>
                                    <span className="text-slate-400">|</span>
                                    <span>Defect: <span className="font-medium text-rose-600">{totalDefect.toFixed(1)}</span>/<span className="text-slate-600">{totalMD.toFixed(1)} MD</span></span>
                                </div>
                            </div>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                            <select
                                value={yearFilter}
                                onChange={(e) => setYearFilter(parseInt(e.target.value))}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm"
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm"
                            >
                                <option value="all">ทั้งปี</option>
                                {MONTHS.map(m => (
                                    <option key={m.value} value={m.value.toString()}>{m.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => fetchData()}
                                disabled={isLoading}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Bottom: Monthly Trend + Target Legend */}
                    <div className="flex items-center gap-3 px-5 py-2.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {MONTHS.map((month) => {
                                const monthData = trend.find((t: any) => t.month === month.value)
                                const isSelected = monthFilter === String(month.value)
                                const hasData = monthData && monthData.project_count > 0
                                const totalDefectMD = monthData?.total_defect || 0
                                const totalMandaysMD = monthData?.total_mandays || 0
                                const ratio = totalMandaysMD > 0 ? (totalDefectMD / totalMandaysMD) * 100 : 0
                                const isPass = ratio <= 15

                                return (
                                    <button
                                        key={month.value}
                                        onClick={() => setMonthFilter(isSelected ? "all" : String(month.value))}
                                        className={`flex-1 rounded-md px-1 py-1 text-center transition-all min-w-0 ${
                                            isSelected
                                                ? 'ring-2 ring-rose-300 border-rose-400 shadow-sm bg-rose-50'
                                                : hasData
                                                    ? (isPass ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-rose-50 hover:bg-rose-100')
                                                    : 'bg-slate-50 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className={`text-[9px] font-medium ${hasData ? (isPass ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>{month.label}</div>
                                        <div className={`text-xs font-bold leading-tight ${hasData ? (isPass ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-300'}`}>
                                            {hasData ? `${ratio.toFixed(1)}%` : "-"}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="h-8 w-px bg-slate-200 shrink-0" />

                        <div className="flex items-center gap-3 text-[10px] shrink-0">
                            <span className="text-emerald-600 font-medium">&lt;=15%: Pass</span>
                            <span className="text-rose-600 font-medium">&gt;15%: Exceed</span>
                            <span className="text-slate-500">(Lower is better)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Project Table ===== */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-pink-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FolderKanban size={18} className="text-rose-600" />
                        รายละเอียดตามโครงการ
                        <span className="text-sm font-normal text-slate-500 ml-2">({data.length} โปรเจค)</span>
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700">โครงการ</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">เดือน</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-700 w-24">Total MD</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-700 w-24">Defect MD</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-700 w-24">Defect %</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-16">ผล</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-500">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-rose-500" />
                                        <div className="text-sm">กำลังโหลด...</div>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-500">
                                        <FolderKanban size={24} className="mx-auto mb-3 text-slate-300" />
                                        <div className="text-sm">ไม่มีข้อมูลโปรเจค</div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, idx) => {
                                    const isPass = row.is_pass === 1
                                    return (
                                        <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${!isPass ? 'bg-rose-50/30' : ''}`}>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditProject(row.project_id)}
                                                        className="font-bold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1"
                                                        title="คลิกเพื่อแก้ไขโครงการ"
                                                    >
                                                        {row.project_code}
                                                        <ExternalLink size={12} className="opacity-50" />
                                                    </button>
                                                    <span className="text-slate-600 truncate max-w-[300px]">{row.project_name}</span>
                                                </div>
                                            </td>
                                            <td className="text-center px-4 py-2.5 text-xs text-slate-500">
                                                {MONTHS[row.month - 1]?.label} {row.year}
                                            </td>
                                            <td className="text-right px-4 py-2.5 text-slate-700 font-medium">
                                                {row.total_mandays?.toFixed(1)}
                                            </td>
                                            <td className="text-right px-4 py-2.5 font-medium">
                                                <span className={row.defect_mandays > 0 ? 'text-rose-600' : 'text-slate-400'}>
                                                    {row.defect_mandays?.toFixed(1)}
                                                </span>
                                            </td>
                                            <td className="text-right px-4 py-2.5">
                                                <span className={`font-bold ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {row.defect_ratio_percent}%
                                                </span>
                                            </td>
                                            <td className="text-center px-4 py-2.5">
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {isPass ? "Pass" : "Exceed"}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                        {/* Summary Row */}
                        {summary && data.length > 0 && (
                            <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                                <tr>
                                    <td className="px-4 py-3 font-bold text-slate-700">รวมทั้งหมด ({data.length} โปรเจค)</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="text-right px-4 py-3 font-bold text-slate-700">{totalMD.toFixed(1)}</td>
                                    <td className="text-right px-4 py-3 font-bold text-rose-600">{totalDefect.toFixed(1)}</td>
                                    <td className="text-right px-4 py-3">
                                        <span className={`text-lg font-black ${summary.isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {overallRate}%
                                        </span>
                                    </td>
                                    <td className="text-center px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${summary.isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {summary.isPass ? "Pass" : "Exceed"}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-600">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Pass (&lt;= 15%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Exceed (&gt; 15%)</span>
                </div>
            </div>

            {/* Edit Project Modal */}
            <ProjectModal
                open={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                mode="edit"
                project={selectedProject}
                onSuccess={() => {
                    setIsEditModalOpen(false)
                    fetchData()
                }}
            />
        </div>
    )
}
