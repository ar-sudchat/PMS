'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useEffect } from "react"
import { WeeklyKPIRecord, saveWeeklyKPIRecord } from "@/lib/actions/kpi-records-actions"
import { format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface WeeklyRecordModalProps {
    record: WeeklyKPIRecord | null
    isOpen: boolean
    onClose: () => void
    onSaved: () => void
}

export function WeeklyRecordModal({ record, isOpen, onClose, onSaved }: WeeklyRecordModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<WeeklyKPIRecord>>({})

    useEffect(() => {
        if (record) {
            setFormData({
                ...record,
                // Ensure defaults for new record fields if null
                total_deploys: record.total_deploys || 0,
                total_rollbacks: record.total_rollbacks || 0,
                backup_completed: record.backup_completed || false,
                backup_date: record.backup_date ? new Date(record.backup_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            })
        }
    }, [record, isOpen])

    const handleSubmit = async () => {
        if (!record || !formData) return

        if ((formData.total_rollbacks || 0) > (formData.total_deploys || 0)) {
            toast.error("Rollbacks cannot exceed Total Deploys")
            return
        }

        setIsLoading(true)
        try {
            const dataToSave: WeeklyKPIRecord = {
                ...record, // Base record (has year, week, dates)
                ...formData, // Updates
                // Ensure types
                total_deploys: Number(formData.total_deploys),
                total_rollbacks: Number(formData.total_rollbacks),
                backup_completed: Boolean(formData.backup_completed),
                backup_date: formData.backup_completed ? formData.backup_date : null
            } as WeeklyKPIRecord

            const res = await saveWeeklyKPIRecord(dataToSave)

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

    if (!record) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>📅 Weekly KPI Record</DialogTitle>
                    <div className="text-sm text-slate-500 mt-1">
                        Week {record.week_number}: {format(new Date(record.week_start_date), 'd MMM')} - {format(new Date(record.week_end_date), 'd MMM yyyy')}
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Deploy Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">🚀 Deploy & Rollback</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Total Deploys</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.total_deploys}
                                    onChange={(e) => setFormData({ ...formData, total_deploys: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Total Rollbacks</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max={formData.total_deploys}
                                    value={formData.total_rollbacks}
                                    onChange={(e) => setFormData({ ...formData, total_rollbacks: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        {/* Rate Preview */}
                        <div className="bg-slate-50 p-3 rounded-md flex justify-between items-center text-sm">
                            <span className="text-slate-600">Deploy Success Rate:</span>
                            <span className={cn(
                                "font-bold",
                                ((formData.total_deploys || 0) - (formData.total_rollbacks || 0)) / (formData.total_deploys || 1) * 100 >= 95 ? "text-green-600" : "text-slate-900"
                            )}>
                                {formData.total_deploys && formData.total_deploys > 0
                                    ? Math.round(((formData.total_deploys - (formData.total_rollbacks || 0)) / formData.total_deploys) * 100)
                                    : 100}%
                            </span>
                        </div>

                        <div className="space-y-2">
                            <Label>Rollback Notes / Issues</Label>
                            <Input
                                placeholder="E.g. Issue with DB migration..."
                                value={formData.rollback_notes || ''}
                                onChange={(e) => setFormData({ ...formData, rollback_notes: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Backup Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">💾 Pre-deploy Backup</h3>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="backup_done"
                                checked={formData.backup_completed}
                                onChange={(e) => setFormData({ ...formData, backup_completed: e.target.checked })}
                            />
                            <Label htmlFor="backup_done" className="font-medium">Confirm Full Backup Completed (incl. DB & Assets)</Label>
                        </div>

                        {formData.backup_completed && (
                            <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-slate-100">
                                <div className="space-y-2">
                                    <Label>Backup Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.backup_date ? new Date(formData.backup_date).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setFormData({ ...formData, backup_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Location / Path</Label>
                                    <Input
                                        placeholder="/backups/2026/..."
                                        value={formData.backup_location || ''}
                                        onChange={(e) => setFormData({ ...formData, backup_location: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save Record"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
