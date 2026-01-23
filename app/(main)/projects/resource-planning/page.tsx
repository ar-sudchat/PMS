'use client'

import { useState } from 'react'
import { ResourcePlanningView } from '@/components/workload/ResourcePlanningView'
import { GanttResourceView } from '@/components/workload/GanttResourceView'
import { WeeklyWorkloadTable } from '@/components/workload/WeeklyWorkloadTable'
import { LayoutGrid, GanttChart, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

type ViewMode = 'card' | 'gantt' | 'weekly'

export default function ResourcePlanningPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('gantt')

    return (
        <div className="p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
            {/* View Toggle */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <h1 className="text-xl font-bold text-slate-800">Resource Planning</h1>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('gantt')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                            viewMode === 'gantt'
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <GanttChart className="w-4 h-4" />
                        Gantt View
                    </button>
                    <button
                        onClick={() => setViewMode('card')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                            viewMode === 'card'
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Card View
                    </button>
                    <button
                        onClick={() => setViewMode('weekly')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                            viewMode === 'weekly'
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Calendar className="w-4 h-4" />
                        Weekly Workload
                    </button>
                </div>
            </div>

            {/* View Content */}
            <div className="flex-1 overflow-hidden">
                {viewMode === 'gantt' ? (
                    <GanttResourceView />
                ) : viewMode === 'weekly' ? (
                    <WeeklyWorkloadTable />
                ) : (
                    <ResourcePlanningView />
                )}
            </div>
        </div>
    )
}
