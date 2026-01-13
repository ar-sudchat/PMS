'use client'

import { type ProjectHealthSummary } from '@/lib/actions/dashboard-actions'

interface TimelineViewProps {
    projects: ProjectHealthSummary[]
}

export function TimelineView({ projects }: TimelineViewProps) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Project Timeline</h2>
                <p className="text-sm text-slate-500">Gantt-style view of all projects</p>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[1200px] p-6">
                    {/* Timeline Header */}
                    <div className="flex items-center mb-4">
                        <div className="w-64 flex-shrink-0 font-semibold text-sm text-slate-600">
                            Project
                        </div>
                        <div className="flex-1 flex">
                            {months.map((month, idx) => (
                                <div key={month} className="flex-1 text-center text-xs font-medium text-slate-500">
                                    {month}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline Rows */}
                    <div className="space-y-3">
                        {projects.slice(0, 20).map((project) => {
                            // Calculate timeline position based on due date
                            const currentMonth = new Date().getMonth()
                            const currentYear = new Date().getFullYear()

                            let barStart = currentMonth
                            let barDuration = 3

                            if (project.next_due_date) {
                                const dueDate = new Date(project.next_due_date)
                                const dueMonth = dueDate.getMonth()
                                const dueYear = dueDate.getFullYear()

                                if (dueYear === currentYear) {
                                    barStart = Math.max(0, dueMonth - 2)
                                    barDuration = Math.min(12 - barStart, dueMonth - barStart + 1)
                                }
                            }

                            const progress = project.overall_health / 100
                            const isOverdue = project.delayed_milestones_count && project.delayed_milestones_count > 0

                            return (
                                <div key={project.project_id} className="flex items-center group">
                                    <div className="w-64 flex-shrink-0 pr-4">
                                        <div className="text-sm font-medium text-slate-700 truncate">
                                            {project.project_name}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate flex items-center gap-2">
                                            {project.customer_name}
                                            {isOverdue && (
                                                <span className="text-rose-600 font-semibold">
                                                    ({project.delayed_milestones_count} delayed)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 relative h-12">
                                        <div className="absolute inset-0 flex">
                                            {months.map((_, idx) => (
                                                <div key={idx} className="flex-1 border-l border-slate-100 first:border-l-0" />
                                            ))}
                                        </div>
                                        {barDuration > 0 && (
                                            <div
                                                className="absolute h-8 top-2 rounded-lg flex items-center px-3 transition-all group-hover:shadow-lg"
                                                style={{
                                                    left: `${(barStart / 12) * 100}%`,
                                                    width: `${(barDuration / 12) * 100}%`,
                                                    background: isOverdue
                                                        ? 'linear-gradient(90deg, #fca5a5 0%, #ef4444 100%)'
                                                        : project.health_status === 'critical'
                                                            ? 'linear-gradient(90deg, #fca5a5 0%, #ef4444 100%)'
                                                            : project.health_status === 'at-risk'
                                                                ? 'linear-gradient(90deg, #fcd34d 0%, #f59e0b 100%)'
                                                                : 'linear-gradient(90deg, #86efac 0%, #10b981 100%)'
                                                }}
                                            >
                                                <div className="w-full bg-white/30 h-1 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-white rounded-full transition-all duration-500"
                                                        style={{ width: `${progress * 100}%` }}
                                                    />
                                                </div>
                                                <span className="ml-2 text-xs font-bold text-white whitespace-nowrap">
                                                    {Math.round(progress * 100)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
