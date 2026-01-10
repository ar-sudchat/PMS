'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MyTask } from '@/lib/actions/my-tasks-actions'
import { logTimeEntry } from '@/lib/actions/timesheet-actions'
import { format } from 'date-fns'
import { Calendar, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button' // If exists, else html button. I see Input used previously.

interface QuickLogTimeModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    task: MyTask | null
    postLogAction?: () => void
}

export function QuickLogTimeModal({ open, onOpenChange, task, postLogAction }: QuickLogTimeModalProps) {
    const [hours, setHours] = useState<string>('1') // string for input
    const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
    const [activityType, setActivityType] = useState('development')
    const [description, setDescription] = useState('')
    const [isOvertime, setIsOvertime] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (open) {
            // Reset fields
            setHours('1')
            setDate(format(new Date(), 'yyyy-MM-dd'))
            setActivityType('development')
            setDescription('')
            setIsOvertime(false)
        }
    }, [open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!task) return

        setIsSubmitting(true)
        try {
            const result = await logTimeEntry({
                taskId: task.task_id,
                entryDate: date,
                hours: parseFloat(hours),
                description,
                activityType,
                isOvertime
            })

            if (result.success) {
                toast.success('Time logged successfully')
                onOpenChange(false)
                if (postLogAction) postLogAction()
            } else {
                toast.error(result.error || 'Failed to log time')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!task) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Log Time</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="bg-slate-50 p-3 rounded-md border border-slate-100 flex justify-between items-center text-sm">
                        <div>
                            <div className="font-medium text-slate-900">{task.task_code}</div>
                            <div className="text-slate-500 line-clamp-1">{task.task_title}</div>
                        </div>
                        <div className="text-xs text-right text-slate-400">
                            {task.project_code}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full text-sm p-2 rounded-md border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Hours</label>
                            <div className="relative">
                                <Clock className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                                <input
                                    type="number"
                                    min="0.25"
                                    max="24"
                                    step="0.25"
                                    value={hours}
                                    onChange={(e) => setHours(e.target.value)}
                                    className="w-full text-sm p-2 pl-9 rounded-md border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Activity Type</label>
                        <select
                            value={activityType}
                            onChange={(e) => setActivityType(e.target.value)}
                            className="w-full text-sm p-2 rounded-md border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="development">Development</option>
                            <option value="bug_fix">Bug Fix (Defect)</option>
                            <option value="meeting">Meeting</option>
                            <option value="documentation">Documentation</option>
                            <option value="testing">Testing</option>
                            <option value="support">Support</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="What did you work on?"
                            className="w-full text-sm p-2 rounded-md border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="ot"
                            checked={isOvertime}
                            onChange={(e) => setIsOvertime(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <label htmlFor="ot" className="text-sm text-slate-700">This is Overtime (OT)</label>
                    </div>

                    <DialogFooter className="mt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Log Time
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
