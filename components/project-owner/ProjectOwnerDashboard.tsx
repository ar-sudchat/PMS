'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    FolderKanban, CheckCircle, ChevronRight,
    AlertCircle, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { ProjectCard } from './ProjectCard'
import { MandayOverviewTable } from './MandayOverviewTable'
import { AttentionRequired } from './AttentionRequired'
import type { ProjectSummary, DashboardStats, AttentionItem, UpcomingMilestone } from '@/lib/actions/project-owner-dashboard-actions'

interface ProjectOwnerDashboardProps {
    data: {
        stats: DashboardStats | null
        projects: ProjectSummary[]
        attention: AttentionItem[]
        upcomingMilestones: UpcomingMilestone[]
    }
    user: {
        id: string
        name: string
        nameTh?: string
    }
}

export function ProjectOwnerDashboard({ data, user }: ProjectOwnerDashboardProps) {
    const { stats, projects, attention, upcomingMilestones } = data
    const [showAllProjects, setShowAllProjects] = useState(false)

    const displayedProjects = showAllProjects ? projects : projects.slice(0, 5)
    const displayName = user.nameTh || user.name

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        My Projects Dashboard
                    </h1>
                    <p className="text-gray-500">
                        {displayName} | {stats?.total_projects || 0} โครงการ
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                            <FolderKanban className="h-4 w-4" />
                            Total Projects
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.total_projects || 0}</div>
                        <p className="text-xs text-gray-500">โครงการ</p>
                    </CardContent>
                </Card>

                <Card className="border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-600 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            On Track
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{stats?.on_track_count || 0}</div>
                        <p className="text-xs text-gray-500">
                            {stats && stats.total_projects > 0
                                ? Math.round((stats.on_track_count / stats.total_projects) * 100)
                                : 0}%
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-yellow-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-yellow-600 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            At Risk
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-600">{stats?.at_risk_count || 0}</div>
                        <p className="text-xs text-gray-500">
                            {stats && stats.total_projects > 0
                                ? Math.round((stats.at_risk_count / stats.total_projects) * 100)
                                : 0}%
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-red-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Delayed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">{stats?.delayed_count || 0}</div>
                        <p className="text-xs text-gray-500">
                            {stats && stats.total_projects > 0
                                ? Math.round((stats.delayed_count / stats.total_projects) * 100)
                                : 0}%
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-blue-600 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Completed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{stats?.completed_count || 0}</div>
                        <p className="text-xs text-gray-500">
                            {stats && stats.total_projects > 0
                                ? Math.round((stats.completed_count / stats.total_projects) * 100)
                                : 0}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Attention Required */}
            {attention.length > 0 && (
                <AttentionRequired items={attention} />
            )}

            {/* Projects List */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                My Projects
                            </CardTitle>
                            <CardDescription>โครงการที่รับผิดชอบทั้งหมด</CardDescription>
                        </div>
                        <Link href="/projects">
                            <Button variant="ghost" size="sm">
                                View All <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {displayedProjects.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            ไม่มีโครงการที่รับผิดชอบ
                        </div>
                    ) : (
                        displayedProjects.map((project) => (
                            <ProjectCard key={project.project_id} project={project} />
                        ))
                    )}

                    {projects.length > 5 && !showAllProjects && (
                        <div className="text-center pt-4">
                            <Button variant="outline" onClick={() => setShowAllProjects(true)}>
                                แสดงทั้งหมด ({projects.length} โครงการ)
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Man-day Overview */}
            <MandayOverviewTable projects={projects} stats={stats} />

            {/* Upcoming Milestones */}
            {upcomingMilestones.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Upcoming Milestones
                        </CardTitle>
                        <CardDescription>Milestones ที่จะถึงใน 30 วัน</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {upcomingMilestones.map((ms, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${ms.urgency === 'OVERDUE' ? 'bg-red-500' :
                                            ms.urgency === 'THIS_WEEK' ? 'bg-orange-500' :
                                                'bg-blue-500'
                                            }`} />
                                        <div>
                                            <p className="font-medium">{ms.milestone_name}</p>
                                            <p className="text-sm text-gray-500">{ms.project_code}: {ms.project_name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant={
                                            ms.urgency === 'OVERDUE' ? 'destructive' :
                                                ms.urgency === 'THIS_WEEK' ? 'default' : 'secondary'
                                        }>
                                            {ms.days_until_due < 0
                                                ? `เกิน ${Math.abs(ms.days_until_due)} วัน`
                                                : ms.days_until_due === 0
                                                    ? 'วันนี้'
                                                    : `อีก ${ms.days_until_due} วัน`
                                            }
                                        </Badge>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {ms.planned_date ? new Date(ms.planned_date).toLocaleDateString('th-TH') : '-'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
