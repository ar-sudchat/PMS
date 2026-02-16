'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectDetail } from '@/lib/actions/project-detail-actions'
import { GanttData, getGanttData, GanttTask } from '@/lib/actions/gantt-actions'
import { GanttTabContent } from './GanttTabContent'
import { ProjectDetailView } from './table-view/ProjectDetailView'
import { ProjectTabs } from './ProjectTabs'
import { cn } from '@/lib/utils'
import { NewTaskModal as TaskModal } from '@/components/modals/NewTaskModal'
import { CreateStoryModal as StoryModal } from '@/components/modals/CreateStoryModal'
import { ProjectModal } from '@/components/modals/ProjectModal'

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
    const router = useRouter()
    const [ganttData, setGanttData] = useState(initialGanttData)

    // Modal States
    const [taskModal, setTaskModal] = useState<{ open: boolean, storyId?: string, task?: any, mode: 'create' | 'edit' }>({
        open: false, mode: 'create'
    })
    const [storyModal, setStoryModal] = useState<{ open: boolean, milestoneId?: string, story?: any, mode: 'create' | 'edit' }>({
        open: false, mode: 'create'
    })
    const [editProjectModal, setEditProjectModal] = useState(false)

    // Calculate if user can edit this project
    const canEdit = useMemo(() => {
        if (currentUser.role === 'admin') return true
        if (currentUser.role === 'manager') return project.project_owner_id === currentUser.id
        return false
    }, [currentUser, project])

    // Derived Milestones for Story Modal
    const milestones = useMemo(() => {
        if (!ganttData) return []
        return ganttData.data
            .filter(item => item.entity_type === 'milestone')
            .map(m => ({ id: m.id, name: m.text }))
    }, [ganttData])

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

    // Handlers
    const handleAddStory = (projectId: string, milestoneId?: string) => {
        setStoryModal({ open: true, milestoneId, mode: 'create' })
    }

    const handleAddTask = (storyId: string) => {
        setTaskModal({ open: true, storyId, mode: 'create' })
    }

    const handleEditItem = (item: GanttTask) => {
        if (!canEdit) return

        if (item.entity_type === 'story') {
            setStoryModal({
                open: true,
                mode: 'edit',
                story: { id: item.entity_id, title: item.text, status: item.status, priority: 'Medium', code: 'STORY' } // Partial mapping
            })
        } else if (item.entity_type === 'task') {
            // We need to pass enough info for TaskModal to pre-select, or it should fetch.
            // TaskModal expects `task` object with fields matching DB mostly.
            // GanttTask: { id, text, start_date, duration, progress, status, assignee_id, ... }
            // Let's map what we have.
            setTaskModal({
                open: true,
                mode: 'edit',
                task: {
                    id: item.entity_id,
                    title: item.text,
                    status: item.status,
                    start_date: item.start_date,
                    // end_date: item.end_date, // TaskModal doesn't use end_date directly mostly, uses due_date/duration? 
                    // TaskModal uses `due_date`, `estimated_hours`.
                    // GanttTask usually has `end_date` as due date.
                    due_date: item.end_date,
                    assignee_id: item.assignee_id,
                    task_type: item.type, // 'dev', 'bug' etc if mapped
                    estimated_hours: item.duration ? item.duration * 8 : 0, // rough guess if not in gantt data
                    // We might need to fetch real task detail if this is insufficient. 
                    // For now, this is better than nothing.
                }
            })
        }
    }

    const handleModalSuccess = () => {
        handleGanttRefresh()
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
                        {canEdit && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditProjectModal(true)}
                                className="gap-2"
                            >
                                <Settings className="w-4 h-4" />
                                Edit Project
                            </Button>
                        )}
                        {/* Global Actions if any */}
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="mt-6">
                    <ProjectTabs projectId={project.id} />
                </div>

                {/* Shared Stats */}
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
                    projectId={project.id}
                    readOnly={!canEdit}
                    onRefresh={handleGanttRefresh}
                    onAddStory={handleAddStory}
                    onAddTask={handleAddTask}
                    onEditItem={handleEditItem}
                />
            ) : (
                <ProjectDetailView projectId={project.id} currentUserId={currentUser.id} />
            )}

            {/* Modals */}
            <TaskModal
                isOpen={taskModal.open}
                onClose={() => setTaskModal(prev => ({ ...prev, open: false }))}
                storyId={taskModal.storyId || ''}
                onSuccess={handleModalSuccess}
                mode={taskModal.mode}
                task={taskModal.task}
                currentUserId={currentUser.id}
            />

            <StoryModal
                isOpen={storyModal.open}
                onClose={() => setStoryModal(prev => ({ ...prev, open: false }))}
                projectId={project.id}
                milestoneId={storyModal.milestoneId}
                milestones={milestones}
                onSuccess={handleModalSuccess}
                mode={storyModal.mode}
                story={storyModal.story}
            />

            <ProjectModal
                open={editProjectModal}
                onClose={() => setEditProjectModal(false)}
                mode="edit"
                project={project as any}
                onSuccess={() => {
                    router.refresh()
                    setEditProjectModal(false)
                }}
            />
        </div>
    )
}
