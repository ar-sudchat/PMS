'use client'

import { useState, useMemo } from 'react'
import { FileText, CheckCircle2, AlertCircle, Upload, Link as LinkIcon, Lock, X, Plus, Trash2, Loader2, PlusCircle, ChevronDown } from 'lucide-react'
import { MilestoneRow, ProjectDeliverable, DeliverableConfig } from '@/types/project'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { createCustomDeliverable, deleteProjectDeliverable, verifyDeliverable, createDeliverableFromConfig } from '@/lib/actions/project-actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'

interface DeliverablesTabProps {
    milestones: MilestoneRow[]
    deliverableConfigs?: DeliverableConfig[]
    onRefresh?: () => void
    deliverableChanges?: Record<string, any>
    onDeliverableChange?: (id: string, field: string, value: any) => void
    pendingDeletes?: Set<string>
    onMarkDelete?: (id: string, name: string) => void
}

export function DeliverablesTab({ milestones, deliverableConfigs = [], onRefresh, deliverableChanges = {}, onDeliverableChange, pendingDeletes = new Set(), onMarkDelete }: DeliverablesTabProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
    const [newDocData, setNewDocData] = useState({ name: '', is_required: true, configId: '' })
    const [selectedDocOption, setSelectedDocOption] = useState<Option | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Helper to format date for input (YYYY-MM-DD)
    const formatDateForInput = (date: string | Date | null | undefined): string => {
        if (!date) return ''
        try {
            if (typeof date === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
                return new Date(date).toISOString().split('T')[0]
            }
            return date.toISOString().split('T')[0]
        } catch {
            return ''
        }
    }

    // Get available deliverable configs for a milestone (not yet added)
    const getAvailableConfigs = (milestone: MilestoneRow) => {
        const existingConfigIds = milestone.deliverables?.map(d => d.deliverable_config_id) || []
        return deliverableConfigs.filter(
            config => config.milestone_config_id === milestone.milestone_config_id &&
                !existingConfigIds.includes(config.id)
        )
    }

    // Add deliverable from template config
    const handleAddFromConfig = async (milestoneId: string, configId: string) => {
        setIsSubmitting(true)
        try {
            const result = await createDeliverableFromConfig({
                project_milestone_id: milestoneId,
                deliverable_config_id: configId
            })
            if (result.success) {
                toast.success('Document added from template')
                onRefresh?.()
            } else {
                toast.error(result.error || 'Failed to add document')
            }
        } catch (error) {
            toast.error('Failed to add document')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Add all available deliverables from template
    const handleAddAllFromConfig = async (milestoneId: string, milestoneConfigId: string) => {
        const availableConfigs = deliverableConfigs.filter(
            c => c.milestone_config_id === milestoneConfigId
        )
        const milestone = milestones.find(m => m.id === milestoneId)
        const existingConfigIds = milestone?.deliverables?.map(d => d.deliverable_config_id) || []
        const configsToAdd = availableConfigs.filter(c => !existingConfigIds.includes(c.id))

        if (configsToAdd.length === 0) {
            toast.info('All template documents already added')
            return
        }

        setIsSubmitting(true)
        try {
            for (const config of configsToAdd) {
                await createDeliverableFromConfig({
                    project_milestone_id: milestoneId,
                    deliverable_config_id: config.id
                })
            }
            toast.success(`Added ${configsToAdd.length} documents from template`)
            onRefresh?.()
        } catch (error) {
            toast.error('Failed to add some documents')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return

        // Mark for pending delete - will be saved when Update Project is clicked
        if (onMarkDelete) {
            onMarkDelete(id, name)
            toast.success('Document marked for deletion (save to confirm)')
        }
    }

    const handleOpenAddModal = (msId: string) => {
        setSelectedMilestoneId(msId)
        setNewDocData({ name: '', is_required: true, configId: '' })
        setSelectedDocOption(null)
        setIsAddModalOpen(true)
    }

    // Get deliverable config options for the selected milestone
    const getDocOptions = (): Option[] => {
        if (!selectedMilestoneId) return []
        const milestone = milestones.find(m => m.id === selectedMilestoneId)
        if (!milestone) return []
        const existingConfigIds = milestone.deliverables?.map(d => d.deliverable_config_id) || []
        return deliverableConfigs
            .filter(c => c.milestone_config_id === milestone.milestone_config_id && !existingConfigIds.includes(c.id))
            .map(c => ({
                value: c.id,
                label: c.name_th || c.name,
            }))
    }

    // handleVerify replaced by onDeliverableChange prop logic in render
    // keeping generic handler if needed, but UI will direct call onDeliverableChange

    const handleVerify = async (id: string, isVerified: boolean) => {
        const result = await verifyDeliverable(id, isVerified)
        if (result.success) {
            toast.success(isVerified ? 'Document Verified' : 'Verification Revoked')
            onRefresh?.()
        } else {
            toast.error(result.error)
        }
    }

    const handleCreateCustom = async () => {
        if (!selectedMilestoneId || !selectedDocOption) return

        setIsSubmitting(true)
        try {
            const configId = selectedDocOption.value as string
            const result = await createDeliverableFromConfig({
                project_milestone_id: selectedMilestoneId,
                deliverable_config_id: configId
            })

            if (result.success) {
                toast.success('เพิ่มเอกสารสำเร็จ')
                setIsAddModalOpen(false)
                onRefresh?.()
            } else {
                toast.error(result.error || 'ไม่สามารถเพิ่มเอกสารได้')
            }
        } catch (error) {
            toast.error('ไม่สามารถเพิ่มเอกสารได้')
        } finally {
            setIsSubmitting(false)
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

                                {/* Delete All Button */}
                                {!m.is_locked && m.deliverables && m.deliverables.filter(d => !pendingDeletes.has(d.id)).length > 0 && (
                                    <button
                                        onClick={() => {
                                            const activeDocs = m.deliverables!.filter(d => !pendingDeletes.has(d.id))
                                            if (confirm(`Are you sure you want to delete ALL ${activeDocs.length} documents in "${m.milestone_name}"?`)) {
                                                activeDocs.forEach(d => {
                                                    if (onMarkDelete) onMarkDelete(d.id, d.name)
                                                })
                                                toast.success(`Marked ${activeDocs.length} documents for deletion`)
                                            }
                                        }}
                                        className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                                        title="Delete All Documents"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}

                                {/* Add from Template Dropdown */}
                                {!m.is_locked && m.id && (() => {
                                    const availableConfigs = getAvailableConfigs(m)
                                    // Always show dropdown if not locked (for Custom Add)

                                    return (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="inline-flex items-center px-3 py-1 h-7 text-xs border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50" disabled={isSubmitting}>
                                                <Plus className="w-3 h-3 mr-1" />
                                                Add
                                                <ChevronDown className="w-3 h-3 ml-1" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-64">
                                                <DropdownMenuItem
                                                    onClick={() => m.id && handleOpenAddModal(m.id)}
                                                    className="font-medium"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add Custom Document
                                                </DropdownMenuItem>

                                                {availableConfigs.length > 0 && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => m.id && m.milestone_config_id && handleAddAllFromConfig(m.id, m.milestone_config_id)}
                                                            className="font-medium text-blue-600"
                                                        >
                                                            <PlusCircle className="w-4 h-4 mr-2" />
                                                            Add All Templates ({availableConfigs.length})
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {availableConfigs.map(config => (
                                                            <DropdownMenuItem
                                                                key={config.id}
                                                                onClick={() => m.id && handleAddFromConfig(m.id, config.id)}
                                                            >
                                                                {config.name}
                                                                {config.is_required && (
                                                                    <span className="ml-auto text-xs text-amber-600">(Required)</span>
                                                                )}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )
                                })()}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50/50 text-slate-500 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium w-10">#</th>
                                        <th className="px-4 py-2 text-left font-medium">Document</th>
                                        <th className="px-4 py-2 text-center font-medium w-24">Required</th>
                                        <th className="px-4 py-2 text-center font-medium w-24">Submitted</th>
                                        <th className="px-4 py-2 text-center font-medium w-24">On-time</th>
                                        <th className="px-4 py-2 text-center font-medium w-20">Verified</th>
                                        <th className="px-4 py-2 text-right font-medium w-32">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(!m.deliverables || m.deliverables.length === 0) ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center">
                                                <div className="text-slate-400 italic mb-4">
                                                    No deliverables configured for this phase.
                                                </div>
                                                {/* Show Add buttons when no deliverables */}
                                                {!m.is_locked && m.id && (() => {
                                                    const availableConfigs = getAvailableConfigs(m)

                                                    return (
                                                        <div className="flex justify-center gap-2">
                                                            {availableConfigs.length > 0 && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => m.id && m.milestone_config_id && handleAddAllFromConfig(m.id, m.milestone_config_id)}
                                                                    disabled={isSubmitting}
                                                                >
                                                                    <PlusCircle className="w-4 h-4 mr-1" />
                                                                    Add from Template ({availableConfigs.length})
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => m.id && handleOpenAddModal(m.id)}
                                                            >
                                                                <Plus className="w-4 h-4 mr-1" />
                                                                Add Custom
                                                            </Button>
                                                        </div>
                                                    )
                                                })()}
                                                {/* Message for unsaved milestones */}
                                                {!m.id && (
                                                    <div className="text-amber-600 text-xs mt-2">
                                                        <AlertCircle className="w-4 h-4 inline mr-1" />
                                                        Save the project first to add deliverables
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        m.deliverables
                                            .filter(d => !pendingDeletes.has(d.id)) // Filter out pending deletes
                                            .map((d, idx) => {
                                                // Merge current DB data with pending changes
                                                const changes = deliverableChanges[d.id] || {}
                                                // Handle submitted_date: if in changes use it (can be null), otherwise DB
                                                // If changes.submitted_date is explicitly null/empty string, it means cleared.
                                                // DB submitted_date is string or null.
                                                const submittedDateValue = changes.submitted_date !== undefined ? changes.submitted_date : d.submitted_date
                                                const isSubmitted = !!submittedDateValue
                                                const verifiedValue = changes.is_verified !== undefined ? changes.is_verified : d.is_verified

                                                // On-time Calculation
                                                let onTimeElement = <span className="text-slate-300">-</span>

                                                if (isSubmitted && m.due_date) {
                                                    const subDate = new Date(submittedDateValue)
                                                    const dueDate = new Date(m.due_date)
                                                    if (subDate <= dueDate) {
                                                        onTimeElement = <span className="text-green-600 font-bold">✓ On-time</span>
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
                                                            <Input
                                                                type="date"
                                                                value={formatDateForInput(submittedDateValue)}
                                                                onChange={(e) => onDeliverableChange?.(d.id, 'submitted_date', e.target.value || null)}
                                                                disabled={m.is_locked}
                                                                className="h-8 w-32 mx-auto text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-xs">
                                                            {onTimeElement}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex justify-center">
                                                                <Checkbox
                                                                    checked={!!verifiedValue}
                                                                    onChange={(e) => onDeliverableChange?.(d.id, 'is_verified', e.target.checked)}
                                                                    disabled={!isSubmitted || m.is_locked}
                                                                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                                                />
                                                            </div>
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
                                                                {/* Delete Button - Always visible when not locked */}
                                                                {!m.is_locked && (
                                                                    <button
                                                                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                                                                        onClick={() => handleDelete(d.id, d.name)}
                                                                        title="Remove document"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
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
                                                    onClick={() => m.id && handleOpenAddModal(m.id)}
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

                        {/* Summary Dashboard */}
                        {(() => {
                            const activeDeliverables = m.deliverables || []
                            const totalRequired = activeDeliverables.filter(d => d.is_required).length
                            const submittedRequired = activeDeliverables.filter(d => d.is_required && d.submitted_date).length

                            // On-time (Required & Submitted & On-time)
                            const onTimeCount = activeDeliverables.filter(d =>
                                d.is_required &&
                                d.submitted_date &&
                                m.due_date &&
                                new Date(d.submitted_date) <= new Date(m.due_date)
                            ).length

                            // Verified (All Active)
                            const verifiedCount = activeDeliverables.filter(d => d.is_verified).length
                            const totalCount = activeDeliverables.length

                            return (
                                <div className="bg-slate-50 px-4 py-2 border-t flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium">
                                    <span className={cn("flex items-center gap-1.5", submittedRequired === totalRequired ? "text-green-700" : "text-amber-600")}>
                                        {submittedRequired === totalRequired ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                        {submittedRequired}/{totalRequired} Required Submitted
                                    </span>

                                    <span className={cn("flex items-center gap-1.5", m.due_date && onTimeCount === totalRequired ? "text-green-700" : "text-amber-600")}>
                                        {onTimeCount === totalRequired ? <CheckCircle2 className="w-3.5 h-3.5" /> : (m.due_date ? <span className="text-[10px] w-3.5 text-center">-</span> : null)}
                                        {onTimeCount}/{submittedRequired} On-time
                                    </span>

                                    <span className={cn("flex items-center gap-1.5", verifiedCount === totalCount && totalCount > 0 ? "text-green-700" : "text-amber-600")}>
                                        {verifiedCount === totalCount && totalCount > 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                        {verifiedCount}/{totalCount} Verified
                                    </span>
                                </div>
                            )
                        })()}
                    </div>
                ))
            )
            }

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>เพิ่มเอกสาร</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>เลือกเอกสาร</Label>
                            <SmartCombobox
                                placeholder="เลือกเอกสาร..."
                                options={getDocOptions()}
                                value={selectedDocOption}
                                onChange={setSelectedDocOption}
                            />
                            {getDocOptions().length === 0 && (
                                <p className="text-xs text-muted-foreground">ไม่มีเอกสารให้เลือก (เพิ่มครบแล้ว)</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>ยกเลิก</Button>
                        <Button onClick={handleCreateCustom} disabled={isSubmitting || !selectedDocOption}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            เพิ่มเอกสาร
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
