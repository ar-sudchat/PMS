'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getAvailableTasksForTimesheet } from '@/lib/actions/timesheet-actions'
import { Search, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddTaskModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onTaskSelect: (taskId: string) => void
}

export function AddTaskModal({ open, onOpenChange, onTaskSelect }: AddTaskModalProps) {
    const [tasks, setTasks] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [search, setSearch] = useState('')

    useEffect(() => {
        if (open) {
            loadTasks()
        }
    }, [open])

    const loadTasks = async () => {
        setIsLoading(true)
        try {
            const res = await getAvailableTasksForTimesheet()
            setTasks(res)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const filteredTasks = tasks.filter(t =>
        t.task_title.toLowerCase().includes(search.toLowerCase()) ||
        t.task_code.toLowerCase().includes(search.toLowerCase()) ||
        t.project_name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl h-[500px] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Add Task to Timesheet</DialogTitle>
                </DialogHeader>

                <div className="relative mt-2">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by task, code, or project..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                    />
                </div>

                <div className="flex-1 overflow-y-auto mt-4 border border-slate-100 rounded-lg">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <p>No tasks found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredTasks.map(task => (
                                <div
                                    key={task.task_id}
                                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between group"
                                    onClick={() => onTaskSelect(task.task_id)}
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                {task.task_code}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {task.project_code}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium text-slate-700 group-hover:text-indigo-600">
                                            {task.task_title}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {task.project_name}
                                        </div>
                                    </div>
                                    <Plus className="w-5 h-5 text-slate-300 group-hover:text-indigo-600" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
