'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Plus, Pencil, Trash2, CheckCircle, XCircle, Loader2,
    ChevronDown, ChevronRight, FolderOpen, Folder
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
    ProjectGroup,
    ProjectGroupTree,
    deleteProjectGroup,
    toggleProjectGroupActive,
} from '@/lib/actions/project-group-actions'
import { ProjectGroupModal } from './ProjectGroupModal'

interface ProjectGroupListProps {
    tree: ProjectGroupTree[]
    allGroups: ProjectGroup[]
}

export function ProjectGroupList({ tree, allGroups }: ProjectGroupListProps) {
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [selectedGroup, setSelectedGroup] = useState<ProjectGroup | null>(null)
    const [defaultParentId, setDefaultParentId] = useState<string | null>(null)
    const [loadingAction, setLoadingAction] = useState<string | null>(null)
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(tree.map(g => g.id)) // expand all by default
    )

    const topLevelGroups = allGroups.filter(g => g.parent_id === null)

    const toggleExpand = (id: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleAddGroup = () => {
        setModalMode('create')
        setSelectedGroup(null)
        setDefaultParentId(null)
        setIsModalOpen(true)
    }

    const handleAddSubGroup = (parentId: string) => {
        setModalMode('create')
        setSelectedGroup(null)
        setDefaultParentId(parentId)
        setIsModalOpen(true)
    }

    const handleEdit = (group: ProjectGroup) => {
        setModalMode('edit')
        setSelectedGroup(group)
        setDefaultParentId(null)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`คุณต้องการลบ "${name}" ?\n\nหากมีโครงการใช้อยู่ จะไม่สามารถลบได้`)) return

        setLoadingAction(id)
        try {
            const result = await deleteProjectGroup(id)
            if (result.success) {
                toast.success('ลบสำเร็จ')
                router.refresh()
            } else {
                toast.error(result.error || 'ลบไม่สำเร็จ')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleToggleActive = async (id: string, name: string, currentActive: boolean) => {
        setLoadingAction(id)
        try {
            const result = await toggleProjectGroupActive(id)
            if (result.success) {
                toast.success(`"${name}" ${currentActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}แล้ว`)
                router.refresh()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setLoadingAction(null)
        }
    }

    const renderActions = (group: ProjectGroup) => {
        const isLoading = loadingAction === group.id
        if (isLoading) {
            return <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />
        }
        return (
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(group)} title="แก้ไข">
                    <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-blue-600" />
                </Button>
                {group.is_active ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => handleToggleActive(group.id, group.name, true)} title="ปิดใช้งาน">
                        <XCircle className="h-3.5 w-3.5 text-slate-400 hover:text-orange-600" />
                    </Button>
                ) : (
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => handleToggleActive(group.id, group.name, false)} title="เปิดใช้งาน">
                        <CheckCircle className="h-3.5 w-3.5 text-slate-400 hover:text-green-600" />
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => handleDelete(group.id, group.name)} title="ลบ">
                    <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-600" />
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                    {tree.length} กลุ่มหลัก, {allGroups.filter(g => g.parent_id !== null).length} กลุ่มย่อย
                </div>
                <Button onClick={handleAddGroup} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่ม Group
                </Button>
            </div>

            {/* Tree Table */}
            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-3 w-12 text-center">#</th>
                                <th className="px-4 py-3 w-10"></th>
                                <th className="px-4 py-3">ชื่อ Group / Sub Group</th>
                                <th className="px-4 py-3 w-28">รหัส</th>
                                <th className="px-4 py-3">ชื่อ (TH)</th>
                                <th className="px-4 py-3 w-24 text-center">โครงการ</th>
                                <th className="px-4 py-3 w-24 text-center">สถานะ</th>
                                <th className="px-4 py-3 w-32 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tree.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                                        ยังไม่มี Group กด "เพิ่ม Group" เพื่อสร้างใหม่
                                    </td>
                                </tr>
                            ) : (
                                tree.map((group, idx) => {
                                    const isExpanded = expandedGroups.has(group.id)
                                    const hasChildren = group.children.length > 0

                                    return (
                                        <>
                                            {/* Parent Group Row */}
                                            <tr
                                                key={group.id}
                                                className={cn(
                                                    'hover:bg-slate-50/50 group/row transition-colors bg-slate-50/30',
                                                    !group.is_active && 'opacity-50'
                                                )}
                                            >
                                                <td className="px-4 py-3 text-center text-slate-400 font-medium">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className="w-4 h-4 rounded-full inline-block shadow-sm"
                                                        style={{ backgroundColor: group.color || '#6B7280' }}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            className="flex items-center gap-1.5 font-semibold text-slate-800 hover:text-purple-600 transition-colors"
                                                            onClick={() => hasChildren && toggleExpand(group.id)}
                                                        >
                                                            {hasChildren ? (
                                                                isExpanded
                                                                    ? <ChevronDown className="w-4 h-4 text-slate-400" />
                                                                    : <ChevronRight className="w-4 h-4 text-slate-400" />
                                                            ) : (
                                                                <span className="w-4" />
                                                            )}
                                                            <FolderOpen className="w-4 h-4 text-slate-500" />
                                                            {group.name}
                                                        </button>
                                                        {!group.is_active && (
                                                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 text-xs">
                                                                Inactive
                                                            </span>
                                                        )}
                                                        {/* Add Sub Group button */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 text-xs text-purple-500 hover:text-purple-700 opacity-0 group-hover/row:opacity-100 transition-opacity"
                                                            onClick={() => handleAddSubGroup(group.id)}
                                                        >
                                                            <Plus className="w-3 h-3 mr-1" />
                                                            Sub Group
                                                        </Button>
                                                    </div>
                                                    {group.description && (
                                                        <div className="text-xs text-slate-400 mt-0.5 ml-[4.5rem] truncate max-w-sm">
                                                            {group.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                                                        {group.code}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {group.name_th || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-xs text-slate-500">
                                                        {group.project_count || 0}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {group.is_active ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {renderActions(group)}
                                                </td>
                                            </tr>

                                            {/* Sub Group Rows */}
                                            {isExpanded && group.children.map((child, childIdx) => (
                                                <tr
                                                    key={child.id}
                                                    className={cn(
                                                        'hover:bg-blue-50/30 group/row transition-colors',
                                                        !child.is_active && 'opacity-50'
                                                    )}
                                                >
                                                    <td className="px-4 py-2.5 text-center text-slate-300 text-xs">
                                                        {idx + 1}.{childIdx + 1}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span
                                                            className="w-3.5 h-3.5 rounded-full inline-block shadow-sm"
                                                            style={{ backgroundColor: child.color || '#6B7280' }}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-2 pl-8">
                                                            <Folder className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="text-slate-700">{child.name}</span>
                                                            {!child.is_active && (
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 text-xs">
                                                                    Inactive
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                                                            {child.code}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-slate-500 text-xs">
                                                        {child.name_th || '-'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <span className="text-xs text-slate-500">
                                                            {child.project_count || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        {child.is_active ? (
                                                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        {renderActions(child)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <ProjectGroupModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode={modalMode}
                initialData={selectedGroup}
                parentGroups={topLevelGroups}
                defaultParentId={defaultParentId}
                onSuccess={() => {
                    setIsModalOpen(false)
                    router.refresh()
                }}
            />
        </div>
    )
}
