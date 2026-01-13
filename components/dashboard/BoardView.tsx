'use client'

import { type ProjectHealthSummary } from '@/lib/actions/dashboard-actions'
import { cn } from '@/lib/utils'

interface BoardViewProps {
    projects: ProjectHealthSummary[]
    onProjectClick: (projectId: string) => void
}

export function BoardView({ projects, onProjectClick }: BoardViewProps) {
    const columns = [
        {
            id: 'critical',
            title: 'Critical',
            status: 'critical',
            headerBg: '#fef2f2',
            headerBorder: '#fecaca',
            headerText: '#991b1b',
            badgeBg: '#fee2e2',
            badgeText: '#7f1d1d',
            progressColor: '#ef4444'
        },
        {
            id: 'at-risk',
            title: 'At Risk',
            status: 'at-risk',
            headerBg: '#fffbeb',
            headerBorder: '#fde68a',
            headerText: '#92400e',
            badgeBg: '#fef3c7',
            badgeText: '#78350f',
            progressColor: '#f59e0b'
        },
        {
            id: 'on-track',
            title: 'On Track',
            status: 'on-track',
            headerBg: '#f0fdf4',
            headerBorder: '#86efac',
            headerText: '#14532d',
            badgeBg: '#dcfce7',
            badgeText: '#14532d',
            progressColor: '#10b981'
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((column) => {
                const columnProjects = projects.filter(p => p.health_status === column.status)

                return (
                    <div key={column.id} className="flex flex-col">
                        <div
                            className="px-4 py-3 rounded-t-2xl border-t border-x"
                            style={{
                                backgroundColor: column.headerBg,
                                borderColor: column.headerBorder
                            }}
                        >
                            <h3
                                className="font-bold text-sm uppercase tracking-wider flex items-center justify-between"
                                style={{ color: column.headerText }}
                            >
                                {column.title}
                                <span
                                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                                    style={{
                                        backgroundColor: column.badgeBg,
                                        color: column.badgeText
                                    }}
                                >
                                    {columnProjects.length}
                                </span>
                            </h3>
                        </div>

                        <div className="flex-1 bg-slate-50 border-x border-b border-slate-200 rounded-b-2xl p-3 space-y-3 min-h-[400px]">
                            {columnProjects.map((project) => (
                                <div
                                    key={project.project_id}
                                    onClick={() => onProjectClick(project.project_id)}
                                    className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-lg transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-semibold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                            {project.project_name}
                                        </h4>
                                    </div>

                                    <div className="text-xs text-slate-500 mb-3">
                                        {project.customer_name}
                                    </div>

                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-slate-500">Progress</span>
                                                <span className="font-semibold text-slate-700">
                                                    {project.overall_health}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${project.overall_health}%`,
                                                        backgroundColor: column.progressColor
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            <span className="text-slate-600">T: {project.time_score ?? '-'}%</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            <span className="text-slate-600">R: {project.resource_score ?? '-'}%</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                            <span className="text-slate-600">D: {project.docs_score ?? '-'}%</span>
                                        </div>
                                    </div>

                                    {project.current_milestone_name && (
                                        <div className="mt-3 pt-3 border-t border-slate-100">
                                            <div className="text-xs text-slate-500">Current Milestone:</div>
                                            <div className="text-xs font-medium text-slate-700 truncate">
                                                {project.current_milestone_name}
                                            </div>
                                        </div>
                                    )}

                                    {project.next_due_date && (
                                        <div className="mt-2">
                                            <div className="text-xs text-slate-500">Next Due:</div>
                                            <div className="text-xs font-medium text-slate-700">
                                                {new Date(project.next_due_date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {columnProjects.length === 0 && (
                                <div className="text-center py-12 text-slate-400 text-sm">
                                    No projects in this status
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
