'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { ProjectDetail } from '@/lib/actions/project-detail-actions'
import { GanttData, getGanttData } from '@/lib/actions/gantt-actions'
import { GanttTabContent } from './GanttTabContent'
import { WorkItemsTabContent } from './work-items/WorkItemsTabContent'
import { ProjectTabs } from './ProjectTabs'
import { cn } from '@/lib/utils'

interface ProjectGanttPageProps {
    project: ProjectDetail
    ganttData: GanttData | null
    currentUser: {
        id: string
        role: 'admin' | 'manager' | 'member'
        [key: string]: any
    },
    activeTab: string
}

export function ProjectGanttPage({ project, ganttData: initialGanttData, currentUser, activeTab }: ProjectGanttPageProps) {
    const [ganttData, setGanttData] = useState(initialGanttData)
    // Zoom state moved to GanttTabContent or kept here? GanttTabContent has its own.

    // Calculate if user can edit this project
    const canEdit = useMemo(() => {
        if (currentUser.role === 'admin') return true
        if (currentUser.role === 'manager') return project.owner_id === currentUser.id
        return false
    }, [currentUser, project])

    const handleGanttRefresh = useCallback(async () => {
        const result = await getGanttData({})
        if (result.success && result.data) {
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
                        {/* Global Actions if any */}
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="mt-6">
                    <ProjectTabs projectId={project.id} />
                </div>

                {/* Shared Stats - Only for Gantt View as per requirement 'Original Content' ?? 
                   Actually stats at top are useful for both?
                   Requirement says: "Gantt View (default, เนื้อหาเดิม)"
                   "Work Items Tab Content -> Summary Cards (ด้านบน)"
                   So Work Items has its own stats.
                   I will show Project Stats ONLY for Gantt view or make them consistent.
                   Given specific requirement for Work Item Summary Cards, I'll hide the generic Project Stats when in Work Items tab,
                   to avoid cluttering (2 sets of stats).
                */}

                {activeTab === 'gantt' && (
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
                )}
            </div>

            {/* Tab Content */}
            {activeTab === 'gantt' ? (
                <GanttTabContent
                    data={ganttData}
                    readOnly={!canEdit}
                    onRefresh={handleGanttRefresh}
                />
            ) : (
                <WorkItemsTabContent projectId={project.id} />
            )}
        </div>
    )
}
