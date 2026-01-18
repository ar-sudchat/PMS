'use client'

import { useState, useEffect } from 'react'
import { getProjectFilterOptions, type FilterOptions } from '@/lib/actions/project-actions'
import { getSalesForecastMetrics, getMilestoneTimeline, type SalesMetric, type ProjectRow } from '@/lib/actions/project-onhand-actions'
import { ProjectRoadmapMatrix } from '@/components/project-onhand/ProjectRoadmapMatrix'
import { AdvancedMultiFilter } from '@/components/project-onhand/AdvancedMultiFilter'
import { ExecutiveSummaryPanel } from '@/components/project-onhand/ExecutiveSummaryPanel'
import { Button } from "@/components/ui/button"; import { cn } from "@/lib/utils"
import { PanelRightClose, PanelRightOpen, Loader2 } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function SalesForecastPage() {
    const [metrics, setMetrics] = useState<SalesMetric[]>([])
    const [roadmapData, setRoadmapData] = useState<ProjectRow[]>([])
    const [loading, setLoading] = useState(true)
    const [showSummary, setShowSummary] = useState(false)

    // Filter Options
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        customers: [],
        managers: [],
        owners: [],
        years: [],
        statuses: [],
        milestones: [],
        projectTypes: []
    })

    // Filters
    const [filters, setFilters] = useState({
        year: 2026,
        search: '',
        myPortfolio: false,
        criticalOnly: false,
        statusId: 'active', // Default to Active
        pmId: '',
        ownerId: '',
        projectTypeId: '',
        selectedTypes: ['DEV', 'SUP'] // Default Filter
    })

    // Load Options
    useEffect(() => {
        async function loadOptions() {
            const res = await getProjectFilterOptions()
            if (res.success && res.data) {
                setFilterOptions(res.data)

                // Set default status ID if 'Active' isn't the direct ID (usually it's a UUID)
                // Assuming 'active' string works based on server action logic, if not we search for it
                const activeStatus = res.data.statuses.find((s: any) => s.name?.toLowerCase() === 'active' || s.code?.toLowerCase() === 'active')
                if (activeStatus) {
                    setFilters(prev => ({ ...prev, statusId: activeStatus.id }))
                }
            }
        }
        loadOptions()
    }, [])

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            try {
                // Fetch metrics & timeline in parallel
                // Note: Metrics currently don't use filters, but timeline does
                const [m, t] = await Promise.all([
                    getSalesForecastMetrics(),
                    getMilestoneTimeline({
                        year: filters.year,
                        search: filters.search,
                        myPortfolio: filters.myPortfolio,
                        criticalOnly: filters.criticalOnly,
                        statusId: filters.statusId,
                        pmId: filters.pmId,
                        ownerId: filters.ownerId,
                        projectTypeId: filters.projectTypeId
                    })
                ])
                setMetrics(m)
                setRoadmapData(t)
            } catch (error) {
                console.error("Failed to load sales data", error)
            } finally {
                setLoading(false)
            }
        }

        // Debounce search slightly if needed, or just let it fire
        const timer = setTimeout(() => {
            loadData()
        }, 300)

        return () => clearTimeout(timer)
    }, [filters])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            {/* Header / Filter Bar */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="shrink-0">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            Project Onhand
                        </h1>
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                        <AdvancedMultiFilter
                            filters={filters}
                            onFilterChange={setFilters}
                            options={filterOptions}
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowSummary(!showSummary)}
                            className={cn("shrink-0", showSummary ? "bg-blue-50 text-blue-600 border-blue-200" : "")}
                            title={showSummary ? "Hide Summary" : "Show Summary"}
                        >
                            {showSummary ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
                <div id="project-roadmap-snapshot" className="flex-1 flex flex-col p-6 gap-6 overflow-hidden bg-[#F8FAFC]">
                    {/* Matrix View (Main Content) */}
                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        {/* Header removed as requested to maximize space, or kept minimal */}
                        <div className="flex-1 overflow-hidden relative">
                            <ProjectRoadmapMatrix projects={roadmapData} year={filters.year} selectedTypes={filters.selectedTypes} />
                        </div>
                    </div>
                </div>

                {/* Side Panel Summary */}
                {showSummary && (
                    <div className="w-[480px] border-l border-slate-200 bg-white p-6 shrink-0 hidden xl:block overflow-y-auto animate-in slide-in-from-right duration-300">
                        <ExecutiveSummaryPanel data={roadmapData} metrics={metrics} />
                    </div>
                )}
            </div>
        </div>
    )
}
