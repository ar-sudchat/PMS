'use client'

import React, { useState, useEffect } from "react"
import { X, CheckCircle2, XCircle, Clock } from "lucide-react"
import { getTasksForDate, TaskDetail } from "@/lib/actions/issue-clearing-actions"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"

interface TaskDetailModalProps {
    open: boolean
    onClose: () => void
    date: string
    employeeId: string
    employeeName: string
}

export function TaskDetailModal({ open, onClose, date, employeeId, employeeName }: TaskDetailModalProps) {
    const [tasks, setTasks] = useState<TaskDetail[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (open && date && employeeId) {
            loadTasks()
        }
    }, [open, date, employeeId])

    const loadTasks = async () => {
        setIsLoading(true)
        try {
            const result = await getTasksForDate(employeeId, date)
            if (result.success) {
                setTasks(result.data || [])
            }
        } catch (error) {
            console.error('Error loading tasks:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const completedCount = tasks.filter(t => t.is_completed_today).length
    const totalCount = tasks.length
    const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100

    const formattedDate = date ? format(new Date(date), 'd MMMM yyyy', { locale: th }) : ''
    const dayName = date ? format(new Date(date), 'EEEE', { locale: th }) : ''

    if (!open) return null

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.3 }}
                        className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">
                                    Tasks for {formattedDate}
                                </h2>
                                <p className="text-sm text-slate-500">{dayName} - {employeeName}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary */}
                        <div className={`px-6 py-3 border-b ${rate >= 85 ? 'bg-green-50' : rate >= 70 ? 'bg-orange-50' : 'bg-red-50'}`}>
                            <div className="flex items-center gap-4">
                                <span className="font-medium text-slate-700">Summary:</span>
                                <span className="text-slate-600">
                                    {totalCount} Tasks Open → {completedCount} Completed =
                                </span>
                                <span className={`font-bold ${rate >= 85 ? 'text-green-600' : rate >= 70 ? 'text-orange-600' : 'text-red-600'}`}>
                                    {rate}%
                                </span>
                                {rate >= 85 ? (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">✅ Good</span>
                                ) : (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">⚠️ Below Target</span>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[50vh]">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : tasks.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    No tasks found for this date
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Task Table */}
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-2 px-2 text-sm font-medium text-slate-600 w-16">Status</th>
                                                <th className="text-left py-2 px-2 text-sm font-medium text-slate-600">Task Code</th>
                                                <th className="text-left py-2 px-2 text-sm font-medium text-slate-600">Task Name</th>
                                                <th className="text-left py-2 px-2 text-sm font-medium text-slate-600">Project</th>
                                                <th className="text-right py-2 px-2 text-sm font-medium text-slate-600">Hours</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tasks.map((task) => (
                                                <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="py-2 px-2">
                                                        {task.is_completed_today ? (
                                                            <CheckCircle2 size={18} className="text-green-600" />
                                                        ) : (
                                                            <XCircle size={18} className="text-red-500" />
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <span className="font-mono text-sm text-blue-600">{task.task_code}</span>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <span className="text-sm text-slate-800 truncate block max-w-[200px]" title={task.task_name}>
                                                            {task.task_name}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <span className="text-sm text-slate-600">{task.project_code}</span>
                                                    </td>
                                                    <td className="py-2 px-2 text-right">
                                                        <span className="text-sm text-slate-600">
                                                            {task.hours_logged ? `${task.hours_logged}h` : '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Not Completed List */}
                                    {tasks.filter(t => !t.is_completed_today).length > 0 && (
                                        <div className="mt-4 p-3 bg-red-50 rounded-lg">
                                            <div className="flex items-center gap-1 text-sm text-red-600 font-medium mb-2">
                                                <XCircle size={14} />
                                                <span>Not Completed:</span>
                                            </div>
                                            <ul className="space-y-1">
                                                {tasks.filter(t => !t.is_completed_today).map((task) => (
                                                    <li key={task.id} className="text-sm text-slate-600 flex items-start gap-2">
                                                        <span className="text-slate-400">•</span>
                                                        <span>
                                                            <span className="font-mono text-blue-600">{task.task_code}</span>:
                                                            <span className="ml-1">{task.task_name}</span>
                                                            <span className="text-slate-400 ml-1">- Carried over to next day</span>
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end bg-slate-50">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
