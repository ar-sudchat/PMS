'use client'

import { useState, useCallback, useRef, useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { GripVertical } from 'lucide-react'

interface ResizablePanelLayoutProps {
    leftPanel: ReactNode
    rightPanel: ReactNode
    defaultLeftWidth?: number // percentage 0-100
    minLeftWidth?: number // percentage
    maxLeftWidth?: number // percentage
    className?: string
}

export function ResizablePanelLayout({
    leftPanel,
    rightPanel,
    defaultLeftWidth = 25,
    minLeftWidth = 15,
    maxLeftWidth = 40,
    className
}: ResizablePanelLayoutProps) {
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
    const [isDragging, setIsDragging] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return

        const container = containerRef.current
        const rect = container.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percentage = (x / rect.width) * 100

        // Clamp the percentage within bounds
        const clampedPercentage = Math.min(Math.max(percentage, minLeftWidth), maxLeftWidth)
        setLeftWidth(clampedPercentage)
    }, [isDragging, minLeftWidth, maxLeftWidth])

    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            // Change cursor globally while dragging
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }
    }, [isDragging, handleMouseMove, handleMouseUp])

    return (
        <div
            ref={containerRef}
            className={cn("flex flex-row h-full", className)}
        >
            {/* Left Panel */}
            <div
                style={{ width: `${leftWidth}%` }}
                className="shrink-0 overflow-auto"
            >
                {leftPanel}
            </div>

            {/* Resize Handle */}
            <div
                onMouseDown={handleMouseDown}
                className={cn(
                    "w-3 shrink-0 flex items-center justify-center cursor-col-resize group transition-colors",
                    "hover:bg-blue-50 active:bg-blue-100",
                    isDragging && "bg-blue-100"
                )}
            >
                <div className={cn(
                    "flex flex-col items-center gap-1 py-4 px-1 rounded-full transition-colors",
                    "bg-slate-200 group-hover:bg-blue-200",
                    isDragging && "bg-blue-300"
                )}>
                    <GripVertical className={cn(
                        "w-4 h-4 text-slate-400 group-hover:text-blue-500",
                        isDragging && "text-blue-600"
                    )} />
                </div>
            </div>

            {/* Right Panel */}
            <div
                style={{ width: `calc(${100 - leftWidth}% - 12px)` }}
                className="flex-1 overflow-auto"
            >
                {rightPanel}
            </div>
        </div>
    )
}
