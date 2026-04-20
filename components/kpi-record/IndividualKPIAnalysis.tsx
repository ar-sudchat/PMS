'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { SuperTable } from '@/components/shared/SuperTable/SuperTable'
import { SmartCombobox, type Option } from '@/components/shared/SmartCombobox'
import {
    getIndividualKPIAnalysis,
    getPersonalKPIDetail,
    EmployeeOption,
    KPISummaryItem,
    ProjectKPIDetail,
    MonthlyKPIRow,
    IndividualKPIData,
    PersonalKPIDetailResult,
    PersonalKPIDetailRow
} from '@/lib/actions/kpi-individual-actions'
import {
    Target, CheckCircle2, XCircle, RefreshCw, User, TrendingUp,
    AlertTriangle, Award, ExternalLink, ChevronRight, BarChart3, Shield, FileText,
    Info, Calendar, ArrowUpRight, X, Loader2
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// ============================================
// Constants
// ============================================

const MONTHS = [
    { value: 0, label: 'ทั้งปี' },
    { value: 1, label: 'ม.ค.' }, { value: 2, label: 'ก.พ.' }, { value: 3, label: 'มี.ค.' },
    { value: 4, label: 'เม.ย.' }, { value: 5, label: 'พ.ค.' }, { value: 6, label: 'มิ.ย.' },
    { value: 7, label: 'ก.ค.' }, { value: 8, label: 'ส.ค.' }, { value: 9, label: 'ก.ย.' },
    { value: 10, label: 'ต.ค.' }, { value: 11, label: 'พ.ย.' }, { value: 12, label: 'ธ.ค.' },
]

const MONTH_NAMES = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

const KPI_ICONS: Record<string, React.ReactNode> = {
    'Time to Delivery': <TrendingUp size={16} />,
    'Man-day Control': <BarChart3 size={16} />,
    'Defect Ratio': <AlertTriangle size={16} />,
    'Post Go-live Rework': <Shield size={16} />,
    'Deploy Success Rate': <CheckCircle2 size={16} />,
    'Pre-deploy Backup': <Shield size={16} />,
    'Issue Clearing': <Target size={16} />,
    'On-time Meeting Minutes': <FileText size={16} />,
    'Required Docs On-time': <FileText size={16} />,
    'Contact Customer': <User size={16} />,
    'Manday Assessment': <BarChart3 size={16} />,
}

// Links to detail pages for each KPI
const KPI_DETAIL_LINKS: Record<string, string> = {
    'Time to Delivery': '/kpi-record/time-to-delivery',
    'Man-day Control': '/kpi-record/manday-control',
    'Defect Ratio': '/kpi-record/defect-ratio',
    'Post Go-live Rework': '/kpi-record/post-golive-rework',
    'Deploy Success Rate': '/kpi-record/deploy-success',
    'Pre-deploy Backup': '/kpi-record/deploy-backup',
    'Issue Clearing': '/kpi-record/issue-clearing',
    'On-time Meeting Minutes': '/kpi-record/meeting-minutes',
    'Required Docs On-time': '/kpi-record/docs-ontime',
    'Contact Customer': '/kpi-record/contact-customer',
    'Manday Assessment': '/kpi-record/manday-assessment',
}

const POSITION_COLORS: Record<string, string> = {
    'PM': 'from-blue-500 to-indigo-600',
    'PG': 'from-emerald-500 to-teal-600',
    'SA': 'from-purple-500 to-violet-600',
    'BA': 'from-amber-500 to-orange-600',
}

// ============================================
// Component
// ============================================

interface IndividualKPIAnalysisProps {
    initialEmployees: EmployeeOption[]
}

export default function IndividualKPIAnalysis({ initialEmployees }: IndividualKPIAnalysisProps) {
    const [employees] = useState<EmployeeOption[]>(initialEmployees)
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [monthFilter, setMonthFilter] = useState<number>(0) // 0 = ทั้งปี
    const [data, setData] = useState<IndividualKPIData | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [selectedKPI, setSelectedKPI] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'summary' | 'monthly' | 'projects'>('summary')
    const [expandedKPI, setExpandedKPI] = useState<string | null>(null)
    // Personal KPI Detail Modal
    const [modalKPI, setModalKPI] = useState<PersonalKPIDetailResult | null>(null)
    const [modalLoading, setModalLoading] = useState(false)

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    const fetchData = useCallback(async () => {
        if (!selectedEmployeeId) return
        setIsLoading(true)
        try {
            const result = await getIndividualKPIAnalysis(
                selectedEmployeeId, yearFilter,
                monthFilter > 0 ? monthFilter : undefined
            )
            setData(result)
            setSelectedKPI(null)
        } catch {
            toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
        } finally {
            setIsLoading(false)
        }
    }, [selectedEmployeeId, yearFilter, monthFilter])

    useEffect(() => {
        if (selectedEmployeeId) fetchData()
    }, [fetchData, selectedEmployeeId])

    const openPersonalKPIDetail = useCallback(async (kpiName: string) => {
        if (!selectedEmployeeId) return
        setModalLoading(true)
        try {
            const result = await getPersonalKPIDetail(
                selectedEmployeeId, kpiName, yearFilter,
                monthFilter > 0 ? monthFilter : undefined
            )
            setModalKPI(result)
        } catch {
            toast.error('ไม่สามารถโหลดรายละเอียดได้')
        } finally {
            setModalLoading(false)
        }
    }, [selectedEmployeeId, yearFilter, monthFilter])

    // Filter project details by selected KPI
    const filteredProjects = useMemo(() => {
        if (!data) return []
        if (!selectedKPI) return data.projectDetails
        return data.projectDetails.filter(p => p.kpi_name === selectedKPI)
    }, [data, selectedKPI])

    // Group monthly breakdown by KPI name for pivot table
    const monthlyPivot = useMemo(() => {
        if (!data || data.monthlyBreakdown.length === 0) return null
        const kpiNames = [...new Set(data.monthlyBreakdown.map(r => r.kpi_name))]
        const months = [...new Set(data.monthlyBreakdown.map(r => r.month))].sort((a, b) => a - b)
        return { kpiNames, months, rows: data.monthlyBreakdown }
    }, [data])

    // SuperTable columns for project drill-down
    const projectColumns: ColumnDef<ProjectKPIDetail, any>[] = useMemo(() => [
        {
            id: 'row_number', header: '#', size: 50, enableSorting: false,
            cell: ({ row, table }) => {
                const idx = table.getRowModel().rows.findIndex(r => r.id === row.id)
                const { pageIndex, pageSize } = table.getState().pagination
                return <span className="text-sm text-slate-400 font-medium">{pageIndex * pageSize + idx + 1}</span>
            },
        },
        {
            accessorKey: 'project_code', header: 'รหัส', size: 110,
            cell: ({ row }) => (
                <span className="font-semibold text-indigo-700 flex items-center gap-1">
                    {row.original.project_code} <ExternalLink size={11} className="opacity-40" />
                </span>
            ),
        },
        {
            accessorKey: 'project_name', header: 'ชื่อโครงการ', size: 240,
            cell: ({ row }) => <span className="text-sm text-slate-700 truncate block max-w-[240px]" title={row.original.project_name}>{row.original.project_name}</span>,
        },
        {
            accessorKey: 'kpi_name', header: 'KPI', size: 150,
            cell: ({ row }) => <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">{row.original.kpi_name}</span>,
        },
        {
            accessorKey: 'actual_value', header: 'ค่าจริง', size: 85,
            cell: ({ row }) => {
                const pass = row.original.is_pass
                return <span className={`font-bold text-sm ${pass ? 'text-emerald-600' : 'text-rose-600'}`}>{row.original.actual_value != null ? `${row.original.actual_value}%` : '-'}</span>
            },
        },
        {
            accessorKey: 'target_value', header: 'เป้า', size: 65,
            cell: ({ row }) => <span className="text-sm text-slate-500">{row.original.target_value}%</span>,
        },
        {
            id: 'status', header: 'สถานะ', size: 80,
            cell: ({ row }) => row.original.is_pass
                ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={12} /> ผ่าน</span>
                : <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full"><XCircle size={12} /> ไม่ผ่าน</span>,
        },
        {
            accessorKey: 'detail_1_value', header: 'รายละเอียด', size: 120,
            cell: ({ row }) => <div className="text-xs"><span className="text-slate-400">{row.original.detail_1_label}: </span><span className="text-slate-700 font-medium">{row.original.detail_1_value}</span></div>,
        },
        {
            accessorKey: 'detail_2_value', header: '', size: 130,
            cell: ({ row }) => <div className="text-xs"><span className="text-slate-400">{row.original.detail_2_label}: </span><span className="text-slate-700 font-medium">{row.original.detail_2_value}</span></div>,
        },
        {
            accessorKey: 'remark', header: 'หมายเหตุ', size: 180,
            cell: ({ row }) => row.original.remark
                ? <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{row.original.remark}</span>
                : <span className="text-slate-300">-</span>,
        },
    ], [])

    const employee = data?.employee
    const posColor = employee ? (POSITION_COLORS[employee.position] || 'from-slate-500 to-slate-600') : ''

    return (
        <div className="p-6 space-y-5 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg"><Target className="w-6 h-6 text-indigo-600" /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">วิเคราะห์ KPI รายบุคคล</h1>
                        <p className="text-sm text-slate-500">เลือกพนักงานเพื่อวิเคราะห์ KPI สำหรับประชุมประจำเดือน</p>
                    </div>
                </div>
                {selectedEmployeeId && (
                    <button onClick={fetchData} disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> รีเฟรช
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[280px]">
                        <label className="block text-xs font-medium text-slate-500 mb-1">เลือกพนักงาน</label>
                        <SmartCombobox
                            options={employees.map(e => ({ value: e.id, label: `${e.name} (${e.position})` }))}
                            value={selectedEmployeeId ? { value: selectedEmployeeId, label: employees.find(e => e.id === selectedEmployeeId)?.name || '' } : null}
                            onChange={(opt: Option | null) => setSelectedEmployeeId(opt ? String(opt.value) : null)}
                            placeholder="ค้นหาพนักงาน..."
                        />
                    </div>
                    <div className="w-28">
                        <label className="block text-xs font-medium text-slate-500 mb-1">ปี</label>
                        <select value={yearFilter} onChange={e => setYearFilter(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="w-28">
                        <label className="block text-xs font-medium text-slate-500 mb-1">เดือน</label>
                        <select value={monthFilter} onChange={e => setMonthFilter(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Empty state */}
            {!selectedEmployeeId && (
                <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                    <User size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-500">กรุณาเลือกพนักงาน</h3>
                    <p className="text-sm text-slate-400 mt-1">เลือกพนักงานด้านบนเพื่อเริ่มวิเคราะห์ KPI</p>
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                    <RefreshCw size={32} className="mx-auto text-indigo-400 animate-spin mb-4" />
                    <p className="text-sm text-slate-500">กำลังโหลดข้อมูล KPI...</p>
                </div>
            )}

            {/* Results */}
            {!isLoading && data && employee && (
                <>
                    {/* Employee Profile Card */}
                    <div className={`relative overflow-hidden bg-gradient-to-br ${posColor} rounded-2xl p-5 text-white shadow-lg`}>
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                                    {employee.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{employee.name}</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white/20">{employee.position}</span>
                                        <span className="text-white/70 text-sm">{employee.department}</span>
                                        <span className="text-white/50 text-xs">({employee.employee_code})</span>
                                    </div>
                                    <p className="text-white/60 text-xs mt-1">
                                        {monthFilter > 0 ? MONTH_NAMES[monthFilter - 1] : 'ทั้งปี'} {yearFilter} — KPI ตาม Position: {employee.position}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-black">
                                    {data.overallScore}<span className="text-lg font-medium opacity-70">%</span>
                                </div>
                                <div className="text-white/70 text-sm">ผ่าน {data.passCount}/{data.totalCount} ตัว</div>
                                {data.failCount > 0 && (
                                    <div className="text-yellow-200 text-xs mt-0.5">ไม่ผ่าน {data.failCount} ตัว</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1 w-fit">
                        {(['summary', 'monthly', 'projects'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                                {tab === 'summary' ? 'สรุป KPI' : tab === 'monthly' ? 'รายเดือน' : 'รายโครงการ'}
                            </button>
                        ))}
                    </div>

                    {/* ====== TAB: Summary ====== */}
                    {activeTab === 'summary' && (
                        <div className="space-y-4">
                            {/* Department KPIs */}
                            {data.kpiSummary.filter(k => k.type === 'department').length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">KPI ระดับหน่วยงาน (เฉพาะโครงการที่รับผิดชอบ)</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                                        {data.kpiSummary.filter(k => k.type === 'department').map(kpi => (
                                            <KPICard key={kpi.kpi_name} kpi={kpi} expanded={expandedKPI === kpi.kpi_name}
                                                onToggleExpand={() => setExpandedKPI(expandedKPI === kpi.kpi_name ? null : kpi.kpi_name)}
                                                onFilter={() => { setSelectedKPI(selectedKPI === kpi.kpi_name ? null : kpi.kpi_name); setActiveTab('projects') }}
                                                hasDetails={data.projectDetails.some(p => p.kpi_name === kpi.kpi_name)}
                                                detailLink={KPI_DETAIL_LINKS[kpi.kpi_name]} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Personal KPIs */}
                            {data.kpiSummary.filter(k => k.type === 'personal').length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">KPI ส่วนบุคคล (เฉพาะพนักงานคนนี้)</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                                        {data.kpiSummary.filter(k => k.type === 'personal').map(kpi => (
                                            <KPICard key={kpi.kpi_name} kpi={kpi} expanded={expandedKPI === kpi.kpi_name}
                                                onToggleExpand={() => setExpandedKPI(expandedKPI === kpi.kpi_name ? null : kpi.kpi_name)}
                                                onFilter={() => openPersonalKPIDetail(kpi.kpi_name)} hasDetails={!kpi.no_data}
                                                detailLink={KPI_DETAIL_LINKS[kpi.kpi_name]}
                                                personalDetailLabel="ดูรายละเอียด" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Expanded KPI Description */}
                            {expandedKPI && (() => {
                                const kpi = data.kpiSummary.find(k => k.kpi_name === expandedKPI)
                                if (!kpi) return null
                                return (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <Info size={18} className="text-indigo-600 mt-0.5 shrink-0" />
                                            <div>
                                                <h4 className="font-bold text-indigo-900 text-sm">{kpi.kpi_name}</h4>
                                                <p className="text-sm text-indigo-800 mt-1">{kpi.description}</p>
                                                <p className="text-xs text-indigo-600 mt-2 font-mono bg-indigo-100 px-2 py-1 rounded">{kpi.formula}</p>
                                                {kpi.raw_detail && (
                                                    <p className="text-xs text-indigo-700 mt-2 font-medium">ข้อมูลจริง: {kpi.raw_detail}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    )}

                    {/* ====== TAB: Monthly ====== */}
                    {activeTab === 'monthly' && (
                        <div>
                            {monthlyPivot && monthlyPivot.months.length > 0 ? (
                                <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 border-b">
                                                <th className="text-left px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 min-w-[200px]">KPI</th>
                                                {monthlyPivot.months.map(m => (
                                                    <th key={m} className="text-center px-3 py-3 font-semibold text-slate-600 min-w-[80px]">{MONTH_NAMES[m - 1]}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthlyPivot.kpiNames.map(kpiName => {
                                                const kpiMeta = data.kpiSummary.find(k => k.kpi_name === kpiName)
                                                return (
                                                    <tr key={kpiName} className="border-b hover:bg-slate-50">
                                                        <td className="px-4 py-3 sticky left-0 bg-white z-10">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`p-1 rounded ${kpiMeta?.is_pass === false ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                    {KPI_ICONS[kpiName] || <Target size={14} />}
                                                                </span>
                                                                <div>
                                                                    <div className="font-medium text-slate-800 text-xs">{kpiName}</div>
                                                                    <div className="text-[10px] text-slate-400">เป้า: {kpiMeta?.target_label}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {monthlyPivot.months.map(m => {
                                                            const cell = monthlyPivot.rows.find(r => r.kpi_name === kpiName && r.month === m)
                                                            if (!cell) return <td key={m} className="text-center px-3 py-3 text-slate-300">-</td>
                                                            return (
                                                                <td key={m} className="text-center px-3 py-3">
                                                                    <div className={`font-bold text-sm ${cell.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                        {cell.actual_value !== null ? (kpiName === 'On-time Meeting Minutes' ? cell.actual_value : `${cell.actual_value}%`) : '-'}
                                                                    </div>
                                                                    {cell.raw_detail && (
                                                                        <div className="text-[10px] text-slate-400">{cell.raw_detail}</div>
                                                                    )}
                                                                    <div className="mt-0.5">
                                                                        {cell.is_pass
                                                                            ? <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                                                                            : <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
                                                                        }
                                                                    </div>
                                                                </td>
                                                            )
                                                        })}
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                                    <Calendar size={36} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm text-slate-500">
                                        {monthFilter > 0 ? 'เลือก "ทั้งปี" เพื่อดูข้อมูลรายเดือน' : 'ไม่มีข้อมูลรายเดือน'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ====== TAB: Projects ====== */}
                    {activeTab === 'projects' && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <h3 className="text-lg font-bold text-slate-800">รายละเอียดระดับโครงการ</h3>
                                {selectedKPI && (
                                    <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium flex items-center gap-1">
                                        {selectedKPI}
                                        <button onClick={() => setSelectedKPI(null)} className="ml-1 hover:text-indigo-900">✕</button>
                                    </span>
                                )}
                                <span className="text-xs text-slate-400">
                                    ({filteredProjects.length} โครงการ, ไม่ผ่าน {filteredProjects.filter(p => !p.is_pass).length})
                                </span>
                            </div>
                            {filteredProjects.length > 0 ? (
                                <SuperTable
                                    data={filteredProjects}
                                    columns={projectColumns}
                                    enablePagination={true}
                                    pageSize={15}
                                    pageSizeOptions={[10, 15, 25, 50]}
                                    enableGlobalFilter={true}
                                    searchPlaceholder="ค้นหาโครงการ..."
                                    enableSorting={true}
                                    defaultSorting={[{ id: 'actual_value', desc: false }]}
                                    size="sm"
                                    emptyMessage="ไม่พบข้อมูลโครงการ"
                                />
                            ) : (
                                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                                    <Award size={36} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm text-slate-500">ไม่มีข้อมูลโครงการ — Department KPI จะแสดงเฉพาะโครงการที่พนักงานเป็น Owner/PM</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ====== Personal KPI Detail Modal ====== */}
            {(modalKPI || modalLoading) && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setModalKPI(null); setModalLoading(false) }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        {modalLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 size={32} className="animate-spin text-indigo-500 mb-3" />
                                <p className="text-sm text-slate-500">กำลังโหลดรายละเอียด...</p>
                            </div>
                        ) : modalKPI && (
                            <>
                                {/* Modal Header */}
                                <div className="flex items-center justify-between p-5 border-b">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">{modalKPI.kpi_name}</h3>
                                        <p className="text-sm text-slate-500 mt-0.5">{modalKPI.description}</p>
                                    </div>
                                    <button onClick={() => setModalKPI(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                                        <X size={20} className="text-slate-400" />
                                    </button>
                                </div>

                                {/* Modal Summary */}
                                <div className="px-5 py-3 bg-slate-50 border-b flex items-center gap-6 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-500">ค่าจริง:</span>
                                        <span className={`text-lg font-bold ${modalKPI.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {modalKPI.actual_value !== null ? (modalKPI.kpi_name === 'On-time Meeting Minutes' ? `${modalKPI.actual_value} ครั้ง` : `${modalKPI.actual_value}%`) : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-500">เป้า:</span>
                                        <span className="text-sm font-medium text-slate-700">{modalKPI.target_label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {modalKPI.is_pass
                                            ? <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full"><CheckCircle2 size={14} /> ผ่าน</span>
                                            : <span className="inline-flex items-center gap-1 text-sm font-medium text-rose-700 bg-rose-100 px-3 py-1 rounded-full"><XCircle size={14} /> ไม่ผ่าน</span>
                                        }
                                    </div>
                                    <div className="flex items-center gap-4 text-sm ml-auto">
                                        <span className="text-slate-500">ทั้งหมด <span className="font-bold text-slate-700">{modalKPI.summary.total}</span></span>
                                        <span className="text-emerald-600">ผ่าน <span className="font-bold">{modalKPI.summary.pass}</span></span>
                                        <span className="text-rose-600">ไม่ผ่าน <span className="font-bold">{modalKPI.summary.fail}</span></span>
                                    </div>
                                </div>

                                {/* Modal Formula */}
                                <div className="px-5 py-2 bg-indigo-50 border-b">
                                    <p className="text-xs text-indigo-600 font-mono">{modalKPI.formula}</p>
                                </div>

                                {/* Modal Table */}
                                <div className="flex-1 overflow-auto p-5">
                                    {modalKPI.rows.length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-slate-50">
                                                    <th className="text-left px-3 py-2 font-semibold text-slate-600 w-10">#</th>
                                                    <th className="text-left px-3 py-2 font-semibold text-slate-600 w-28">วันที่</th>
                                                    {modalKPI.rows.some(r => r.project_code) && (
                                                        <th className="text-left px-3 py-2 font-semibold text-slate-600 w-28">โครงการ</th>
                                                    )}
                                                    <th className="text-left px-3 py-2 font-semibold text-slate-600">รายการ</th>
                                                    <th className="text-left px-3 py-2 font-semibold text-slate-600 w-24">สถานะ</th>
                                                    <th className="text-left px-3 py-2 font-semibold text-slate-600">รายละเอียด</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {modalKPI.rows.map((row, idx) => (
                                                    <tr key={row.id} className={`border-b hover:bg-slate-50 ${!row.is_pass ? 'bg-rose-50/50' : ''}`}>
                                                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                                        <td className="px-3 py-2 text-slate-600 text-xs">
                                                            {row.date ? new Date(row.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                                                        </td>
                                                        {modalKPI.rows.some(r => r.project_code) && (
                                                            <td className="px-3 py-2">
                                                                {row.project_code && (
                                                                    <span className="text-xs font-medium text-indigo-700">{row.project_code}</span>
                                                                )}
                                                            </td>
                                                        )}
                                                        <td className="px-3 py-2 text-slate-800 text-xs max-w-[250px] truncate" title={row.title}>{row.title}</td>
                                                        <td className="px-3 py-2">
                                                            {row.is_pass
                                                                ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} />{row.status}</span>
                                                                : <span className="inline-flex items-center gap-1 text-xs text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full"><XCircle size={11} />{row.status}</span>
                                                            }
                                                        </td>
                                                        <td className="px-3 py-2 text-xs text-slate-500">{row.detail}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="text-center py-10 text-slate-400">
                                            <p>ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================
// KPI Card Sub-component
// ============================================

function KPICard({ kpi, expanded, onToggleExpand, onFilter, hasDetails, detailLink, personalDetailLabel }: {
    kpi: KPISummaryItem; expanded: boolean; onToggleExpand: () => void; onFilter: () => void; hasDetails: boolean; detailLink?: string; personalDetailLabel?: string
}) {
    const icon = KPI_ICONS[kpi.kpi_name] || <Target size={16} />

    const getValueDisplay = () => {
        if (kpi.no_data || kpi.actual_value === null) return 'N/A'
        if (kpi.kpi_name === 'On-time Meeting Minutes') return `${kpi.actual_value} ครั้ง`
        return `${kpi.actual_value}%`
    }

    const getBgColor = () => {
        if (kpi.no_data) return 'bg-slate-50 border-slate-200'
        if (expanded) return kpi.is_pass ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200' : 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
        return kpi.is_pass ? 'bg-white border-emerald-200 hover:border-emerald-400' : 'bg-white border-rose-200 hover:border-rose-400'
    }

    const handleCardClick = () => {
        if (hasDetails) {
            onFilter()
        } else if (detailLink) {
            window.location.href = detailLink
        }
    }

    const isClickable = hasDetails || !!detailLink

    return (
        <div
            className={`p-3 rounded-xl border text-left transition-all ${getBgColor()} ${isClickable ? 'cursor-pointer hover:shadow-md' : ''}`}
            onClick={isClickable ? handleCardClick : undefined}
        >
            <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-lg ${kpi.no_data ? 'bg-slate-100 text-slate-400' : kpi.is_pass ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {icon}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onToggleExpand() }} className="text-slate-400 hover:text-indigo-600 p-0.5 rounded" title="ดูคำอธิบาย/สูตร">
                        <Info size={14} />
                    </button>
                    {!kpi.no_data && (kpi.is_pass
                        ? <CheckCircle2 size={16} className="text-emerald-500" />
                        : <XCircle size={16} className="text-rose-500" />
                    )}
                </div>
            </div>
            <div className="text-xs text-slate-500 truncate mb-1" title={kpi.kpi_name}>{kpi.kpi_name}</div>
            <div className={`text-lg font-bold ${kpi.no_data ? 'text-slate-300' : kpi.is_pass ? 'text-emerald-700' : 'text-rose-700'}`}>
                {getValueDisplay()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">เป้า: {kpi.target_label}</div>
            {kpi.raw_detail && <div className="text-[10px] text-slate-500 mt-1 truncate" title={kpi.raw_detail}>{kpi.raw_detail}</div>}
            {isClickable && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-indigo-500">
                    {personalDetailLabel ? <>{personalDetailLabel} <ChevronRight size={10} /></> : hasDetails ? <>ดูรายโครงการ <ChevronRight size={10} /></> : <>ดูรายละเอียด <ArrowUpRight size={10} /></>}
                </div>
            )}
        </div>
    )
}
