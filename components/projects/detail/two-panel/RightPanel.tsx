'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { getProjectTasks, TaskListItem, StorySimple } from '@/lib/actions/project-detail-actions'
import { updateStory, deleteStory, deleteTask } from '@/lib/actions/work-items-actions'
import { TasksPanelHeader } from './TasksPanelHeader'
import { SuperTable } from '@/components/shared/SuperTable/SuperTable'
import { CreateStoryModal as StoryModal } from '@/components/modals/CreateStoryModal'
import { NewTaskModal as TaskModal } from '@/components/modals/NewTaskModal'
import { toast } from 'sonner'
import { Pencil, Trash2, CheckCircle2, Circle, Clock, AlertCircle, Calendar, Paperclip, Check, X } from 'lucide-react'

interface RightPanelProps {
    projectId: string
    selectedStory: StorySimple | null
    onRefreshStories: () => void
    milestones: { id: string, name: string }[]
    currentUserId?: string
}

export function RightPanel({ projectId, selectedStory, onRefreshStories, milestones, currentUserId }: RightPanelProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [tasks, setTasks] = useState<TaskListItem[]>([])

    // Modal States
    const [isEditStoryOpen, setIsEditStoryOpen] = useState(false)
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const [taskModalMode, setTaskModalMode] = useState<'create' | 'edit'>('create')
    const [selectedTask, setSelectedTask] = useState<TaskListItem | undefined>(undefined)

    // Filters
    const [filterDate, setFilterDate] = useState<string>('')

    const filteredTasks = useMemo(() => {
        if (!filterDate) return tasks
        return tasks.filter(t => {
            if (!t.due_date) return false
            // standard comparison: YYYY-MM-DD
            return new Date(t.due_date).toISOString().split('T')[0] === filterDate
        })
    }, [tasks, filterDate])

    const fetchTasks = useCallback(async () => {
        if (!selectedStory) return

        setIsLoading(true)
        try {
            const res = await getProjectTasks(projectId, {
                storyId: selectedStory.id
            }, { field: 'sort_order', order: 'asc' }) // Default sort

            setTasks(res.data)
        } finally {
            setIsLoading(false)
        }
    }, [projectId, selectedStory])

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    const handleDeleteStory = async () => {
        if (!selectedStory) return
        if (!confirm('Are you sure you want to delete this story? All associated tasks will be deleted.')) return

        const res = await deleteStory(selectedStory.id)
        if (res.success) {
            toast.success('Story deleted')
            onRefreshStories() // Navigate away or refresh will handle it
        } else {
            toast.error('Failed to delete story')
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return

        const res = await deleteTask(taskId)
        if (res.success) {
            toast.success('Task deleted')
            fetchTasks()
            onRefreshStories() // Refresh counts
        } else {
            toast.error('Failed to delete task')
        }
    }

    const handleEditTask = (task: TaskListItem) => {
        setSelectedTask(task)
        setTaskModalMode('edit')
        setIsTaskModalOpen(true)
    }

    const handleCreateTask = () => {
        setSelectedTask(undefined)
        setTaskModalMode('create')
        setIsTaskModalOpen(true)
    }

    const columns = [
        {
            accessorKey: 'task_code',
            header: 'Code',
            cell: ({ row }: any) => <span className="font-mono text-xs">{row.original.task_code}</span>,
            size: 80,
            enableSorting: true
        },
        {
            accessorKey: 'title',
            header: 'Title',
            cell: ({ row }: any) => (
                <div className="font-medium text-slate-700 truncate" title={row.original.title}>
                    {row.original.title}
                </div>
            ),
            size: 300,
            enableSorting: true
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }: any) => {
                const status = row.original.status
                let color = 'bg-slate-100 text-slate-700'
                let icon = <Circle className="w-3 h-3 mr-1" />

                if (status === 'done') { color = 'bg-green-100 text-green-700'; icon = <CheckCircle2 className="w-3 h-3 mr-1" /> }
                else if (status === 'in_progress') { color = 'bg-blue-100 text-blue-700'; icon = <Clock className="w-3 h-3 mr-1" /> }
                else if (status === 'review') { color = 'bg-purple-100 text-purple-700'; icon = <AlertCircle className="w-3 h-3 mr-1" /> }
                else if (status === 'blocked') { color = 'bg-red-100 text-red-700'; icon = <AlertCircle className="w-3 h-3 mr-1" /> }
                else if (status === 'done_not_planned') { color = 'bg-slate-200 text-slate-600'; icon = <CheckCircle2 className="w-3 h-3 mr-1" /> }

                return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${color} whitespace-nowrap`}>
                        {icon}
                        {status ? status.split('_').join(' ').toUpperCase() : 'TODO'}
                    </span>
                )
            },
            size: 180,
            enableSorting: true
        },
        {
            accessorKey: 'priority',
            header: 'Priority',
            cell: ({ row }: any) => {
                const p = row.original.priority
                let color = 'text-slate-500'
                if (p === 'critical') color = 'text-red-600 font-bold'
                if (p === 'high') color = 'text-orange-500 font-semibold'
                if (p === 'medium') color = 'text-blue-500'
                return <span className={`text-xs ${color} whitespace-nowrap`}>{p ? p.toUpperCase() : 'N/A'}</span>
            },
            size: 100,
            enableSorting: true
        },
        {
            accessorKey: 'estimated_hours',
            header: 'Est. Hours',
            cell: ({ row }: any) => {
                const est = row.original.estimated_hours
                const act = row.original.actual_hours
                return (
                    <div className="flex flex-col text-xs">
                        <span className="font-medium text-slate-700">{est ? `${est}h` : '-'}</span>
                        {act ? <span className="text-slate-400 text-[10px]">Act: {act}h</span> : null}
                    </div>
                )
            },
            size: 100,
            enableSorting: true
        },
        {
            accessorKey: 'due_date',
            header: 'Due Date',
            cell: ({ row }: any) => {
                const date = row.original.due_date
                const isOverdue = row.original.is_overdue
                if (!date) return <span className="text-slate-400 text-xs">-</span>

                return (
                    <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                        <Calendar className="w-3 h-3" />
                        {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </div>
                )
            },
            size: 120,
            enableSorting: true
        },
        {
            accessorKey: 'is_count_for_kpi',
            header: 'KPI',
            cell: ({ row }: any) => {
                const isKpi = row.original.is_count_for_kpi
                return (
                    <div title={isKpi ? 'Counts for KPI' : 'Excluded from KPI'}>
                        {isKpi ? (
                            <Check className="w-4 h-4 text-green-500" />
                        ) : (
                            <X className="w-4 h-4 text-slate-300" />
                        )}
                    </div>
                )
            },
            size: 60,
            enableSorting: true
        },
        {
            accessorKey: 'attachment_count',
            header: 'Att.',
            cell: ({ row }: any) => {
                const count = row.original.attachment_count || 0
                if (count === 0) return null
                return (
                    <div className="flex items-center gap-1 text-slate-500" title={`${count} Attachment(s)`}>
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{count}</span>
                    </div>
                )
            },
            size: 60,
            enableSorting: true
        },
        {
            accessorKey: 'assignee_name',
            header: 'Assignee',
            cell: ({ row }: any) => (
                <div className="flex items-center gap-2">
                    {row.original.assignee_id ? (
                        <>
                            <div className="w-6 h-6 shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                {row.original.assignee_nickname?.[0] || row.original.assignee_name?.[0] || '?'}
                            </div>
                            <span className="text-xs text-slate-600 truncate max-w-[120px]" title={row.original.assignee_nickname || row.original.assignee_name}>
                                {row.original.assignee_nickname || row.original.assignee_name}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                    )}
                </div>
            ),
            size: 160,
            enableSorting: true
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }: any) => (
                <div className="flex justify-end gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEditTask(row.original); }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600"
                        title="Edit Task"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(row.original.id); }}
                        className="p-1 hover:bg-red-50 rounded text-slate-500 hover:text-red-600"
                        title="Delete Task"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ),
            size: 60
        }
    ]

    if (!selectedStory) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50 rounded-lg border-2 border-dashed m-4 p-8">
                <span className="text-4xl mb-4">👈</span>
                <p className="text-lg font-medium text-slate-500">Select a story to view tasks</p>
                <p className="text-sm">Choose a story from the list on the left</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Custom Header with Edit Buttons */}
            <div className="px-6 py-4 bg-white border-b flex items-center justify-between shadow-sm z-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono bg-blue-50 text-blue-600 font-bold`}>
                            {selectedStory.code}
                        </span>
                        <h2 className="text-lg font-bold text-slate-800 line-clamp-1" title={selectedStory.title}>
                            {selectedStory.title}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            Status: <span className="font-medium text-slate-700 capitalize">{selectedStory.status || 'Backlog'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                            Priority: <span className="font-medium text-slate-700 capitalize">{selectedStory.priority || 'Medium'}</span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditStoryOpen(true)}
                        className="p-2 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                        title="Edit Story"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleDeleteStory}
                        className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-200"
                        title="Delete Story"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Task Table Content */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
                <div className="bg-white rounded-lg border shadow-sm flex-1 flex flex-col overflow-hidden">
                    <SuperTable
                        data={filteredTasks}
                        columns={columns}
                        isLoading={isLoading}
                        enableGlobalFilter={false} // Maybe enable later?
                        enablePagination={false}
                        // Inject custom toolbar action for "Add Task"
                        renderToolbarAction={() => (
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="px-2 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-600 w-36"
                                    />
                                    {filterDate && (
                                        <button
                                            onClick={() => setFilterDate('')}
                                            className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={handleCreateTask}
                                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    ＋ Add Task
                                </button>
                            </div>
                        )}
                        onRowClick={(task) => handleEditTask(task)}
                    />
                </div>
            </div>

            {/* Modals */}
            <StoryModal
                isOpen={isEditStoryOpen}
                onClose={() => setIsEditStoryOpen(false)}
                projectId={projectId}
                milestones={milestones}
                onSuccess={() => {
                    onRefreshStories() // Refresh story details
                    // Ideally we should also refresh selectedStory in parent or refetch it here? 
                    // onRefreshStories triggers parent fetch, which updates 'milestones' prop, which updates 'selectedStory' derived prop
                }}
                mode="edit"
                story={selectedStory}
            />

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                storyId={selectedStory.id}
                onSuccess={() => {
                    fetchTasks()
                    onRefreshStories()
                }}
                mode={taskModalMode}
                task={selectedTask}
                currentUserId={currentUserId}
            />
        </div>
    )
}
