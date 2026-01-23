"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { SmartCombobox } from "@/components/ui/smart-combobox"
import { updateTaskPlanning, getAllEmployeesForPlanning } from "@/lib/actions/workload-actions"
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"

interface TaskEditModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    task: {
        id: string
        title: string
        projectCode: string
        projectName?: string
        hours: number
        start: string // YYYY-MM-DD
        end: string // YYYY-MM-DD
        employeeId?: string // PG
        reviewerId?: string // SA (if available) - we might not have this in quick view
        position?: string
    } | null
    onSaved: () => void
}

export function TaskEditModal({ open, onOpenChange, task, onSaved }: TaskEditModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [employees, setEmployees] = useState<{ id: string, name: string, position_code: string }[]>([])

    // Form State
    const [assigneeId, setAssigneeId] = useState<string>("") // PG
    const [reviewerId, setReviewerId] = useState<string>("") // SA
    const [startDate, setStartDate] = useState<string>("")
    const [dueDate, setDueDate] = useState<string>("")

    // Helper to filter employees
    const pgs = employees.filter(e => e.position_code === 'PG').map(e => ({ value: e.id, label: e.name }))
    const sas = employees.filter(e => e.position_code === 'SA' || e.position_code === 'BA').map(e => ({ value: e.id, label: e.name }))

    useEffect(() => {
        if (open) {
            console.log("TaskEditModal Opened:", task)
            loadEmployees()
            if (task) {
                setStartDate(task.start)
                setDueDate(task.end)
                // We initially set assignee from the task prop (which usually comes from the row it's in)
                setAssigneeId(task.employeeId || "")
                setReviewerId(task.reviewerId || "")
            }
        }
    }, [open, task])

    const loadEmployees = async () => {
        const res = await getAllEmployeesForPlanning()
        if (res.success) {
            setEmployees(res.data)
        }
    }

    const handleSave = async () => {
        if (!task) return

        // Validation
        if (!startDate || !dueDate) {
            toast.error("Start and Due dates are required")
            return
        }

        setIsLoading(true)
        try {
            const result = await updateTaskPlanning({
                taskId: task.id,
                assigneeId: assigneeId || null,
                reviewerId: reviewerId || null,
                startDate,
                dueDate
            })

            if (result.success) {
                toast.success("Task updated successfully")
                if (result.changes && result.changes.length > 0) {
                    toast.info(`Changes: ${result.changes.join(', ')}`)
                }
                onSaved()
                onOpenChange(false)
            } else {
                toast.error(result.error || "Failed to update task")
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    if (!task) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Edit Planning: {task.projectCode}
                        {task.projectName && <span className="text-sm font-normal text-slate-500 ml-2">({task.projectName})</span>}
                    </DialogTitle>
                    <DialogDescription>
                        Modify assignment details, planning dates, and reviewers for this task.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-md border">
                        {task.title}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Start Date is hidden (synced with Due Date) */}
                        <div className="space-y-2">
                            <Label>Planning Date (Start & Due)</Label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => {
                                    const val = e.target.value
                                    setDueDate(val)
                                    setStartDate(val) // Sync Start with Due
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Programmer (PG)</Label>
                        <SmartCombobox
                            options={pgs}
                            value={assigneeId}
                            onChange={setAssigneeId}
                            placeholder="Select Programmer..."
                            searchPlaceholder="Search PG..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>System Analyst (SA/Reviewer)</Label>
                        <SmartCombobox
                            options={sas}
                            value={reviewerId}
                            onChange={setReviewerId}
                            placeholder="Select SA/BA..."
                            searchPlaceholder="Search SA..."
                        />
                    </div>

                    <div className="text-xs text-muted-foreground pt-2 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
                        <p>Changes will be logged. History tracking coming soon.</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
