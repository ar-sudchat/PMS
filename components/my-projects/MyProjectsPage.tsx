'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FolderOpen, Calendar, Users, TrendingUp, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project {
    id: string
    project_code: string
    name: string
    customer_name: string
    status_name: string
    status_color: string
    start_date: string
    end_date: string
    total_stories: number
    done_stories: number
    total_tasks: number
    done_tasks: number
    total_milestones: number
    done_milestones: number
}

import { GanttData, GanttTask } from '@/lib/actions/gantt-actions'
import { GanttChart } from '@/components/gantt/GanttChart'
import { GanttToolbar } from '@/components/gantt/GanttToolbar'
import { GanttContextMenu } from '@/components/gantt/GanttContextMenu'
import { StoryModal } from '@/components/gantt/StoryModal'
import { TaskModal } from '@/components/gantt/TaskModal'
import { LayoutGrid, List } from 'lucide-react'

// ... existing Project interface ...

interface MyProjectsPageProps {
    projects: Project[]
    multiProjectGanttData: GanttData
}

export function MyProjectsPage({ projects, multiProjectGanttData }: MyProjectsPageProps) {
    const [zoomScale, setZoomScale] = useState<'day' | 'month'>('day')

    // Modals State
    const [storyModal, setStoryModal] = useState<{ open: boolean; projectId: string; milestoneId?: string }>({ open: false, projectId: '' })
    const [taskModal, setTaskModal] = useState<{ open: boolean; storyId: string }>({ open: false, storyId: '' })

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ task: GanttTask | null; position: { x: number; y: number } | null }>({
        task: null, position: null
    })

    const handleZoomChange = (scale: 'day' | 'week' | 'month') => {
        setZoomScale(scale)
    }

    const handleRefresh = () => {
        window.location.reload()
    }

    // Interaction Handlers
    const handleTaskDblClick = (task: GanttTask) => {
        // TaskModal and StoryModal don't support editing yet
        // Double-click is disabled for now
    }

    const handleContextMenu = (task: GanttTask, position: { x: number; y: number }) => {
        setContextMenu({ task, position })
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">📁 My Projects</h1>
                    <p className="text-slate-500">โครงการที่คุณรับผิดชอบ ({projects.length} โครงการ)</p>
                </div>
                <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                    ⚙️ Settings
                </Link>
            </div>

            {/* Timeline View */}
            <div className="bg-white rounded-xl border overflow-hidden relative">
                <GanttToolbar
                    onZoomChange={handleZoomChange}
                    onRefresh={handleRefresh}
                    onExport={() => window.print()}
                />
                <GanttChart
                    data={multiProjectGanttData}
                    zoom={zoomScale}
                    onTaskDblClick={handleTaskDblClick}
                    onContextMenu={handleContextMenu}
                    onDataChange={handleRefresh}
                />

                {contextMenu.task && contextMenu.position && (
                    <GanttContextMenu
                        task={contextMenu.task}
                        position={contextMenu.position}
                        onClose={() => setContextMenu({ task: null, position: null })}
                        onAddStory={(pid, mid) => {
                            setStoryModal({ open: true, projectId: pid, milestoneId: mid })
                            setContextMenu({ task: null, position: null })
                        }}
                        onAddTask={(storyId) => {
                            setTaskModal({ open: true, storyId })
                            setContextMenu({ task: null, position: null })
                        }}
                        onAssign={(task) => {
                            // TODO: Implement assign functionality
                            setContextMenu({ task: null, position: null })
                        }}
                        onEdit={(task) => {
                            // TaskModal and StoryModal don't support editing yet
                            // Edit functionality is disabled for now
                            setContextMenu({ task: null, position: null })
                        }}
                        onDelete={(task) => {
                            // TODO: Implement delete functionality
                            setContextMenu({ task: null, position: null })
                        }}
                    />
                )}
            </div>

            <StoryModal
                open={storyModal.open}
                onClose={() => setStoryModal(prev => ({ ...prev, open: false }))}
                projectId={storyModal.projectId}
                milestoneId={storyModal.milestoneId}
                onSuccess={handleRefresh}
            />

            <TaskModal
                open={taskModal.open}
                onClose={() => setTaskModal(prev => ({ ...prev, open: false }))}
                storyId={taskModal.storyId}
                onSuccess={handleRefresh}
            />
        </div>
    )
}

function ProjectCard({ project }: { project: Project }) {
    const progress = project.total_tasks > 0
        ? Math.round((project.done_tasks / project.total_tasks) * 100)
        : 0

    const isOverdue = project.end_date && new Date(project.end_date) < new Date()

    return (
        <div className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-slate-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-slate-800">{project.project_code}</span>
                        <span className="text-slate-600">{project.name}</span>
                        <span
                            className="px-2 py-1 text-xs rounded"
                            style={{ backgroundColor: project.status_color + '20', color: project.status_color }}
                        >
                            {project.status_name}
                        </span>
                        {isOverdue && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded">
                                ⚠️ Overdue
                            </span>
                        )}
                    </div>
                    <span className="text-sm text-slate-500">🏢 {project.customer_name}</span>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-500">Progress</span>
                        <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-blue-500" : "bg-amber-500"
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Milestone Timeline */}
                <div className="mb-4">
                    <p className="text-sm text-slate-500 mb-2">🚩 Milestones ({project.done_milestones}/{project.total_milestones})</p>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: project.total_milestones }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex-1 h-2 rounded",
                                    i < project.done_milestones ? "bg-green-500" : "bg-slate-200"
                                )}
                            />
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-lg font-bold text-slate-800">{project.done_stories}/{project.total_stories}</p>
                        <p className="text-xs text-slate-500">Stories</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-lg font-bold text-slate-800">{project.done_tasks}/{project.total_tasks}</p>
                        <p className="text-xs text-slate-500">Tasks</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-lg font-bold text-slate-800">
                            {project.start_date ? new Date(project.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-'}
                        </p>
                        <p className="text-xs text-slate-500">Start</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                        <p className={cn(
                            "text-lg font-bold",
                            isOverdue ? "text-red-600" : "text-slate-800"
                        )}>
                            {project.end_date ? new Date(project.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-'}
                        </p>
                        <p className="text-xs text-slate-500">Due</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                    <Link
                        href={`/projects/${project.id}`}
                        className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        📊 View Gantt
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
