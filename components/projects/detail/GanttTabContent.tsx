'use client'

import { useState } from 'react'
import { GanttData } from '@/lib/actions/gantt-actions'
import { GanttChart } from '@/components/gantt/GanttChart'
import { GanttToolbar } from '@/components/gantt/GanttToolbar'

interface GanttTabContentProps {
    data: GanttData | null
    readOnly: boolean
    onRefresh: () => void
}

export function GanttTabContent({ data, readOnly, onRefresh }: GanttTabContentProps) {
    const [zoomScale, setZoomScale] = useState<'day' | 'month'>('day')

    const handleZoomChange = (scale: 'day' | 'month') => {
        setZoomScale(scale)
    }

    const handleExport = () => {
        window.print()
    }

    return (
        <div className="space-y-4">
            {/* Gantt Chart */}
            <div className="bg-white rounded-xl border overflow-hidden">
                <GanttToolbar
                    onZoomChange={handleZoomChange}
                    onRefresh={onRefresh}
                    onExport={handleExport}
                />

                {!readOnly && (
                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
                        <p className="text-sm text-amber-700">
                            🔒 Read-only mode - คุณสามารถดูและเลื่อนดูได้เท่านั้น (ไม่สามารถแก้ไขได้)
                        </p>
                    </div>
                )}

                {data ? (
                    <GanttChart
                        data={data}
                        zoom={zoomScale}
                        readOnly={readOnly}
                        onDataChange={onRefresh}
                    />
                ) : (
                    <div className="flex items-center justify-center h-96 text-slate-500">
                        <div className="text-center">
                            <p className="text-lg mb-2">ไม่มีข้อมูล Timeline</p>
                            <p className="text-sm">เริ่มสร้าง Story และ Task เพื่อดู Gantt Chart</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="bg-white rounded-xl border p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Legend:</p>
                <div className="flex items-center gap-6 text-sm">
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-green-500 rounded"></span> Done
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-blue-500 rounded"></span> In Progress
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-slate-300 rounded"></span> Planned
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-red-500 rounded"></span> Overdue
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-indigo-500 rounded-full"></span> Milestone
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-1 h-4 bg-red-500"></span> Today
                    </span>
                </div>
            </div>
        </div>
    )
}
