'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { FolderKanban, BarChart3, Settings, Search, Building, ChevronDown, Check } from 'lucide-react'
import Link from 'next/link'
import { GanttChart, ZoomLevel } from '@/components/gantt/GanttChart'
import { GanttToolbar } from '@/components/gantt/GanttToolbar'
import { GanttContextMenu } from '@/components/gantt/GanttContextMenu'
import { CreateStoryModal as StoryModal } from '@/components/modals/CreateStoryModal'
import { NewTaskModal as TaskModal } from '@/components/modals/NewTaskModal'
import { AssignTaskModal } from '@/components/gantt/AssignTaskModal'
import { WorkItemsModal } from '@/components/gantt/WorkItemsModal'
import { DailyTaskWorkloadView } from '@/components/workload/DailyTaskWorkloadView'
import { getProjectFilterOptions } from '@/lib/actions/project-actions'
import {
    GanttData,
    GanttTask,
    getGanttData,
    deleteStory,
    deleteTask
} from '@/lib/actions/gantt-actions'
import { getGlobalWorkItems, ProjectWorkItemsGroup } from '@/lib/actions/work-items-actions'
import { AllWorkItemsView } from './AllWorkItemsView'
import { cn } from '@/lib/utils'

interface MyProjectsGanttPageProps {
    initialData: GanttData
    currentUser: any
}

type ViewMode = 'gantt' | 'work-items' | 'daily-workload'

interface Filters {
    year: number | ''
    customerId: string
    managerId: string
    ownerId: string
    statusId: string
    milestoneIds: string[]
    search: string
    assigneeId: string
}

interface FilterOptions {
    customers: { id: string; code: string; name: string }[]
    managers: { id: string; name: string; name_th: string }[]
    owners: { id: string; name: string; name_th: string; position_code: string }[]
    years: number[]
    statuses: { id: string; code: string; name: string; color: string }[]
    milestones: { id: string; code: string; name: string; color: string }[]
}

