'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { 
    ChevronLeft, 
    ChevronRight, 
    ChevronDown, 
    Search, 
    Check, 
    CalendarCheck,
    Image as ImageIcon,
    FileSpreadsheet,
    Info
} from 'lucide-react'
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
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface FilterOptions {
    customers: { id: string; code: string; name: string }[]
    managers: { id: string; name: string; name_th: string }[]
    owners: { id: string; name: string; name_th: string; position_code: string }[]
    years: number[]
    statuses: { id: string; code: string; name: string; color: string }[]
    milestones: { id: string; code: string; name: string; color: string }[]
    projectTypes: { id: string; code: string; name: string; color: string }[]
}

interface TrackingProject {
    id: string
    project_code: string
    name: string
    customer_name: string | null
    project_type_code: string | null
    project_type_color: string | null
    owner_name: string | null
    pm_name: string | null
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

export const LEGEND_ITEMS = [
    { key: 'DONE', label: 'เสร็จสิ้น (Done)', color: '#10b981', type: 'status' },
    { key: 'POSTPONED', label: 'เลื่อนแผน (Postponed)', color: '#f59e0b', type: 'status' },
    { key: 'incoming', label: 'งานเลื่อนเข้า (Postponed In)', color: '#f59e0b', type: 'kind' },
    { key: 'departed', label: 'งานย้ายออก (Postponed Out)', color: '#94a3b8', type: 'kind' },
    { key: 'code', label: 'งานพัฒนา (Dev)', color: '#6366f1', type: 'icon' },
    { key: 'bug', label: 'แก้บั๊ก (Bug)', color: '#ef4444', type: 'icon' },
    { key: 'meeting', label: 'ประชุม (Meeting)', color: '#ec4899', type: 'icon' },
    { key: 'task', label: 'Task ทั่วไป', color: '#06b6d4', type: 'icon' },
]

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

    const [projects, setProjects] = useState<TrackingProject[]>([])
    const [entries, setEntries] = useState<TrackingEntry[]>([])
    const [employees, setEmployees] = useState<AssignableEmployee[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const initialLoadedRef = useRef(false)
    const [isFilterOptionsLoaded, setIsFilterOptionsLoaded] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const [isMilestoneDropdownOpen, setIsMilestoneDropdownOpen] = useState(false)
    const [isCapturing, setIsCapturing] = useState(false)
    const [hoveredLegend, setHoveredLegend] = useState<string | null>(null)

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
        try {
            const [optsResult, empResult] = await Promise.all([
                getProjectFilterOptions(),
                getAssignableEmployees(),
            ])
            if (optsResult.success && optsResult.data) {
                setFilterOptions(optsResult.data)
                const activeStatus = optsResult.data.statuses.find(
                    (s) => s.code?.toLowerCase() === 'active' || s.name?.toLowerCase() === 'active'
                )
                const devType = optsResult.data.projectTypes.find(
                    (t) => t.code?.toUpperCase() === 'DEV'
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
        } catch (error) {
            console.error('Failed to load filter options:', error)
        } finally {
            setIsFilterOptionsLoaded(true)
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
        if (isFilterOptionsLoaded) {
            loadData()
        }
    }, [loadData, isFilterOptionsLoaded])

    // Debounce search query changes to prevent rapid database reloading
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters((prev) => {
                if (prev.search === searchQuery) return prev
                return { ...prev, search: searchQuery }
            })
        }, 400)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
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

    // Capture grid to image
    const handleCaptureImage = async () => {
        const element = document.getElementById('tracking-grid-card')
        if (!element) return
        setIsCapturing(true)
        try {
            const canvas = await html2canvas(element, {
                useCORS: true,
                scale: 2, // higher resolution
                backgroundColor: '#ffffff',
                logging: false,
                ignoreElements: (el) => el.tagName === 'BUTTON' || el.classList.contains('no-export')
            })
            const dataUrl = canvas.toDataURL('image/png')
            const monthStr = THAI_MONTHS[month - 1]
            saveAs(dataUrl, `team-tracking-${year + 543}-${monthStr}.png`)
        } catch (error) {
            console.error('Error capturing image:', error)
        } finally {
            setIsCapturing(false)
        }
    }

