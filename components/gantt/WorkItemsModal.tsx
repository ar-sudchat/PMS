'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, RefreshCw, Save } from 'lucide-react'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import { getProjectInfo, createStory as createStoryAPI } from '@/lib/actions/gantt-actions'
import { getStories, updateStory as updateStoryAPI, deleteStory as deleteStoryAPI } from '@/lib/actions/story-actions'
import { getTasksByStory, updateTask as updateTaskAPI, deleteTask as deleteTaskAPI, createTask as createTaskAPI } from '@/lib/actions/task-actions'
import { MilestoneNode } from './MilestoneNode'
import { WorkItemFilters } from './WorkItemFilters'

// ============================================
// TYPES
// ============================================

interface Milestone {
    id: string
    code: string
    name: string
    color?: string
    due_date?: string | null
    status?: 'pending' | 'in_progress' | 'completed'
}

interface Story {
    id: string
    story_code: string
    title: string
    status: string
    priority: string
    start_date: string | null
    due_date: string | null
    estimated_md: number
    progress_percent: number
    milestone_id: string | null
    total_tasks?: number
    completed_tasks?: number
}

interface Task {
    id: string
    task_code: string
    title: string
    status: string
    priority: string
    task_type: string
    assignee_id: string | null
    assignee_name: string | null
    reviewer_id: string | null
    estimated_hours: number | null
    actual_hours: number
    due_date: string | null
    story_id: string
}

interface ChangeRecord {
    entityType: 'story' | 'task'
    entityId: string
    field: string
    oldValue: any
    newValue: any
}

interface WorkItemsModalProps {
    projectId: string | null
    projects?: { id: string; name: string }[] // Optional list of projects for selector
    currentUser?: any // Current logged-in user for owner validation
    onClose: () => void
    onChange?: () => void
}

// ============================================
// MAIN COMPONENT
// ============================================