export function MyProjectsGanttPage({ initialData, currentUser }: MyProjectsGanttPageProps) {
    console.log('DEBUG - currentUser full:', JSON.stringify(currentUser, null, 2))
    const [viewMode, setViewMode] = useState<ViewMode>('gantt')
    const [zoom, setZoom] = useState<ZoomLevel>('day') // Default to 'day'
    const [ganttData, setGanttData] = useState<GanttData | null>(initialData)
    const [workItemsData, setWorkItemsData] = useState<ProjectWorkItemsGroup[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Filters
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        customers: [],
        managers: [],
        owners: [],
        years: [],
        statuses: [],
        milestones: []
    })

    const [filters, setFilters] = useState<Filters>({
        year: new Date().getFullYear(),
        customerId: '',
        managerId: '',
        ownerId: currentUser?.employeeId || currentUser?.id || '', // Default to login user
        statusId: '',
        milestoneIds: [],
        search: '',
        assigneeId: ''
    })

    const [isMilestoneDropdownOpen, setIsMilestoneDropdownOpen] = useState(false)

    // Derived Read-Only State
    // Admin and Manager can edit, Member is read-only
    const isReadOnly = currentUser?.role === 'member'

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

    // Edit Task Modal state
    const [editTaskModal, setEditTaskModal] = useState<{
        open: boolean
        task: GanttTask | null
    }>({ open: false, task: null })

    const [assignModal, setAssignModal] = useState<{
        open: boolean
        task: GanttTask | null
    }>({ open: false, task: null })

    const [workItemsModal, setWorkItemsModal] = useState<{
        open: boolean
        projectId: string
    }>({ open: false, projectId: '' })

    // Load Filter Options
    useEffect(() => {
        loadFilterOptions()
    }, [])

    const loadFilterOptions = async () => {
        const result = await getProjectFilterOptions()
        if (result.success && result.data) {
            setFilterOptions(result.data)

            // Set default status to "Active" if available and not already set
            if (!filters.statusId && result.data.statuses?.length > 0) {
                const activeStatus = result.data.statuses.find(
                    (s: any) => s.code?.toLowerCase() === 'active' || s.name?.toLowerCase() === 'active'
                )
                if (activeStatus) {
                    setFilters(prev => ({ ...prev, statusId: activeStatus.id }))
                }
            }
        }
    }

    // Load data
    const loadData = useCallback(async () => {
        setIsLoading(true)

        if (viewMode === 'gantt') {
            const result = await getGanttData({
                year: filters.year || undefined,
                customerId: filters.customerId || undefined,
                managerId: filters.managerId || undefined,
                ownerId: filters.ownerId || undefined,
                statusId: filters.statusId || undefined,
                milestoneIds: filters.milestoneIds.length > 0 ? filters.milestoneIds : undefined,
                search: filters.search || undefined,
                assigneeId: filters.assigneeId || undefined
            })
            if (result.success && result.data) {
                setGanttData(result.data)
            }
        } else if (viewMode === 'work-items') {
            const result = await getGlobalWorkItems({
                year: filters.year || undefined,
                customerId: filters.customerId || undefined,
                managerId: filters.managerId || undefined,
                ownerId: filters.ownerId || undefined,
                statusId: filters.statusId || undefined,
                milestoneIds: filters.milestoneIds.length > 0 ? filters.milestoneIds : undefined,
                search: filters.search || undefined
            })
            if (result.success && result.data) {
                setWorkItemsData(result.data)
            }
        }

        setIsLoading(false)
        setIsRefreshing(false)
    }, [filters, viewMode])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleRefresh = useCallback(async () => {
        await loadData() // Reuse loadData logic
    }, [loadData])


    const handleFilterChange = (key: keyof Filters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const toggleMilestone = (milestoneId: string) => {
        setFilters(prev => ({
            ...prev,
            milestoneIds: prev.milestoneIds.includes(milestoneId)
                ? prev.milestoneIds.filter(id => id !== milestoneId)
                : [...prev.milestoneIds, milestoneId]
        }))
    }

    // Context menu handlers
    const handleContextMenu = useCallback((task: GanttTask, position: { x: number; y: number }) => {
        // Disable context menu if read only? Or just disable edit options?
        // User said "View Only". So no context menu actions for editing.
        // It's cleaner to just not show it, or show limited options.
        if (isReadOnly) return
        setContextMenu({ task, position })
    }, [isReadOnly])

    const handleQuickAdd = useCallback(() => {
        if (isReadOnly) return
        const firstProject = ganttData?.data.find(d => d.entity_type === 'project')
        setWorkItemsModal({ open: true, projectId: firstProject?.entity_id || '' })
    }, [ganttData, isReadOnly])

    // ... (rest of methods)

    const projects = ganttData?.data
        .filter(t => t.entity_type === 'project')
        .map(t => ({ id: t.entity_id, name: t.text })) || []

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

    // Open Edit Task Modal
    const handleEditTask = useCallback((task: GanttTask) => {
        setEditTaskModal({ open: true, task })
    }, [])

    const handleEdit = useCallback((task: GanttTask) => {
        // Open edit task modal for tasks
        if (task.entity_type === 'task') {
            handleEditTask(task)
        }
    }, [handleEditTask])

    const handleDelete = useCallback(async (task: GanttTask) => {
        if (task.entity_type === 'project' || task.entity_type === 'milestone') {
            alert('ไม่สามารถลบ Project หรือ Milestone ได้จากหน้านี้ กรุณาแก้ไขที่หน้า Project Detail')
            return
        }

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

    // Double-click handler - เปิด Edit Task Modal แทน Assign Modal
    const handleTaskDblClick = useCallback((task: GanttTask) => {
        if (task.entity_type === 'task') {
            handleEditTask(task)
        } else if (task.entity_type === 'story') {
            const storyId = task.story_id || task.entity_id.replace('story_', '')
            handleAddTask(storyId)
        } else if (task.entity_type === 'project' || task.entity_type === 'milestone') {
            const projectId = task.entity_type === 'project' ? task.entity_id : task.project_id
            handleAddStory(projectId, task.milestone_id || undefined)
        }
    }, [handleAddStory, handleAddTask, handleEditTask])

    // Count projects
    const projectCount = ganttData?.data.filter(t => t.entity_type === 'project').length || 0

    // Derive Milestones for active project in StoryModal
    const activeProjectMilestones = useMemo(() => {
        if (!ganttData || !storyModal.projectId) return []
        return ganttData.data
            .filter(t => t.entity_type === 'milestone' && t.project_id === storyModal.projectId)
            .map(t => ({ id: t.entity_id, name: t.text }))
    }, [ganttData, storyModal.projectId])

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Main Content */}
            <div className="flex-1 overflow-hidden p-4 flex flex-col gap-4">
                {/* Filters */}
                <div className="bg-white rounded-xl border p-4 shrink-0 shadow-sm">
                    <div className="flex items-end gap-4 flex-wrap">
                        {/* Year */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Fiscal Year</label>
                            <select
                                value={filters.year}
                                onChange={(e) => handleFilterChange('year', e.target.value ? parseInt(e.target.value) : '')}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[100px] bg-white"
                            >
                                <option value="">All Years</option>
                                {filterOptions.years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        {/* Customer */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Customer</label>
                            <select
                                value={filters.customerId}
                                onChange={(e) => handleFilterChange('customerId', e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[180px] bg-white"
                            >
                                <option value="">All Customers</option>
                                {filterOptions.customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Project Manager */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Project Manager</label>
                            <select
                                value={filters.managerId}
                                onChange={(e) => handleFilterChange('managerId', e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[150px] bg-white"
                            >
                                <option value="">All PMs</option>
                                {filterOptions.managers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name_th || m.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Owner */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Owner</label>
                            <select
                                value={filters.ownerId}
                                onChange={(e) => handleFilterChange('ownerId', e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[150px] bg-white"
                            >
                                <option value="">All Owners</option>
                                {filterOptions.owners.map(o => (
                                    <option key={o.id} value={o.id}>
                                        {o.name_th || o.name} {o.position_code && `(${o.position_code})`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Status</label>
                            <select
                                value={filters.statusId}
                                onChange={(e) => handleFilterChange('statusId', e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[120px] bg-white"
                            >
                                <option value="">All Status</option>
                                {filterOptions.statuses.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Assignee - Filter tasks by assigned person */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Assignee</label>
                            <select
                                value={filters.assigneeId}
                                onChange={(e) => handleFilterChange('assigneeId', e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[150px] bg-white"
                            >
                                <option value="">All Assignees</option>
                                {filterOptions.owners.map(o => (
                                    <option key={o.id} value={o.id}>
                                        {o.name_th || o.name} {o.position_code && `(${o.position_code})`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs text-slate-500 mb-1">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    placeholder="Search projects..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>

                        {/* View Switcher */}
                        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0 h-[38px] items-center">
                            <button
                                onClick={() => setViewMode('gantt')}
                                className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-all h-full flex items-center", viewMode === 'gantt' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700')}
                            >
                                Gantt View
                            </button>
                            <button
                                onClick={() => setViewMode('work-items')}
                                className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-all h-full flex items-center", viewMode === 'work-items' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700')}
                            >
                                Project Detail
                            </button>
                            <button
                                onClick={() => setViewMode('daily-workload')}
                                className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-all h-full flex items-center", viewMode === 'daily-workload' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700')}
                            >
                                Daily Workload
                            </button>
                        </div>
                    </div>
                </div>

                {viewMode === 'gantt' ? (
                    <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border overflow-hidden min-h-0">
                        <div className="p-2 border-b">
                            <GanttToolbar
                                zoom={zoom}
                                onZoomChange={setZoom}
                                onRefresh={handleRefresh}
                                isRefreshing={isRefreshing}
                                onExport={() => alert('Export feature coming soon!')}
                                onQuickAdd={!isReadOnly ? handleQuickAdd : undefined}
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
                                    readOnly={isReadOnly}
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
                ) : viewMode === 'work-items' ? (
                    <AllWorkItemsView
                        data={workItemsData}
                        filters={filters}
                        onRefresh={handleRefresh}
                    />
                ) : (
                    <div className="h-full overflow-y-auto">
                        <DailyTaskWorkloadView />
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
                isOpen={storyModal.open}
                onClose={() => setStoryModal({ ...storyModal, open: false })}
                projectId={storyModal.projectId}
                milestoneId={storyModal.milestoneId}
                milestones={activeProjectMilestones}
                onSuccess={handleRefresh}
                mode="create"
            />

            <TaskModal
                isOpen={taskModal.open}
                onClose={() => setTaskModal({ ...taskModal, open: false })}
                storyId={taskModal.storyId}
                onSuccess={handleRefresh}
                mode="create"
                currentUserId={currentUser?.id}
            />

            {/* Edit Task Modal - เปิดเมื่อ double-click ที่ Task */}
            {editTaskModal.task && (
                <TaskModal
                    isOpen={editTaskModal.open}
                    onClose={() => setEditTaskModal({ open: false, task: null })}
                    storyId={editTaskModal.task.story_id || ''}
                    onSuccess={handleRefresh}
                    mode="edit"
                    task={{
                        id: editTaskModal.task.entity_id,
                        task_code: editTaskModal.task.text?.split(':')[0]?.trim(),
                        title: editTaskModal.task.text?.split(':').slice(1).join(':').trim() || editTaskModal.task.text,
                        status: editTaskModal.task.status,
                        assignee_id: editTaskModal.task.assignee_id,
                        assignee_name: editTaskModal.task.assignee_name
                    }}
                    currentUserId={currentUser?.id}
                />
            )}

            {assignModal.task && (
                <AssignTaskModal
                    open={assignModal.open}
                    onClose={() => setAssignModal({ ...assignModal, open: false })}
                    task={assignModal.task}
                    onSuccess={handleRefresh}
                />
            )}

            {workItemsModal.open && (
                <WorkItemsModal
                    projectId={workItemsModal.projectId}
                    projects={projects}
                    currentUser={currentUser}
                    onClose={() => setWorkItemsModal({ ...workItemsModal, open: false })}
                    onChange={() => {
                        // Refresh Gantt data when work items change
                        handleRefresh()
                    }}
                />
            )}
        </div>
    )
}
