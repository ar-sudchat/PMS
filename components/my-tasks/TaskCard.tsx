'use client'

import { MyTask } from '@/lib/actions/my-tasks-actions'
import { Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskCardProps {
    task: MyTask
    onViewDetail: (task: MyTask) => void
    onLogTime: (task: MyTask) => void
    onStatusChange: (task: MyTask, newStatus: string) => void
}

export function TaskCard({ task, onViewDetail, onLogTime, onStatusChange }: TaskCardProps) {

    const getPriorityColor = (p: string) => {
        switch (p?.toLowerCase()) {
            case 'high': return 'text-red-600 bg-red-50 border-red-100'
            case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100'
            default: return 'text-slate-600 bg-slate-50 border-slate-100'
        }
    }

    const getStatusColor = (s: string) => {
        switch (s?.toLowerCase()) {
            case 'done': return 'text-green-600 bg-green-50'
            case 'in_progress': return 'text-blue-600 bg-blue-50'
            case 'review': return 'text-purple-600 bg-purple-50'
            case 'blocked': return 'text-red-600 bg-red-50'
            default: return 'text-slate-600 bg-slate-50'
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {task.task_code}
                        </span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border", getPriorityColor(task.priority))}>
                            {task.priority || 'Normal'}
                        </span>
                    </div>
                    <h3
                        className="font-semibold text-slate-900 line-clamp-1 cursor-pointer hover:text-indigo-600"
                        onClick={() => onViewDetail(task)}
                    >
                        {task.task_title}
                    </h3>
                </div>
                {task.is_overdue && (
                    <div className="text-red-500" title="Overdue">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                )}
            </div>

            <div className="text-xs text-slate-500 mb-4 space-y-1">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    {task.project_name}
                </div>
                <div className="flex items-center gap-1.5 pl-3.5 border-l-2 border-slate-100 ml-1">
                    {task.story_code}: {task.story_title}
                </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded-lg">
                <div className="flex items-center gap-1.5 min-w-[100px]">
                    <Calendar className={cn("w-3.5 h-3.5", task.is_overdue ? "text-red-500" : "")} />
                    <span className={task.is_overdue ? "text-red-600 font-medium" : ""}>
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB') : 'No Date'}
                    </span>
                    {task.days_until_due <= 3 && task.days_until_due >= 0 && (
                        <span className="text-amber-600 font-medium">({task.days_until_due}d left)</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 flex-1 w-full">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <div className="flex-1">
                        <div className="flex justify-between mb-1">
                            <span>{task.actual_hours}h / {task.estimated_hours}h</span>
                            <span className="font-medium">{task.progress_percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full", task.progress_percent >= 100 ? "bg-green-500" : "bg-indigo-500")}
                                style={{ width: `${Math.min(task.progress_percent, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex gap-2">
                    <button
                        onClick={() => onViewDetail(task)}
                        className="text-xs font-medium text-slate-600 hover:text-indigo-600 px-2 py-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                    >
                        View Detail
                    </button>
                    <button
                        onClick={() => onLogTime(task)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1.5 bg-indigo-50 border border-indigo-100 rounded hover:bg-indigo-100 transition-colors"
                    >
                        Log Time
                    </button>
                </div>

                <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task, e.target.value)}
                    className={cn(
                        "text-xs font-medium px-2 py-1.5 rounded border outline-none cursor-pointer appearance-none pr-6 bg-no-repeat bg-[right_0.2rem_center] bg-[length:12px]",
                        getStatusColor(task.status)
                    )}
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor' class='w-6 h-6'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3e%3c/svg%3e")`
                    }}
                >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                </select>
            </div>
        </div>
    )
}
