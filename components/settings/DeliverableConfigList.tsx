'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeliverableConfig, deleteDeliverableConfig, deactivateDeliverableConfig, activateDeliverableConfig } from '@/lib/actions/deliverable-config-actions'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, FileText, XCircle, CheckCircle, Loader2 } from 'lucide-react'
import { DeliverableConfigModal } from './DeliverableConfigModal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface DeliverableConfigListProps {
    configs: DeliverableConfig[]
    milestoneConfigs: any[]
}

export function DeliverableConfigList({ configs, milestoneConfigs }: DeliverableConfigListProps) {
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [selectedMilestone, setSelectedMilestone] = useState<{ id: string, name: string } | null>(null)
    const [selectedConfig, setSelectedConfig] = useState<DeliverableConfig | null>(null)
    const [loadingAction, setLoadingAction] = useState<string | null>(null) // Track which item is loading

    // Group configs by milestone
    // We use milestoneConfigs to ensure order and show empty milestones too
    const groupedConfigs = milestoneConfigs.map(mc => ({
        ...mc,
        items: configs.filter(c => c.milestone_config_id === mc.id)
    }))

    const handleAdd = (msId: string, msName: string) => {
        setSelectedMilestone({ id: msId, name: msName })
        setModalMode('create')
        setSelectedConfig(null)
        setIsModalOpen(true)
    }

    const handleEdit = (config: DeliverableConfig) => {
        const ms = milestoneConfigs.find(m => m.id === config.milestone_config_id)
        setSelectedMilestone(ms ? { id: ms.id, name: ms.name } : null)
        setModalMode('edit')
        setSelectedConfig(config)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?\n\nNote: If this template is being used in projects, deletion will fail and you should use "Deactivate" instead.`)) return

        setLoadingAction(id)
        try {
            const result = await deleteDeliverableConfig(id)
            if (result.success) {
                toast.success('Document template deleted')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to delete')
            }
        } catch (error) {
            toast.error('An error occurred while deleting')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleDeactivate = async (id: string, name: string) => {
        setLoadingAction(id)
        try {
            const result = await deactivateDeliverableConfig(id)
            if (result.success) {
                toast.success(`"${name}" has been deactivated. It will no longer appear for new projects.`)
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to deactivate')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleActivate = async (id: string, name: string) => {
        setLoadingAction(id)
        try {
            const result = await activateDeliverableConfig(id)
            if (result.success) {
                toast.success(`"${name}" has been activated`)
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to activate')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoadingAction(null)
        }
    }

    return (
        <div className="space-y-8">
            {groupedConfigs.map((group) => (
                <div key={group.id} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    {/* Header */}
                    <div className="bg-slate-50 px-6 py-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span
                                className="w-4 h-4 rounded-full shadow-sm"
                                style={{ backgroundColor: group.color || '#cbd5e1' }}
                            />
                            <h3 className="font-semibold text-lg text-slate-800">{group.name}</h3>
                            <span className="text-xs text-slate-400 font-mono">({group.items.length} docs)</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-blue-50 text-blue-600 border-blue-200"
                            onClick={() => handleAdd(group.id, group.name)}
                        >
                            <Plus className="w-4 h-4 mr-1" /> Add Document
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                                <tr>
                                    <th className="px-6 py-3 w-16 text-center">#</th>
                                    <th className="px-6 py-3">Document Name</th>
                                    <th className="px-6 py-3">Thai Name</th>
                                    <th className="px-6 py-3 w-24 text-center">Required</th>
                                    <th className="px-6 py-3 w-32 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {group.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                                            No default deliverables configured.
                                        </td>
                                    </tr>
                                ) : (
                                    group.items.map((item: any, idx: number) => {
                                        const isInactive = item.is_active === false
                                        const isLoading = loadingAction === item.id

                                        return (
                                            <tr
                                                key={item.id}
                                                className={cn(
                                                    "hover:bg-slate-50/50 group transition-colors",
                                                    isInactive && "opacity-50 bg-slate-50"
                                                )}
                                            >
                                                <td className="px-6 py-3 text-center text-slate-400">{item.sort_order}</td>
                                                <td className="px-6 py-3 font-medium text-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                        <span>{item.name}</span>
                                                        {isInactive && (
                                                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 text-xs">Inactive</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-slate-500">{item.name_th || '-'}</td>
                                                <td className="px-6 py-3 text-center">
                                                    {item.is_required ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Yes</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">Optional</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    {isLoading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {/* Edit Button */}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit(item)}
                                                                title="Edit"
                                                                className="h-8 w-8"
                                                            >
                                                                <Pencil className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                                                            </Button>

                                                            {/* Activate/Deactivate Button */}
                                                            {isInactive ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleActivate(item.id, item.name)}
                                                                    title="Activate"
                                                                    className="h-8 w-8"
                                                                >
                                                                    <CheckCircle className="h-4 w-4 text-slate-400 hover:text-green-600" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDeactivate(item.id, item.name)}
                                                                    title="Deactivate"
                                                                    className="h-8 w-8"
                                                                >
                                                                    <XCircle className="h-4 w-4 text-slate-400 hover:text-orange-600" />
                                                                </Button>
                                                            )}

                                                            {/* Delete Button */}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(item.id, item.name)}
                                                                title="Delete"
                                                                className="h-8 w-8"
                                                            >
                                                                <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            <DeliverableConfigModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode={modalMode}
                milestoneConfigId={selectedMilestone?.id}
                milestoneName={selectedMilestone?.name}
                initialData={selectedConfig}
                onSuccess={() => {/* Page revalidates automatically via server action */ }}
            />
        </div>
    )
}