    // Export to Excel
    const handleExportExcel = () => {
        if (projects.length === 0) return

        const totalDays = new Date(year, month, 0).getDate()
        const headers = ['รหัสโครงการ', 'ชื่อโครงการ', 'ลูกค้า', 'ประเภท', 'พนักงาน', 'PM']
        for (let d = 1; d <= totalDays; d++) {
            headers.push(`${d}/${month}`)
        }

        const rows = projects.map((p) => {
            const projectEntries = entries.filter((e) => e.project_id === p.id)
            const rowData: Record<string, string> = {
                'รหัสโครงการ': p.project_code,
                'ชื่อโครงการ': p.name,
                'ลูกค้า': p.customer_name || '-',
                'ประเภท': p.project_type_code || '-',
                'พนักงาน': p.owner_name || '-',
                'PM': p.pm_name || '-'
            }

            for (let d = 1; d <= totalDays; d++) {
                const dateStr = `${year}-${pad2(month)}-${pad2(d)}`
                
                const dayEntries = projectEntries.filter((e) => {
                    if (e.entry_date === dateStr) return true
                    if (e.status === 'POSTPONED' && e.postponed_date === dateStr) return true
                    if (e.status === 'DONE' && e.completed_date === dateStr) return true
                    return false
                })

                if (dayEntries.length > 0) {
                    rowData[`${d}/${month}`] = dayEntries.map((e) => {
                        const statusStr = e.status === 'DONE' ? '[เสร็จ]' : e.status === 'POSTPONED' ? '[เลื่อน]' : '[แผน]'
                        return `${statusStr} ${e.assignee_name || 'ไม่ระบุ'}: ${e.note || ''}`
                    }).join(' | ')
                } else {
                    rowData[`${d}/${month}`] = ''
                }
            }
            return rowData
        })

        const worksheet = XLSX.utils.json_to_sheet(rows)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Team Tracking')

        const monthStr = THAI_MONTHS[month - 1]
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' })
        saveAs(data, `team-tracking-${year + 543}-${monthStr}.xlsx`)
    }

