'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Settings } from 'lucide-react'
import { ProjectDetail } from '@/lib/actions/project-detail-actions'
import { GanttData, getGanttData } from '@/lib/actions/gantt-actions'
import { GanttChart } from '@/components/gantt/GanttChart'
import { GanttToolbar } from '@/components/gantt/GanttToolbar'
import { cn } from '@/lib/utils'

interface ProjectGanttPageProps {
    project: ProjectDetail
    ganttData: GanttData | null
    currentUser: {
        id: string
        role: 'admin' | 'manager' | 'member'
        [key: string]: any
    }
}

export function ProjectGanttPage({ project, ganttData: initialGanttData, currentUser }: ProjectGanttPageProps) {
    const [ganttData, setGanttData] = useState(initialGanttData)
    const [zoomScale, setZoomScale] = useState<'day' | 'month'>('day')

    // Calculate if user can edit this project
    const canEdit = useMemo(() => {
        // Admin can edit everything
        if (currentUser.role === 'admin') return true

        // Manager/Owner can edit their own projects
        if (currentUser.role === 'manager') {
            return project.owner_id === currentUser.id
        }

        // Members cannot edit via Gantt (read-only)
        return false
    }, [currentUser, project])

    const handleRefresh = useCallback(async () => {
        // Note: getGanttData doesn't support single project filtering yet
        // For now we refresh all data and filter on client side
        const result = await getGanttData({})
        if (result.success && result.data) {
            // Filter to only this project's data
            const filteredData = {
                ...result.data,
                data: result.data.data.filter(item =>
                    item.entity_type === 'project' ? item.entity_id === project.id :
                    item.project_id === project.id
                )
            }
            setGanttData(filteredData)
        }
    }, [project.id])

    const handleExport = () => {
        // Export to PDF/PNG
        window.print()
    }

    const handleZoomChange = (scale: 'day' | 'week' | 'month') => {
        setZoomScale(scale)
        // Update gantt scale via event or ref
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl border p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/my-projects"
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold">{project.project_code}</h1>
                                <span
                                    className="px-2 py-1 text-sm rounded"
                                    style={{ backgroundColor: project.status_color + '20', color: project.status_color }}
                                >
                                    {project.status_name}
                                </span>
                            </div>
                            <p className="text-lg text-slate-600">{project.name}</p>
                            <p className="text-sm text-slate-500">{project.customer_name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <Plus className="w-4 h-4" />
                            Add Story
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-slate-800">{project.progress_percent}%</p>
                        <p className="text-sm text-slate-500">Progress</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-slate-800">
                            {project.completed_stories}/{project.total_stories}
                        </p>
                        <p className="text-sm text-slate-500">Stories</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-slate-800">
                            {project.completed_tasks}/{project.total_tasks}
                        </p>
                        <p className="text-sm text-slate-500">Tasks</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-slate-800">
                            {project.used_mandays?.toFixed(1)}/{project.sold_mandays}
                        </p>
                        <p className="text-sm text-slate-500">Mandays</p>
                    </div>
                    <div className="text-center">
                        <p className={cn(
                            "text-2xl font-bold",
                            project.health_status === 'overdue' ? "text-red-600" :
                                project.health_status === 'at_risk' ? "text-amber-600" : "text-green-600"
                        )}>
                            {project.health_status === 'on_track' ? '🟢' :
                                project.health_status === 'at_risk' ? '🟡' : '🔴'}
                        </p>
                        <p className="text-sm text-slate-500">Health</p>
                    </div>
                </div>
            </div>

            {/* Gantt Chart */}
            <div className="bg-white rounded-xl border overflow-hidden">
                <GanttToolbar
                    onZoomChange={handleZoomChange}
                    onRefresh={handleRefresh}
                    onExport={handleExport}
                />

                {!canEdit && (
                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
                        <p className="text-sm text-amber-700">
                            🔒 Read-only mode - คุณสามารถดูและเลื่อนดูได้เท่านั้น (ไม่สามารถแก้ไขได้)
                        </p>
                    </div>
                )}

                {ganttData ? (
                    <GanttChart
                        data={ganttData}
                        zoom={zoomScale}
                        readOnly={!canEdit}
                        onDataChange={handleRefresh}
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
