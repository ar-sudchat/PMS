'use client'

import React, { useState, useEffect, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { SuperTable } from "@/components/shared/SuperTable/SuperTable"
import { Plus, Edit, Trash2, CheckCircle2, Clock, X, Search, RefreshCw, AlertCircle, FileText, Users } from "lucide-react"
import { getMeetingMinutesRecords, deleteMeetingMinutesRecord, getMeetingMinutesKPI, getMeetingMinutesKPIByOrganizer, MeetingMinutesRecord, OrganizerKPI, approveAllPendingMeetingMinutes } from "@/lib/actions/meeting-minutes-actions"
import { getActiveEmployees } from "@/lib/actions/employee-actions"
import { MEETING_TYPES } from "@/lib/constants/kpi-record"
import { MeetingMinutesModal } from "@/components/kpi-record/MeetingMinutesModal"
import { toast } from "sonner"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { SmartCombobox } from "@/components/shared/SmartCombobox"
import { getActiveProjects } from "@/lib/actions/project-actions"
import { ApprovalStatusBadge } from "@/components/approval/ApprovalStatusBadge"

interface MeetingMinutesViewProps {
    currentUserId: string
    embedded?: boolean
}

export function MeetingMinutesView({ currentUserId, embedded = false }: MeetingMinutesViewProps) {
    const [data, setData] = useState<MeetingMinutesRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState<MeetingMinutesRecord | undefined>(undefined)
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
    const [summary, setSummary] = useState({ total: 0, on_time: 0, late: 0, pending: 0, late_count: 0, on_time_rate: 0 })
    const [organizerKPIs, setOrganizerKPIs] = useState<OrganizerKPI[]>([])

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [projectFilter, setProjectFilter] = useState<string | null>(null)
    const [organizerFilter, setOrganizerFilter] = useState<string | null>(null)
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [onTimeFilter, setOnTimeFilter] = useState<'all' | 'on_time' | 'late' | 'pending'>('all')
    const [meetingTypeFilter, setMeetingTypeFilter] = useState<string>('')
    const [projects, setProjects] = useState<{ id: string, name: string }[]>([])
    const [employees, setEmployees] = useState<{ id: string, name: string }[]>([])

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            let onTime: boolean | 'all' = 'all'
            if (onTimeFilter === 'on_time') onTime = true
            else if (onTimeFilter === 'late') onTime = false

            const result = await getMeetingMinutesRecords({
                projectId: projectFilter || undefined,
                organizerId: organizerFilter || undefined,
                year: yearFilter,
                onTime: onTime,
                meetingType: meetingTypeFilter || undefined,
                search: searchQuery || undefined,
                page: pagination.page,
                pageSize: pagination.pageSize
            })

            if (result.success && result.data) {
                setData(result.data)
                setPagination(prev => ({
                    ...prev,
                    total: result.total || 0,
                    totalPages: result.totalPages || 0
                }))
            } else {
                toast.error("Failed to load meeting minutes")
            }

            // Fetch summary
            const summaryResult = await getMeetingMinutesKPI(yearFilter, organizerFilter || undefined)
            if (summaryResult.success && summaryResult.data) {
                setSummary(summaryResult.data)
            }

            // Fetch organizer KPIs
            const organizerKPIResult = await getMeetingMinutesKPIByOrganizer(yearFilter)
            if (organizerKPIResult.success && organizerKPIResult.data) {
                setOrganizerKPIs(organizerKPIResult.data)
            }
        } catch (error) {
            toast.error("An error occurred while fetching data")
        } finally {
            setIsLoading(false)
        }
    }, [projectFilter, organizerFilter, yearFilter, onTimeFilter, meetingTypeFilter, searchQuery, pagination.page, pagination.pageSize])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        const loadFilters = async () => {
            const [projectsRes, employeesRes] = await Promise.all([
                getActiveProjects(),
                getActiveEmployees()
            ])
            if (projectsRes.success && projectsRes.data) {
                setProjects(projectsRes.data.map((p: any) => ({ id: p.id, name: `${p.project_code} - ${p.name}` })))
            }
            if (employeesRes.success && employeesRes.data) {
                setEmployees(employeesRes.data.map((e: any) => ({
                    id: e.id,
                    name: e.full_name || e.nickname || e.employee_code
                })))
            }
        }
        loadFilters()
    }, [])

    const handleCreate = () => {
        setSelectedRecord(undefined)
        setIsModalOpen(true)
    }

    const handleEdit = (record: MeetingMinutesRecord) => {
        setSelectedRecord(record)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this record?")) return

        try {
            const result = await deleteMeetingMinutesRecord(id)
            if (result.success) {
                toast.success("Record deleted successfully")
                fetchData()
            } else {
                toast.error(result.error || "Failed to delete")
            }
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    const handleModalClose = () => {
        setIsModalOpen(false)
        fetchData()
    }

    const handleApproveAllPending = async () => {
        try {
            const result = await approveAllPendingMeetingMinutes()
            if (result.success) {
                toast.success(`Approved ${result.count || 0} pending records`)
                fetchData()
            } else {
                toast.error(result.error || 'Failed to approve')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    // Count pending records
    const pendingCount = data.filter(d => (d as any).approval_status === 'PENDING').length

    const clearFilters = () => {
        setSearchQuery('')
        setProjectFilter(null)
        setOrganizerFilter(null)
        setYearFilter(new Date().getFullYear())
        setOnTimeFilter('all')
        setMeetingTypeFilter('')
    }

    const getMeetingTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'Kickoff': 'bg-green-100 text-green-700',
            'Weekly': 'bg-blue-100 text-blue-700',
            'Review': 'bg-purple-100 text-purple-700',
            'UAT': 'bg-orange-100 text-orange-700',
            'GoLive': 'bg-red-100 text-red-700',
            'Internal': 'bg-slate-100 text-slate-700',
            'Customer': 'bg-amber-100 text-amber-700',
            'Other': 'bg-gray-100 text-gray-700',
        }
        return colors[type] || 'bg-gray-100 text-gray-700'
    }

    const columns: ColumnDef<MeetingMinutesRecord>[] = [
        {
            accessorKey: "meeting_date",
            header: "Date & Time",
            size: 150,
            cell: ({ row }) => (
                <div className="text-sm">
                    <div className="font-medium text-slate-800">
                        {format(new Date(row.original.meeting_date), 'd MMM yyyy', { locale: th })}
                    </div>
                    <div className="text-xs text-slate-500">
                        {format(new Date(row.original.meeting_date), 'HH:mm')} น.
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "project_code",
            header: "Project",
            size: 200,
            cell: ({ row }) => (
                row.original.project_code ? (
                    <div>
                        <div className="font-medium text-slate-800">{row.original.project_code}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[180px]">{row.original.project_name}</div>
                    </div>
                ) : (
                    <span className="text-xs text-slate-400 italic">Internal</span>
                )
            ),
        },
        {
            accessorKey: "meeting_type",
            header: "Type",
            size: 100,
            cell: ({ row }) => (
                <span className={`px-2 py-1 text-xs font-medium rounded ${getMeetingTypeColor(row.original.meeting_type)}`}>
                    {row.original.meeting_type}
                </span>
            ),
        },
        {
            accessorKey: "meeting_title",
            header: "Title",
            size: 300,
            cell: ({ row }) => (
                <span className="text-sm text-slate-700 truncate block max-w-[280px]" title={row.original.meeting_title}>
                    {row.original.meeting_title}
                </span>
            ),
        },
        {
            accessorKey: "organized_by_name",
            header: "ผู้จัดประชุม",
            size: 130,
            cell: ({ row }) => (
                <span className="text-sm font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    {row.original.organized_by_name || '-'}
                </span>
            ),
        },
        {
            accessorKey: "attendees",
            header: "Attendees",
            size: 100,
            cell: ({ row }) => (
                <div className="flex items-center gap-1 text-slate-500">
                    <Users size={14} />
                    <span className="text-xs truncate max-w-[70px]" title={row.original.attendees || ''}>
                        {row.original.attendees || '-'}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "is_on_time",
            header: "MoM Status",
            size: 130,
            cell: ({ row }) => {
                const isOnTime = row.original.is_on_time
                const hoursToSend = row.original.hours_to_send
                const momSentAt = row.original.mom_sent_at

                if (!momSentAt) {
                    return (
                        <span className="flex items-center gap-1 text-slate-400">
                            <Clock size={16} />
                            <span className="text-xs">Pending</span>
                        </span>
                    )
                }

                return isOnTime ? (
                    <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 size={16} />
                            <span className="text-xs font-medium">On Time</span>
                        </span>
                        {hoursToSend !== null && (
                            <span className="text-xs text-slate-400">{hoursToSend.toFixed(1)}h</span>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-red-600">
                            <AlertCircle size={16} />
                            <span className="text-xs font-medium">Late</span>
                        </span>
                        {hoursToSend !== null && (
                            <span className="text-xs text-red-400">{hoursToSend.toFixed(1)}h</span>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: "sent_by_name",
            header: "Sent By",
            size: 120,
            cell: ({ row }) => (
                <span className="text-sm text-slate-600">{row.original.sent_by_name || '-'}</span>
            ),
        },
        {
            accessorKey: "mom_file_path",
            header: "File",
            size: 60,
            cell: ({ row }) => (
                row.original.mom_file_path ? (
                    <a
                        href={row.original.mom_file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                        title={row.original.mom_file_path}
                    >
                        <FileText size={18} />
                    </a>
                ) : (
                    <span className="text-slate-300">-</span>
                )
            ),
        },
        {
            accessorKey: "approval_status",
            header: "Approval",
            size: 100,
            cell: ({ row }) => {
                const record = row.original as any
                const status = record.approval_status || 'DRAFT'
                return <ApprovalStatusBadge status={status} size="sm" />
            },
        },
        {
            id: "actions",
            header: "",
            size: 100,
            cell: ({ row }) => {
                const record = row.original as any
                const status = record.approval_status || 'DRAFT'
                return (
                    <div className="flex items-center gap-1 justify-end">
                        <button
                            onClick={() => handleEdit(record)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDelete(record.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )
            },
        },
    ]

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    return (
        <div className={embedded ? "p-4" : "p-6 w-full"}>
            {/* Page Header */}
            < div className={`flex items-center justify-between ${embedded ? 'mb-3' : 'mb-6'}`
            }>
                {!embedded && (
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Meeting Minutes Records</h1>
                        <p className="text-slate-500 text-sm mt-1">Track MoM submission - Target: ≤ 24 hours, Late ≤ 3/year</p>
                    </div>
                )}
                {embedded && <div className="text-sm text-slate-500">Target: ≤ 24 hours, Late ≤ 3/year</div>}
                <div className="flex items-center gap-2">
                    {pendingCount > 0 && (
                        <button
                            onClick={handleApproveAllPending}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm shadow-green-600/20 font-medium text-sm"
                        >
                            <CheckCircle2 size={16} />
                            Approve All ({pendingCount})
                        </button>
                    )}
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 font-medium text-sm"
                    >
                        <Plus size={16} />
                        New Meeting
                    </button>
                </div>
            </div >

            {/* KPI Summary Cards */}
            < div className="grid grid-cols-5 gap-4 mb-6" >
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-slate-800">{summary.total}</div>
                    <div className="text-sm text-slate-500">Total Meetings</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-green-600">{summary.on_time}</div>
                    <div className="text-sm text-slate-500">On Time</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className={`text-2xl font-bold ${summary.late_count <= 3 ? 'text-amber-600' : 'text-red-600'}`}>
                        {summary.late_count}
                    </div>
                    <div className="text-sm text-slate-500">Late (Target: ≤3)</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-slate-500">{summary.pending}</div>
                    <div className="text-sm text-slate-500">Pending</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className={`text-2xl font-bold ${summary.on_time_rate >= 95 ? 'text-green-600' : summary.on_time_rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                        {summary.on_time_rate}%
                    </div>
                    <div className="text-sm text-slate-500">On Time Rate</div>
                </div>
            </div >

            {/* Filters */}
            < div className="bg-white border border-slate-200 rounded-xl p-4 mb-4" >
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search project, title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>

                    {/* Year Filter */}
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(parseInt(e.target.value))}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    {/* On Time Filter */}
                    <select
                        value={onTimeFilter}
                        onChange={(e) => setOnTimeFilter(e.target.value as any)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                    >
                        <option value="all">All Status</option>
                        <option value="on_time">On Time Only</option>
                        <option value="late">Late Only</option>
                        <option value="pending">Pending Only</option>
                    </select>

                    {/* Meeting Type Filter */}
                    <select
                        value={meetingTypeFilter}
                        onChange={(e) => setMeetingTypeFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                    >
                        <option value="">All Types</option>
                        {MEETING_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>

                    {/* Project Filter */}
                    <div className="min-w-[200px]">
                        <SmartCombobox
                            options={projects.map(p => ({ value: p.id, label: p.name }))}
                            value={projectFilter ? { value: projectFilter, label: projects.find(p => p.id === projectFilter)?.name || '' } : null}
                            onChange={(opt) => setProjectFilter(opt?.value?.toString() || null)}
                            placeholder="All Projects"
                        />
                    </div>

                    {/* Organizer Filter */}
                    <div className="min-w-[180px]">
                        <SmartCombobox
                            options={employees.map(e => ({ value: e.id, label: e.name }))}
                            value={organizerFilter ? { value: organizerFilter, label: employees.find(e => e.id === organizerFilter)?.name || '' } : null}
                            onChange={(opt) => setOrganizerFilter(opt?.value?.toString() || null)}
                            placeholder="ผู้จัดประชุม"
                        />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchData()}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>

                    {/* Clear Filters */}
                    {(searchQuery || projectFilter || organizerFilter || onTimeFilter !== 'all' || meetingTypeFilter) && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <X size={16} />
                            Clear
                        </button>
                    )}
                </div>
            </div >

            {/* Table */}
            < div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm" >
                <SuperTable
                    data={data}
                    columns={columns}
                    isLoading={isLoading}
                    enableGlobalFilter={false}
                />

                {/* Pagination */}
                {
                    pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                            <div className="text-sm text-slate-500">
                                Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    disabled={pagination.page === 1}
                                    className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-slate-600">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )
                }
            </div >

            {/* KPI Summary by Organizer */}
            {
                organizerKPIs.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">KPI Summary by Organizer ({yearFilter})</h3>
                            <span className="text-sm text-slate-500">Target: ส่งช้าไม่เกิน 3 ครั้ง/ปี</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {organizerKPIs.map((kpi) => (
                                <div
                                    key={kpi.organizer_id}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${kpi.is_pass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-800">{kpi.organizer_name}</div>
                                        <div className="text-xs text-slate-500">
                                            {kpi.total_meetings} meetings | <span className="text-green-600">{kpi.on_time_count} On-time</span> | <span className="text-red-600">{kpi.late_count} Late</span>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${kpi.is_pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {kpi.is_pass ? (
                                            <>
                                                <CheckCircle2 size={14} />
                                                Pass
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle size={14} />
                                                Fail
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Modal */}
            <MeetingMinutesModal
                open={isModalOpen}
                onClose={handleModalClose}
                record={selectedRecord}
                currentUserId={currentUserId}
            />
        </div >
    )
}