    const activeEmployees = useMemo(
        () => filterOptions.owners,
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
        <div className="-m-6 -mt-16 p-3 space-y-3.5 text-xs bg-slate-50/30 min-h-screen">
            {/* Header - Glassmorphic styled banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-2xl p-4 shadow-md border border-indigo-500/20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)] pointer-events-none" />
                <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
                    <div className="space-y-1">
                        <h1 className="text-base font-bold flex items-center gap-2 whitespace-nowrap">
                            <CalendarCheck className="w-5 h-5 text-amber-300 animate-[bounce_2s_infinite]" />
                            <span className="bg-gradient-to-r from-white to-slate-100 bg-clip-text text-transparent">ติดตามทีมโครงการ</span>
                            <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md text-[11px] font-semibold text-slate-100 px-2.5 py-0.5 rounded-full border border-white/10">
                                {projects.length} โครงการ · {entries.length} แผนงาน
                            </span>
                        </h1>
                        <p className="text-[10px] text-indigo-100/80">ระบบติดตามและบริหารจัดการงานโครงการสำหรับทีมพัฒนา</p>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Capture button */}
                        <button
                            onClick={handleCaptureImage}
                            disabled={isCapturing}
                            className="px-3 py-1.5 text-[11px] border border-white/20 rounded-lg text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all duration-200 flex items-center gap-1.5 font-medium disabled:opacity-50 shadow-sm"
                            title="จับภาพตารางงานเป็นรูปภาพ"
                        >
                            <ImageIcon className="w-3.5 h-3.5 text-indigo-200" />
                            {isCapturing ? 'กำลังจับภาพ...' : 'จับภาพบอร์ด'}
                        </button>

                        {/* Export excel button */}
                        <button
                            onClick={handleExportExcel}
                            className="px-3 py-1.5 text-[11px] border border-emerald-500/20 bg-emerald-500/20 hover:bg-emerald-500/30 text-white rounded-lg active:scale-95 transition-all duration-200 flex items-center gap-1.5 font-medium shadow-sm"
                            title="ส่งออกตารางเป็นไฟล์ Excel"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                            ส่งออก Excel
                        </button>

                        <div className="h-5 w-px bg-white/20 mx-1 shrink-0" />

                        {/* Month selector */}
                        <button
                            onClick={goToday}
                            className="px-3 py-1.5 text-[11px] border border-white/20 rounded-lg text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all duration-200 font-medium shadow-sm"
                        >
                            วันนี้
                        </button>
                        <div className="flex items-center bg-white/15 border border-white/20 rounded-lg overflow-hidden shadow-sm backdrop-blur-md">
                            <button
                                onClick={goPrevMonth}
                                className="px-2 py-1.5 text-white/95 hover:bg-white/10 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="px-3 py-1.5 text-[11px] font-bold text-white min-w-[120px] text-center bg-white/5">
                                {THAI_MONTHS[month - 1]} {year + 543}
                            </div>
                            <button
                                onClick={goNextMonth}
                                className="px-2 py-1.5 text-white/95 hover:bg-white/10 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters - Glassmorphism style with elevated aesthetics */}
            <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="flex flex-wrap items-end gap-3.5">
                    {/* Fiscal Year */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ปีงบประมาณ</span>
                        <select
                            value={filters.year}
                            onChange={(e) =>
                                handleFilterChange('year', e.target.value ? parseInt(e.target.value) : '')
                            }
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs min-w-[90px] bg-slate-50/50 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white transition-all duration-150 outline-none shadow-sm font-medium"
                            title="Fiscal Year"
                        >
                            <option value="">ทุกปี</option>
                            {filterOptions.years.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Customer */}
                    <div className="flex flex-col gap-1 min-w-[170px]">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ลูกค้า</span>
                        <div className="[&_button]:!py-1.5 [&_button]:!px-2.5 [&_button]:!text-xs [&_button]:!rounded-lg [&_button]:bg-slate-50/50 [&_button]:border-slate-200 [&_button]:hover:bg-slate-50">
                            <SmartCombobox
                                placeholder="ลูกค้าทั้งหมด"
                                options={[
                                    { value: '', label: 'ลูกค้าทั้งหมด' },
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
                                        : { value: '', label: 'ลูกค้าทั้งหมด' }
                                }
                                onChange={(opt) => handleFilterChange('customerId', String(opt?.value || ''))}
                                maxDisplayItems={10}
                            />
                        </div>
                    </div>

                    {/* Project Manager */}
                    <div className="flex flex-col gap-1 min-w-[150px]">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ผู้จัดการโครงการ (PM)</span>
                        <div className="[&_button]:!py-1.5 [&_button]:!px-2.5 [&_button]:!text-xs [&_button]:!rounded-lg [&_button]:bg-slate-50/50 [&_button]:border-slate-200 [&_button]:hover:bg-slate-50">
                            <SmartCombobox
                                placeholder="PM ทั้งหมด"
                                options={[
                                    { value: '', label: 'PM ทั้งหมด' },
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
                                        : { value: '', label: 'PM ทั้งหมด' }
                                }
                                onChange={(opt) => handleFilterChange('managerId', String(opt?.value || ''))}
                                maxDisplayItems={10}
                            />
                        </div>
                    </div>

                    {/* Employee (Changed from SA to activeEmployees) */}
                    <div className="flex flex-col gap-1 min-w-[175px]">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">พนักงาน</span>
                        <div className="[&_button]:!py-1.5 [&_button]:!px-2.5 [&_button]:!text-xs [&_button]:!rounded-lg [&_button]:bg-slate-50/50 [&_button]:border-slate-200 [&_button]:hover:bg-slate-50">
                            <SmartCombobox
                                placeholder="พนักงานทั้งหมด"
                                options={[
                                    { value: '', label: 'พนักงานทั้งหมด' },
                                    ...activeEmployees.map((o) => ({
                                        value: o.id,
                                        label: `${o.name_th || o.name}${o.position_code ? ` (${o.position_code})` : ''}`,
                                    })),
                                ]}
                                value={
                                    filters.ownerId
                                        ? activeEmployees.find((o) => o.id === filters.ownerId)
                                            ? {
                                                  value: filters.ownerId,
                                                  label: (() => {
                                                      const o = activeEmployees.find((o) => o.id === filters.ownerId)!
                                                      return `${o.name_th || o.name}${o.position_code ? ` (${o.position_code})` : ''}`
                                                  })(),
                                              }
                                            : null
                                        : { value: '', label: 'พนักงานทั้งหมด' }
                                }
                                onChange={(opt) => handleFilterChange('ownerId', String(opt?.value || ''))}
                                maxDisplayItems={10}
                            />
                        </div>
                    </div>

                    {/* Type */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ประเภทงาน</span>
                        <select
                            value={filters.projectTypeId}
                            onChange={(e) => handleFilterChange('projectTypeId', e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs min-w-[95px] bg-slate-50/50 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white transition-all duration-150 outline-none shadow-sm font-medium"
                            title="Type"
                        >
                            <option value="">ทุกประเภท</option>
                            {filterOptions.projectTypes.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.code}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">สถานะโครงการ</span>
                        <select
                            value={filters.statusId}
                            onChange={(e) => handleFilterChange('statusId', e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs min-w-[110px] bg-slate-50/50 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white transition-all duration-150 outline-none shadow-sm font-medium"
                            title="Status"
                        >
                            <option value="">ทุกสถานะ</option>
                            {filterOptions.statuses.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Milestone Multi-select */}
                    <div className="flex flex-col gap-1 relative">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">หมุดหมายหลัก</span>
                        <button
                            type="button"
                            onClick={() => setIsMilestoneDropdownOpen(!isMilestoneDropdownOpen)}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs min-w-[140px] flex items-center justify-between gap-2 bg-slate-50/50 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white transition-all duration-150 outline-none shadow-sm font-medium text-left"
                            title="Milestone"
                        >
                            <span
                                className={
                                    filters.milestoneIds.length > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400 font-normal'
                                }
                            >
                                {filters.milestoneIds.length > 0
                                    ? `เลือกแล้ว ${filters.milestoneIds.length} รายการ`
                                    : 'หมุดหมายทั้งหมด'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>

                        {isMilestoneDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsMilestoneDropdownOpen(false)}
                                />
                                <div className="absolute z-20 top-full left-0 mt-1.5 w-56 bg-white border border-slate-200/80 rounded-xl shadow-lg max-h-60 overflow-y-auto p-1 backdrop-blur-sm">
                                    {filters.milestoneIds.length > 0 && (
                                        <button
                                            onClick={() => handleFilterChange('milestoneIds', [])}
                                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border-b border-slate-100"
                                        >
                                            ล้างทั้งหมด
                                        </button>
                                    )}
                                    {filterOptions.milestones.map((m) => (
                                        <label
                                            key={m.id}
                                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={filters.milestoneIds.includes(m.id)}
                                                onChange={() => toggleMilestone(m.id)}
                                                className="hidden"
                                            />
                                            <div
                                                className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                                    filters.milestoneIds.includes(m.id)
                                                        ? 'bg-indigo-600 border-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.3)]'
                                                        : 'border-slate-300'
                                                }`}
                                            >
                                                {filters.milestoneIds.includes(m.id) && (
                                                    <Check className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                            <span className="text-[11px] font-semibold" style={{ color: m.color || '#475569' }}>
                                                {m.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Search */}
                    <div className="flex flex-col gap-1 relative ml-auto w-56">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ค้นหาโครงการ</span>
                        <div className="relative w-full">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="ค้นหาชื่อ/รหัสโครงการ..."
                                className="w-full pl-8.5 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:border-indigo-500 transition-all shadow-inner outline-none font-medium"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive Legend Bar - Floating premium design */}
            <div className="bg-white/70 backdrop-blur-md border border-slate-200/50 rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[10px] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-2 text-slate-500 font-semibold">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>ชี้เมาส์ที่แถบอธิบายเพื่อไฮไลท์ประเภทงานในตารางบอร์ด:</span>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                    {LEGEND_ITEMS.map((item) => (
                        <div
                            key={item.key}
                            onMouseEnter={() => setHoveredLegend(item.key)}
                            onMouseLeave={() => setHoveredLegend(null)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer transition-all duration-200 border ${
                                hoveredLegend === item.key 
                                ? 'bg-white shadow-[0_4px_12px_rgba(99,102,241,0.15)] border-indigo-400 scale-105 text-indigo-700 font-bold' 
                                : 'bg-white hover:bg-slate-50 hover:shadow-sm border-slate-100 hover:scale-105 text-slate-600 font-medium'
                            }`}
                        >
                            {item.key === 'incoming' ? (
                                <div className="w-2.5 h-2.5 rounded-full flex items-center justify-center bg-amber-100">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                </div>
                            ) : item.key === 'departed' ? (
                                <div className="w-2.5 h-2.5 rounded-full flex items-center justify-center bg-slate-200">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 opacity-60" />
                                </div>
                            ) : (
                                <div 
                                    className="w-2 h-2 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.1)]" 
                                    style={{ 
                                        backgroundColor: item.color,
                                        boxShadow: hoveredLegend === item.key ? `0 0 8px ${item.color}80` : 'none'
                                    }} 
                                />
                            )}
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Grid Container */}
            <div id="tracking-grid-card" className="bg-white rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden p-1.5 bg-gradient-to-b from-slate-50/50 to-white transition-all duration-300">
                <TrackingGrid
                    projects={projects}
                    entries={entries}
                    year={year}
                    month={month}
                    onCellClick={handleCellClick}
                    isLoading={isLoading}
                    highlightFilter={hoveredLegend}
                />
            </div>

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
