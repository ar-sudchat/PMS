'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MyTask } from '@/lib/actions/my-tasks-actions'
import { logTimeEntry } from '@/lib/actions/timesheet-actions'
import { format } from 'date-fns'
import { Calendar, Clock, Loader2, ArrowRightLeft, ListChecks, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import { getTaskTypes } from '@/lib/actions/task-actions'
import { getChecklistItems, toggleChecklistItem, ChecklistItem } from '@/lib/actions/checklist-actions'

interface QuickLogTimeModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    task: MyTask | null
    postLogAction?: () => void
}

type TimeUnit = 'hours' | 'minutes'

export function QuickLogTimeModal({ open, onOpenChange, task, postLogAction }: QuickLogTimeModalProps) {
    const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
    const [activityType, setActivityType] = useState('development')
    const [description, setDescription] = useState('')
    const [isOvertime, setIsOvertime] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activityOptions, setActivityOptions] = useState<{ value: string, label: string }[]>([])
    const formRef = useRef<HTMLFormElement>(null)

    // Handle Enter key to move to next field
    const handleEnterKey = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const inputs = Array.from(formRef.current?.querySelectorAll(
                'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled])'
            ) || []) as HTMLElement[]
            const currentIdx = inputs.indexOf(e.currentTarget)
            if (currentIdx !== -1 && currentIdx < inputs.length - 1) {
                inputs[currentIdx + 1].focus()
            }
        }
    }

    // Checklist State
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
    const [loadingChecklist, setLoadingChecklist] = useState(false)

    // Time Unit State
    const [timeUnit, setTimeUnit] = useState<TimeUnit>('hours')
    const [inputValue, setInputValue] = useState<string>('1') // Value shown in input
    const [displayConversion, setDisplayConversion] = useState<string>('') // e.g. "90 min = 1.5 hr"

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const types = await getTaskTypes()
                const dynamicOptions = types.map((t: any) => ({
                    value: t.value || t.code,
                    label: t.label || t.name
                }))
                setActivityOptions(dynamicOptions)

                // Set default if empty and not set
                if (dynamicOptions.length > 0 && !activityType) {
                    setActivityType(dynamicOptions[0].value)
                }
            } catch (error) {
                console.error("Failed to load task types", error)
                setActivityOptions([
                    { value: 'development', label: 'Development' },
                    { value: 'bug_fix', label: 'Bug Fix' }
                ])
            }
        }
        loadOptions()
    }, [])

    useEffect(() => {
        if (open) {
            setInputValue('1')
            setTimeUnit('hours')

            // Default date: use task's start_date if available, otherwise today
            const today = new Date()
            let defaultDate = today

            if (task?.start_date) {
                const taskStartDate = new Date(task.start_date)
                // Use task's start_date if it's not in the future
                if (taskStartDate <= today) {
                    defaultDate = taskStartDate
                }
            }
            setDate(format(defaultDate, 'yyyy-MM-dd'))

            // Default to task type if available
            if (task?.task_type) {
                setActivityType(task.task_type)
            } else if (activityOptions.length > 0) {
                setActivityType(activityOptions[0].value)
            }

            setDescription('')
            setIsOvertime(false)
            setDisplayConversion('')

            // Load checklist items
            if (task?.task_id) {
                loadChecklistItems(task.task_id)
            }
        }
    }, [open, activityOptions, task])

    // Load checklist items for the task
    const loadChecklistItems = async (taskId: string) => {
        setLoadingChecklist(true)
        try {
            const items = await getChecklistItems(taskId)
            setChecklistItems(items)
        } catch (error) {
            console.error('Failed to load checklist:', error)
            setChecklistItems([])
        } finally {
            setLoadingChecklist(false)
        }
    }

    // Handle checklist item toggle
    const handleToggleChecklist = async (item: ChecklistItem) => {
        const newValue = !item.is_completed
        // Optimistic update
        setChecklistItems(prev =>
            prev.map(i => i.id === item.id ? { ...i, is_completed: newValue } : i)
        )

        try {
            const result = await toggleChecklistItem(item.id, newValue)
            if (!result.success) {
                // Revert on error
                setChecklistItems(prev =>
                    prev.map(i => i.id === item.id ? { ...i, is_completed: !newValue } : i)
                )
                toast.error('Failed to update checklist')
            }
        } catch (error) {
            // Revert on error
            setChecklistItems(prev =>
                prev.map(i => i.id === item.id ? { ...i, is_completed: !newValue } : i)
            )
            toast.error('Failed to update checklist')
        }
    }

    // Handle Input Change
    const handleInputChange = (val: string) => {
        setInputValue(val)
        updateConversionPreview(val, timeUnit)
    }

    // Handle Unit Toggle
    const toggleUnit = () => {
        const newUnit = timeUnit === 'hours' ? 'minutes' : 'hours'
        setTimeUnit(newUnit)

        // Auto convert value
        const currentVal = parseFloat(inputValue) || 0
        if (currentVal > 0) {
            if (newUnit === 'minutes') {
                // Hours -> Minutes
                setInputValue(Math.round(currentVal * 60).toString())
            } else {
                // Minutes -> Hours (2 decimal places)
                setInputValue((currentVal / 60).toFixed(2).replace(/\.00$/, ''))
            }
        }

        updateConversionPreview(inputValue, newUnit) // Update preview clearing? No, confusing.
        // Actually, if we convert value, we don't need preview essentially. 
        // But user asked for "convert to hour" displayed.
        // If I type 90 mins, I want to see "1.5 hours"
        // So update preview AFTER conversion logic.

        // Wait, if I toggle, the input value ITSELF changes.
        // If I input 1.5 Hr -> Toggle -> Input becomes 90 Min.
        // In that case, preview might just say "1.5 Hr" again?
        // Let's keep it simple: Preview always shows the "Other unit" equivalent.
    }

    // Update conversion text
    const updateConversionPreview = (val: string, unit: TimeUnit) => {
        const num = parseFloat(val) || 0
        if (num <= 0) {
            setDisplayConversion('')
            return
        }

        if (unit === 'minutes') {
            const hrs = (num / 60).toFixed(2).replace(/\.00$/, '')
            setDisplayConversion(`${hrs} hrs`)
        } else {
            const mins = Math.round(num * 60)
            setDisplayConversion(`${mins} mins`)
        }
    }

    // Effect to update conversion when unit or input changes (redundant if called in handlers, but safe)
    useEffect(() => {
        updateConversionPreview(inputValue, timeUnit)
    }, [inputValue, timeUnit])


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!task) return

        let hoursToLog = parseFloat(inputValue)
        if (isNaN(hoursToLog) || hoursToLog <= 0) {
            toast.error('Please enter valid time')
            return
        }

        if (timeUnit === 'minutes') {
            hoursToLog = hoursToLog / 60
        }

        // Round to 2 decimals
        hoursToLog = Math.round(hoursToLog * 100) / 100

        setIsSubmitting(true)
        try {
            const result = await logTimeEntry({
                taskId: task.task_id,
                entryDate: date,
                hours: hoursToLog,
                description,
                activityType,
                isOvertime
            })

            if (result.success) {
                toast.success(`Logged ${hoursToLog} hours successfully`)
                onOpenChange(false)
                if (postLogAction) postLogAction()
            } else {
                console.error('Log time failed:', result.error)
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
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Log Time</DialogTitle>
                </DialogHeader>

                <form ref={formRef} onSubmit={handleSubmit} className="mt-2">
                    {/* Task Info Header */}
                    <div className="bg-slate-50 p-3 rounded-md border border-slate-100 flex justify-between items-center text-sm mb-6">
                        <div>
                            <div className="font-medium text-slate-900">{task.task_code}</div>
                            <div className="text-slate-500 line-clamp-1">{task.task_title}</div>
                        </div>
                        <div className="text-xs text-right text-slate-400">
                            {task.project_code}
                        </div>
                    </div>

                    {/* 2 Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Form */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        onKeyDown={handleEnterKey}
                                        className="w-full text-sm p-2 rounded-md border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-medium text-slate-500">
                                            Time ({timeUnit === 'hours' ? 'Hours' : 'Minutes'})
                                        </label>
                                        <button
                                            type="button"
                                            onClick={toggleUnit}
                                            className="text-[10px] flex items-center gap-1 text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer"
                                        >
                                            <ArrowRightLeft className="w-3 h-3" />
                                            Switch to {timeUnit === 'hours' ? 'Mins' : 'Hrs'}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Clock className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                                        <input
                                            type="number"
                                            min="0"
                                            step={timeUnit === 'hours' ? "0.25" : "15"}
                                            value={inputValue}
                                            onChange={(e) => handleInputChange(e.target.value)}
                                            onKeyDown={handleEnterKey}
                                            className="w-full text-sm p-2 pl-9 rounded-md border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            required
                                        />
                                        {displayConversion && (
                                            <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                                                = {displayConversion}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Activity Type</label>
                                <SmartCombobox
                                    value={activityOptions.find(opt => opt.value === activityType) || activityOptions[0]}
                                    onChange={(opt) => setActivityType(opt?.value?.toString() || '')}
                                    options={activityOptions}
                                    placeholder="Select Activity"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
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
                        </div>

                        {/* Right Column - Checklist */}
                        <div className="space-y-3">
                            {checklistItems.length > 0 ? (
                                <>
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <ListChecks className="w-4 h-4 text-emerald-500" />
                                            Checklist
                                        </label>
                                        <span className={cn(
                                            "text-sm font-bold px-2 py-0.5 rounded-full",
                                            checklistItems.filter(i => i.is_completed).length === checklistItems.length
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-600"
                                        )}>
                                            {checklistItems.filter(i => i.is_completed).length}/{checklistItems.length}
                                        </span>
                                    </div>

                                    {/* Checklist Items */}
                                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                                        {loadingChecklist ? (
                                            <div className="p-4 text-center text-sm text-slate-400">
                                                <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                                                Loading checklist...
                                            </div>
                                        ) : (
                                            checklistItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={cn(
                                                        "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors",
                                                        item.is_completed && "bg-emerald-50/30"
                                                    )}
                                                    onClick={() => handleToggleChecklist(item)}
                                                >
                                                    <div className="pt-0.5">
                                                        {item.is_completed ? (
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                                        ) : (
                                                            <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <span className={cn(
                                                        "text-sm flex-1 leading-relaxed",
                                                        item.is_completed ? "text-slate-500 line-through" : "text-slate-700 font-medium"
                                                    )}>
                                                        {item.title}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Progress bar */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Progress</span>
                                            <span className={cn(
                                                "font-semibold",
                                                checklistItems.filter(i => i.is_completed).length === checklistItems.length
                                                    ? "text-emerald-600"
                                                    : "text-slate-600"
                                            )}>
                                                {Math.round((checklistItems.filter(i => i.is_completed).length / checklistItems.length) * 100)}%
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-500",
                                                    checklistItems.filter(i => i.is_completed).length === checklistItems.length
                                                        ? "bg-emerald-500"
                                                        : "bg-emerald-400"
                                                )}
                                                style={{
                                                    width: `${(checklistItems.filter(i => i.is_completed).length / checklistItems.length) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-center p-8">
                                    <div>
                                        <ListChecks className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-sm text-slate-400">No checklist items for this task</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <DialogFooter className="mt-6">
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
