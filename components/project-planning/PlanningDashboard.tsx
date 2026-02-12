'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Banknote, Users, RefreshCw, CheckCircle2, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanningDashboardData } from '@/lib/actions/project-planning-actions'
import { MilestoneTimeline } from './MilestoneTimeline'
import { GanttView } from './GanttView'
import { TeamWorkloadView } from './TeamWorkloadView'
import { CostSummaryView } from './CostSummaryView'

// ============================================
// Types
// ============================================

interface PlanningDashboardProps {
    data: PlanningDashboardData
    onRefresh: () => void
}

// ============================================
// Helpers
// ============================================

function formatThaiDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: '2-digit',
        })
    } catch {
        return '-'
    }
}

function formatCurrency(amount: number): string {
    return amount.toLocaleString('th-TH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })
}

// ============================================
// Component
// ============================================

export function PlanningDashboard({ data, onRefresh }: PlanningDashboardProps) {
    const { project, summary, cost } = data

    const progressPercent = project.progress_percent ?? 0
    const completedTasks = summary.completed_tasks
    const totalTasks = summary.total_tasks

    return (
        <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">{project.name}</h2>
                    <Badge
                        style={{
                            backgroundColor: project.status_color || undefined,
                            color: '#fff',
                        }}
                    >
                        {project.status_name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                        PM: {project.project_manager_name || '-'}
                    </span>
                </div>
                <Button variant="outline" size="sm" onClick={onRefresh}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    รีเฟรช
                </Button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Timeline card */}
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium text-muted-foreground">ระยะเวลา</span>
                        </div>
                        <div className="text-sm font-semibold">
                            {formatThaiDate(project.start_date)} ~ {formatThaiDate(project.end_date)}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{summary.duration_days.toLocaleString('th-TH')} วัน</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Budget card */}
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Banknote className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-muted-foreground">งบประมาณ</span>
                        </div>
                        <div className="text-sm font-semibold">
                            {formatCurrency(cost.total_budget)} บาท
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Sold: {project.sold_mandays.toLocaleString('th-TH')} MD
                        </div>
                    </CardContent>
                </Card>

                {/* Team card */}
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span className="text-sm font-medium text-muted-foreground">ทีมงาน</span>
                        </div>
                        <div className="text-sm font-semibold">
                            {summary.team_size.toLocaleString('th-TH')} คน
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <ListTodo className="h-3 w-3" />
                            <span>{totalTasks.toLocaleString('th-TH')} งาน</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Progress card */}
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-medium text-muted-foreground">ความคืบหน้า</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${Math.min(progressPercent, 100)}%`,
                                        backgroundColor: progressPercent >= 100
                                            ? '#10b981'
                                            : progressPercent >= 50
                                                ? '#3b82f6'
                                                : '#f59e0b',
                                    }}
                                />
                            </div>
                            <span className="text-sm font-semibold whitespace-nowrap">
                                {progressPercent.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            เสร็จแล้ว {completedTasks.toLocaleString('th-TH')}/{totalTasks.toLocaleString('th-TH')} งาน
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="milestone" className="w-full">
                <TabsList>
                    <TabsTrigger value="milestone">Milestone</TabsTrigger>
                    <TabsTrigger value="gantt">Gantt</TabsTrigger>
                    <TabsTrigger value="team">ทีมงาน</TabsTrigger>
                    <TabsTrigger value="cost">งบประมาณ</TabsTrigger>
                </TabsList>

                <TabsContent value="milestone" className="mt-4">
                    <MilestoneTimeline
                        milestones={data.milestones}
                        onRefresh={onRefresh}
                    />
                </TabsContent>

                <TabsContent value="gantt" className="mt-4">
                    <GanttView
                        milestones={data.milestones}
                        projectStartDate={project.start_date}
                        projectEndDate={project.end_date}
                    />
                </TabsContent>

                <TabsContent value="team" className="mt-4">
                    <TeamWorkloadView team={data.team} />
                </TabsContent>

                <TabsContent value="cost" className="mt-4">
                    <CostSummaryView cost={data.cost} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
