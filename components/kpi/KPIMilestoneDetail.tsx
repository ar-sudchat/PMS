'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Circle,
    Calendar,
    TrendingUp,
    TrendingDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

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

interface KPIMilestoneDetailProps {
    milestones: MilestoneKPIDetail[]
    className?: string
}

const getTimeStatusIcon = (status: string) => {
    switch (status) {
        case 'on_time':
            return <CheckCircle2 className="h-4 w-4 text-green-500" />
        case 'late':
            return <XCircle className="h-4 w-4 text-red-500" />
        case 'on_track':
            return <Clock className="h-4 w-4 text-blue-500" />
        case 'overdue':
            return <AlertTriangle className="h-4 w-4 text-red-500" />
        default:
            return <Circle className="h-4 w-4 text-slate-400" />
    }
}

const getTimeStatusLabel = (status: string) => {
    switch (status) {
        case 'on_time':
            return 'On-time'
        case 'late':
            return 'Late'
        case 'on_track':
            return 'On track'
        case 'overdue':
            return 'Overdue'
        default:
            return 'No date'
    }
}

const getBudgetStatusIcon = (status: string) => {
    switch (status) {
        case 'within_budget':
            return <TrendingDown className="h-4 w-4 text-green-500" />
        case 'over_budget':
            return <TrendingUp className="h-4 w-4 text-red-500" />
        default:
            return <Circle className="h-4 w-4 text-slate-400" />
    }
}

const getBudgetStatusLabel = (status: string, variance: number) => {
    switch (status) {
        case 'within_budget':
            return variance < 0 ? `${Math.abs(variance).toFixed(1)} MD under` : 'On budget'
        case 'over_budget':
            return `+${variance.toFixed(1)} MD over`
        default:
            return 'No budget'
    }
}

export function KPIMilestoneDetail({ milestones, className }: KPIMilestoneDetailProps) {
    if (milestones.length === 0) {
        return (
            <div className="p-4 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                No milestones found
            </div>
        )
    }

    return (
        <div className={cn('border rounded-lg overflow-hidden', className)}>
            <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                            Milestone
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                            Weight
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                            Progress
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                            <div className="flex items-center justify-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Time Status
                            </div>
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                            Budget Status
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {milestones.map((milestone) => (
                        <tr
                            key={milestone.milestone_id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                        >
                            {/* Milestone Name */}
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: milestone.milestone_color || '#94a3b8' }}
                                    />
                                    <div>
                                        <div className="font-medium text-slate-800 dark:text-slate-200">
                                            {milestone.milestone_name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {milestone.milestone_code}
                                            {milestone.kpi_category && (
                                                <Badge variant="outline" className="ml-2 text-xs">
                                                    {milestone.kpi_category}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            {/* Weight */}
                            <td className="px-4 py-3 text-center">
                                <Badge variant="secondary">
                                    {milestone.weight_percent}%
                                </Badge>
                            </td>

                            {/* Progress */}
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <Progress
                                        value={milestone.progress_percent}
                                        className="h-2 w-20"
                                    />
                                    <span className={cn(
                                        'text-sm font-medium',
                                        milestone.progress_percent >= 100 ? 'text-green-600' :
                                            milestone.progress_percent >= 50 ? 'text-blue-600' :
                                                'text-slate-600'
                                    )}>
                                        {milestone.progress_percent}%
                                    </span>
                                </div>
                            </td>

                            {/* Time Status */}
                            <td className="px-4 py-3">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1">
                                        {getTimeStatusIcon(milestone.time_status)}
                                        <span className={cn(
                                            'text-sm font-medium',
                                            milestone.time_status === 'on_time' || milestone.time_status === 'on_track'
                                                ? 'text-green-600'
                                                : milestone.time_status === 'late' || milestone.time_status === 'overdue'
                                                    ? 'text-red-600'
                                                    : 'text-slate-500'
                                        )}>
                                            {getTimeStatusLabel(milestone.time_status)}
                                        </span>
                                    </div>
                                    {milestone.due_date && (
                                        <div className="text-xs text-slate-500">
                                            Due: {format(new Date(milestone.due_date), 'dd MMM yyyy')}
                                            {milestone.days_variance !== 0 && (
                                                <span className={cn(
                                                    'ml-1',
                                                    milestone.days_variance > 0 ? 'text-red-500' : 'text-green-500'
                                                )}>
                                                    ({milestone.days_variance > 0 ? '+' : ''}{milestone.days_variance}d)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {milestone.completed_date && (
                                        <div className="text-xs text-green-600">
                                            Completed: {format(new Date(milestone.completed_date), 'dd MMM yyyy')}
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* Budget Status */}
                            <td className="px-4 py-3">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1">
                                        {getBudgetStatusIcon(milestone.budget_status)}
                                        <span className={cn(
                                            'text-sm font-medium',
                                            milestone.budget_status === 'within_budget'
                                                ? 'text-green-600'
                                                : milestone.budget_status === 'over_budget'
                                                    ? 'text-red-600'
                                                    : 'text-slate-500'
                                        )}>
                                            {getBudgetStatusLabel(milestone.budget_status, milestone.manday_variance)}
                                        </span>
                                    </div>
                                    {(milestone.planned_mandays > 0 || milestone.actual_mandays > 0) && (
                                        <div className="text-xs text-slate-500">
                                            {milestone.actual_mandays?.toFixed(1) || '0'} / {milestone.planned_mandays?.toFixed(1) || '0'} MD
                                            {milestone.manday_variance_percent !== 0 && (
                                                <span className={cn(
                                                    'ml-1',
                                                    milestone.manday_variance_percent > 0 ? 'text-red-500' : 'text-green-500'
                                                )}>
                                                    ({milestone.manday_variance_percent > 0 ? '+' : ''}{milestone.manday_variance_percent?.toFixed(0) || 0}%)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
