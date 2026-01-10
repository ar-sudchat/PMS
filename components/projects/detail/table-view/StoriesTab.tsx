'use client'

import { useState, useEffect, useCallback } from 'react'
import { getProjectStories, StoryListItem, getProjectMilestones } from '@/lib/actions/project-detail-actions'
import { StoriesTable } from './StoriesTable'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter } from 'lucide-react'
import { AddStoryModal } from '../work-items/AddStoryModal' // Reuse existing

interface StoriesTabProps {
    projectId: string
}

export function StoriesTab({ projectId }: StoriesTabProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [stories, setStories] = useState<StoryListItem[]>([])
    const [milestones, setMilestones] = useState<any[]>([])

    // Filters
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search, 300)
    const [milestoneFilter, setMilestoneFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [priorityFilter, setPriorityFilter] = useState('all')

    // Sort
    const [sort, setSort] = useState<{ field: string, order: 'asc' | 'desc' }>({ field: 'sort_order', order: 'asc' })

    // Modal
    const [isAddOpen, setIsAddOpen] = useState(false)

    const fetchStories = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await getProjectStories(projectId, {
                search: debouncedSearch,
                milestoneId: milestoneFilter,
                status: statusFilter,
                priority: priorityFilter
            }, sort)

            setStories(res.data)
        } finally {
            setIsLoading(false)
        }
    }, [projectId, debouncedSearch, milestoneFilter, statusFilter, priorityFilter, sort])

    useEffect(() => {
        fetchStories()
    }, [fetchStories])

    useEffect(() => {
        // Load milestones for filter
        getProjectMilestones(projectId).then(res => {
            if (res.success) setMilestones(res.data)
        })
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
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search stories..."
                            className="pl-9 bg-slate-50 border-slate-200"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select value={milestoneFilter} onValueChange={setMilestoneFilter}>
                        <SelectTrigger className="w-[160px] bg-slate-50">
                            <SelectValue placeholder="All Milestones" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Milestones</SelectItem>
                            {milestones.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.milestone_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] bg-slate-50">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="backlog">Backlog</SelectItem>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="working">Working</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-[140px] bg-slate-50">
                            <SelectValue placeholder="All Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Button onClick={() => setIsAddOpen(true)} className="shadow-sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Story
                    </Button>
                </div>
            </div>

            {/* Table */}
            <StoriesTable
                stories={stories}
                isLoading={isLoading}
                onRefresh={fetchStories}
                sort={sort}
                onSortChange={handleSortChange}
            />

            <AddStoryModal
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                projectId={projectId}
                milestones={milestones.map(m => ({ id: m.id, name: m.milestone_name }))}
                onSuccess={fetchStories}
            />
        </div>
    )
}

// Simple debounce hook if not exists
function useDebounce<T>(value: T, delay?: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay || 500)
        return () => clearTimeout(timer)
    }, [value, delay])
    return debouncedValue
}
