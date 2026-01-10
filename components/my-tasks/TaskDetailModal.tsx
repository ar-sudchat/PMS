'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MyTask } from '@/lib/actions/my-tasks-actions'
import { format } from 'date-fns'
import { Calendar, Clock, Tag, CheckSquare, AlignLeft, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskDetailModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    task: MyTask | null
    onLogTime: (task: MyTask) => void
    onStatusChange: (task: MyTask, status: string) => void
}

export function TaskDetailModal({ open, onOpenChange, task, onLogTime, onStatusChange }: TaskDetailModalProps) {
    if (!task) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {task.task_code}
                        </span>
                        <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full border uppercase font-medium",
                            task.priority === 'High' ? 'text-red-600 bg-red-50 border-red-100' :
                                task.priority === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                    'text-slate-600 bg-slate-50 border-slate-100'
                        )}>
                            {task.priority || 'Normal'}
                        </span>
                        {task.is_overdue && (
                            <span className="text-xs flex items-center gap-1 text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                <AlertCircle className="w-3 h-3" /> Overdue
                            </span>
                        )}
                    </div>
                    <DialogTitle className="text-xl font-bold text-slate-900">
                        {task.task_title}
                    </DialogTitle>
                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                        <span className="font-medium text-slate-700">{task.project_code}: {task.project_name}</span>
                        <span>•</span>
                        <span>{task.story_code}: {task.story_title}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.milestone_color || '#ccc' }} />
                            {task.milestone_name}
                        </span>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    {/* Left Column: Details */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Description */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                <AlignLeft className="w-4 h-4 text-slate-400" />
                                Description
                            </h4>
                            <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                                {task.task_description || 'No description provided.'}
                            </div>
                        </div>

                        {/* Acceptance Criteria */}
                        {task.acceptance_criteria && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4 text-slate-400" />
                                    Acceptance Criteria
                                </h4>
                                <div className="bg-green-50/50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap border border-green-100">
                                    {task.acceptance_criteria}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {task.notes && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-2">Notes</h4>
                                <div className="text-sm text-slate-600 italic">
                                    {task.notes}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Meta & Actions */}
                    <div className="space-y-6">
                        {/* Status */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Status</label>
                                <select
                                    value={task.status}
                                    onChange={(e) => onStatusChange(task, e.target.value)}
                                    className="w-full text-sm rounded-md border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="todo">To Do</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="review">Review</option>
                                    <option value="done">Done</option>
                                    <option value="blocked">Blocked</option>
                                </select>
                            </div>

                            {/* Dates */}
                            <div className="space-y-3 pt-3 border-t border-slate-200/50">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Start Date
                                    </label>
                                    <div className="text-sm text-slate-700">
                                        {task.start_date ? format(new Date(task.start_date), 'dd MMM yyyy') : '-'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Due Date
                                    </label>
                                    <div className={cn("text-sm font-medium", task.is_overdue ? "text-red-600" : "text-slate-700")}>
                                        {task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy') : '-'}
                                        {task.days_until_due <= 3 && task.days_until_due >= 0 && (
                                            <span className="text-amber-500 ml-2 text-xs">({task.days_until_due}d left)</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Effort */}
                            <div className="space-y-3 pt-3 border-t border-slate-200/50">
                                <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Effort
                                </label>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600">Progress</span>
                                        <span className="font-semibold">{task.progress_percent}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full", task.progress_percent >= 100 ? "bg-green-500" : "bg-indigo-500")}
                                            style={{ width: `${Math.min(task.progress_percent, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                                        <span>Est: {task.estimated_hours}h</span>
                                        <span>Act: {task.actual_hours}h</span>
                                    </div>
                                    {task.remaining_hours < 0 && (
                                        <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Over budget by {Math.abs(task.remaining_hours)}h
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        onLogTime(task)
                                        // We might want to keep detail modal open or not?
                                        // Usually log time modal opens ON TOP or replaces.
                                        // onLogTime logic in parent should handle this.
                                    }}
                                    className="w-full mt-2 py-2 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    <Clock className="w-4 h-4" /> Log Time
                                </button>
                            </div>

                            {/* Meta */}
                            <div className="space-y-2 pt-3 border-t border-slate-200/50">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Type</span>
                                    <span className="capitalize">{task.task_type}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Phase</span>
                                    <span className="capitalize">{task.work_phase || 'Development'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer mainly for closing if needed, but X icon exists */}
            </DialogContent>
        </Dialog>
    )
}
