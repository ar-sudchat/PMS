'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface TaskCardProps {
    id: string
    title: string
    hours: number
    priority: string
    status: string
    projectCode: string
    isLocked?: boolean
    draggable?: boolean  // Default: false - only Resource Demand panel cards are draggable
    showUnassign?: boolean  // Show unassign button (for Team Workload)
    onUnassign?: (taskId: string) => void  // Callback when unassign is clicked
}

export function TaskCard({
    id,
    title,
    hours,
    priority,
    status,
    projectCode,
    isLocked,
    draggable = false,
    showUnassign = false,
    onUnassign
}: TaskCardProps) {
    const [isHovered, setIsHovered] = useState(false)

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: id,
        data: {
            title,
            hours,
            priority,
            projectCode,
            isLocked
        },
        disabled: !draggable || isLocked
    })

    const handleUnassign = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onUnassign && !isLocked) {
            onUnassign(id)
        }
    }

    return (
        <div
            ref={draggable ? setNodeRef : undefined}
            {...(draggable ? listeners : {})}
            {...(draggable ? attributes : {})}
            className={cn(
                "p-2 rounded border bg-white shadow-sm text-xs mb-1 select-none transition-all relative group",
                draggable && !isLocked && "cursor-grab active:cursor-grabbing",
                draggable && isDragging && "opacity-30",
                isLocked && "bg-slate-50 opacity-80 cursor-not-allowed border-slate-200",
                !draggable && !isLocked && "cursor-default hover:border-slate-300"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Unassign Button - Show on hover */}
            {showUnassign && !isLocked && isHovered && (
                <button
                    onClick={handleUnassign}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all z-10"
                    title="ถอนงาน"
                >
                    <X className="w-3 h-3" />
                </button>
            )}

            <div className="flex justify-between items-start gap-1">
                <span className="font-semibold text-blue-600 truncate">{projectCode}</span>
                {isLocked && <span className="text-[10px]" title="Locked">🔒</span>}
            </div>
            <p className="font-medium truncate mt-0.5" title={title}>{title}</p>
            <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
                <span className={cn(
                    "px-1 py-0.5 rounded",
                    priority === 'urgent' ? "bg-red-100 text-red-600" :
                        priority === 'high' ? "bg-amber-100 text-amber-600" :
                            priority === 'medium' ? "bg-blue-50 text-blue-600" :
                                "bg-slate-100"
                )}>
                    {priority}
                </span>
                <span>{hours}h</span>
            </div>
        </div>
    )
}
