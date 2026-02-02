'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Clock, Users, DollarSign, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { ProjectSummary } from '@/lib/actions/project-owner-dashboard-actions'

interface ProjectCardProps {
    project: ProjectSummary
}

const healthConfig: Record<string, { label: string; color: string; icon: string }> = {
    ON_TRACK: { label: 'On Track', color: 'bg-green-100 text-green-700', icon: '' },
    AT_RISK: { label: 'At Risk', color: 'bg-yellow-100 text-yellow-700', icon: '' },
    DELAYED: { label: 'Delayed', color: 'bg-red-100 text-red-700', icon: '' },
    OVER_BUDGET: { label: 'Over Budget', color: 'bg-red-100 text-red-700', icon: '' },
    COMPLETED: { label: 'Completed', color: 'bg-blue-100 text-blue-700', icon: '' },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: '' }
}

export function ProjectCard({ project }: ProjectCardProps) {
    const health = healthConfig[project.health_status] || healthConfig.ON_TRACK

    const getProgressColor = (percent: number) => {
        if (percent > 100) return '[&>div]:bg-red-500'
        if (percent > 90) return '[&>div]:bg-yellow-500'
        return '[&>div]:bg-green-500'
    }

    const borderColor = {
        ON_TRACK: 'border-l-green-500',
        AT_RISK: 'border-l-yellow-500',
        DELAYED: 'border-l-red-500',
        OVER_BUDGET: 'border-l-red-500',
        COMPLETED: 'border-l-blue-500',
        CANCELLED: 'border-l-gray-500'
    }[project.health_status] || 'border-l-gray-300'

    return (
        <Card className={`border-l-4 ${borderColor}`}>
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Link href={`/projects/${project.project_id}`} className="font-semibold hover:underline">
                                {project.project_code}: {project.project_name}
                            </Link>
                        </div>
                        <p className="text-sm text-gray-500">{project.customer_name || '-'}</p>
                    </div>
                    <Badge className={health.color}>
                        {health.label}
                    </Badge>
                </div>

                {/* Overall Progress */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span className="font-medium">{project.overall_progress || 0}%</span>
                    </div>
                    <Progress value={project.overall_progress || 0} className="h-2" />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Timeline */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <Clock className="h-4 w-4" />
                            Timeline
                        </div>
                        <div className="text-lg font-semibold">
                            {project.elapsed_days || 0}/{project.planned_duration_days || '-'}
                        </div>
                        {project.planned_duration_days > 0 && (
                            <Progress
                                value={Math.min((project.elapsed_days / project.planned_duration_days) * 100, 100)}
                                className="h-1.5 mt-1"
                            />
                        )}
                        <p className={`text-xs mt-1 ${project.overdue_days > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                            {project.overdue_days > 0
                                ? `เกิน ${project.overdue_days} วัน`
                                : 'On Schedule'
                            }
                        </p>
                    </div>

                    {/* Man-day */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <Users className="h-4 w-4" />
                            Man-day
                        </div>
                        <div className="text-lg font-semibold">
                            {Math.round(project.actual_mandays || 0)}/{Math.round(project.planned_mandays || 0)}
                            {project.manday_percent > 100 && <span className="text-red-600 text-sm ml-1">!</span>}
                        </div>
                        <Progress
                            value={Math.min(project.manday_percent || 0, 100)}
                            className={`h-1.5 mt-1 ${getProgressColor(project.manday_percent || 0)}`}
                        />
                        <p className={`text-xs mt-1 ${project.manday_percent > 100 ? 'text-red-600' :
                            project.manday_percent > 90 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                            {project.manday_percent > 100
                                ? `เกิน ${Math.round(project.manday_percent - 100)}%`
                                : `ใช้ไป ${Math.round(project.manday_percent || 0)}%`
                            }
                        </p>
                    </div>

                    {/* Budget */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <DollarSign className="h-4 w-4" />
                            Budget
                        </div>
                        <div className="text-lg font-semibold">
                            {((project.actual_budget || 0) / 1000).toFixed(0)}K/{((project.planned_budget || 0) / 1000).toFixed(0)}K
                            {project.budget_percent > 100 && <span className="text-red-600 text-sm ml-1">!</span>}
                        </div>
                        <Progress
                            value={Math.min(project.budget_percent || 0, 100)}
                            className={`h-1.5 mt-1 ${getProgressColor(project.budget_percent || 0)}`}
                        />
                        <p className={`text-xs mt-1 ${project.budget_percent > 100 ? 'text-red-600' :
                            project.budget_percent > 90 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                            {project.budget_percent > 100
                                ? `เกิน ${Math.round(project.budget_percent - 100)}%`
                                : `ใช้ไป ${Math.round(project.budget_percent || 0)}%`
                            }
                        </p>
                    </div>
                </div>

                {/* Milestones */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm">
                        <span className="text-gray-500">Milestones:</span>
                        <span className="flex items-center gap-0.5">
                            {Array.from({ length: project.completed_milestones || 0 }).map((_, i) => (
                                <span key={`c-${i}`} title="Completed" className="text-green-500">&#10003;</span>
                            ))}
                            {Array.from({ length: project.in_progress_milestones || 0 }).map((_, i) => (
                                <span key={`p-${i}`} title="In Progress" className="text-blue-500">&#9679;</span>
                            ))}
                            {Array.from({ length: project.pending_milestones || 0 }).map((_, i) => (
                                <span key={`w-${i}`} title="Pending" className="text-gray-300">&#9675;</span>
                            ))}
                        </span>
                        <span className="text-gray-400 ml-1">
                            ({project.completed_milestones || 0}/{project.total_milestones || 0})
                        </span>
                    </div>

                    <Link href={`/projects/${project.project_id}`}>
                        <Button variant="ghost" size="sm">
                            Details <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </Link>
                </div>

                {/* Current Milestone */}
                {project.current_milestone && (
                    <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Current Milestone:</span>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{project.current_milestone}</Badge>
                                {project.current_milestone_days_until !== null && (
                                    <span className={`text-xs ${project.current_milestone_days_until < 0 ? 'text-red-600' :
                                        project.current_milestone_days_until <= 7 ? 'text-orange-600' :
                                            'text-gray-500'
                                        }`}>
                                        {project.current_milestone_days_until < 0
                                            ? `เกิน ${Math.abs(project.current_milestone_days_until)} วัน`
                                            : project.current_milestone_days_until === 0
                                                ? 'วันนี้'
                                                : `อีก ${project.current_milestone_days_until} วัน`
                                        }
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
