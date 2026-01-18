'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ActivityRings } from '@/components/dashboard/ActivityRings'
import { FloatingProjectRow } from '@/components/dashboard/FloatingProjectRow'
import { TimelineView } from '@/components/dashboard/TimelineView'
import { BoardView } from '@/components/dashboard/BoardView'
import { CalendarView } from '@/components/dashboard/CalendarView'
import { ProjectDetailModal } from '@/components/dashboard/ProjectDetailModal'
import { getProjectsHealthOverview, type ProjectHealthSummary, type ProjectsOverviewSummary } from '@/lib/actions/dashboard-actions'
import {
    RefreshCw,
    LayoutDashboard,
    Search,
    Filter,
    ArrowRight,
    Users,
    Briefcase,
    CalendarClock,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    SlidersHorizontal,
    List,
    Calendar as CalendarIcon,
    LayoutGrid,
    Download,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ProjectHealthDashboardClientProps {
    initialSummary: ProjectsOverviewSummary
    initialProjects: ProjectHealthSummary[]
    initialOee: { time: number; resource: number; docs: number; overall: number }
    currentYear: number
}

export function ProjectHealthDashboardClient({
    initialSummary,
    initialProjects,
    initialOee,
    currentYear
}: ProjectHealthDashboardClientProps) {
    const router = useRouter()
    const [projects, setProjects] = useState(initialProjects)
    const [summary, setSummary] = useState(initialSummary)
    const [oee, setOee] = useState(initialOee)
    const [year, setYear] = useState(currentYear)
    const [isLoading, setIsLoading] = useState(false)

    // Filter States
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState('All')
    // const [selectedType, setSelectedType] = useState('All') // Disabled until backend supports it
    const [selectedStatus, setSelectedStatus] = useState('All')

    // Quick Action Tags
    const [activeTag, setActiveTag] = useState<string | null>(null)

    // View State
    const [currentView, setCurrentView] = useState<'list' | 'timeline' | 'board' | 'calendar'>('list')

    // Modal State
    const [selectedProject, setSelectedProject] = useState<ProjectHealthSummary | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    // Sorting State
    const [sortField, setSortField] = useState<'name' | 'customer' | 'overall_health'>('overall_health')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    // Derived Options for Dropdowns
    const customers = useMemo(() => Array.from(new Set(projects.map(p => p.customer_name))).sort(), [projects])
    // const types = useMemo(() => Array.from(new Set(projects.map(p => p.project_type || 'Unknown'))).sort(), [projects])
    // Mock PMs for now as data isn't in ProjectHealthSummary yet, or use generic
    const pms = ['All']

    const handleRefresh = async () => {
        setIsLoading(true)
        const result = await getProjectsHealthOverview({ year, status: selectedStatus !== 'All' ? [selectedStatus] : undefined })
        setProjects(result.projects)
        setSummary(result.summary)
        setOee(result.oee || initialOee)
        setIsLoading(false)
    }

    const handleProjectClick = (projectId: string) => {
        const project = projects.find(p => p.project_id === projectId)
        if (project) {
            setSelectedProject(project)
            setIsModalOpen(true)
        }
    }

    const handleGoToControlTower = (projectId: string) => {
        router.push(`/pm-dashboard/control-tower?id=${projectId}`)
        setIsModalOpen(false)
    }

    const handleExport = () => {
        const csv = [
            ['Project Code', 'Project Name', 'Customer', 'Status', 'Overall Health', 'Time', 'Resource', 'Docs'].join(','),
            ...filteredProjects.map(p => [
                p.project_code,
                `"${p.project_name}"`,
                `"${p.customer_name}"`,
                p.health_status,
                p.overall_health,
                p.time_score,
                p.resource_score,
                p.docs_score
            ].join(','))
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'pm-dashboard-export.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    // Filter Logic
    const filteredProjects = projects.filter(p => {
        const matchesSearch =
            p.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.project_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.customer_name.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesCustomer = selectedCustomer === 'All' || p.customer_name === selectedCustomer
        // const matchesType = selectedType === 'All' || p.project_type === selectedType

        let matchesStatus = true
        if (selectedStatus !== 'All') {
            // Map UI status to backend status if needed, or stick to health_status
            matchesStatus = p.health_status === selectedStatus.toLowerCase().replace(' ', '-')
        }

        // Quick Tags logic
        if (activeTag === 'Critical') matchesStatus = p.health_status === 'critical'
        if (activeTag === 'My Projects') matchesStatus = true // Placeholder for "My Projects" logic

        return matchesSearch && matchesCustomer && matchesStatus
    })

    // Sorting Logic
    const sortedProjects = [...filteredProjects].sort((a, b) => {
        let aVal, bVal

        if (sortField === 'name') {
            aVal = a.project_name.toLowerCase()
            bVal = b.project_name.toLowerCase()
        } else if (sortField === 'customer') {
            aVal = a.customer_name.toLowerCase()
            bVal = b.customer_name.toLowerCase()
        } else {
            aVal = a.overall_health
            bVal = b.overall_health
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
        return 0
    })

    // Pagination Logic
    const totalPages = Math.ceil(sortedProjects.length / pageSize)
    const paginatedProjects = currentView === 'list'
        ? sortedProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize)
        : sortedProjects

    // Grouping Logic (for list view)
    const groupedProjects = {
        critical: paginatedProjects.filter(p => p.health_status === 'critical'),
        atRisk: paginatedProjects.filter(p => p.health_status === 'at-risk'),
        onTrack: paginatedProjects.filter(p => p.health_status === 'on-track')
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans text-slate-600">
            {/* 1. COMPACT HEADER & ADVANCED FILTER (Sticky) */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg transition-all">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    {/* Top Row: Title & Org Health */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/30">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white tracking-tight">PM Dashboard</h1>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Enterprise Portfolio</p>
                            </div>
                        </div>

                        {/* Org Health Micro-Rings */}
                        <div className="flex items-center gap-6 bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/10">
                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-300 mr-2">
                                <span className="uppercase tracking-wider text-[10px]">Org Health</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 shadow-sm shadow-blue-400/50" />
                                    <span className="text-xs font-bold text-white">{oee.overall}%</span>
                                    <span className="text-[10px] text-slate-400">Overall</span>
                                </div>
                                <div className="h-4 w-[1px] bg-white/20" />
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-400/50" />
                                    <span className="text-xs font-bold text-white">{oee.time}%</span>
                                    <span className="text-[10px] text-slate-400">Time</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-sm shadow-amber-400/50" />
                                    <span className="text-xs font-bold text-white">{oee.resource}%</span>
                                    <span className="text-[10px] text-slate-400">Res</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* View Tabs */}
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg mb-4 border border-white/10">
                        <button
                            onClick={() => setCurrentView('list')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                                currentView === 'list'
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-300 hover:text-white hover:bg-white/10"
                            )}
                        >
                            <List className="w-4 h-4" />
                            List
                        </button>
                        <button
                            onClick={() => setCurrentView('timeline')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                                currentView === 'timeline'
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-300 hover:text-white hover:bg-white/10"
                            )}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Timeline
                        </button>
                        <button
                            onClick={() => setCurrentView('board')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                                currentView === 'board'
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-300 hover:text-white hover:bg-white/10"
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Board
                        </button>
                        <button
                            onClick={() => setCurrentView('calendar')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                                currentView === 'calendar'
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-300 hover:text-white hover:bg-white/10"
                            )}
                        >
                            <CalendarIcon className="w-4 h-4" />
                            Calendar
                        </button>
                    </div>

                    {/* Filter Bar Row */}
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        {/* Search */}
                        <div className="relative w-full md:w-64 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search..."
                                className="pl-9 h-9 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/20 focus:ring-2 focus:ring-white/20 transition-all rounded-lg text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Dropdown Filters Group */}
                        <div className="flex items-center gap-2 w-full overflow-x-auto no-scrollbar">
                            <select
                                className="h-9 px-3 py-1 rounded-lg border border-white/20 bg-white/10 text-xs font-medium text-white focus:outline-none focus:border-white/40 hover:bg-white/20 transition-colors cursor-pointer min-w-[100px]"
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                            >
                                <option value="All" className="text-slate-800">Customer: All</option>
                                {customers.map(c => <option key={c} value={c} className="text-slate-800">{c}</option>)}
                            </select>

                            <select
                                className="h-9 px-3 py-1 rounded-lg border border-white/20 bg-white/10 text-xs font-medium text-white focus:outline-none focus:border-white/40 hover:bg-white/20 transition-colors cursor-pointer min-w-[100px]"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                                <option value="All" className="text-slate-800">Status: All</option>
                                <option value="On Track" className="text-slate-800">Healthy</option>
                                <option value="At Risk" className="text-slate-800">At Risk</option>
                                <option value="Critical" className="text-slate-800">Critical</option>
                            </select>

                            <select
                                className="h-9 px-3 py-1 rounded-lg border border-white/20 bg-white/10 text-xs font-medium text-white focus:outline-none focus:border-white/40 hover:bg-white/20 transition-colors cursor-pointer min-w-[80px]"
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                            >
                                <option value={currentYear} className="text-slate-800">FY {currentYear}</option>
                                <option value={currentYear - 1} className="text-slate-800">FY {currentYear - 1}</option>
                            </select>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <Button
                                onClick={handleExport}
                                size="sm"
                                variant="outline"
                                className="h-9 gap-2 rounded-lg border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Export</span>
                            </Button>
                            <Button
                                onClick={handleRefresh}
                                disabled={isLoading}
                                size="sm"
                                variant="outline"
                                className="h-9 w-9 p-0 rounded-lg border-white/20 bg-white/10 text-white hover:bg-white/20"
                            >
                                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    {/* Quick Action Tags */}
                    <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                        {[
                            { label: 'All Projects', id: null },
                            { label: 'Critical Only', id: 'Critical', count: summary.critical, color: 'text-rose-300 bg-rose-500/20 border-rose-500/30' },
                            { label: 'My Projects', id: 'My Projects', count: 3, color: 'text-indigo-300 bg-indigo-500/20 border-indigo-500/30' },
                            { label: 'Ending Warranty', id: 'Warranty', count: 0, color: 'text-amber-300 bg-amber-500/20 border-amber-500/30' }
                        ].map(tag => (
                            <button
                                key={tag.label}
                                onClick={() => setActiveTag(tag.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap flex items-center gap-2",
                                    activeTag === tag.id
                                        ? "bg-white text-slate-800 border-white shadow-md"
                                        : (tag.color || "bg-white/10 text-slate-300 border-white/20 hover:bg-white/20")
                                )}
                            >
                                {tag.label}
                                {tag.count !== undefined && (
                                    <span className={cn("px-1.5 py-0.5 rounded-full text-[9px]", activeTag === tag.id ? "bg-slate-200 text-slate-800" : "bg-white/20")}>
                                        {tag.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. CONTENT AREA - Views */}
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* LIST VIEW */}
                {currentView === 'list' && (
                    <div className="space-y-8">
                        {/* Sorting & Count */}
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-500">
                                Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sortedProjects.length)} of {sortedProjects.length} projects
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">Sort by:</span>
                                <select
                                    className="h-8 px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600"
                                    value={sortField}
                                    onChange={(e) => setSortField(e.target.value as any)}
                                >
                                    <option value="overall_health">Health Score</option>
                                    <option value="name">Project Name</option>
                                    <option value="customer">Customer</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                                >
                                    {sortOrder === 'asc' ? '↑' : '↓'}
                                </button>
                            </div>
                        </div>

                        {/* CRITICAL SECTION */}
                        {groupedProjects.critical.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pl-2">
                                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                                    <h3 className="text-sm font-bold text-rose-600 uppercase tracking-widest">Critical Attention ({groupedProjects.critical.length})</h3>
                                </div>
                                <div className="space-y-3">
                                    {groupedProjects.critical.map((project, idx) => (
                                        <FloatingProjectRow
                                            key={project.project_id}
                                            index={((currentPage - 1) * pageSize) + idx + 1}
                                            projectCode={project.project_code}
                                            projectName={project.project_name}
                                            customerName={project.customer_name}
                                            currentMilestone={project.current_milestone_name}
                                            timeScore={project.time_score}
                                            resourceScore={project.resource_score}
                                            docsScore={project.docs_score}
                                            overallHealth={project.overall_health}
                                            healthStatus={project.health_status}
                                            onClick={() => handleProjectClick(project.project_id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AT RISK SECTION */}
                        {groupedProjects.atRisk.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pl-2">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                                    <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest">At Risk / Watching ({groupedProjects.atRisk.length})</h3>
                                </div>
                                <div className="space-y-3">
                                    {groupedProjects.atRisk.map((project, idx) => (
                                        <FloatingProjectRow
                                            key={project.project_id}
                                            index={((currentPage - 1) * pageSize) + groupedProjects.critical.length + idx + 1}
                                            projectCode={project.project_code}
                                            projectName={project.project_name}
                                            customerName={project.customer_name}
                                            currentMilestone={project.current_milestone_name}
                                            timeScore={project.time_score}
                                            resourceScore={project.resource_score}
                                            docsScore={project.docs_score}
                                            overallHealth={project.overall_health}
                                            healthStatus={project.health_status}
                                            onClick={() => handleProjectClick(project.project_id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ON TRACK SECTION */}
                        {groupedProjects.onTrack.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pl-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                    <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Healthy ({groupedProjects.onTrack.length})</h3>
                                </div>
                                <div className="space-y-3">
                                    {groupedProjects.onTrack.map((project, idx) => (
                                        <FloatingProjectRow
                                            key={project.project_id}
                                            index={((currentPage - 1) * pageSize) + groupedProjects.critical.length + groupedProjects.atRisk.length + idx + 1}
                                            projectCode={project.project_code}
                                            projectName={project.project_name}
                                            customerName={project.customer_name}
                                            currentMilestone={project.current_milestone_name}
                                            timeScore={project.time_score}
                                            resourceScore={project.resource_score}
                                            docsScore={project.docs_score}
                                            overallHealth={project.overall_health}
                                            healthStatus={project.health_status}
                                            onClick={() => handleProjectClick(project.project_id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500">Show:</span>
                                    <select
                                        className="h-9 px-3 py-1 rounded-lg border border-slate-200 bg-white text-sm"
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value))
                                            setCurrentPage(1)
                                        }}
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                    <span className="text-sm text-slate-500">per page</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        size="sm"
                                        variant="outline"
                                        className="h-9"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter(page => {
                                                return page === 1 || page === totalPages ||
                                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                            })
                                            .map((page, idx, arr) => (
                                                <div key={page} className="flex items-center gap-1">
                                                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                        <span className="px-2 text-slate-400">...</span>
                                                    )}
                                                    <Button
                                                        onClick={() => setCurrentPage(page)}
                                                        size="sm"
                                                        variant={currentPage === page ? "primary" : "outline"}
                                                        className="h-9 w-9 p-0"
                                                    >
                                                        {page}
                                                    </Button>
                                                </div>
                                            ))
                                        }
                                    </div>

                                    <Button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        size="sm"
                                        variant="outline"
                                        className="h-9"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TIMELINE VIEW */}
                {currentView === 'timeline' && <TimelineView projects={sortedProjects} />}

                {/* BOARD VIEW */}
                {currentView === 'board' && <BoardView projects={sortedProjects} onProjectClick={handleProjectClick} />}

                {/* CALENDAR VIEW */}
                {currentView === 'calendar' && <CalendarView projects={sortedProjects} onProjectClick={handleProjectClick} />}

                {filteredProjects.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Search className="w-6 h-6 text-slate-300" />
                        </div>
                        <h3 className="text-slate-800 font-semibold mb-1">No Projects Found</h3>
                        <p className="text-sm text-slate-400">Try adjusting your filters or search query.</p>
                        <Button variant="link" onClick={() => {
                            setSearchQuery('')
                            setSelectedCustomer('All')
                            setSelectedStatus('All')
                            setActiveTag(null)
                        }}>Clear all filters</Button>
                    </div>
                )}
            </div>

            {/* Project Detail Modal */}
            <ProjectDetailModal
                project={selectedProject}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onGoToControlTower={handleGoToControlTower}
            />
        </div>
    )
}
