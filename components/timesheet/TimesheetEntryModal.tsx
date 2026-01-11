'use client'

import { useState, useEffect } from 'react'
import { X, Search, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimesheetEntryModalProps {
  open: boolean
  onClose: () => void
  date: string
  onSuccess: () => void
}

const typeColors: Record<string, string> = {
  dev: 'bg-blue-100 text-blue-700',
  bug: 'bg-red-100 text-red-700',
  rework: 'bg-amber-100 text-amber-700',
  doc: 'bg-purple-100 text-purple-700',
  test: 'bg-green-100 text-green-700'
}

export function TimesheetEntryModal({ open, onClose, date, onSuccess }: TimesheetEntryModalProps) {
  const [tasks, setTasks] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [hours, setHours] = useState<string>('')
  const [description, setDescription] = useState('')
  const [isOvertime, setIsOvertime] = useState(false)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      loadTasks()
      resetForm()
    }
  }, [open])

  const loadTasks = async () => {
    setIsLoading(true)
    // TODO: Implement getAvailableTasksForTimesheet or getMyTasksForTimesheet
    // const result = await getAvailableTasksForTimesheet()
    // if (result.success) {
    //   setTasks(result.data || [])
    // }
    setIsLoading(false)
  }

  const resetForm = () => {
    setSelectedTask(null)
    setHours('')
    setDescription('')
    setIsOvertime(false)
    setSearch('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTask || !hours) return

    setIsSaving(true)

    // TODO: Use logTimeEntry from timesheet-actions
    // const result = await logTimeEntry({
    //   taskId: selectedTask.id,
    //   entryDate: date,
    //   hours: parseFloat(hours),
    //   isOvertime,
    //   description: description || undefined
    // })
    // if (result.success) {
    //   onSuccess()
    //   onClose()
    // } else {
    //   alert(result.error)
    // }

    setIsSaving(false)
  }

  const filteredTasks = tasks.filter(t =>
    !search ||
    t.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.project_code?.toLowerCase().includes(search.toLowerCase()) ||
    t.task_title?.toLowerCase().includes(search.toLowerCase())
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Add Timesheet Entry</h2>
            <p className="text-sm text-slate-500">
              {new Date(date).toLocaleDateString('th-TH', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Task <span className="text-red-500">*</span>
            </label>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-slate-500">Loading tasks...</div>
              ) : filteredTasks.length === 0 ? (
                <div className="p-4 text-center text-slate-500">No tasks found</div>
              ) : (
                filteredTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={cn(
                      "px-3 py-2 cursor-pointer border-b last:border-b-0 hover:bg-slate-50",
                      selectedTask?.id === task.id && "bg-blue-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{task.task_title}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 text-xs rounded",
                        typeColors[task.task_type] || 'bg-slate-100'
                      )}>
                        {task.task_type_name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {task.project_code} &gt; {task.story_code} &gt; {task.task_code}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedTask && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <div className="font-medium text-blue-900">{selectedTask.task_title}</div>
              <div className="text-blue-700 text-xs mt-1">
                Project: {selectedTask.project_name} | Milestone: {selectedTask.milestone_name || '-'}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Hours <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                min="0.5"
                max="24"
                step="0.5"
                placeholder="e.g. 4"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[1, 2, 4, 6, 8].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHours(String(h))}
                  className={cn(
                    "px-3 py-1 rounded border text-sm",
                    hours === String(h) ? "bg-blue-50 border-blue-300 text-blue-700" : "hover:bg-slate-50"
                  )}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isOvertime}
              onChange={(e) => setIsOvertime(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm">This is overtime work</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What did you work on?"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedTask || !hours || isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}
