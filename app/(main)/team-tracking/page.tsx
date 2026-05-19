'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Search, Check, CalendarCheck } from 'lucide-react'
import { getProjectFilterOptions, ProjectFilters } from '@/lib/actions/project-actions'
import {
    getTeamTrackingData,
    getAssignableEmployees,
    getProjectMilestones,
    TrackingEntry,
    AssignableEmployee,
} from '@/lib/actions/team-tracking-actions'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import { TrackingGrid } from '@/components/team-tracking/TrackingGrid'
import { TrackingCellDialog } from '@/components/team-tracking/TrackingCellDialog'

interface FilterOptions {
    customers: { id: string; code: string; name: string }[]
    managers: { id: string; name: string; name_th: string }[]
    owners: { id: string; name: string; name_th: string; position_code: string }[]
    years: number[]
    statuses: { id: string; code: string; name: string; color: string }[]
    milestones: { id: string; code: string; name: string; color: string }[]
    projectTypes: { id: string; code: string; name: string; color: string }[]
}

interface Filters {
    year: number | ''
    customerId: string
    managerId: string
    ownerId: string
    statusId: string
    projectTypeId: string
    milestoneIds: string[]
    search: string
}

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

function pad2(n: number) {
    return n < 10 ? `0${n}` : String(n)
}

function monthRange(year: number, month: number) {
    const start = `${year}-${pad2(month)}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${year}-${pad2(month)}-${pad2(lastDay)}`
    return { start, end }
}

