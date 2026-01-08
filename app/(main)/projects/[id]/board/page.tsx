"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import {
    Plus,
    MoreHorizontal,
    MessageSquare,
    Paperclip,
    GripVertical,
    Calendar
} from "lucide-react"
import {
    getProjectById,
    getTasksByProject,
    getUserById,
    priorityDots,
    priorityColors,
    Task
} from "@/lib/mock-data"
import { cn } from "@/lib/utils"

import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
} from "@dnd-kit/core"
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type ColumnId = "todo" | "in_progress" | "review" | "done"

const columns: { id: ColumnId; title: string; emoji: string }[] = [
    { id: "todo", title: "To Do", emoji: "📥" },
    { id: "in_progress", title: "In Progress", emoji: "🔄" },
    { id: "review", title: "Review", emoji: "👀" },
    { id: "done", title: "Done", emoji: "✅" },
]

// Task Card Component
function TaskCard({ task, isDragging }: { task: Task; isDragging?: boolean }) {
    const assignee = task.assigneeId ? getUserById(task.assigneeId) : null

    return (
        <div
            className={cn(
                "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-grab hover:shadow-md transition-shadow",
                isDragging && "opacity-50 rotate-2 shadow-xl"
            )}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
                    {task.title}
                </h4>
                <button className="text-slate-400 hover:text-slate-600 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            </div>

            {/* Labels */}
            {task.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {task.labels.slice(0, 2).map((label) => (
                        <span
                            key={label}
                            className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded"
                        >
                            {label}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", priorityDots[task.priority])} />
                    {task.dueDate && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {task.comments > 0 && (
                        <span className="flex items-center text-xs text-slate-400">
                            <MessageSquare className="h-3 w-3 mr-1" />{task.comments}
                        </span>
                    )}
                    {task.attachments > 0 && (
                        <span className="flex items-center text-xs text-slate-400">
                            <Paperclip className="h-3 w-3 mr-1" />{task.attachments}
                        </span>
                    )}
                    {assignee && (
                        <Avatar className="h-5 w-5" name={assignee.name} />
                    )}
                </div>
            </div>
        </div>
    )
}

// Sortable Task Card
function SortableTaskCard({ task }: { task: Task }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TaskCard task={task} isDragging={isDragging} />
        </div>
    )
}

// Column Component
function Column({ column, tasks }: { column: typeof columns[0]; tasks: Task[] }) {
    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 min-w-[280px] max-w-[320px] flex-shrink-0">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span>{column.emoji}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{column.title}</span>
                    <span className="text-sm text-slate-400">({tasks.length})</span>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            </div>

            {/* Tasks */}
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 min-h-[200px]">
                    {tasks.map((task) => (
                        <SortableTaskCard key={task.id} task={task} />
                    ))}
                </div>
            </SortableContext>

            {/* Add Task Button */}
            <button className="w-full mt-3 p-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <Plus className="h-4 w-4" />
                Add Task
            </button>
        </div>
    )
}

export default function KanbanBoardPage() {
    const params = useParams()
    const projectId = params.id as string
    const project = getProjectById(projectId)
    const projectTasks = getTasksByProject(projectId)

    const [tasks, setTasks] = React.useState(projectTasks)
    const [activeTask, setActiveTask] = React.useState<Task | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragStart = (event: DragStartEvent) => {
        const task = tasks.find(t => t.id === event.active.id)
        if (task) setActiveTask(task)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveTask(null)

        if (!over) return

        // Find which column the task was dropped in
        const activeTask = tasks.find(t => t.id === active.id)
        if (!activeTask) return

        // For simplicity, we'll just update the status based on drop position
        // In a real app, you'd calculate the target column more precisely
    }

    if (!project) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-slate-500">Project not found</p>
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout
            breadcrumb={[
                { label: "Projects", href: "/projects" },
                { label: project.name, href: `/projects/${projectId}` },
                { label: "Board" }
            ]}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Column
                </Button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">Filter</Button>
                    <Button variant="outline" size="sm">Group By</Button>
                </div>
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {columns.map((column) => (
                        <Column
                            key={column.id}
                            column={column}
                            tasks={tasks.filter(t => t.status === column.id)}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeTask && <TaskCard task={activeTask} />}
                </DragOverlay>
            </DndContext>
        </MainLayout>
    )
}
