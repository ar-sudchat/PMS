'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SummaryCard, HealthIndicator } from '@/components/dashboard/HealthComponents'
import { getProjectsHealthOverview, type ProjectHealthSummary, type ProjectsOverviewSummary } from '@/lib/actions/dashboard-actions'
import { ChevronRight, Filter, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProjectHealthDashboardClientProps {
    initialSummary: ProjectsOverviewSummary
    initialProjects: ProjectHealthSummary[]
    currentYear: number
}

export function ProjectHealthDashboardClient({
    initialSummary,
    initialProjects,
    currentYear
}: ProjectHealthDashboardClientProps) {
    const router = useRouter()
    const [summary, setSummary] = useState(initialSummary)
    const [projects, setProjects] = useState(initialProjects)
    const [year, setYear] = useState(currentYear)
    const [status, setStatus] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)

    const handleRefresh = async () => {
        setIsLoading(true)
        const result = await getProjectsHealthOverview({
            year: year || undefined,
            status: status || undefined
        })
        setSummary(result.summary)
        setProjects(result.projects)
        setIsLoading(false)
    }

    const handleProjectClick = (projectId: string) => {
        router.push(`/pm-dashboard/${projectId}`)
    }

    const formatScore = (score: number | null) => {
        return score !== null ? `${Math.round(score)}%` : '-'
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">📊 PM Dashboard</h1>
                    <p className="text-sm text-slate-500">OEE-Style Project Health Overview</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Filters */}
                    <select
                        className="border rounded-lg px-3 py-2 text-sm"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                    >
                        <option value={currentYear}>{currentYear}</option>
                        <option value={currentYear - 1}>{currentYear - 1}</option>
                        <option value={currentYear - 2}>{currentYear - 2}</option>
                    </select>
                    <select
                        className="border rounded-lg px-3 py-2 text-sm"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="on_hold">On Hold</option>
                        <option value="completed">Completed</option>
                    </select>
                    <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4">
                <SummaryCard icon="📁" value={summary.total} label="Total Projects" color="blue" />
                <SummaryCard icon="🟢" value={summary.onTrack} label="On Track" color="green" />
                <SummaryCard icon="🟡" value={summary.atRisk} label="At Risk" color="yellow" />
                <SummaryCard icon="🔴" value={summary.critical} label="Critical" color="red" />
                <SummaryCard icon="⚡" value={`${summary.avgHealth}%`} label="Avg Health" color="gray" />
            </div>

            {/* Projects Table */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="text-left px-4 py-3 font-semibold">Project</th>
                            <th className="text-left px-4 py-3 font-semibold">Customer</th>
                            <th className="text-left px-4 py-3 font-semibold">Current MS</th>
                            <th className="text-center px-3 py-3 font-semibold w-20">Time</th>
                            <th className="text-center px-3 py-3 font-semibold w-20">Resource</th>
                            <th className="text-center px-3 py-3 font-semibold w-20">Docs</th>
                            <th className="text-center px-3 py-3 font-semibold w-24">Health</th>
                            <th className="text-center px-3 py-3 font-semibold w-20">Status</th>
                            <th className="w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {projects.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center py-8 text-slate-400">
                                    No projects found
                                </td>
                            </tr>
                        ) : (
                            projects.map((project) => (
                                <tr
                                    key={project.project_id}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => handleProjectClick(project.project_id)}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-blue-600 font-medium">{project.project_code}</span>
                                            <span className="text-slate-700">{project.project_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{project.customer_name}</td>
                                    <td className="px-4 py-3 text-slate-600">{project.current_milestone_name || '-'}</td>
                                    <td className="text-center px-3 py-3">
                                        <span className={project.time_score !== null ? (project.time_score >= 80 ? 'text-green-600' : project.time_score >= 60 ? 'text-yellow-600' : 'text-red-600') : 'text-slate-400'}>
                                            {formatScore(project.time_score)}
                                        </span>
                                    </td>
                                    <td className="text-center px-3 py-3">
                                        <span className={project.resource_score !== null ? (project.resource_score >= 80 ? 'text-green-600' : project.resource_score >= 60 ? 'text-yellow-600' : 'text-red-600') : 'text-slate-400'}>
                                            {formatScore(project.resource_score)}
                                        </span>
                                    </td>
                                    <td className="text-center px-3 py-3">
                                        <span className={project.docs_score !== null ? (project.docs_score >= 80 ? 'text-green-600' : project.docs_score >= 60 ? 'text-yellow-600' : 'text-red-600') : 'text-slate-400'}>
                                            {formatScore(project.docs_score)}
                                        </span>
                                    </td>
                                    <td className="text-center px-3 py-3">
                                        <HealthIndicator health={project.overall_health} size="sm" />
                                    </td>
                                    <td className="text-center px-3 py-3">
                                        <span className={cn(
                                            "text-xs px-2 py-1 rounded-full font-medium",
                                            project.status === 'active' ? 'bg-green-100 text-green-700' :
                                                project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-slate-100 text-slate-700'
                                        )}>
                                            {project.status}
                                        </span>
                                    </td>
                                    <td className="px-2 py-3 text-slate-400">
                                        <ChevronRight className="w-4 h-4" />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Click hint */}
            <div className="text-center text-sm text-slate-400">
                Click on a project to view detailed health breakdown ↑
            </div>
        </div>
    )
}
