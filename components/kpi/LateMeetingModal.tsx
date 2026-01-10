'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { LateMeetingRecord, addLateMeetingRecord } from "@/lib/actions/kpi-records-actions"
import { format, differenceInHours } from "date-fns"
import { toast } from "sonner"
import { getProjects } from "@/lib/actions/project-actions"

interface LateMeetingModalProps {
    isOpen: boolean
    onClose: () => void
    onSaved: () => void
}

export function LateMeetingModal({ isOpen, onClose, onSaved }: LateMeetingModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [projects, setProjects] = useState<any[]>([])
    const [formData, setFormData] = useState<Partial<LateMeetingRecord>>({
        meeting_date: new Date().toISOString().split('T')[0],
        meeting_end_time: '17:00',
        submitted_date: new Date().toISOString().split('T')[0],
        submitted_time: '09:00',
        meeting_type: 'project'
    })

    useEffect(() => {
        if (isOpen) {
            // Load projects
            getProjects().then(res => {
                if (res && Array.isArray(res)) {
                    setProjects(res)
                } else if (res && res.data) { // Assuming response wrapper
                    setProjects(res.data) // Type might vary based on action return
                }
            })
        }
    }, [isOpen])

    const calculateLateHours = () => {
        if (!formData.meeting_date || !formData.meeting_end_time || !formData.submitted_date || !formData.submitted_time) return 0

        const meetingEnd = new Date(`${formData.meeting_date}T${formData.meeting_end_time}`)
        const submitted = new Date(`${formData.submitted_date}T${formData.submitted_time}`)

        const diff = differenceInHours(submitted, meetingEnd)
        return Math.max(0, diff - 24)
    }

    const lateHours = calculateLateHours()

    const handleSubmit = async () => {
        if (!formData.project_id) {
            toast.error("Please select a project")
            return
        }
        if (!formData.late_reason) {
            toast.error("Please provide a reason")
            return
        }

        setIsLoading(true)
        try {
            const res = await addLateMeetingRecord({
                ...formData,
                year: new Date(formData.submitted_date!).getFullYear()
            } as LateMeetingRecord)

            if (res.success) {
                toast.success("Saved successfully")
                onSaved()
                onClose()
            } else {
                toast.error(res.error || "Failed to save")
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>📝 Late Meeting Minutes Record</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Project</Label>
                        <select
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.project_id || ''}
                            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                        >
                            <option value="">Select Project</option>
                            {projects && projects.length > 0 ? (
                                projects.map((p: any) => (
                                    <option key={p.id} value={p.id}>
                                        {p.project_code} - {p.name}
                                    </option>
                                ))
                            ) : (
                                <option disabled>Loading projects...</option>
                            )}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Meeting Date</Label>
                            <Input
                                type="date"
                                value={formData.meeting_date}
                                onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input
                                type="time"
                                value={formData.meeting_end_time}
                                onChange={(e) => setFormData({ ...formData, meeting_end_time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                        <div className="space-y-2">
                            <Label>Submitted Date</Label>
                            <Input
                                type="date"
                                value={formData.submitted_date}
                                onChange={(e) => setFormData({ ...formData, submitted_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Submitted Time</Label>
                            <Input
                                type="time"
                                value={formData.submitted_time}
                                onChange={(e) => setFormData({ ...formData, submitted_time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                        <div className="flex justify-between font-medium">
                            <span className="text-amber-800">Calculation:</span>
                            <span className="text-red-700">{lateHours} hours late</span>
                        </div>
                        <p className="text-xs text-amber-700 mt-1">
                            (Exceeded 24h allowance)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason for Delay</Label>
                        <Textarea
                            placeholder="Why was it late?"
                            value={formData.late_reason || ''}
                            onChange={(e) => setFormData({ ...formData, late_reason: e.target.value })}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading} variant="danger">
                        {isLoading ? "Saving..." : "Record Late MoM"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
