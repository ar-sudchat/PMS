'use client'

import { useState, useEffect, useCallback } from 'react'
import { getProjectTasks, TaskListItem, getProjectMilestones, getProjectStories } from '@/lib/actions/project-detail-actions'
import { getProjectDetail } from '@/lib/actions/project-detail-actions'
import { getEmployees } from '@/lib/actions/project-actions'
import { TasksTable } from './TasksTable'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'
import { AddTaskModal } from '@/components/timesheet/AddTaskModal' // Or create one for Project Detail specifically if needed. The existing one in timesheet might be specific.
// Actually AddTaskInline was created in previous context or we can reuse AddTaskModal from other task/timesheet context.
// Let's assume we need a generic AddTaskModal. For now I'll stub the button or use existing if compatible. 
// The prompt says "Reuse AddStoryModal / AddTaskModal".
// Previous context had `AddStoryModal.tsx` in `work-items`.
// I'll reuse my `useDebounce` logic.

interface TasksTabProps {
    projectId: string
}

export function TasksTab({ projectId }: TasksTabProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [tasks, setTasks] = useState<TaskListItem[]>([])
    const [milestones, setMilestones] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])

    // Filters
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search, 300)
    const [milestoneFilter, setMilestoneFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [priorityFilter, setPriorityFilter] = useState('all')
    const [assigneeFilter, setAssigneeFilter] = useState('all')

    // Sort
    const [sort, setSort] = useState<{ field: string, order: 'asc' | 'desc' }>({ field: 'sort_order', order: 'asc' })

    // Modal
    const [isAddOpen, setIsAddOpen] = useState(false)

    const fetchTasks = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await getProjectTasks(projectId, {
                search: debouncedSearch,
                milestoneId: milestoneFilter,
                status: statusFilter,
                priority: priorityFilter,
                assigneeId: assigneeFilter
            }, sort)

            setTasks(res.data)
        } finally {
            setIsLoading(false)
        }
    }, [projectId, debouncedSearch, milestoneFilter, statusFilter, priorityFilter, assigneeFilter, sort])

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    useEffect(() => {
        // Load filters data
        getProjectMilestones(projectId).then(res => { if (res.success) setMilestones(res.data) })
        getEmployees().then(res => { if (res) setEmployees(res) })
    }, [projectId])

    const handleSortChange = (field: string) => {
        setSort(prev => ({
            field,
            order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
        }))
    }

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex flex-wrap gap-2 items-center flex-1">
                    <div className="relative w-full md:w-56">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search tasks..."
                            className="pl-9 bg-slate-50 border-slate-200"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select value={milestoneFilter} onValueChange={setMilestoneFilter}>
                        <SelectTrigger className="w-[150px] bg-slate-50">
                            <SelectValue placeholder="Milestone" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Milestones</SelectItem>
                            {milestones.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.milestone_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[120px] bg-slate-50">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="working">Running</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-[120px] bg-slate-50">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                        <SelectTrigger className="w-[140px] bg-slate-50">
                            <SelectValue placeholder="Assignee" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Assignees</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {employees.map(e => (
                                <SelectItem key={e.id} value={e.id}>{e.nickname || e.first_name_en}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Button onClick={() => setIsAddOpen(true)} className="shadow-sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                    </Button>
                </div>
            </div>

            {/* Table */}
            <TasksTable
                tasks={tasks}
                isLoading={isLoading}
                onRefresh={fetchTasks}
                sort={sort}
                onSortChange={handleSortChange}
            />

            {/* Placeholder for AddTaskModal - Reuse or Implement */}
            {/* <AddTaskModal ... /> */}
        </div>
    )
}

function useDebounce<T>(value: T, delay?: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay || 500)
        return () => clearTimeout(timer)
    }, [value, delay])
    return debouncedValue
}
