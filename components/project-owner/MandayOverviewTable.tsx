'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import type { ProjectSummary, DashboardStats } from '@/lib/actions/project-owner-dashboard-actions'

interface MandayOverviewTableProps {
    projects: ProjectSummary[]
    stats: DashboardStats | null
}

export function MandayOverviewTable({ projects, stats }: MandayOverviewTableProps) {
    const getStatusColor = (percent: number) => {
        if (percent > 100) return 'text-red-600'
        if (percent > 90) return 'text-yellow-600'
        return 'text-green-600'
    }

    const getProgressColor = (percent: number) => {
        if (percent > 100) return '[&>div]:bg-red-500'
        if (percent > 90) return '[&>div]:bg-yellow-500'
        return '[&>div]:bg-green-500'
    }

    const getStatusIcon = (percent: number) => {
        if (percent > 100) return <span className="text-red-500">&#9679;</span>
        if (percent > 90) return <span className="text-yellow-500">&#9679;</span>
        return <span className="text-green-500">&#9679;</span>
    }

    // Filter out cancelled projects
    const activeProjects = projects.filter(p => p.health_status !== 'CANCELLED')

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    MAN-DAY OVERVIEW
                </CardTitle>
                <CardDescription>สรุป Man-day ทุกโครงการ</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-2 px-2 font-medium">Project</th>
                                <th className="text-right py-2 px-2 font-medium">Budget</th>
                                <th className="text-right py-2 px-2 font-medium">Used</th>
                                <th className="text-right py-2 px-2 font-medium">Remaining</th>
                                <th className="py-2 px-2 font-medium w-40">Progress</th>
                                <th className="text-center py-2 px-2 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeProjects.map((project) => (
                                <tr key={project.project_id} className="border-b hover:bg-gray-50">
                                    <td className="py-2 px-2">
                                        <Link
                                            href={`/projects/${project.project_id}`}
                                            className="hover:underline text-blue-600"
                                        >
                                            {project.project_code}: {project.project_name}
                                        </Link>
                                    </td>
                                    <td className="text-right py-2 px-2 font-mono">
                                        {Math.round(project.planned_mandays || 0)} MD
                                    </td>
                                    <td className={`text-right py-2 px-2 font-mono ${getStatusColor(project.manday_percent || 0)}`}>
                                        {Math.round(project.actual_mandays || 0)} MD
                                    </td>
                                    <td className={`text-right py-2 px-2 font-mono ${(project.remaining_mandays || 0) < 0 ? 'text-red-600' : ''}`}>
                                        {Math.round(project.remaining_mandays || 0)} MD
                                    </td>
                                    <td className="py-2 px-2">
                                        <div className="flex items-center gap-2">
                                            <Progress
                                                value={Math.min(project.manday_percent || 0, 100)}
                                                className={`h-2 flex-1 ${getProgressColor(project.manday_percent || 0)}`}
                                            />
                                            <span className={`text-xs font-medium w-12 text-right ${getStatusColor(project.manday_percent || 0)}`}>
                                                {Math.round(project.manday_percent || 0)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-center py-2 px-2">
                                        {getStatusIcon(project.manday_percent || 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {stats && (
                            <tfoot>
                                <tr className="border-t-2 font-medium bg-gray-50">
                                    <td className="py-2 px-2">TOTAL</td>
                                    <td className="text-right py-2 px-2 font-mono">
                                        {Math.round(stats.total_planned_mandays || 0)} MD
                                    </td>
                                    <td className={`text-right py-2 px-2 font-mono ${getStatusColor(stats.overall_manday_percent || 0)}`}>
                                        {Math.round(stats.total_actual_mandays || 0)} MD
                                    </td>
                                    <td className={`text-right py-2 px-2 font-mono ${(stats.total_remaining_mandays || 0) < 0 ? 'text-red-600' : ''}`}>
                                        {Math.round(stats.total_remaining_mandays || 0)} MD
                                    </td>
                                    <td className="py-2 px-2">
                                        <div className="flex items-center gap-2">
                                            <Progress
                                                value={Math.min(stats.overall_manday_percent || 0, 100)}
                                                className={`h-2 flex-1 ${getProgressColor(stats.overall_manday_percent || 0)}`}
                                            />
                                            <span className={`text-xs font-medium w-12 text-right ${getStatusColor(stats.overall_manday_percent || 0)}`}>
                                                {Math.round(stats.overall_manday_percent || 0)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-center py-2 px-2">
                                        {getStatusIcon(stats.overall_manday_percent || 0)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
