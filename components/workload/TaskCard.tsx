'use client'

import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface TaskCardProps {
    id: string
    title: string
    hours: number
    priority: string
    status: string
    projectCode: string
    isLocked?: boolean
}

export function TaskCard({ id, title, hours, priority, status, projectCode, isLocked }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        data: {
            title,
            hours,
            priority,
            projectCode,
            isLocked
        },
        disabled: isLocked
    })

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999
    } : undefined

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "p-2 rounded border bg-white shadow-sm text-xs cursor-grab active:cursor-grabbing mb-1 select-none",
                isDragging && "opacity-50 ring-2 ring-blue-500",
                isLocked && "bg-slate-50 opacity-80 cursor-not-allowed border-slate-200"
            )}
        >
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
