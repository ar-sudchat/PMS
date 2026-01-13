'use client'

import { useState, useEffect } from 'react'
import { getProjectFilterOptions, type FilterOptions } from '@/lib/actions/project-actions'
import { getSalesForecastMetrics, getMilestoneTimeline, type SalesMetric, type ProjectRow } from '@/lib/actions/project-onhand-actions'
import { HeroMetricsCard } from '@/components/project-onhand/HeroMetricsCard'
import { ProjectRoadmapMatrix } from '@/components/project-onhand/ProjectRoadmapMatrix'
import { AdvancedMultiFilter } from '@/components/project-onhand/AdvancedMultiFilter'
import { ExecutiveSummaryPanel } from '@/components/project-onhand/ExecutiveSummaryPanel'
import { Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function SalesForecastPage() {
    const [metrics, setMetrics] = useState<SalesMetric[]>([])
    const [roadmapData, setRoadmapData] = useState<ProjectRow[]>([])
    const [loading, setLoading] = useState(true)

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
        statusId: '',
        pmId: '',
        ownerId: '',
        projectTypeId: ''
    })

    // Load Options
    useEffect(() => {
        async function loadOptions() {
            const res = await getProjectFilterOptions()
            if (res.success && res.data) {
                setFilterOptions(res.data)
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
                        statusId: filters.statusId,
                        pmId: filters.pmId,
                        ownerId: filters.ownerId
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            Project Onhand {filters.year}
                        </h1>
                        <p className="text-sm text-slate-500">Project Delivery & Handover Tracking</p>
                    </div>
                    <AdvancedMultiFilter
                        filters={filters}
                        onFilterChange={setFilters}
                        options={filterOptions}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
                <div id="project-roadmap-snapshot" className="flex-1 flex flex-col p-6 gap-6 overflow-hidden bg-[#F8FAFC]">
                    {/* 1. Hero Metrics (Compact) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                        {metrics.map((m, i) => (
                            <HeroMetricsCard key={i} metric={m} />
                        ))}
                    </div>

                    {/* 2. Matrix View (Main Content) */}
                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800">Project Delivery Matrix</h2>
                            <div className="flex gap-4 text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Completed</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>On Track</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Risk / Delayed</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <ProjectRoadmapMatrix projects={roadmapData} year={filters.year} />
                        </div>
                    </div>
                </div>

                {/* Side Panel Summary */}
                <div className="w-[300px] border-l border-slate-200 bg-white p-6 shrink-0 hidden xl:block overflow-y-auto">
                    <ExecutiveSummaryPanel data={roadmapData} metrics={metrics} />
                </div>
            </div>
        </div>
    )
}
