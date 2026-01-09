'use client'

import { ChevronLeft, ChevronRight, Calendar, RefreshCw, Download, Plus } from 'lucide-react'
import { ZoomLevel } from './GanttChart'

interface GanttToolbarProps {
    zoom?: ZoomLevel
    onZoomChange: (zoom: ZoomLevel) => void
    onRefresh: () => void
    onExport?: () => void
    onQuickAdd?: () => void
    isRefreshing?: boolean
    // Optional for backward compatibility if parent uses different prop names (it shouldn't based on previous edits)
}

export function GanttToolbar({
    zoom = 'week',
    onZoomChange,
    onRefresh,
    onExport,
    onQuickAdd,
    isRefreshing
}: GanttToolbarProps) {
    const zoomOptions: { value: ZoomLevel; label: string }[] = [
        { value: 'day', label: 'Day' },
        { value: 'week', label: 'Week' },
        { value: 'month', label: 'Month' }
    ]

    // Navigation handlers using window methods
    const handlePrev = () => {
        (window as any).__ganttScrollPrev?.()
    }

    const handleNext = () => {
        (window as any).__ganttScrollNext?.()
    }

    const handleToday = () => {
        (window as any).__ganttScrollToToday?.()
    }

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
            {/* Left: Zoom Buttons */}
            <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500 mr-2">Zoom:</span>
                {zoomOptions.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => onZoomChange(opt.value)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${zoom === opt.value
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Center: Navigation */}
            <div className="flex items-center gap-1">
                <button
                    onClick={handlePrev}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title={`Previous ${zoom === 'day' ? 'Week' : zoom === 'week' ? 'Month' : 'Quarter'}`}
                >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>

                <button
                    onClick={handleToday}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium"
                >
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Today</span>
                </button>

                <button
                    onClick={handleNext}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title={`Next ${zoom === 'day' ? 'Week' : zoom === 'week' ? 'Month' : 'Quarter'}`}
                >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                {onQuickAdd && (
                    <button
                        onClick={onQuickAdd}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Quick Add</span>
                    </button>
                )}

                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw className={`w-5 h-5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>

                {onExport && (
                    <button
                        onClick={onExport}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Export</span>
                    </button>
                )}
            </div>
        </div>
    )
}