export function WorkItemsModal({
    projectId: initialProjectId,
    projects: projectsList,
    currentUser,
    onClose,
    onChange
}: WorkItemsModalProps) {
    // State management
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId)
    const [projectOwnerId, setProjectOwnerId] = useState<string | null>(null)
    const [milestones, setMilestones] = useState<Milestone[]>([])
    const [stories, setStories] = useState<Map<string, Story[]>>(new Map())
    const [tasks, setTasks] = useState<Map<string, Task[]>>(new Map())

    // Lazy loading tracking
    const [loadedMilestones, setLoadedMilestones] = useState<Set<string>>(new Set())
    const [loadedStories, setLoadedStories] = useState<Set<string>>(new Set())

    // Expansion state
    const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
    const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set())

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string[]>([])
    const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)

    // Change tracking
    const [pendingChanges, setPendingChanges] = useState<Map<string, ChangeRecord>>(new Map())
    const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())

    // Loading states
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // ============================================
    // DATA LOADING
    // ============================================

    // Load project info (milestones only initially)
    const loadProjectInfo = useCallback(async () => {
        if (!selectedProjectId) {
            console.log('WorkItemsModal: No projectId selected')
            return
        }

        console.log('WorkItemsModal: Loading project info for', selectedProjectId)
        setIsLoading(true)
        try {
            const response = await getProjectInfo(selectedProjectId)
            console.log('WorkItemsModal: getProjectInfo response:', response)
            if (response.success && response.data) {
                const milestonesData = response.data.milestones as Milestone[]
                console.log('WorkItemsModal: Setting milestones:', milestonesData)
                setMilestones(milestonesData)

                // Set project owner ID for validation
                if (response.data.owner_id) {
                    setProjectOwnerId(response.data.owner_id)
                }
            } else {
                console.error('Failed to load project info:', response.error)
                alert(`Failed to load project: ${response.error}`)
            }
        } catch (error) {
            console.error('Error loading project info:', error)
            alert(`Error loading project: ${error}`)
        } finally {
            setIsLoading(false)
        }
    }, [selectedProjectId])

    // Handle project change
    const handleProjectChange = useCallback((newProjectId: string | null) => {
        setSelectedProjectId(newProjectId)
        // Clear all data when project changes
        setMilestones([])
        setStories(new Map())
        setTasks(new Map())
        setLoadedMilestones(new Set())
        setLoadedStories(new Set())
        setExpandedMilestones(new Set())
        setExpandedStories(new Set())
        setPendingChanges(new Map())
        setModifiedFields(new Set())
    }, [])

    // Lazy load stories when milestone expanded
    const handleMilestoneExpand = useCallback(async (milestoneId: string) => {
        // Toggle expansion
        const newExpanded = new Set(expandedMilestones)
        if (newExpanded.has(milestoneId)) {
            newExpanded.delete(milestoneId)
            setExpandedMilestones(newExpanded)
            return
        }

        newExpanded.add(milestoneId)
        setExpandedMilestones(newExpanded)

        // Load stories if not already loaded
        if (!loadedMilestones.has(milestoneId) && selectedProjectId) {
            try {
                const result = await getStories({
                    projectId: selectedProjectId,
                    milestoneId
                })

                if (result.success) {
                    setStories(prev => {
                        const newMap = new Map(prev)
                        newMap.set(milestoneId, result.data as Story[])
                        return newMap
                    })
                }

                setLoadedMilestones(prev => new Set([...prev, milestoneId]))
            } catch (error) {
                console.error('Error loading stories:', error)
            }
        }
    }, [expandedMilestones, loadedMilestones, selectedProjectId])

    // Lazy load tasks when story expanded
    const handleStoryExpand = useCallback(async (storyId: string) => {
        // Toggle expansion
        const newExpanded = new Set(expandedStories)
        if (newExpanded.has(storyId)) {
            newExpanded.delete(storyId)
            setExpandedStories(newExpanded)
            return
        }

        newExpanded.add(storyId)
        setExpandedStories(newExpanded)

        // Load tasks if not already loaded
        if (!loadedStories.has(storyId)) {
            try {
                const result = await getTasksByStory(storyId)

                if (result.success) {
                    setTasks(prev => {
                        const newMap = new Map(prev)
                        newMap.set(storyId, result.data as Task[])
                        return newMap
                    })
                }

                setLoadedStories(prev => new Set([...prev, storyId]))
            } catch (error) {
                console.error('Error loading tasks:', error)
            }
        }
    }, [expandedStories, loadedStories])

    // Initial load when modal opens or project changes
    useEffect(() => {
        if (selectedProjectId) {
            loadProjectInfo()
        }
    }, [selectedProjectId]) // Remove loadProjectInfo from deps to avoid infinite loop

    // ============================================
    // CHANGE TRACKING
    // ============================================

    const handleFieldChange = useCallback((
        entityType: 'story' | 'task',
        entityId: string,
        field: string,
        newValue: any,
        oldValue: any
    ) => {
        const key = `${entityType}-${entityId}-${field}`

        setPendingChanges(prev => {
            const newMap = new Map(prev)
            newMap.set(key, {
                entityType,
                entityId,
                field,
                oldValue,
                newValue
            })
            return newMap
        })

        setModifiedFields(prev => new Set([...prev, key]))
    }, [])

    const isFieldModified = useCallback((entityType: 'story' | 'task', entityId: string, field: string) => {
        return modifiedFields.has(`${entityType}-${entityId}-${field}`)
    }, [modifiedFields])

    // ============================================
    // BATCH SAVE
    // ============================================

    const handleSave = async () => {
        if (pendingChanges.size === 0) return

        // Validate owner before saving
        const currentUserId = currentUser?.employeeId || currentUser?.id
        if (projectOwnerId && currentUserId !== projectOwnerId) {
            alert('คุณไม่ใช่เจ้าของโครงการนี้ ไม่สามารถบันทึกการเปลี่ยนแปลงได้')
            return
        }

        setIsSaving(true)
        const changes = Array.from(pendingChanges.values())

        try {
            for (const change of changes) {
                if (change.entityType === 'story') {
                    const result = await updateStoryAPI(change.entityId, {
                        [change.field]: change.newValue
                    })
                    if (!result.success) {
                        throw new Error(`Failed to update story ${change.field}: ${result.error}`)
                    }
                } else if (change.entityType === 'task') {
                    const result = await updateTaskAPI(change.entityId, {
                        [change.field]: change.newValue
                    })
                    if (!result.success) {
                        throw new Error(`Failed to update task ${change.field}: ${result.error}`)
                    }
                }
            }

            // All successful
            setPendingChanges(new Map())
            setModifiedFields(new Set())

            // Reload data to get fresh state
            await loadProjectInfo()

            // Notify parent
            onChange?.()

            alert('บันทึกการเปลี่ยนแปลงสำเร็จ!')
        } catch (error: any) {
            console.error('Save error:', error)
            alert(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`)
        } finally {
            setIsSaving(false)
        }
    }

    // ============================================
    // CRUD OPERATIONS
    // ============================================

    // Create Story
    const handleCreateStory = async (milestoneId: string, title: string) => {
        if (!selectedProjectId) return

        try {
            const result = await createStoryAPI({
                project_id: selectedProjectId,
                milestone_id: milestoneId,
                title
            })

            if (result.success) {
                // Reload stories for this milestone
                const storyResult = await getStories({
                    projectId: selectedProjectId,
                    milestoneId
                })

                if (storyResult.success) {
                    setStories(prev => {
                        const newMap = new Map(prev)
                        newMap.set(milestoneId, storyResult.data as Story[])
                        return newMap
                    })
                }

                // Expand milestone to show new story
                setExpandedMilestones(prev => new Set([...prev, milestoneId]))

                onChange?.()
                alert(`Story created successfully: ${result.data?.story_code}`)
            } else {
                alert(`Failed to create story: ${result.error}`)
            }
        } catch (error: any) {
            console.error('Create story error:', error)
            alert(`Error creating story: ${error.message}`)
        }
    }

    // Delete Story
    const handleDeleteStory = async (storyId: string) => {
        try {
            const result = await deleteStoryAPI(storyId)

            if (result.success) {
                // Remove from UI
                setStories(prev => {
                    const newMap = new Map(prev)
                    for (const [milestoneId, storyList] of newMap.entries()) {
                        newMap.set(
                            milestoneId,
                            storyList.filter(s => s.id !== storyId)
                        )
                    }
                    return newMap
                })

                // Remove tasks for this story
                setTasks(prev => {
                    const newMap = new Map(prev)
                    newMap.delete(storyId)
                    return newMap
                })

                onChange?.()
                alert('Story deleted successfully')
            } else {
                alert(`Failed to delete story: ${result.error}`)
            }
        } catch (error: any) {
            console.error('Delete story error:', error)
            alert(`Error deleting story: ${error.message}`)
        }
    }

    // Create Task
    const handleCreateTask = async (storyId: string, title: string) => {
        try {
            const result = await createTaskAPI({
                story_id: storyId,
                title,
                task_type: 'TASK',
                priority: 'medium'
            })

            if (result.success) {
                // Reload tasks for this story
                const taskResult = await getTasksByStory(storyId)

                if (taskResult.success) {
                    setTasks(prev => {
                        const newMap = new Map(prev)
                        newMap.set(storyId, taskResult.data as Task[])
                        return newMap
                    })
                }

                // Expand story to show new task
                setExpandedStories(prev => new Set([...prev, storyId]))

                onChange?.()
                alert(`Task created successfully: ${result.data?.task_code}`)
            } else {
                alert(`Failed to create task: ${result.error}`)
            }
        } catch (error: any) {
            console.error('Create task error:', error)
            alert(`Error creating task: ${error.message}`)
        }
    }

    // Delete Task
    const handleDeleteTask = async (taskId: string) => {
        try {
            const result = await deleteTaskAPI(taskId)

            if (result.success) {
                // Remove from UI
                setTasks(prev => {
                    const newMap = new Map(prev)
                    for (const [storyId, taskList] of newMap.entries()) {
                        newMap.set(
                            storyId,
                            taskList.filter(t => t.id !== taskId)
                        )
                    }
                    return newMap
                })

                onChange?.()
                alert('Task deleted successfully')
            } else {
                alert(`Failed to delete task: ${result.error}`)
            }
        } catch (error: any) {
            console.error('Delete task error:', error)
            alert(`Error deleting task: ${error.message}`)
        }
    }

    // ============================================
    // STATISTICS
    // ============================================

    const calculateStatistics = useCallback(() => {
        const allStories = Array.from(stories.values()).flat()
        const allTasks = Array.from(tasks.values()).flat()

        return {
            totalStories: allStories.length,
            storiesDone: allStories.filter(s => s.status === 'done').length,
            storiesInProgress: allStories.filter(s => s.status === 'in_progress').length,
            storiesOther: allStories.filter(s => !['done', 'in_progress'].includes(s.status)).length,
            totalTasks: allTasks.length,
            completedTasks: allTasks.filter(t => t.status === 'done').length,
            remainingTasks: allTasks.filter(t => t.status !== 'done').length,
            overallProgress: allTasks.length > 0
                ? Math.round((allTasks.filter(t => t.status === 'done').length / allTasks.length) * 100)
                : 0
        }
    }, [stories, tasks])

    const stats = calculateStatistics()

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-[90%] h-[90%] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-xl font-bold text-slate-800">Work Items Management</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                {/* Project Selector & Refresh */}
                <div className="flex items-center gap-4 px-6 py-3 border-b bg-slate-50">
                    <div className="flex-1">
                        <div className="text-sm text-slate-600 mb-1">Project:</div>
                        {projectsList && projectsList.length > 0 ? (
                            <SmartCombobox
                                options={projectsList.map(p => ({ value: p.id, label: p.name }))}
                                value={selectedProjectId ? { value: selectedProjectId, label: projectsList.find(p => p.id === selectedProjectId)?.name || '' } : null}
                                onChange={(option) => handleProjectChange(option?.value as string || null)}
                                placeholder="Select a project"
                            />
                        ) : (
                            <div className="font-medium text-slate-800 font-mono text-xs bg-slate-100 px-3 py-2 rounded">
                                {selectedProjectId || 'No projects available'}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={loadProjectInfo}
                        disabled={isLoading || !selectedProjectId}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh project data"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Filters */}
                <WorkItemFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    assigneeFilter={assigneeFilter}
                    onAssigneeFilterChange={setAssigneeFilter}
                    employees={[]}
                />

                {/* Summary Statistics */}
                {stats.totalStories > 0 && (
                    <div className="px-6 py-3 border-b bg-blue-50">
                        <div className="text-sm text-slate-700">
                            📊 <strong>Total:</strong> {stats.totalStories} stories ({stats.storiesDone} done, {stats.storiesInProgress} in progress, {stats.storiesOther} other)
                            {' • '}
                            {stats.totalTasks} tasks ({stats.completedTasks} completed, {stats.remainingTasks} remaining)
                            {' • '}
                            {stats.overallProgress}% complete
                        </div>
                    </div>
                )}

                {/* Unsaved Changes Warning */}
                {pendingChanges.size > 0 && (
                    <div className="px-6 py-2 bg-amber-50 border-b border-amber-200">
                        <div className="text-sm text-amber-800 font-medium">
                            ⚠️ {pendingChanges.size} unsaved change{pendingChanges.size > 1 ? 's' : ''}
                        </div>
                    </div>
                )}

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                                <p className="text-slate-500">Loading milestones...</p>
                            </div>
                        </div>
                    ) : milestones.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-slate-400 mb-2">
                                <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-lg font-medium text-slate-600 mb-1">ไม่พบ Milestones</p>
                            <p className="text-sm text-slate-500">โครงการนี้ยังไม่มีการกำหนด Milestones</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {milestones.map(milestone => {
                                const milestoneStories = stories.get(milestone.id)
                                const storiesArray = Array.isArray(milestoneStories) ? milestoneStories : []

                                return (
                                    <MilestoneNode
                                        key={milestone.id}
                                        milestone={milestone}
                                        stories={storiesArray}
                                        isExpanded={expandedMilestones.has(milestone.id)}
                                        onToggleExpand={() => handleMilestoneExpand(milestone.id)}
                                        onCreateStory={handleCreateStory}
                                        onStoryExpand={handleStoryExpand}
                                        expandedStories={expandedStories}
                                        tasks={tasks}
                                        onFieldChange={handleFieldChange}
                                        isFieldModified={isFieldModified}
                                        onDeleteStory={handleDeleteStory}
                                        onCreateTask={handleCreateTask}
                                        onDeleteTask={handleDeleteTask}
                                    />
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer with Save/Cancel */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={pendingChanges.size === 0 || isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : `Save Changes${pendingChanges.size > 0 ? ` (${pendingChanges.size})` : ''}`}
                    </button>
                </div>
            </div>
        </div>
    )
}
