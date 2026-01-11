'use client'

import { useState } from 'react'
import { FileText, CheckCircle2, AlertCircle, Upload, Link as LinkIcon, Lock, X, Plus, Trash2, Loader2 } from 'lucide-react'
import { MilestoneRow, ProjectDeliverable } from '@/types/project'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { createCustomDeliverable, deleteProjectDeliverable } from '@/lib/actions/project-actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface DeliverablesTabProps {
    milestones: MilestoneRow[]
    onRefresh?: () => void
}

export function DeliverablesTab({ milestones, onRefresh }: DeliverablesTabProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
    const [newDocData, setNewDocData] = useState({ name: '', is_required: true })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return

        const result = await deleteProjectDeliverable(id)
        if (result.success) {
            toast.success('Document deleted')
            onRefresh?.()
        } else {
            toast.error(result.error)
        }
    }

    const handleOpenAddModal = (msId: string) => {
        setSelectedMilestoneId(msId)
        setNewDocData({ name: '', is_required: true })
        setIsAddModalOpen(true)
    }

    const handleCreateCustom = async () => {
        if (!selectedMilestoneId || !newDocData.name.trim()) return

        setIsSubmitting(true)
        const result = await createCustomDeliverable({
            project_milestone_id: selectedMilestoneId,
            name: newDocData.name,
            is_required: newDocData.is_required
        })
        setIsSubmitting(false)

        if (result.success) {
            toast.success('Custom document added')
            setIsAddModalOpen(false)
            onRefresh?.()
        } else {
            toast.error(result.error)
        }
    }

    return (
        <div className="space-y-6">
            {milestones.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-xl">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No milestones defined yet.</p>
                </div>
            ) : (
                milestones.map((m, i) => (
                    <div key={m.id || i} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                        <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: m.milestone_color || '#cbd5e1' }}
                                />
                                <h3 className="font-semibold text-slate-800">{m.milestone_name || 'Unnamed Phase'}</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-xs text-slate-500 font-medium px-2 py-1 bg-white rounded border">
                                    Due: {m.due_date ? format(new Date(m.due_date), 'dd MMM yyyy') : 'No date'}
                                </div>
                                <div className={cn(
                                    "text-xs font-medium px-2.5 py-1 rounded-md border",
                                    m.status === 'completed' ? "bg-green-50 text-green-700 border-green-100" :
                                        "bg-slate-100 text-slate-500"
                                )}>
                                    {m.status === 'completed' ? 'Completed' : 'Pending'}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50/50 text-slate-500 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium w-10">#</th>
                                        <th className="px-4 py-2 text-left font-medium">Document</th>
                                        <th className="px-4 py-2 text-center font-medium w-24">Required</th>
                                        <th className="px-4 py-2 text-center font-medium w-32">Submitted</th>
                                        <th className="px-4 py-2 text-center font-medium w-24">On-time</th>
                                        <th className="px-4 py-2 text-right font-medium w-32">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(!m.deliverables || m.deliverables.length === 0) ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">
                                                No deliverables configured for this phase.
                                            </td>
                                        </tr>
                                    ) : (
                                        m.deliverables.map((d, idx) => {
                                            const isSubmitted = !!d.submitted_date

                                            // On-time Calculation
                                            let onTimeElement = <span className="text-slate-300">-</span>

                                            if (isSubmitted && m.due_date) {
                                                const subDate = new Date(d.submitted_date!)
                                                const dueDate = new Date(m.due_date)
                                                if (subDate <= dueDate) {
                                                    onTimeElement = <span className="text-green-600 font-bold">✓</span>
                                                } else {
                                                    onTimeElement = <span className="text-red-500 font-bold">Late</span>
                                                }
                                            } else if (!isSubmitted && d.is_required && m.due_date) {
                                                const dueDate = new Date(m.due_date)
                                                if (new Date() > dueDate) {
                                                    onTimeElement = <span className="text-red-400 font-medium text-xs">Overdue</span>
                                                }
                                            }

                                            return (
                                                <tr key={d.id || idx} className="hover:bg-slate-50/50 group">
                                                    <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-slate-900">{d.name}</div>
                                                        {d.description && (
                                                            <div className="text-xs text-slate-500 truncate max-w-xs" title={d.description}>
                                                                {d.description}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {d.is_required ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-slate-600 text-xs">
                                                        {d.submitted_date ? (
                                                            <span className="text-blue-600 font-medium">
                                                                {format(new Date(d.submitted_date), 'dd MMM yyyy')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">Pending</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs">
                                                        {onTimeElement}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {d.file_path ? (
                                                                <a
                                                                    href={d.file_path}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
                                                                >
                                                                    <LinkIcon className="w-3 h-3" /> View
                                                                </a>
                                                            ) : (
                                                                <button
                                                                    className="text-slate-400 hover:text-blue-600 disabled:opacity-50 inline-flex items-center gap-1 border px-2 py-1 rounded hover:bg-slate-50 text-xs"
                                                                    disabled={d.is_locked}
                                                                    title="Upload functionalities coming soon"
                                                                >
                                                                    <Upload className="w-3 h-3" /> Upload
                                                                </button>
                                                            )}
                                                            {/* Delete Button - Show only if not submitted or approved/locked logic allows */}
                                                            {!d.submitted_date && !m.is_locked && (
                                                                <button
                                                                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onClick={() => handleDelete(d.id, d.name)}
                                                                    title="Remove document"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                    {/* Add Custom Deliverable Row */}
                                    {!m.is_locked && m.id && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-2 border-t border-slate-100 bg-slate-50/30">
                                                <button
                                                    onClick={() => handleOpenAddModal(m.id)}
                                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" /> Add Custom Document
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Custom Document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Document Name</Label>
                            <Input
                                value={newDocData.name}
                                onChange={(e) => setNewDocData({ ...newDocData, name: e.target.value })}
                                placeholder="e.g. Additional Report"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="custom-req"
                                checked={newDocData.is_required}
                                onCheckedChange={(c) => setNewDocData({ ...newDocData, is_required: !!c })}
                            />
                            <Label htmlFor="custom-req">Required (Counts for KPI)</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateCustom} disabled={isSubmitting || !newDocData.name.trim()}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Add Document
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
