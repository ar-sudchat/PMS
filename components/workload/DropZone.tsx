'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface DropZoneProps {
    id: string
    date: string
    employeeId: string
    children: React.ReactNode
    disabled?: boolean
    className?: string
}

export function DropZone({ id, date, employeeId, children, disabled, className }: DropZoneProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: {
            date,
            employeeId
        },
        disabled
    })

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "min-h-[60px] p-1 rounded transition-colors",
                isOver && !disabled ? "bg-blue-50 ring-1 ring-blue-300 ring-inset" : "",
                className
            )}
        >
            {children}
            {isOver && !disabled && (
                <div className="h-8 border-2 border-dashed border-blue-200 rounded flex items-center justify-center bg-blue-50/50 mt-1">
                    <span className="text-[10px] text-blue-400 font-medium">Drop here</span>
                </div>
            )}
        </div>
    )
}
