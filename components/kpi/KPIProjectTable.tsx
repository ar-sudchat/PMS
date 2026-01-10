'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KPIMilestoneDetail } from './KPIMilestoneDetail'
import {
    ChevronDown,
    ChevronUp,
    Clock,
    DollarSign,
    CheckCircle2,
    XCircle,
    AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeToDeliveryKPI {
    project_id: string
    project_code: string
    project_name: string
    project_year: number
    total_milestones: number
    on_time_milestones: number
    late_milestones: number
    total_weight: number
    kpi_score: number
    kpi_target: number
    kpi_status: 'PASS' | 'FAIL'
}

interface MandayControlKPI {
    project_id: string
    project_code: string
    project_name: string
    project_year: number
    total_milestones: number
    within_budget_milestones: number
    over_budget_milestones: number
    total_planned_mandays: number
    total_actual_mandays: number
    total_variance: number
    total_weight: number
    kpi_score: number
    kpi_target: number
    kpi_status: 'PASS' | 'FAIL'
}

interface MilestoneKPIDetail {
    project_id: string
    milestone_id: string
    milestone_code: string
    milestone_name: string
    milestone_color: string | null
    kpi_category: string | null
    weight_percent: number
    progress_percent: number
    status: string
    due_date: string | null
    completed_date: string | null
    days_variance: number
    time_status: 'on_time' | 'late' | 'on_track' | 'overdue' | 'no_date'
    planned_mandays: number
    actual_mandays: number
    manday_variance: number
    manday_variance_percent: number
    budget_status: 'within_budget' | 'over_budget' | 'no_budget'
}

interface KPIProjectTableProps {
    timeToDelivery: TimeToDeliveryKPI[]
    mandayControl: MandayControlKPI[]
    onLoadMilestones: (projectId: string) => Promise<MilestoneKPIDetail[]>
    loading?: boolean
    className?: string
}

export function KPIProjectTable({
    timeToDelivery,
    mandayControl,
    onLoadMilestones,
    loading = false,
    className
}: KPIProjectTableProps) {
    const [expandedProject, setExpandedProject] = useState<string | null>(null)
    const [milestoneDetails, setMilestoneDetails] = useState<Record<string, MilestoneKPIDetail[]>>({})
    const [loadingMilestones, setLoadingMilestones] = useState<string | null>(null)

    // Combine TTD and MDC data by project
    const combinedData = timeToDelivery.map(ttd => {
        const mdc = mandayControl.find(m => m.project_id === ttd.project_id)
        return {
            ...ttd,
            mdc_score: mdc?.kpi_score || 0,
            mdc_status: mdc?.kpi_status || 'FAIL' as const,
            mdc_target: mdc?.kpi_target || 85,
            within_budget_milestones: mdc?.within_budget_milestones || 0,
            over_budget_milestones: mdc?.over_budget_milestones || 0,
            total_planned_mandays: mdc?.total_planned_mandays || 0,
            total_actual_mandays: mdc?.total_actual_mandays || 0,
            total_variance: mdc?.total_variance || 0
        }
    })

    const handleExpand = async (projectId: string) => {
        if (expandedProject === projectId) {
            setExpandedProject(null)
            return
        }

        setExpandedProject(projectId)

        // Load milestone details if not already loaded
        if (!milestoneDetails[projectId]) {
            setLoadingMilestones(projectId)
            try {
                const details = await onLoadMilestones(projectId)
                setMilestoneDetails(prev => ({ ...prev, [projectId]: details }))
            } catch (error) {
                console.error('Failed to load milestone details:', error)
            } finally {
                setLoadingMilestones(null)
            }
        }
    }

    if (loading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle>Project KPI Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse flex items-center gap-4 p-4 border rounded-lg">
                                <div className="h-4 w-24 bg-slate-200 rounded" />
                                <div className="h-4 w-40 bg-slate-200 rounded flex-1" />
                                <div className="h-6 w-16 bg-slate-200 rounded" />
                                <div className="h-6 w-16 bg-slate-200 rounded" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Project KPI Overview
                    <Badge variant="outline">{combinedData.length} projects</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {/* Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-slate-500 border-b">
                        <div className="col-span-1">Project</div>
                        <div className="col-span-3">Name</div>
                        <div className="col-span-1 text-center">Year</div>
                        <div className="col-span-1 text-center">Milestones</div>
                        <div className="col-span-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3" />
                                Time to Delivery
                            </div>
                        </div>
                        <div className="col-span-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                Man-day Control
                            </div>
                        </div>
                        <div className="col-span-2 text-center">Overall</div>
                    </div>

                    {/* Rows */}
                    {combinedData.map((project) => (
                        <div key={project.project_id}>
                            <div
                                className={cn(
                                    'grid grid-cols-12 gap-4 px-4 py-3 items-center rounded-lg border cursor-pointer transition-colors',
                                    expandedProject === project.project_id
                                        ? 'bg-slate-50 dark:bg-slate-800/50 border-blue-200 dark:border-blue-800'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                )}
                                onClick={() => handleExpand(project.project_id)}
                            >
                                {/* Project Code */}
                                <div className="col-span-1 font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                                    {project.project_code}
                                </div>

                                {/* Project Name */}
                                <div className="col-span-3 text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                    {project.project_name}
                                </div>

                                {/* Year */}
                                <div className="col-span-1 text-center text-sm text-slate-600 dark:text-slate-400">
                                    {project.project_year}
                                </div>

                                {/* Milestones */}
                                <div className="col-span-1 text-center text-sm text-slate-600 dark:text-slate-400">
                                    {project.total_milestones}
                                </div>

                                {/* TTD Score */}
                                <div className="col-span-2 flex items-center justify-center gap-2">
                                    <div className={cn(
                                        'text-lg font-bold',
                                        project.kpi_status === 'PASS' ? 'text-green-600' : 'text-red-600'
                                    )}>
                                        {project.kpi_score.toFixed(1)}%
                                    </div>
                                    <Badge
                                        variant={project.kpi_status === 'PASS' ? 'default' : 'destructive'}
                                        className="text-xs"
                                    >
                                        {project.kpi_status}
                                    </Badge>
                                </div>

                                {/* MDC Score */}
                                <div className="col-span-2 flex items-center justify-center gap-2">
                                    <div className={cn(
                                        'text-lg font-bold',
                                        project.mdc_status === 'PASS' ? 'text-green-600' : 'text-red-600'
                                    )}>
                                        {project.mdc_score.toFixed(1)}%
                                    </div>
                                    <Badge
                                        variant={project.mdc_status === 'PASS' ? 'default' : 'destructive'}
                                        className="text-xs"
                                    >
                                        {project.mdc_status}
                                    </Badge>
                                </div>

                                {/* Overall Status */}
                                <div className="col-span-2 flex items-center justify-center gap-2">
                                    {project.kpi_status === 'PASS' && project.mdc_status === 'PASS' ? (
                                        <div className="flex items-center gap-1 text-green-600">
                                            <CheckCircle2 className="h-5 w-5" />
                                            <span className="text-sm font-medium">All Pass</span>
                                        </div>
                                    ) : project.kpi_status === 'FAIL' && project.mdc_status === 'FAIL' ? (
                                        <div className="flex items-center gap-1 text-red-600">
                                            <XCircle className="h-5 w-5" />
                                            <span className="text-sm font-medium">All Fail</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-yellow-600">
                                            <AlertTriangle className="h-5 w-5" />
                                            <span className="text-sm font-medium">Partial</span>
                                        </div>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleExpand(project.project_id)
                                        }}
                                    >
                                        {expandedProject === project.project_id ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Expanded Milestone Details */}
                            {expandedProject === project.project_id && (
                                <div className="ml-4 mt-2 mb-4">
                                    {loadingMilestones === project.project_id ? (
                                        <div className="p-4 text-center text-slate-500">
                                            Loading milestone details...
                                        </div>
                                    ) : milestoneDetails[project.project_id] ? (
                                        <KPIMilestoneDetail
                                            milestones={milestoneDetails[project.project_id]}
                                        />
                                    ) : null}
                                </div>
                            )}
                        </div>
                    ))}

                    {combinedData.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            No projects found
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
