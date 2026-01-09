'use client'

import { useState, useCallback, useEffect } from 'react'
import { FolderKanban, BarChart3, Settings } from 'lucide-react'
import Link from 'next/link'
import { GanttChart, ZoomLevel } from '@/components/gantt/GanttChart'
import { GanttToolbar } from '@/components/gantt/GanttToolbar'
import { GanttContextMenu } from '@/components/gantt/GanttContextMenu'
import { StoryModal } from '@/components/gantt/StoryModal'
import { TaskModal } from '@/components/gantt/TaskModal'
import { AssignTaskModal } from '@/components/workload/AssignTaskModal' // Keep in workload folder as originally planned
import { TeamWorkloadView } from '@/components/workload/TeamWorkloadView'
import {
    GanttData,
    GanttTask,
    getGanttData,
    deleteStory,
    deleteTask
} from '@/lib/actions/gantt-actions'

interface MyProjectsGanttPageProps {
    initialData: GanttData
    currentUser: any
}

type ViewMode = 'gantt' | 'workload'

export function MyProjectsGanttPage({ initialData, currentUser }: MyProjectsGanttPageProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('gantt')
    const [zoom, setZoom] = useState<ZoomLevel>('week')
    const [ganttData, setGanttData] = useState<GanttData | null>(initialData)
    const [isLoading, setIsLoading] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        task: GanttTask
        position: { x: number; y: number }
    } | null>(null)

    // Modal states
    const [storyModal, setStoryModal] = useState<{
        open: boolean
        projectId: string
        milestoneId?: string
    }>({ open: false, projectId: '' })

    const [taskModal, setTaskModal] = useState<{
        open: boolean
        storyId: string
    }>({ open: false, storyId: '' })

    const [assignModal, setAssignModal] = useState<{
        open: boolean
        task: GanttTask | null
    }>({ open: false, task: null })

    // Load data
    const loadData = useCallback(async () => {
        // Only load if explicit refresh or not initial
        // But we use initialData. 
        // This is for manual refresh.
        const result = await getGanttData()
        if (result.success && result.data) {
            setGanttData(result.data)
        }
        setIsLoading(false)
        setIsRefreshing(false)
    }, [])

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true)
        loadData()
    }, [loadData])

    // Context menu handlers
    const handleContextMenu = useCallback((task: GanttTask, position: { x: number; y: number }) => {
        setContextMenu({ task, position })
    }, [])

    const handleAddStory = useCallback((projectId: string, milestoneId?: string) => {
        setStoryModal({ open: true, projectId, milestoneId })
    }, [])

    const handleAddTask = useCallback((storyId: string) => {
        const actualStoryId = storyId.startsWith('story_') ? storyId.replace('story_', '') : storyId
        setTaskModal({ open: true, storyId: actualStoryId })
    }, [])

    const handleAssign = useCallback((task: GanttTask) => {
        setAssignModal({ open: true, task })
    }, [])

    const handleEdit = useCallback((task: GanttTask) => {
        // For now, just open assign modal for tasks or log
        if (task.entity_type === 'task') {
            handleAssign(task)
        }
    }, [handleAssign])

    const handleDelete = useCallback(async (task: GanttTask) => {
        const msg = task.entity_type === 'story'
            ? 'ลบ Story นี้และ Tasks ทั้งหมด?'
            : 'ลบ Task นี้?'

        if (!confirm(msg)) return

        if (task.entity_type === 'story') {
            const res = await deleteStory(task.entity_id)
            if (!res.success) alert(res.error)
        } else if (task.entity_type === 'task') {
            const res = await deleteTask(task.entity_id)
            if (!res.success) alert(res.error)
        }

        handleRefresh()
    }, [handleRefresh])

    // Double-click handler
    const handleTaskDblClick = useCallback((task: GanttTask) => {
        if (task.entity_type === 'task') {
            handleAssign(task)
        } else if (task.entity_type === 'story') {
            const storyId = task.story_id || task.entity_id.replace('story_', '')
            handleAddTask(storyId)
        } else if (task.entity_type === 'project' || task.entity_type === 'milestone') {
            const projectId = task.entity_type === 'project' ? task.entity_id : task.project_id
            handleAddStory(projectId, task.milestone_id || undefined)
        }
    }, [handleAddStory, handleAddTask, handleAssign])

    // Count projects
    const projectCount = ganttData?.data.filter(t => t.entity_type === 'project').length || 0

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0 h-16">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <FolderKanban className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">My Projects</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('gantt')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'gantt' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Gantt View
                        </button>
                        <button
                            onClick={() => setViewMode('workload')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'workload' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Team Workload
                        </button>
                    </div>

                    <Link href="/settings" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Settings">
                        <Settings className="w-5 h-5" />
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden p-4">
                {viewMode === 'gantt' ? (
                    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="p-2 border-b">
                            <GanttToolbar
                                zoom={zoom}
                                onZoomChange={setZoom}
                                onRefresh={handleRefresh}
                                isRefreshing={isRefreshing}
                                onExport={() => alert('Export feature coming soon!')}
                            />
                        </div>

                        <div className="flex-1 relative">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                                        <p className="text-slate-500">Loading...</p>
                                    </div>
                                </div>
                            ) : ganttData && ganttData.data.length > 0 ? (
                                <GanttChart
                                    data={ganttData}
                                    zoom={zoom}
                                    onTaskDblClick={handleTaskDblClick}
                                    onContextMenu={handleContextMenu}
                                    onDataChange={handleRefresh}
                                    onAddStory={handleAddStory}
                                    onAddTask={handleAddTask}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    <div className="text-center">
                                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-lg font-medium mb-1">ไม่มีโครงการ</p>
                                        <p className="text-sm">คุณยังไม่ได้รับมอบหมายให้ดูแลโครงการใดๆ</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Legend */}
                        {ganttData && ganttData.data.length > 0 && (
                            <div className="bg-slate-50 border-t p-2">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs justify-center">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-4 h-3 bg-gradient-to-r from-blue-800 to-blue-500 rounded" />
                                        Project
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 bg-purple-500 rotate-45 rounded-sm" />
                                        Milestone
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-4 h-3 bg-gradient-to-r from-blue-500 to-blue-400 rounded" />
                                        Story
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-4 h-3 bg-gradient-to-r from-blue-400 to-blue-300 rounded" />
                                        Task
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-4 h-3 bg-gradient-to-r from-green-600 to-green-500 rounded" />
                                        Done
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-4 h-3 bg-gradient-to-r from-amber-600 to-amber-500 rounded" />
                                        In Progress
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-4 h-3 bg-gradient-to-r from-red-600 to-red-500 rounded" />
                                        Overdue
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto">
                        <TeamWorkloadView />
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <GanttContextMenu
                    task={contextMenu.task}
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                    onAddStory={handleAddStory}
                    onAddTask={handleAddTask}
                    onAssign={handleAssign}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            {/* Modals */}
            <StoryModal
                open={storyModal.open}
                onClose={() => setStoryModal({ ...storyModal, open: false })}
                projectId={storyModal.projectId}
                milestoneId={storyModal.milestoneId}
                onSuccess={handleRefresh}
            />

            <TaskModal
                open={taskModal.open}
                onClose={() => setTaskModal({ ...taskModal, open: false })}
                storyId={taskModal.storyId}
                onSuccess={handleRefresh}
            />

            {assignModal.task && (
                <AssignTaskModal
                    open={assignModal.open}
                    onClose={() => setAssignModal({ ...assignModal, open: false })}
                    taskId={assignModal.task.entity_id}
                    taskTitle={assignModal.task.text}
                    startDate={assignModal.task.start_date}
                    endDate={assignModal.task.end_date}
                    estimatedHours={assignModal.task.estimated_hours || 0}
                    currentAssigneeId={assignModal.task.assignee_id || undefined}
                    onAssign={async () => {
                        // Assign logic is inside modal, just refresh here
                        handleRefresh()
                    }}
                />
            )}
        </div>
    )
}
