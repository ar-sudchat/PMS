'use client'

import { useState, useEffect, useCallback } from 'react'
import { getProjectTasks, TaskListItem, getProjectStories } from '@/lib/actions/project-detail-actions'
import { getEmployees } from '@/lib/actions/project-actions'
import { TasksTable } from './TasksTable'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'

interface TasksTabProps {
    projectId: string
}

export function TasksTab({ projectId }: TasksTabProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [tasks, setTasks] = useState<TaskListItem[]>([])
    const [stories, setStories] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])

    // Filters
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search, 300)
    const [storyFilter, setStoryFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [assigneeFilter, setAssigneeFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')

    // Sort
    const [sort, setSort] = useState<{ field: string, order: 'asc' | 'desc' }>({ field: 'sort_order', order: 'asc' })

    // Modal
    const [isAddOpen, setIsAddOpen] = useState(false)

    const fetchTasks = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await getProjectTasks(projectId, {
                search: debouncedSearch,
                storyId: storyFilter !== 'all' ? storyFilter : undefined,
                status: statusFilter,
                assigneeId: assigneeFilter,
                taskType: typeFilter
            }, sort)

            setTasks(res.data)
        } finally {
            setIsLoading(false)
        }
    }, [projectId, debouncedSearch, storyFilter, statusFilter, assigneeFilter, typeFilter, sort])

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    useEffect(() => {
        // Load filters data
        // For stories filter, ideally we fetch only active stories? 
        getProjectStories(projectId).then(res => { setStories(res.data) })
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
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-lg border shadow-sm">
                <div className="flex flex-wrap gap-2 items-center flex-1 w-full">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search tasks..."
                            className="pl-9 h-9 bg-slate-50 border-slate-200"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select value={storyFilter} onValueChange={setStoryFilter}>
                        <SelectTrigger className="w-[160px] h-9 bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Story" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stories</SelectItem>
                            {stories.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.story_code}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px] h-9 bg-slate-50 border-slate-200">
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

                    <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                        <SelectTrigger className="w-[150px] h-9 bg-slate-50 border-slate-200">
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

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[130px] h-9 bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="feature">Feature</SelectItem>
                            <SelectItem value="bug">Bug</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full md:w-auto">
                    <Button onClick={() => setIsAddOpen(true)} className="shadow-sm h-9 w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Task
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

            {/* Placeholder for AddTaskModal */}
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
