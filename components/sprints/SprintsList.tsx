'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Plus,
    Calendar,
    Target,
    ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sprint } from '@/lib/actions/sprint-actions'

interface SprintsListProps {
    initialSprints: Sprint[]
}

export function SprintsList({ initialSprints }: SprintsListProps) {
    const statusColors = {
        active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        completed: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
        planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }

    return (
        <div className="pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sprints</h1>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Sprint
                </Button>
            </div>

            {/* Sprint List */}
            <div className="space-y-4">
                {initialSprints.length === 0 ? (
                    <Card className="p-8 text-center">
                        <p className="text-slate-500 mb-4">No sprints found</p>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Sprint
                        </Button>
                    </Card>
                ) : (
                    initialSprints.map((sprint) => {
                        const progress = sprint.tasks_count > 0
                            ? Math.round((sprint.completed_tasks / sprint.tasks_count) * 100)
                            : 0

                        return (
                            <Link key={sprint.id} href={`/sprints/${sprint.id}`}>
                                <Card className="p-5 hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer group">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                'w-10 h-10 rounded-lg flex items-center justify-center',
                                                sprint.status === 'active'
                                                    ? 'bg-emerald-100 text-emerald-600'
                                                    : sprint.status === 'completed'
                                                        ? 'bg-slate-100 text-slate-600'
                                                        : 'bg-blue-100 text-blue-600'
                                            )}>
                                                {sprint.status === 'active' ? '🏃' : sprint.status === 'completed' ? '✅' : '📅'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                                        {sprint.name}
                                                    </h3>
                                                    <Badge className={statusColors[sprint.status]}>
                                                        {sprint.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(sprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        {' - '}
                                                        {new Date(sprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    {sprint.project_name && (
                                                        <span className="text-xs">
                                                            {sprint.project_code}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                    </div>

                                    {/* Goal */}
                                    {sprint.goal && (
                                        <div className="mt-4 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                            <Target className="h-4 w-4 shrink-0 mt-0.5" />
                                            <p>{sprint.goal}</p>
                                        </div>
                                    )}

                                    {/* Progress */}
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">
                                                {sprint.completed_tasks}/{sprint.tasks_count} tasks completed
                                            </span>
                                            <span className="font-medium">{progress}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    'h-full rounded-full transition-all',
                                                    sprint.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
                                                )}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        )
                    })
                )}
            </div>
        </div>
    )
}
