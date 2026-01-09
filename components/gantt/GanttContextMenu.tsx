'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, FolderPlus, User, Edit, Trash2 } from 'lucide-react'
import { GanttTask } from '@/lib/actions/gantt-actions'

interface GanttContextMenuProps {
    task: GanttTask
    position: { x: number; y: number }
    onClose: () => void
    onAddStory: (projectId: string, milestoneId?: string) => void
    onAddTask: (storyId: string) => void
    onAssign: (task: GanttTask) => void
    onEdit: (task: GanttTask) => void
    onDelete: (task: GanttTask) => void
}

export function GanttContextMenu({
    task,
    position,
    onClose,
    onAddStory,
    onAddTask,
    onAssign,
    onEdit,
    onDelete
}: GanttContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEsc)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEsc)
        }
    }, [onClose])

    // Menu items based on entity type
    const menuItems: {
        icon: React.ReactNode
        label: string
        onClick: () => void
        className?: string
        show: boolean
    }[] = [
            {
                icon: <FolderPlus className="w-4 h-4" />,
                label: 'Add Story',
                onClick: () => {
                    const projectId = task.entity_type === 'project' ? task.entity_id : task.project_id
                    onAddStory(projectId, task.milestone_id || undefined)
                    onClose()
                },
                show: task.entity_type === 'project' || task.entity_type === 'milestone'
            },
            {
                icon: <Plus className="w-4 h-4" />,
                label: 'Add Task',
                onClick: () => {
                    const storyId = task.story_id || task.entity_id.replace('story_', '')
                    onAddTask(storyId)
                    onClose()
                },
                show: task.entity_type === 'story'
            },
            {
                icon: <User className="w-4 h-4" />,
                label: 'Assign',
                onClick: () => {
                    onAssign(task)
                    onClose()
                },
                show: task.entity_type === 'task'
            },
            {
                icon: <Edit className="w-4 h-4" />,
                label: 'Edit',
                onClick: () => {
                    onEdit(task)
                    onClose()
                },
                show: task.entity_type !== 'project'
            },
            {
                icon: <Trash2 className="w-4 h-4" />,
                label: 'Delete',
                onClick: () => {
                    onDelete(task)
                    onClose()
                },
                className: 'text-red-600 hover:bg-red-50',
                show: task.entity_type === 'story' || task.entity_type === 'task'
            }
        ]

    const visibleItems = menuItems.filter(item => item.show)

    if (!mounted) return null

    // Use createPortal to ensure the menu is above everything else, including overflows
    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
            style={{
                left: Math.min(position.x, window.innerWidth - 180),
                top: Math.min(position.y, window.innerHeight - 250)
            }}
        >
            {/* Header */}
            <div className="px-3 py-2 border-b bg-slate-50 rounded-t-lg">
                <p className="text-xs text-slate-500 truncate max-w-[200px]" title={task.text}>
                    {task.text}
                </p>
            </div>

            {/* Items */}
            {visibleItems.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-400">
                    No actions available
                </div>
            ) : (
                visibleItems.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={item.onClick}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 transition-colors ${item.className || 'text-slate-700'}`}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))
            )}
        </div>,
        document.body
    )
}
