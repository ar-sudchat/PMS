'use client'

import { useState, useEffect, useCallback } from 'react'
import { getProjectWorkItems, getWorkItemsSummary, MilestoneGroup } from '@/lib/actions/work-items-actions'
import { getEmployees } from '@/lib/actions/project-actions'
import { SummaryCards } from './SummaryCards'
import { WorkItemsTable } from './WorkItemsTable'
import { CreateStoryModal as AddStoryModal } from '@/components/modals/CreateStoryModal'
import { WorkItemFilters } from '@/components/gantt/WorkItemFilters'
import { Button } from '@/components/ui/button'
import { Plus, Download } from 'lucide-react'
import { toast } from 'sonner'

interface WorkItemsTabContentProps {
    projectId: string
}

export function WorkItemsTabContent({ projectId }: WorkItemsTabContentProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [workItems, setWorkItems] = useState<MilestoneGroup[]>([])
    const [summaryStats, setSummaryStats] = useState<any>(null)
    const [employees, setEmployees] = useState<{ id: string, name: string }[]>([])

    // Filter States
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string[]>([])
    const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)
    const [milestoneFilter, setMilestoneFilter] = useState<string[]>([]) // Not implemented in UI yet

    // Modal States
    const [isAddStoryOpen, setIsAddStoryOpen] = useState(false)
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('')

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const filters = {
                search: searchQuery,
                status: statusFilter.length > 0 ? statusFilter[0] : undefined, // Simplify for now
                assigneeId: assigneeFilter || undefined
            }

            const [itemsResult, statsResult, empResult] = await Promise.all([
                getProjectWorkItems(projectId, filters),
                getWorkItemsSummary(projectId),
                getEmployees()
            ])

            if (itemsResult.success) setWorkItems(itemsResult.data)
            if (statsResult.success) setSummaryStats(statsResult.data)
            if (empResult) setEmployees(empResult.map((e: any) => ({ id: e.id, name: e.full_name, nickname: e.nickname })))

        } catch (error) {
            toast.error('Failed to load data')
        } finally {
            setIsLoading(false)
        }
    }, [projectId, searchQuery, statusFilter, assigneeFilter])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleAddStory = (milestoneId?: string) => {
        if (milestoneId) setSelectedMilestoneId(milestoneId)
        setIsAddStoryOpen(true)
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            {summaryStats && <SummaryCards stats={summaryStats} />}

            {/* Controls */}
            <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b flex justify-between items-center flex-wrap gap-4">
                    <div className="flex-1 min-w-[300px]">
                        {/* Reuse existing Filter Component */}
                        <WorkItemFilters
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            statusFilter={statusFilter}
                            onStatusFilterChange={setStatusFilter}
                            assigneeFilter={assigneeFilter}
                            onAssigneeFilterChange={setAssigneeFilter}
                            employees={employees}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => handleAddStory()}>
                            <Plus className="w-4 h-4 mr-2" /> Add Story
                        </Button>
                        <Button variant="outline">
                            <Download className="w-4 h-4 mr-2" /> Export
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="p-4">
                    <WorkItemsTable
                        data={workItems}
                        isLoading={isLoading}
                        employees={employees}
                        onRefresh={fetchData}
                        onAddStory={handleAddStory}
                    />
                </div>
            </div>

            {/* Modals */}
            <AddStoryModal
                isOpen={isAddStoryOpen}
                onClose={() => setIsAddStoryOpen(false)}
                projectId={projectId}
                milestones={workItems.map(m => ({ id: m.id, name: m.name }))} // Pass available milestones
                milestoneId={selectedMilestoneId}
                onSuccess={fetchData}
            />
        </div>
    )
}
