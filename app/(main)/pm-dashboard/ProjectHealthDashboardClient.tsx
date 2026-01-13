'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ActivityRings } from '@/components/dashboard/ActivityRings'
import { FloatingProjectRow } from '@/components/dashboard/FloatingProjectRow'
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
    SlidersHorizontal
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
        // Link to Control Tower as per instruction
        router.push(`/pm-dashboard/control-tower?id=${projectId}`)
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

    // Grouping Logic
    const groupedProjects = {
        critical: filteredProjects.filter(p => p.health_status === 'critical'),
        atRisk: filteredProjects.filter(p => p.health_status === 'at-risk'),
        onTrack: filteredProjects.filter(p => p.health_status === 'on-track')
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans text-slate-600">
            {/* 1. COMPACT HEADER & ADVANCED FILTER (Sticky) */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm transition-all">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    {/* Top Row: Title & Org Health */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 rounded-lg shadow-md shadow-slate-200">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-800 tracking-tight">PM Dashboard</h1>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Enterprise Portfolio</p>
                            </div>
                        </div>

                        {/* Org Health Micro-Rings */}
                        <div className="flex items-center gap-6 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mr-2">
                                <span className="uppercase tracking-wider text-[10px]">Org Health</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-xs font-bold text-slate-700">{oee.overall}%</span>
                                    <span className="text-[10px] text-slate-400">Overall</span>
                                </div>
                                <div className="h-4 w-[1px] bg-slate-200" />
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-bold text-slate-700">{oee.time}%</span>
                                    <span className="text-[10px] text-slate-400">Time</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-xs font-bold text-slate-700">{oee.resource}%</span>
                                    <span className="text-[10px] text-slate-400">Res</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar Row */}
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        {/* Search */}
                        <div className="relative w-full md:w-64 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search..."
                                className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all rounded-lg text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Dropdown Filters Group */}
                        <div className="flex items-center gap-2 w-full overflow-x-auto no-scrollbar">
                            <select
                                className="h-9 px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 focus:outline-none focus:border-indigo-400 hover:border-indigo-200 transition-colors cursor-pointer min-w-[100px]"
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                            >
                                <option value="All">Customer: All</option>
                                {customers.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            {/* Type Filter Disabled - No Backend Data Yet */}
                            {/* <select
                                className="h-9 px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 focus:outline-none focus:border-indigo-400 hover:border-indigo-200 transition-colors cursor-pointer min-w-[100px]"
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                            >
                                <option value="All">Type: All</option>
                                {types.map(t => <option key={t} value={t}>{t}</option>)}
                            </select> */}

                            <select
                                className="h-9 px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 focus:outline-none focus:border-indigo-400 hover:border-indigo-200 transition-colors cursor-pointer min-w-[100px]"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                                <option value="All">Status: All</option>
                                <option value="On Track">Healthy</option>
                                <option value="At Risk">At Risk</option>
                                <option value="Critical">Critical</option>
                            </select>

                            <select
                                className="h-9 px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 focus:outline-none focus:border-indigo-400 hover:border-indigo-200 transition-colors cursor-pointer min-w-[80px]"
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                            >
                                <option value={currentYear}>FY {currentYear}</option>
                                <option value={currentYear - 1}>FY {currentYear - 1}</option>
                            </select>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <Button
                                onClick={handleRefresh}
                                disabled={isLoading}
                                size="sm"
                                variant="outline"
                                className="h-9 w-9 p-0 rounded-lg border-slate-200 text-slate-500 hover:text-indigo-600"
                            >
                                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    {/* Quick Action Tags */}
                    <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                        {[
                            { label: 'All Projects', id: null },
                            { label: 'Critical Only', id: 'Critical', count: summary.critical, color: 'text-rose-600 bg-rose-50 border-rose-100' },
                            { label: 'My Projects', id: 'My Projects', count: 3, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' }, // mock count
                            { label: 'Ending Warranty', id: 'Warranty', count: 0, color: 'text-amber-600 bg-amber-50 border-amber-100' }
                        ].map(tag => (
                            <button
                                key={tag.label}
                                onClick={() => setActiveTag(tag.id)}
                                className={cn(
                                    "px-3 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-all whitespac-nowrap flex items-center gap-2",
                                    activeTag === tag.id
                                        ? "bg-slate-800 text-white border-slate-800 shadow-md"
                                        : (tag.color || "bg-white text-slate-500 border-slate-200 hover:border-slate-300")
                                )}
                            >
                                {tag.label}
                                {tag.count !== undefined && (
                                    <span className={cn("px-1.5 py-0.5 rounded-full text-[9px]", activeTag === tag.id ? "bg-slate-600 text-white" : "bg-white/50")}>
                                        {tag.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. PROJECT LIST (Floating Rows) */}
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">

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
                                    index={idx + 1}
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
                                    index={idx + 1}
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
                                    index={idx + 1}
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
        </div>
    )
}
