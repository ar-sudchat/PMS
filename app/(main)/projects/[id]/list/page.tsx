"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/MainLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Plus,
    ChevronDown,
    ChevronRight,
    Calendar,
    MoreHorizontal
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

type StatusGroup = {
    id: string
    label: string
    emoji: string
    tasks: Task[]
}

export default function ListViewPage() {
    const params = useParams()
    const projectId = params.id as string
    const project = getProjectById(projectId)
    const projectTasks = getTasksByProject(projectId)

    const [expandedGroups, setExpandedGroups] = React.useState<string[]>([
        "todo", "in_progress", "review"
    ])

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(g => g !== groupId)
                : [...prev, groupId]
        )
    }

    const groups: StatusGroup[] = [
        { id: "todo", label: "To Do", emoji: "📥", tasks: projectTasks.filter(t => t.status === "todo") },
        { id: "in_progress", label: "In Progress", emoji: "🔄", tasks: projectTasks.filter(t => t.status === "in_progress") },
        { id: "review", label: "Review", emoji: "👀", tasks: projectTasks.filter(t => t.status === "review") },
        { id: "done", label: "Done", emoji: "✅", tasks: projectTasks.filter(t => t.status === "done") },
    ]

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
                { label: "List" }
            ]}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                </Button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">Filter</Button>
                    <Button variant="outline" size="sm">Group By</Button>
                </div>
            </div>

            {/* List View */}
            <div className="space-y-4">
                {groups.map((group) => (
                    <div key={group.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {/* Group Header */}
                        <button
                            onClick={() => toggleGroup(group.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            {expandedGroups.includes(group.id) ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                            <span>{group.emoji}</span>
                            <span className="font-medium text-slate-900 dark:text-white">{group.label}</span>
                            <span className="text-sm text-slate-400">({group.tasks.length})</span>
                        </button>

                        {/* Tasks */}
                        {expandedGroups.includes(group.id) && group.tasks.length > 0 && (
                            <div className="border-t border-slate-100 dark:border-slate-700">
                                {group.tasks.map((task, index) => {
                                    const assignee = task.assigneeId ? getUserById(task.assigneeId) : null
                                    return (
                                        <div
                                            key={task.id}
                                            className={cn(
                                                "flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors",
                                                index !== group.tasks.length - 1 && "border-b border-slate-100 dark:border-slate-700"
                                            )}
                                        >
                                            <Checkbox checked={task.status === "done"} />
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    "text-sm font-medium",
                                                    task.status === "done"
                                                        ? "text-slate-400 line-through"
                                                        : "text-slate-900 dark:text-white"
                                                )}>
                                                    {task.title}
                                                </p>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-4">
                                                {/* Priority */}
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-2 h-2 rounded-full", priorityDots[task.priority])} />
                                                    <span className="text-xs text-slate-500 capitalize">{task.priority}</span>
                                                </div>
                                                {/* Assignee */}
                                                {assignee && (
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6" name={assignee.name} />
                                                        <span className="text-sm text-slate-500">{assignee.name}</span>
                                                    </div>
                                                )}
                                                {/* Due Date */}
                                                {task.dueDate && (
                                                    <span className="flex items-center gap-1 text-sm text-slate-500">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                    </span>
                                                )}
                                            </div>
                                            <button className="text-slate-400 hover:text-slate-600">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </MainLayout>
    )
}
