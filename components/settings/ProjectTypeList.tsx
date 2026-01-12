'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectType, deleteProjectType, toggleProjectTypeActive } from '@/lib/actions/project-type-actions'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Loader2, Milestone, FileText } from 'lucide-react'
import { ProjectTypeModal } from './ProjectTypeModal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProjectTypeListProps {
    types: ProjectType[]
}

export function ProjectTypeList({ types }: ProjectTypeListProps) {
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [selectedType, setSelectedType] = useState<ProjectType | null>(null)
    const [loadingAction, setLoadingAction] = useState<string | null>(null)

    const handleAdd = () => {
        setModalMode('create')
        setSelectedType(null)
        setIsModalOpen(true)
    }

    const handleEdit = (type: ProjectType) => {
        setModalMode('edit')
        setSelectedType(type)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?\n\nNote: If this type is used in projects, deletion will fail.`)) return

        setLoadingAction(id)
        try {
            const result = await deleteProjectType(id)
            if (result.success) {
                toast.success('Project type deleted')
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

    const handleToggleActive = async (id: string, name: string, currentActive: boolean) => {
        setLoadingAction(id)
        try {
            const result = await toggleProjectTypeActive(id)
            if (result.success) {
                toast.success(`"${name}" has been ${currentActive ? 'deactivated' : 'activated'}`)
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to update status')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoadingAction(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                    {types.length} project type{types.length !== 1 ? 's' : ''} configured
                </div>
                <Button onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Type
                </Button>
            </div>

            {/* Table */}
            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-3 w-16 text-center">#</th>
                                <th className="px-6 py-3 w-12"></th>
                                <th className="px-6 py-3 w-24">Code</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Thai Name</th>
                                <th className="px-6 py-3 w-28 text-center">Milestones</th>
                                <th className="px-6 py-3 w-28 text-center">Deliverables</th>
                                <th className="px-6 py-3 w-24 text-center">Status</th>
                                <th className="px-6 py-3 w-20 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {types.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400 italic">
                                        No project types configured. Click "Add Type" to create one.
                                    </td>
                                </tr>
                            ) : (
                                types.map((type, idx) => {
                                    const isLoading = loadingAction === type.id

                                    return (
                                        <tr
                                            key={type.id}
                                            className={cn(
                                                "hover:bg-slate-50/50 group transition-colors",
                                                !type.is_active && "opacity-50 bg-slate-50"
                                            )}
                                        >
                                            <td className="px-6 py-4 text-center text-slate-400">
                                                {type.sort_order}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className="w-4 h-4 rounded-full inline-block shadow-sm"
                                                    style={{ backgroundColor: type.color || '#6B7280' }}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                                                    {type.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700">
                                                <div className="flex items-center gap-2">
                                                    {type.name}
                                                    {!type.is_active && (
                                                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 text-xs">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                {type.description && (
                                                    <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                                                        {type.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {type.name_th || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {type.has_milestones ? (
                                                    <span className="inline-flex items-center gap-1 text-green-600">
                                                        <Milestone className="w-3.5 h-3.5" />
                                                        <span className="text-xs">Yes</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">No</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {type.has_deliverables ? (
                                                    <span className="inline-flex items-center gap-1 text-green-600">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span className="text-xs">Yes</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">No</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {type.is_active ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isLoading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {/* Edit Button */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEdit(type)}
                                                            title="Edit"
                                                            className="h-8 w-8"
                                                        >
                                                            <Pencil className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                                                        </Button>

                                                        {/* Activate/Deactivate Button */}
                                                        {type.is_active ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleToggleActive(type.id, type.name, type.is_active)}
                                                                title="Deactivate"
                                                                className="h-8 w-8"
                                                            >
                                                                <XCircle className="h-4 w-4 text-slate-400 hover:text-orange-600" />
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleToggleActive(type.id, type.name, type.is_active)}
                                                                title="Activate"
                                                                className="h-8 w-8"
                                                            >
                                                                <CheckCircle className="h-4 w-4 text-slate-400 hover:text-green-600" />
                                                            </Button>
                                                        )}

                                                        {/* Delete Button */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(type.id, type.name)}
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

            {/* Modal */}
            <ProjectTypeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode={modalMode}
                initialData={selectedType}
                onSuccess={() => {
                    setIsModalOpen(false)
                    router.refresh()
                }}
            />
        </div>
    )
}
