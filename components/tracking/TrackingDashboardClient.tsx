'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Calendar, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MultiSelectFilter, SelectedFilters } from '@/components/tracking/TrackingFilters'
import { TimelineTable } from '@/components/tracking/TimelineTable'
import {
    getTrackingProjects,
    getTrackingFilterOptions,
    type TrackingProject,
    type FilterOption
} from '@/lib/actions/tracking-dashboard-actions'
import { cn } from '@/lib/utils'

interface TrackingDashboardClientProps {
    initialProjects: TrackingProject[]
    filterOptions: {
        projectTypes: FilterOption[]
        statuses: FilterOption[]
        customers: FilterOption[]
        owners: FilterOption[]
    }
    currentYear: number
}

export function TrackingDashboardClient({
    initialProjects,
    filterOptions,
    currentYear
}: TrackingDashboardClientProps) {
    const router = useRouter()
    const [projects, setProjects] = useState(initialProjects)
    const [year, setYear] = useState(currentYear)
    const [isLoading, setIsLoading] = useState(false)

    // Filter states
    const [selectedTypes, setSelectedTypes] = useState<string[]>([])
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
    const [selectedOwners, setSelectedOwners] = useState<string[]>([])

    const handleRefresh = async () => {
        setIsLoading(true)
        const data = await getTrackingProjects({
            year,
            projectTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
            statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
            customerIds: selectedCustomers.length > 0 ? selectedCustomers : undefined,
            ownerIds: selectedOwners.length > 0 ? selectedOwners : undefined
        })
        setProjects(data)
        setIsLoading(false)
    }

    const handleYearChange = async (newYear: number) => {
        setYear(newYear)
        setIsLoading(true)
        const data = await getTrackingProjects({ year: newYear })
        setProjects(data)
        setIsLoading(false)
    }

    const handleProjectClick = (projectId: string) => {
        router.push(`/pm-dashboard/${projectId}`)
    }

    const handleClearFilters = () => {
        setSelectedTypes([])
        setSelectedStatuses([])
        setSelectedCustomers([])
        setSelectedOwners([])
    }

    // Auto-refresh when filters change
    useEffect(() => {
        const hasFilters = selectedTypes.length || selectedStatuses.length ||
            selectedCustomers.length || selectedOwners.length
        if (hasFilters) {
            handleRefresh()
        }
    }, [selectedTypes, selectedStatuses, selectedCustomers, selectedOwners])

    return (
        <div className="p-6 space-y-5 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Project Tracking</h1>
                        <p className="text-sm text-slate-500">Timeline & Milestone Overview</p>
                    </div>
                </div>
                <Button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                    className="border-slate-200"
                >
                    <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-medium">Filters:</span>
                    </div>

                    <MultiSelectFilter
                        label="Project Types"
                        options={filterOptions.projectTypes}
                        selected={selectedTypes}
                        onChange={setSelectedTypes}
                    />

                    <MultiSelectFilter
                        label="Status"
                        options={filterOptions.statuses}
                        selected={selectedStatuses}
                        onChange={setSelectedStatuses}
                    />

                    <MultiSelectFilter
                        label="Customer"
                        options={filterOptions.customers}
                        selected={selectedCustomers}
                        onChange={setSelectedCustomers}
                    />

                    <MultiSelectFilter
                        label="Owner"
                        options={filterOptions.owners}
                        selected={selectedOwners}
                        onChange={setSelectedOwners}
                    />
                </div>

                {/* Selected Filters Tags */}
                <div className="mt-3">
                    <SelectedFilters
                        filters={[
                            {
                                label: 'Type',
                                values: selectedTypes,
                                options: filterOptions.projectTypes,
                                onRemove: (v) => setSelectedTypes(prev => prev.filter(x => x !== v))
                            },
                            {
                                label: 'Status',
                                values: selectedStatuses,
                                options: filterOptions.statuses,
                                onRemove: (v) => setSelectedStatuses(prev => prev.filter(x => x !== v))
                            },
                            {
                                label: 'Customer',
                                values: selectedCustomers,
                                options: filterOptions.customers,
                                onRemove: (v) => setSelectedCustomers(prev => prev.filter(x => x !== v))
                            },
                            {
                                label: 'Owner',
                                values: selectedOwners,
                                options: filterOptions.owners,
                                onRemove: (v) => setSelectedOwners(prev => prev.filter(x => x !== v))
                            }
                        ]}
                        onClearAll={handleClearFilters}
                    />
                </div>
            </div>

            {/* Summary Stats */}
            <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{projects.length}</span> projects
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">
                    Year <span className="font-semibold text-slate-700">{year}</span>
                </span>
            </div>

            {/* Timeline Table */}
            <TimelineTable
                projects={projects}
                year={year}
                onYearChange={handleYearChange}
                onProjectClick={handleProjectClick}
            />

            {/* Footer */}
            <div className="text-center text-sm text-slate-400 py-2">
                💡 Click on a project row to view detailed health breakdown • Scroll horizontally to see all months
            </div>
        </div>
    )
}
