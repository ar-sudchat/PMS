'use client'

import { useState, useEffect } from 'react'
import { MyTask, getMyTasks, getMyTaskCounts, updateTaskStatus } from '@/lib/actions/my-tasks-actions'
import { TaskCard } from './TaskCard'
import { StatusFilter } from './StatusFilter'
import { TaskDetailModal } from './TaskDetailModal'
import { QuickLogTimeModal } from './QuickLogTimeModal'
import { Search, Filter, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface MyTasksViewProps {
    initialTasks: MyTask[]
    initialCounts: Record<string, number>
}

export function MyTasksView({ initialTasks, initialCounts }: MyTasksViewProps) {
    const [tasks, setTasks] = useState<MyTask[]>(initialTasks)
    const [counts, setCounts] = useState<Record<string, number>>(initialCounts)
    const [statusFilter, setStatusFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // Modals
    const [detailTask, setDetailTask] = useState<MyTask | null>(null)
    const [logTimeTask, setLogTimeTask] = useState<MyTask | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isLogTimeOpen, setIsLogTimeOpen] = useState(false)

    const fetchTasks = async (status: string) => {
        setIsLoading(true)
        try {
            // Fetch tasks filtered by status
            // Note: Search is client-side filtered usually for speed unless large dataset.
            // Server action supports filters. Let's use server filtering for status.
            const res = await getMyTasks({ status })

            // Also refresh counts
            const newCounts = await getMyTaskCounts()

            setTasks(res)
            setCounts(newCounts)
        } catch (error) {
            toast.error('Failed to refresh tasks')
        } finally {
            setIsLoading(false)
        }
    }

    const handleStatusChange = async (newStatus: string) => {
        setStatusFilter(newStatus)
        await fetchTasks(newStatus)
    }

    const handleTaskStatusUpdate = async (task: MyTask, newStatus: string) => {
        // Optimistic update
        const oldStatus = task.status

        // Update local state temporarily
        // But if filtering by status, it might disappear. That's actually desired behavior usually.

        const result = await updateTaskStatus(task.task_id, newStatus)
        if (result.success) {
            toast.success(`Task status updated to ${newStatus}`)
            // Refresh list to ensure consistency and correct counts
            await fetchTasks(statusFilter)

            // If detail modal is open, update that task too
            if (detailTask && detailTask.task_id === task.task_id) {
                setDetailTask({ ...detailTask, status: newStatus })
            }
        } else {
            toast.error('Failed to update status')
        }
    }

    const filteredTasks = tasks.filter(t =>
    (search === '' ||
        t.task_title.toLowerCase().includes(search.toLowerCase()) ||
        t.task_code.toLowerCase().includes(search.toLowerCase()) ||
        t.project_name.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header / Filter Bar */}
            <div className="px-6 pt-6 pb-4 bg-white border-b border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <StatusFilter
                    currentStatus={statusFilter}
                    onStatusChange={handleStatusChange}
                    counts={counts}
                />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p className="text-lg font-medium">No tasks found</p>
                        <p className="text-sm mt-1">You don't have any tasks in this view.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredTasks.map(task => (
                            <TaskCard
                                key={task.task_id}
                                task={task}
                                onViewDetail={(t) => {
                                    setDetailTask(t)
                                    setIsDetailOpen(true)
                                }}
                                onLogTime={(t) => {
                                    setLogTimeTask(t)
                                    setIsLogTimeOpen(true)
                                }}
                                onStatusChange={handleTaskStatusUpdate}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <TaskDetailModal
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                task={detailTask}
                onLogTime={(t) => {
                    setLogTimeTask(t)
                    setIsLogTimeOpen(true)
                }}
                onStatusChange={handleTaskStatusUpdate}
            />

            <QuickLogTimeModal
                open={isLogTimeOpen}
                onOpenChange={setIsLogTimeOpen}
                task={logTimeTask}
                postLogAction={() => fetchTasks(statusFilter)}
            />
        </div>
    )
}