export default function TeamTrackingPage() {
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        customers: [],
        managers: [],
        owners: [],
        years: [],
        statuses: [],
        milestones: [],
        projectTypes: [],
    })

    const [filters, setFilters] = useState<Filters>({
        year: new Date().getFullYear(),
        customerId: '',
        managerId: '',
        ownerId: '',
        statusId: '',
        projectTypeId: '',
        milestoneIds: [],
        search: '',
    })

    const today = new Date()
    const [year, setYear] = useState(today.getFullYear())
    const [month, setMonth] = useState(today.getMonth() + 1)

    const [projects, setProjects] = useState<any[]>([])
    const [entries, setEntries] = useState<TrackingEntry[]>([])
    const [employees, setEmployees] = useState<AssignableEmployee[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const initialLoadedRef = useRef(false)

    const [isMilestoneDropdownOpen, setIsMilestoneDropdownOpen] = useState(false)

    // Drawer state — keep last cell context across close so slide-out animates.
    const [selectedCell, setSelectedCell] = useState<{
        projectId: string
        projectName: string
        date: string
    } | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    // Per-project milestones cache (loaded on demand when opening dialog)
    const [milestonesByProject, setMilestonesByProject] = useState<
        Record<string, { id: string; name: string; color: string | null }[]>
    >({})

    const loadFilterOptions = useCallback(async () => {
        const [optsResult, empResult] = await Promise.all([
            getProjectFilterOptions(),
            getAssignableEmployees(),
        ])
        if (optsResult.success && optsResult.data) {
            setFilterOptions(optsResult.data)
            const activeStatus = optsResult.data.statuses.find(
                (s: any) => s.code?.toLowerCase() === 'active' || s.name?.toLowerCase() === 'active'
            )
            const devType = optsResult.data.projectTypes.find(
                (t: any) => t.code?.toUpperCase() === 'DEV'
            )
            setFilters((prev) => {
                const next = { ...prev }
                if (activeStatus && !prev.statusId) next.statusId = activeStatus.id
                if (devType && !prev.projectTypeId) next.projectTypeId = devType.id
                return next
            })
        }
        if (empResult.success && empResult.data) {
            setEmployees(empResult.data)
        }
    }, [])

    const loadData = useCallback(
        async (silent = false) => {
            if (!silent) setIsLoading(true)
            const { start, end } = monthRange(year, month)
            const filterPayload: ProjectFilters = {
                year: filters.year || undefined,
                customerId: filters.customerId || undefined,
                managerId: filters.managerId || undefined,
                ownerId: filters.ownerId || undefined,
                statusId: filters.statusId || undefined,
                projectTypeId: filters.projectTypeId || undefined,
                milestoneIds: filters.milestoneIds.length > 0 ? filters.milestoneIds : undefined,
                search: filters.search || undefined,
            }
            const result = await getTeamTrackingData(filterPayload, start, end)
            if (result.success && result.data) {
                setProjects(result.data.projects)
                setEntries(result.data.entries)
            } else {
                setProjects([])
                setEntries([])
            }
            if (!silent) setIsLoading(false)
            initialLoadedRef.current = true
        },
        [filters, year, month]
    )

    useEffect(() => {
        loadFilterOptions()
    }, [loadFilterOptions])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleFilterChange = (key: keyof Filters, value: any) => {
        setFilters((prev) => ({ ...prev, [key]: value }))
    }

    const toggleMilestone = (milestoneId: string) => {
        setFilters((prev) => ({
            ...prev,
            milestoneIds: prev.milestoneIds.includes(milestoneId)
                ? prev.milestoneIds.filter((id) => id !== milestoneId)
                : [...prev.milestoneIds, milestoneId],
        }))
    }

    const goPrevMonth = () => {
        if (month === 1) {
            setMonth(12)
            setYear((y) => y - 1)
        } else {
            setMonth((m) => m - 1)
        }
    }

    const goNextMonth = () => {
        if (month === 12) {
            setMonth(1)
            setYear((y) => y + 1)
        } else {
            setMonth((m) => m + 1)
        }
    }

    const goToday = () => {
        const d = new Date()
        setYear(d.getFullYear())
        setMonth(d.getMonth() + 1)
    }

    const saOwners = useMemo(
        () => filterOptions.owners.filter((o) => o.position_code === 'SA'),
        [filterOptions.owners]
    )

    const cellEntries = useMemo(() => {
        if (!selectedCell) return [] as TrackingEntry[]
        // Show an entry in the dialog when the clicked date is any of its key dates:
        //   - original entry_date (the plan)
        //   - postponed_date (where it was moved to)
        //   - completed_date (where it was actually finished)
        return entries.filter((e) => {
            if (e.project_id !== selectedCell.projectId) return false
            if (e.entry_date === selectedCell.date) return true
            if (e.status === 'POSTPONED' && e.postponed_date === selectedCell.date) return true
            if (e.status === 'DONE' && e.completed_date === selectedCell.date) return true
            return false
        })
    }, [entries, selectedCell])

    const cellMilestones = useMemo(() => {
        if (!selectedCell) return [] as { id: string; name: string; color: string | null }[]
        return milestonesByProject[selectedCell.projectId] || []
    }, [milestonesByProject, selectedCell])

    const handleCellClick = async (projectId: string, date: string) => {
        const proj = projects.find((p) => p.id === projectId)
        if (!proj) return
        setSelectedCell({ projectId, projectName: proj.name, date })
        setIsDrawerOpen(true)
        // Lazy-load milestones for this project if not already cached
        if (!milestonesByProject[projectId]) {
            const result = await getProjectMilestones(projectId)
            if (result.success) {
                setMilestonesByProject((prev) => ({ ...prev, [projectId]: result.data }))
            }
        }
    }

    return (
        <div className="-m-6 -mt-16 p-2 space-y-1.5 text-xs">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                    <CalendarCheck className="w-4 h-4 text-blue-600" />
                    ติดตามทีม
                    <span className="font-normal text-slate-400">
                        ({projects.length} โครงการ · {entries.length} รายการ)
                    </span>
                </h1>

                {/* Month Selector */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={goToday}
                        className="px-2 py-0.5 text-xs border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                    >
                        วันนี้
                    </button>
                    <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden">
                        <button
                            onClick={goPrevMonth}
                            className="px-1 py-0.5 text-slate-600 hover:bg-slate-100"
                        >
                            <ChevronLeft className="w-3 h-3" />
                        </button>
                        <div className="px-2 py-0.5 text-xs font-medium text-slate-900 min-w-[110px] text-center">
                            {THAI_MONTHS[month - 1]} {year + 543}
                        </div>
                        <button
                            onClick={goNextMonth}
                            className="px-1 py-0.5 text-slate-600 hover:bg-slate-100"
                        >
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters - compact single row */}
            <div className="bg-white px-2 py-1.5 rounded border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                    {/* Fiscal Year */}
                    <select
                        value={filters.year}
                        onChange={(e) =>
                            handleFilterChange('year', e.target.value ? parseInt(e.target.value) : '')
                        }
                        className="px-2 py-1 border border-slate-300 rounded text-xs min-w-[90px]"
                        title="Fiscal Year"
                    >
                        <option value="">All Years</option>
                        {filterOptions.years.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>

                    {/* Customer */}
                    <div className="min-w-[170px] [&_button]:!py-1 [&_button]:!px-2 [&_button]:!text-xs [&_button]:!rounded">
                        <SmartCombobox
                            placeholder="All Customers"
                            options={[
                                { value: '', label: 'All Customers' },
                                ...filterOptions.customers.map((c) => ({
                                    value: c.id,
                                    label: c.name,
                                })),
                            ]}
                            value={
                                filters.customerId
                                    ? filterOptions.customers.find((c) => c.id === filters.customerId)
                                        ? {
                                              value: filters.customerId,
                                              label: filterOptions.customers.find((c) => c.id === filters.customerId)!.name,
                                          }
                                        : null
                                    : { value: '', label: 'All Customers' }
                            }
                            onChange={(opt) => handleFilterChange('customerId', opt?.value || '')}
                            maxDisplayItems={10}
                        />
                    </div>

                    {/* Project Manager */}
                    <div className="min-w-[150px] [&_button]:!py-1 [&_button]:!px-2 [&_button]:!text-xs [&_button]:!rounded">
                        <SmartCombobox
                            placeholder="All PMs"
                            options={[
                                { value: '', label: 'All PMs' },
                                ...filterOptions.managers.map((m) => ({
                                    value: m.id,
                                    label: m.name_th || m.name,
                                })),
                            ]}
                            value={
                                filters.managerId
                                    ? filterOptions.managers.find((m) => m.id === filters.managerId)
                                        ? {
                                              value: filters.managerId,
                                              label:
                                                  filterOptions.managers.find((m) => m.id === filters.managerId)!.name_th ||
                                                  filterOptions.managers.find((m) => m.id === filters.managerId)!.name,
                                          }
                                        : null
                                    : { value: '', label: 'All PMs' }
                            }
                            onChange={(opt) => handleFilterChange('managerId', opt?.value || '')}
                            maxDisplayItems={10}
                        />
                    </div>

                    {/* Owner */}
                    <div className="min-w-[170px] [&_button]:!py-1 [&_button]:!px-2 [&_button]:!text-xs [&_button]:!rounded">
                        <SmartCombobox
                            placeholder="All SAs"
                            options={[
                                { value: '', label: 'All SAs' },
                                ...saOwners.map((o) => ({
                                    value: o.id,
                                    label: o.name_th || o.name,
                                })),
                            ]}
                            value={
                                filters.ownerId
                                    ? saOwners.find((o) => o.id === filters.ownerId)
                                        ? {
                                              value: filters.ownerId,
                                              label: (() => {
                                                  const o = saOwners.find((o) => o.id === filters.ownerId)!
                                                  return o.name_th || o.name
                                              })(),
                                          }
                                        : null
                                    : { value: '', label: 'All SAs' }
                            }
                            onChange={(opt) => handleFilterChange('ownerId', opt?.value || '')}
                            maxDisplayItems={10}
                        />
                    </div>

                    {/* Type */}
                    <select
                        value={filters.projectTypeId}
                        onChange={(e) => handleFilterChange('projectTypeId', e.target.value)}
                        className="px-2 py-1 border border-slate-300 rounded text-xs min-w-[90px]"
                        title="Type"
                    >
                        <option value="">All Types</option>
                        {filterOptions.projectTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.code}
                            </option>
                        ))}
                    </select>

                    {/* Status */}
                    <select
                        value={filters.statusId}
                        onChange={(e) => handleFilterChange('statusId', e.target.value)}
                        className="px-2 py-1 border border-slate-300 rounded text-xs min-w-[110px]"
                        title="Status"
                    >
                        <option value="">All Status</option>
                        {filterOptions.statuses.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>

                    {/* Milestone Multi-select */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsMilestoneDropdownOpen(!isMilestoneDropdownOpen)}
                            className="px-2 py-1 border border-slate-300 rounded text-xs min-w-[140px] flex items-center justify-between gap-2 bg-white"
                            title="Milestone"
                        >
                            <span
                                className={
                                    filters.milestoneIds.length > 0 ? 'text-slate-900' : 'text-slate-400'
                                }
                            >
                                {filters.milestoneIds.length > 0
                                    ? `${filters.milestoneIds.length} selected`
                                    : 'All Milestones'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>

                        {isMilestoneDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsMilestoneDropdownOpen(false)}
                                />
                                <div className="absolute z-20 top-full left-0 mt-1 w-56 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {filters.milestoneIds.length > 0 && (
                                        <button
                                            onClick={() => handleFilterChange('milestoneIds', [])}
                                            className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 border-b"
                                        >
                                            Clear all
                                        </button>
                                    )}
                                    {filterOptions.milestones.map((m) => (
                                        <label
                                            key={m.id}
                                            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={filters.milestoneIds.includes(m.id)}
                                                onChange={() => toggleMilestone(m.id)}
                                                className="hidden"
                                            />
                                            <div
                                                className={`w-4 h-4 rounded border flex items-center justify-center ${
                                                    filters.milestoneIds.includes(m.id)
                                                        ? 'bg-blue-600 border-blue-600'
                                                        : 'border-slate-300'
                                                }`}
                                            >
                                                {filters.milestoneIds.includes(m.id) && (
                                                    <Check className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                            <span className="text-sm" style={{ color: m.color }}>
                                                {m.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative ml-auto w-52">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="ค้นหาชื่อ/รหัสโครงการ..."
                            className="w-full pl-7 pr-2 py-1 border border-slate-300 rounded text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <TrackingGrid
                projects={projects}
                entries={entries}
                year={year}
                month={month}
                onCellClick={handleCellClick}
                isLoading={isLoading}
            />

            {/* Cell drawer — always mounted so slide-out animates */}
            <TrackingCellDialog
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSaved={() => loadData(true)}
                projectId={selectedCell?.projectId ?? ''}
                projectName={selectedCell?.projectName ?? ''}
                entryDate={selectedCell?.date ?? ''}
                entries={cellEntries}
                employees={employees}
                milestones={cellMilestones}
            />
        </div>
    )
}
