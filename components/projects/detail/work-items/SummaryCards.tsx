'use client'

import { Card } from "@/components/ui/card"
import { CheckCircle2, Circle, Clock, AlertCircle, Layers, ListTodo } from "lucide-react"

interface SummaryStats {
    totalMilestones: number
    milestoneProgress: number
    totalStories: number
    completedStories: number
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    overdueTasks: number
}

interface SummaryCardsProps {
    stats: SummaryStats
}

export function SummaryCards({ stats }: SummaryCardsProps) {
    const taskProgress = stats.totalTasks > 0
        ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
        : 0

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4">
            <Card className="p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <Layers className="w-5 h-5" />
                    <span className="text-sm font-medium">Milestones</span>
                </div>
                <div>
                    <span className="text-2xl font-bold">{stats.totalMilestones}</span>
                    <span className="text-xs text-slate-500 ml-2">{stats.milestoneProgress}% avg</span>
                </div>
            </Card>

            <Card className="p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <ListTodo className="w-5 h-5" />
                    <span className="text-sm font-medium">Stories</span>
                </div>
                <div>
                    <span className="text-2xl font-bold">{stats.totalStories}</span>
                    <span className="text-xs text-slate-500 ml-2">{stats.completedStories} done</span>
                </div>
            </Card>

            <Card className="p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-violet-600 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Tasks</span>
                </div>
                <div>
                    <span className="text-2xl font-bold">{stats.totalTasks}</span>
                    <span className="text-xs text-slate-500 ml-2">{taskProgress}% done</span>
                </div>
            </Card>

            <Card className="p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Done</span>
                </div>
                <div>
                    <span className="text-2xl font-bold">{stats.completedTasks}</span>
                    <span className="text-xs text-slate-500 ml-2">tasks</span>
                </div>
            </Card>

            <Card className="p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <Circle className="w-5 h-5" />
                    <span className="text-sm font-medium">In Progress</span>
                </div>
                <div>
                    <span className="text-2xl font-bold">{stats.inProgressTasks}</span>
                    <span className="text-xs text-slate-500 ml-2">tasks</span>
                </div>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-l-4 border-l-red-500">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Overdue</span>
                </div>
                <div>
                    <span className="text-2xl font-bold">{stats.overdueTasks}</span>
                    <span className="text-xs text-slate-500 ml-2">tasks</span>
                </div>
            </Card>
        </div>
    )
}
