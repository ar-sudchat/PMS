'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Building, Target, ChevronDown, Check } from 'lucide-react'
import { getProjectFilterOptions, getProjects, ProjectFilters } from '@/lib/actions/project-actions'
import { SuperTable } from '@/components/shared/SuperTable/SuperTable'
import { ProjectModal } from '@/components/modals/ProjectModal'
import { ProjectDetailModal } from '@/components/modals/ProjectDetailModal'

// Types
interface FilterOptions {
    customers: { id: string; code: string; name: string }[]
    managers: { id: string; name: string; name_th: string }[]
    owners: { id: string; name: string; name_th: string; position_code: string }[]
    years: number[]
    statuses: { id: string; code: string; name: string; color: string }[]
    milestones: { id: string; code: string; name: string; color: string }[]
}

interface Filters {
    year: number | ''
    customerId: string
    managerId: string
    ownerId: string
    statusId: string
    milestoneIds: string[]  // Multi-select
    search: string
}

export default function ProjectsPage() {
    // Filter Options
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        customers: [],
        managers: [],
        owners: [],
        years: [],
        statuses: [],
        milestones: []
    })

    // Filters
    const [filters, setFilters] = useState<Filters>({
        year: new Date().getFullYear(),
        customerId: '',
        managerId: '',
        ownerId: '',
        statusId: '',
        milestoneIds: [],
        search: ''
    })

    // Data
    const [projects, setProjects] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<any>(null)
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

    // Milestone Multi-select dropdown
    const [isMilestoneDropdownOpen, setIsMilestoneDropdownOpen] = useState(false)

    // Load filter options
    useEffect(() => {
        loadFilterOptions()
    }, [])

    // Load projects when filters change
    useEffect(() => {
        loadProjects()
    }, [filters])

    const loadFilterOptions = async () => {
        const result = await getProjectFilterOptions()
        if (result.success && result.data) {
            setFilterOptions(result.data)
        }
    }

    const loadProjects = async () => {
        setIsLoading(true)
        const result = await getProjects({
            year: filters.year || undefined,
            customerId: filters.customerId || undefined,
            managerId: filters.managerId || undefined,
            ownerId: filters.ownerId || undefined,
            statusId: filters.statusId || undefined,
            milestoneIds: filters.milestoneIds.length > 0 ? filters.milestoneIds : undefined,
            search: filters.search || undefined
        })
        if (result.success) {
            setProjects(result.data || [])
        }
        setIsLoading(false)
    }

    const handleFilterChange = (key: keyof Filters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    // Toggle milestone in multi-select
    const toggleMilestone = (milestoneId: string) => {
        setFilters(prev => ({
            ...prev,
            milestoneIds: prev.milestoneIds.includes(milestoneId)
                ? prev.milestoneIds.filter(id => id !== milestoneId)
                : [...prev.milestoneIds, milestoneId]
        }))
    }

    // Row click → Detail Modal
    const handleRowClick = (project: any) => {
        setSelectedProjectId(project.id)
        setIsDetailModalOpen(true)
    }

    // Edit from Detail Modal
    const handleEditProject = (project: any) => {
        setSelectedProject(project)
        setIsDetailModalOpen(false)
        setIsEditModalOpen(true)
    }

    // Table columns
    const columns = [
        {
            accessorKey: 'name',
            header: 'Project',
            cell: ({ row }: any) => (
                <div className="min-w-[200px] max-w-[280px]">
                    <p className="font-medium text-slate-900 truncate" title={row.original.name}>
                        {row.original.name}
                    </p>
                    <p className="text-xs text-slate-500">{row.original.project_code}</p>
                </div>
            )
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer',
            cell: ({ row }: any) => (
                <div className="flex items-center gap-2 min-w-[150px] max-w-[200px]">
                    <div className="w-7 h-7 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Building className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-sm truncate" title={row.original.customer_name}>
                        {row.original.customer_name || '-'}
                    </span>
                </div>
            )
        },
        {
            accessorKey: 'status_name',
            header: 'Status',
            cell: ({ row }: any) => (
                <div className="flex justify-center">
                    <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{
                            backgroundColor: row.original.status_color ? `${row.original.status_color}20` : '#e2e8f0',
                            color: row.original.status_color || '#64748b'
                        }}
                    >
                        {row.original.status_name || '-'}
                    </span>
                </div>
            )
        },
        {
            accessorKey: 'current_milestone_name',
            header: 'Current Milestone',
            cell: ({ row }: any) => (
                <div className="flex items-center gap-2 min-w-[120px]">
                    <Target className="w-4 h-4 shrink-0 text-slate-400" />
                    <span
                        className="text-sm whitespace-nowrap"
                        style={{ color: row.original.current_milestone_color || '#64748b' }}
                    >
                        {row.original.current_milestone_name || 'Not started'}
                    </span>
                </div>
            )
        },
        {
            accessorKey: 'progress_percent',
            header: 'Progress',
            cell: ({ row }: any) => (
                <div className="min-w-[110px] max-w-[130px]">
                    <div className="flex items-center justify-between text-xs mb-1 gap-2">
                        <span className="text-slate-500 whitespace-nowrap">
                            {row.original.actual_mandays || 0}/{row.original.sold_mandays || 0} MD
                        </span>
                        <span className="text-slate-700 font-medium">
                            {row.original.progress_percent || 0}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${Math.min(row.original.progress_percent || 0, 100)}%` }}
                        />
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'pm_name',
            header: 'PM',
            cell: ({ row }: any) => (
                <div className="flex items-center gap-2 min-w-[120px] max-w-[160px]">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium uppercase">
                        {row.original.pm_name?.charAt(0) || 'P'}
                    </div>
                    <span className="text-sm truncate" title={row.original.pm_name}>
                        {row.original.pm_name || '-'}
                    </span>
                </div>
            )
        },
        {
            accessorKey: 'owner_name',
            header: 'Owner',
            cell: ({ row }: any) => (
                <div className="flex items-center gap-2 min-w-[130px] max-w-[180px]">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-medium uppercase">
                        {row.original.owner_name?.charAt(0) || 'O'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm truncate" title={row.original.owner_name}>
                            {row.original.owner_name || '-'}
                        </p>
                        {row.original.owner_position_code && (
                            <p className="text-xs text-slate-400">{row.original.owner_position_code}</p>
                        )}
                    </div>
                </div>
            )
        }
    ]

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
                    <p className="text-slate-500">Manage all projects in your organization</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Project
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border p-4 mb-6">
                <div className="flex items-end gap-4 flex-wrap">
                    {/* Year */}
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Fiscal Year</label>
                        <select
                            value={filters.year}
                            onChange={(e) => handleFilterChange('year', e.target.value ? parseInt(e.target.value) : '')}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[100px]"
                        >
                            <option value="">All Years</option>
                            {filterOptions.years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Customer */}
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Customer</label>
                        <select
                            value={filters.customerId}
                            onChange={(e) => handleFilterChange('customerId', e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[180px]"
                        >
                            <option value="">All Customers</option>
                            {filterOptions.customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Project Manager */}
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Project Manager</label>
                        <select
                            value={filters.managerId}
                            onChange={(e) => handleFilterChange('managerId', e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[150px]"
                        >
                            <option value="">All PMs</option>
                            {filterOptions.managers.map(m => (
                                <option key={m.id} value={m.id}>{m.name_th || m.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Owner */}
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Owner</label>
                        <select
                            value={filters.ownerId}
                            onChange={(e) => handleFilterChange('ownerId', e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[150px]"
                        >
                            <option value="">All Owners</option>
                            {filterOptions.owners.map(o => (
                                <option key={o.id} value={o.id}>
                                    {o.name_th || o.name} {o.position_code && `(${o.position_code})`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Status</label>
                        <select
                            value={filters.statusId}
                            onChange={(e) => handleFilterChange('statusId', e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[120px]"
                        >
                            <option value="">All Status</option>
                            {filterOptions.statuses.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Milestone Multi-Select */}
                    <div className="relative">
                        <label className="block text-xs text-slate-500 mb-1">Milestone</label>
                        <button
                            type="button"
                            onClick={() => setIsMilestoneDropdownOpen(!isMilestoneDropdownOpen)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[160px] flex items-center justify-between gap-2 bg-white"
                        >
                            <span className={filters.milestoneIds.length > 0 ? 'text-slate-900' : 'text-slate-400'}>
                                {filters.milestoneIds.length > 0
                                    ? `${filters.milestoneIds.length} selected`
                                    : 'All Milestones'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>

                        {isMilestoneDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsMilestoneDropdownOpen(false)}
                                />
                                <div className="absolute z-20 top-full left-0 mt-1 w-56 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {/* Clear All */}
                                    {filters.milestoneIds.length > 0 && (
                                        <button
                                            onClick={() => handleFilterChange('milestoneIds', [])}
                                            className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 border-b"
                                        >
                                            Clear all
                                        </button>
                                    )}

                                    {filterOptions.milestones.map(m => (
                                        <label
                                            key={m.id}
                                            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={filters.milestoneIds.includes(m.id)}
                                                onChange={() => toggleMilestone(m.id)}
                                                className="hidden"
                                            />
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${filters.milestoneIds.includes(m.id)
                                                ? 'bg-blue-600 border-blue-600'
                                                : 'border-slate-300'
                                                }`}>
                                                {filters.milestoneIds.includes(m.id) && (
                                                    <Check className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                            <span
                                                className="text-sm"
                                                style={{ color: m.color }}
                                            >
                                                {m.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Search */}
                <div className="mt-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="Search projects..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Projects Table - ใช้ SuperTable */}
            <div className="bg-white rounded-xl border">
                <SuperTable
                    data={projects}
                    columns={columns}
                    loading={isLoading}
                    onRowClick={handleRowClick}
                    rowClassName="cursor-pointer hover:bg-slate-50"
                    emptyMessage="No projects found"
                    pageSize={10}
                    pageSizeOptions={[10, 20, 50]}
                />
            </div>

            {/* Create Modal */}
            <ProjectModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                mode="create"
                project={null}
                onSuccess={() => {
                    loadProjects()
                    setIsCreateModalOpen(false)
                }}
            />

            {/* Edit Modal */}
            <ProjectModal
                open={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                mode="edit"
                project={selectedProject}
                onSuccess={() => {
                    loadProjects()
                    setIsEditModalOpen(false)
                }}
            />

            {/* Detail Modal */}
            <ProjectDetailModal
                open={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                projectId={selectedProjectId}
                onEdit={handleEditProject}
            />
        </div>
    )
}
