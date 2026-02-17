
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Users,
    RefreshCw,
    Calendar,
    AlertTriangle,
    FolderKanban,
    Loader2,
    Search,
    Plus,
    Trash2,
    Pencil,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    X,
    ChevronsUpDown,
    Check,
} from 'lucide-react'
import {
    ResourcePlanningData,
    ResourceProject,
    ResourceMilestone,
    MilestoneResource,
    removeMilestoneResource
} from '@/lib/actions/resource-planning-actions'
import {
    getProjects,
    getProjectById
} from '@/lib/actions/project-actions'
import { ProjectModal } from '@/components/modals/ProjectModal'
import { FilterOptions } from '@/app/(main)/resource-planning/page'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { ResourceSummaryTable } from './ResourceSummaryTable'
import { ConflictAlert } from './ConflictAlert'
import { AddResourceDialog } from './AddResourceDialog'
import { EditResourceDialog } from './EditResourceDialog'
import { TaskDetailDialog } from './TaskDetailDialog'
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isWeekend,
    isSameDay,
} from 'date-fns'
import { th } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ResourcePlanningBoardProps {
    data: ResourcePlanningData
    filterOptions: FilterOptions | null
    onRefresh: () => void
}

const ROLE_CELL_COLORS: Record<string, string> = {
    SA: 'bg-blue-400',
    BA: 'bg-purple-400',
    PG: 'bg-green-400',
}

const ROLE_BADGE_COLORS: Record<string, string> = {
    SA: 'bg-blue-100 text-blue-800',
    BA: 'bg-purple-100 text-purple-800',
    PG: 'bg-green-100 text-green-800',
}

const formatDateShort = (d: string | null) => {
    if (!d) return '-'
    try {
        return format(new Date(d), 'd MMM yy', { locale: th })
    } catch {
        return d
    }
}

export function ResourcePlanningBoard({ data, filterOptions, onRefresh }: ResourcePlanningBoardProps) {
    const [searchText, setSearchText] = useState('')
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [activeTab, setActiveTab] = useState<'projects' | 'summary'>('projects')
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
    const [currentMonth, setCurrentMonth] = useState(new Date())
    // Modals
    const [addDialog, setAddDialog] = useState<{
        open: boolean
        milestoneId: string
        milestoneName: string
        projectCode: string
    }>({ open: false, milestoneId: '', milestoneName: '', projectCode: '' })
    const [taskDetailDialog, setTaskDetailDialog] = useState<{
        open: boolean
        milestoneId: string
        milestoneName: string
        employeeId: string
        employeeName: string
        projectCode: string
        currentMonth: Date
    }>({ open: false, milestoneId: '', milestoneName: '', employeeId: '', employeeName: '', projectCode: '', currentMonth: new Date() })

    // Edit Resource Dialog
    const [editDialog, setEditDialog] = useState<{
        open: boolean
        resource: MilestoneResource | null
        milestoneName: string
        projectCode: string
    }>({ open: false, resource: null, milestoneName: '', projectCode: '' })

    // Edit Project Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<any>(null)

    // Filter state
    const [filterYear, setFilterYear] = useState<number | ''>(new Date().getFullYear())
    const [filterCustomer, setFilterCustomer] = useState<Option | null>(null)
    const [filterManager, setFilterManager] = useState<Option | null>(null)
    const [filterOwner, setFilterOwner] = useState<Option | null>(null)
    const [filterMilestones, setFilterMilestones] = useState<string[]>([])

    // Milestone multi-select combobox state
    const [msComboOpen, setMsComboOpen] = useState(false)
    const [msSearch, setMsSearch] = useState('')
    const msContainerRef = useRef<HTMLDivElement>(null)
    const msSearchInputRef = useRef<HTMLInputElement>(null)

    // Auto-focus search when milestone dropdown opens
    useEffect(() => {
        if (msComboOpen && msSearchInputRef.current) {
            setTimeout(() => msSearchInputRef.current?.focus(), 50)
        }
    }, [msComboOpen])

    // Close milestone dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (msContainerRef.current && !msContainerRef.current.contains(e.target as Node)) {
                setMsComboOpen(false)
                setMsSearch('')
            }
        }
        if (msComboOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [msComboOpen])

    // Generate days for selected month
    const monthDays = useMemo(() => {
        const start = startOfMonth(currentMonth)
        const end = endOfMonth(currentMonth)
        return eachDayOfInterval({ start, end })
    }, [currentMonth])

    const totalColSpan = 7 + monthDays.length + 1 // info cols (name+milestone+due+md+md+action) + day cols

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await onRefresh()
        setIsRefreshing(false)
    }

    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev)
            if (next.has(projectId)) next.delete(projectId)
            else next.add(projectId)
            return next
        })
    }

    const expandAll = () => setExpandedProjects(new Set(filteredProjects.map(p => p.id)))
    const collapseAll = () => setExpandedProjects(new Set())

    const handleRemoveResource = async (resourceId: string, employeeName: string) => {
        if (!confirm(`ต้องการลบ ${employeeName} ออก?`)) return
        const result = await removeMilestoneResource(resourceId)
        if (result.success) {
            toast.success('ลบสำเร็จ')
            onRefresh()
        } else {
            toast.error(result.error || 'เกิดข้อผิดพลาด')
        }
    }

    const openEditResource = (resource: MilestoneResource, milestoneName: string, projectCode: string) => {
        setEditDialog({ open: true, resource, milestoneName, projectCode })
    }

    const openAddDialog = (project: ResourceProject, milestone: ResourceMilestone) => {
        setAddDialog({
            open: true,
            milestoneId: milestone.id,
            milestoneName: milestone.milestone_name,
            projectCode: project.project_code,
        })
    }

    const openTaskDetail = (projectCode: string, milestoneId: string, milestoneName: string, employeeId: string, employeeName: string) => {
        setTaskDetailDialog({
            open: true,
            milestoneId,
            milestoneName,
            employeeId,
            employeeName,
            projectCode,
            currentMonth,
        })
    }

    // Filter projects (client-side)
    const filteredProjects = useMemo(() => {
        return data.projects.filter(p => {
            // Year filter
            if (filterYear && p.project_year !== filterYear) return false
            // Customer filter
            if (filterCustomer && filterCustomer.value && p.customer_id !== filterCustomer.value) return false
            // PM filter
            if (filterManager && filterManager.value && p.project_manager_id !== filterManager.value) return false
            // Owner filter
            if (filterOwner && filterOwner.value && p.owner_id !== filterOwner.value) return false
            // Milestone filter (by current milestone of the project)
            if (filterMilestones.length > 0) {
                if (!p.current_milestone_config_id || !filterMilestones.includes(p.current_milestone_config_id)) return false
            }
            // Text search
            if (searchText) {
                const search = searchText.toLowerCase()
                if (!(
                    p.project_code.toLowerCase().includes(search) ||
                    p.name.toLowerCase().includes(search) ||
                    p.customer_name.toLowerCase().includes(search)
                )) return false
            }
            return true
        })
    }, [data.projects, filterYear, filterCustomer, filterManager, filterOwner, filterMilestones, searchText])

    // Toggle milestone filter
    const toggleMilestoneFilter = (milestoneId: string) => {
        setFilterMilestones(prev =>
            prev.includes(milestoneId)
                ? prev.filter(id => id !== milestoneId)
                : [...prev, milestoneId]
        )
    }

    // Stats (based on filtered projects)
    const totalProjects = filteredProjects.length
    const totalResources = filteredProjects.reduce(
        (sum, p) => sum + p.milestones.reduce((ms, m) => ms + m.resources.length, 0), 0
    )
    const totalConflicts = data.conflicts.length
    const totalEmployees = data.allocations.length

    // Check if a date falls in resource range
    const isDateInRange = (day: Date, startDate: string, endDate: string) => {
        const s = new Date(startDate)
        const e = new Date(endDate)
        s.setHours(0, 0, 0, 0)
        e.setHours(0, 0, 0, 0)
        const d = new Date(day)
        d.setHours(0, 0, 0, 0)
        return d >= s && d <= e
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-blue-600" />
                    <div>
                        <h1 className="text-lg font-bold">Resource Planning Board</h1>
                        <p className="text-xs text-muted-foreground">
                            วางแผนพนักงาน (SA, BA, PG) เข้า Milestone ของโครงการ DEV
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                    {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    รีเฟรช
                </Button>
            </div>

            {/* Filter Bar */}
            {filterOptions && (
                <Card>
                    <CardContent className="py-3 px-4">
                        <div className="grid grid-cols-5 gap-3">
                            {/* Fiscal Year */}
                            <div>
                                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Fiscal Year</label>
                                <select
                                    className="w-full h-9 px-2 text-sm border rounded-md bg-white"
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : '')}
                                >
                                    <option value="">ทุกปี</option>
                                    {filterOptions.years.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Customer */}
                            <div>
                                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Customer</label>
                                <SmartCombobox
                                    options={[
                                        { value: '', label: 'All Customers' },
                                        ...filterOptions.customers.map(c => ({ value: c.id, label: c.name }))
                                    ]}
                                    value={filterCustomer || { value: '', label: 'All Customers' }}
                                    onChange={(opt) => setFilterCustomer(opt?.value === '' ? null : opt)}
                                    placeholder="All Customers"
                                    maxDisplayItems={10}
                                />
                            </div>

                            {/* Project Manager */}
                            <div>
                                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Project Manager</label>
                                <SmartCombobox
                                    options={[
                                        { value: '', label: 'All PMs' },
                                        ...filterOptions.managers.map(m => ({ value: m.id, label: m.name_th || m.name }))
                                    ]}
                                    value={filterManager || { value: '', label: 'All PMs' }}
                                    onChange={(opt) => setFilterManager(opt?.value === '' ? null : opt)}
                                    placeholder="All PMs"
                                    maxDisplayItems={10}
                                />
                            </div>

                            {/* Owner */}
                            <div>
                                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Owner</label>
                                <SmartCombobox
                                    options={[
                                        { value: '', label: 'All Owners' },
                                        ...filterOptions.owners.map(o => ({ value: o.id, label: o.name_th || o.name }))
                                    ]}
                                    value={filterOwner || { value: '', label: 'All Owners' }}
                                    onChange={(opt) => setFilterOwner(opt?.value === '' ? null : opt)}
                                    placeholder="All Owners"
                                    maxDisplayItems={10}
                                />
                            </div>

                            {/* Milestone - Multi-select Combobox */}
                            <div>
                                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Milestone</label>
                                <div className="relative" ref={msContainerRef}>
                                    <button
                                        type="button"
                                        className={cn(
                                            "w-full h-9 px-3 text-left border rounded-md bg-white text-gray-900",
                                            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                            "cursor-pointer hover:border-input",
                                            msComboOpen && "ring-2 ring-ring ring-offset-2"
                                        )}
                                        onClick={() => {
                                            setMsComboOpen(!msComboOpen)
                                            if (!msComboOpen) setMsSearch('')
                                        }}
                                    >
                                        <span className={cn(
                                            "block truncate text-sm pr-6",
                                            filterMilestones.length === 0 && "text-gray-400"
                                        )}>
                                            {filterMilestones.length === 0
                                                ? 'ทุก Milestone'
                                                : `${filterMilestones.length} Milestone`
                                            }
                                        </span>
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                            {filterMilestones.length > 0 ? (
                                                <span
                                                    className="pointer-events-auto cursor-pointer hover:text-red-500"
                                                    onClick={(e) => { e.stopPropagation(); setFilterMilestones([]) }}
                                                >
                                                    <X className="h-4 w-4 text-muted-foreground" />
                                                </span>
                                            ) : (
                                                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </span>
                                    </button>

                                    {/* Selected badges */}
                                    {filterMilestones.length > 0 && !msComboOpen && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {filterMilestones.map(msId => {
                                                const ms = filterOptions.milestones.find(m => m.id === msId)
                                                if (!ms) return null
                                                return (
                                                    <span
                                                        key={msId}
                                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-white cursor-pointer"
                                                        style={{ backgroundColor: ms.color || '#6B7280' }}
                                                        onClick={() => toggleMilestoneFilter(msId)}
                                                    >
                                                        {ms.name}
                                                        <X className="h-2.5 w-2.5" />
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Dropdown panel */}
                                    {msComboOpen && (
                                        <div className="absolute z-50 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black/5 border border-slate-200">
                                            {/* Search */}
                                            <div className="p-2 border-b">
                                                <input
                                                    ref={msSearchInputRef}
                                                    type="text"
                                                    className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                                    placeholder="ค้นหา Milestone..."
                                                    value={msSearch}
                                                    onChange={(e) => setMsSearch(e.target.value)}
                                                />
                                            </div>

                                            {/* Options */}
                                            <div className="max-h-60 overflow-auto py-1">
                                                {filterOptions.milestones
                                                    .filter(ms => !msSearch || ms.name.toLowerCase().includes(msSearch.toLowerCase()))
                                                    .map(ms => {
                                                        const isSelected = filterMilestones.includes(ms.id)
                                                        return (
                                                            <button
                                                                key={ms.id}
                                                                type="button"
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2 text-sm cursor-pointer",
                                                                    "hover:bg-accent hover:text-accent-foreground",
                                                                    "flex items-center gap-2",
                                                                    isSelected && "bg-accent/50"
                                                                )}
                                                                onClick={() => toggleMilestoneFilter(ms.id)}
                                                            >
                                                                <div className="w-4 flex-shrink-0">
                                                                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                                                                </div>
                                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ms.color || '#6B7280' }} />
                                                                <span className={cn("flex-1", isSelected && "font-medium")}>{ms.name}</span>
                                                            </button>
                                                        )
                                                    })}
                                            </div>

                                            {/* Footer */}
                                            {filterMilestones.length > 0 && (
                                                <div className="border-t px-3 py-2">
                                                    <button
                                                        type="button"
                                                        className="text-xs text-muted-foreground hover:text-red-500"
                                                        onClick={() => { setFilterMilestones([]); setMsComboOpen(false) }}
                                                    >
                                                        ล้างทั้งหมด
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
                <Card>
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2"><FolderKanban className="h-5 w-5 text-blue-600" /></div>
                        <div>
                            <div className="text-2xl font-bold">{totalProjects}</div>
                            <div className="text-xs text-muted-foreground">โครงการ DEV</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                        <div className="rounded-lg bg-green-50 p-2"><Users className="h-5 w-5 text-green-600" /></div>
                        <div>
                            <div className="text-2xl font-bold">{totalEmployees}</div>
                            <div className="text-xs text-muted-foreground">พนักงานที่ถูกจัดสรร</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                        <div className="rounded-lg bg-orange-50 p-2"><Calendar className="h-5 w-5 text-orange-600" /></div>
                        <div>
                            <div className="text-2xl font-bold">{totalResources}</div>
                            <div className="text-xs text-muted-foreground">การจัดสรรทั้งหมด</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${totalConflicts > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <AlertTriangle className={`h-5 w-5 ${totalConflicts > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <div className={`text-2xl font-bold ${totalConflicts > 0 ? 'text-red-600' : ''}`}>{totalConflicts}</div>
                            <div className="text-xs text-muted-foreground">Conflicts</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Conflict Alert */}
            <ConflictAlert conflicts={data.conflicts} />

            {/* Tab Switcher */}
            <div className="flex items-center gap-2 border-b pb-2">
                <Button variant={activeTab === 'projects' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('projects')}>
                    <FolderKanban className="h-4 w-4 mr-1" />
                    โครงการ ({filteredProjects.length})
                </Button>
                <Button variant={activeTab === 'summary' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('summary')}>
                    <Users className="h-4 w-4 mr-1" />
                    สรุปทรัพยากร ({totalEmployees})
                </Button>
            </div>

            {/* Projects Tab */}
            {activeTab === 'projects' && (
                <div className="space-y-3">
                    {/* Toolbar: search + month picker + expand/collapse */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="ค้นหาโครงการ..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9" />
                        </div>

                        {/* Month Picker */}
                        <div className="flex items-center gap-1 border rounded-lg px-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium px-2 min-w-[120px] text-center">
                                {format(currentMonth, 'MMMM yyyy', { locale: th })}
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs">
                            วันนี้
                        </Button>

                        <div className="flex items-center gap-1 ml-auto">
                            <Button variant="ghost" size="sm" onClick={expandAll}>ขยายทั้งหมด</Button>
                            <Button variant="ghost" size="sm" onClick={collapseAll}>ย่อทั้งหมด</Button>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs flex-wrap">
                        <span className="text-muted-foreground">Role:</span>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-400" /> SA</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-purple-400" /> BA</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-400" /> PG</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-gray-200" /> วันหยุด</div>
                        <span className="text-muted-foreground ml-2">ประเภท:</span>
                        <div className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-800 border border-amber-300">PM</span> PM วางแผน</div>
                        <div className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">PLAN</span> วางแผนจริง</div>
                    </div>

                    {/* Project Table with Timeline */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-auto max-h-[calc(100vh-320px)]">
                                <table className="w-full text-sm border-collapse" style={{ minWidth: `${380 + monthDays.length * 26}px` }}>
                                    <thead>
                                        {/* Month day numbers */}
                                        <tr className="border-b bg-muted/50 sticky top-0 z-30">
                                            <th className="text-left py-2 px-2 font-medium sticky left-0 bg-muted/50 z-40 min-w-[150px]">
                                                โครงการ / Milestone / พนักงาน
                                            </th>
                                            <th className="text-left py-2 px-1 font-medium min-w-[80px] bg-muted/50 text-[11px]">Milestone</th>
                                            <th className="text-center py-2 px-1 font-medium min-w-[65px] bg-muted/50 text-[11px]">Due</th>
                                            <th className="text-center py-2 px-1 font-medium min-w-[40px] bg-muted/50 text-[11px]">Budget</th>
                                            <th className="text-center py-2 px-1 font-medium min-w-[40px] bg-muted/50 text-[11px]" title="MD = Mandays (actual hours / 8)">MD</th>
                                            <th className="text-center py-2 px-0 font-medium min-w-[24px] bg-muted/50"></th>
                                            {monthDays.map((day, i) => {
                                                const weekend = isWeekend(day)
                                                const isToday = isSameDay(day, new Date())
                                                return (
                                                    <th
                                                        key={i}
                                                        className={`text-center py-1 px-0 font-normal min-w-[26px] w-[26px] ${weekend ? 'bg-gray-200' : 'bg-muted/50'} ${isToday ? 'bg-yellow-200' : ''}`}
                                                    >
                                                        <div className="text-[10px] leading-tight">{format(day, 'd')}</div>
                                                        <div className="text-[8px] leading-tight text-muted-foreground">{format(day, 'EEE', { locale: th })}</div>
                                                    </th>
                                                )
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProjects.length === 0 ? (
                                            <tr>
                                                <td colSpan={totalColSpan} className="py-8 text-center text-muted-foreground">
                                                    {searchText ? 'ไม่พบโครงการที่ค้นหา' : 'ไม่มีโครงการ DEV ที่ active'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredProjects.map((project) => {
                                                const isExpanded = expandedProjects.has(project.id)
                                                const resourceCount = project.milestones.reduce((s, m) => s + m.resources.length, 0)
                                                return (
                                                    <ProjectTimelineRows
                                                        key={project.id}
                                                        project={project}
                                                        isExpanded={expandedProjects.has(project.id)}
                                                        resourceCount={resourceCount}
                                                        monthDays={monthDays}
                                                        onToggle={() => toggleProject(project.id)}
                                                        onAddResource={(ms) => openAddDialog(project, ms)}
                                                        onRemoveResource={handleRemoveResource}
                                                        onViewTaskDetail={(msId, msName, empId, empName) => {
                                                            setTaskDetailDialog({
                                                                open: true,
                                                                milestoneId: msId,
                                                                milestoneName: msName,
                                                                employeeId: empId,
                                                                employeeName: empName,
                                                                projectCode: project.project_code,
                                                                currentMonth,
                                                            })
                                                        }}
                                                        isDateInRange={isDateInRange}
                                                        onEditResource={(resource, msName) => openEditResource(resource, msName, project.project_code)}
                                                        onEditProject={async (projectId) => {
                                                            const res = await getProjectById(projectId)
                                                            if (res.success && res.data) {
                                                                setSelectedProject(res.data)
                                                                setIsEditModalOpen(true)
                                                            } else {
                                                                alert('Failed to load project details')
                                                            }
                                                        }}
                                                    />
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === 'summary' && (
                <ResourceSummaryTable allocations={data.allocations} />
            )}

            <AddResourceDialog
                open={addDialog.open}
                onOpenChange={(open) => setAddDialog(prev => ({ ...prev, open }))}
                milestoneId={addDialog.milestoneId}
                milestoneName={addDialog.milestoneName}
                projectCode={addDialog.projectCode}
                employees={data.employees}
                onSuccess={onRefresh}
            />

            <TaskDetailDialog
                open={taskDetailDialog.open}
                onOpenChange={(open) => setTaskDetailDialog(prev => ({ ...prev, open }))}
                milestoneId={taskDetailDialog.milestoneId}
                milestoneName={taskDetailDialog.milestoneName}
                employeeId={taskDetailDialog.employeeId}
                employeeName={taskDetailDialog.employeeName}
                projectCode={taskDetailDialog.projectCode}
                currentMonth={taskDetailDialog.currentMonth}
            />

            <EditResourceDialog
                open={editDialog.open}
                onOpenChange={(open) => setEditDialog(prev => ({ ...prev, open }))}
                resource={editDialog.resource}
                milestoneName={editDialog.milestoneName}
                projectCode={editDialog.projectCode}
                onSuccess={onRefresh}
            />

            {selectedProject && (
                <ProjectModal
                    open={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    mode="edit"
                    project={selectedProject}
                    onSuccess={() => {
                        setIsEditModalOpen(false)
                        onRefresh()
                    }}
                />
            )}
        </div>
    )
}

// ============================================
// Project Timeline Rows
// ============================================
function ProjectTimelineRows({
    project,
    isExpanded,
    resourceCount,
    monthDays,
    onToggle,
    onAddResource,
    onRemoveResource,
    onViewTaskDetail,
    onEditResource,
    isDateInRange,
    onEditProject,
}: {
    project: ResourceProject
    isExpanded: boolean
    resourceCount: number
    monthDays: Date[]
    onToggle: () => void
    onAddResource: (ms: ResourceMilestone) => void
    onRemoveResource: (resourceId: string, name: string) => void
    onViewTaskDetail: (milestoneId: string, milestoneName: string, employeeId: string, employeeName: string) => void
    onEditResource: (resource: MilestoneResource, milestoneName: string) => void
    isDateInRange: (day: Date, start: string, end: string) => boolean
    onEditProject: (id: string) => void
}) {
    // Calculate total MD across all milestones/resources
    const totalMD = Math.round(project.milestones.reduce(
        (sum, ms) => sum + ms.resources.reduce((s, r) => s + r.working_days, 0), 0
    ) * 100) / 100

    // Calculate monthly MD across all milestones/resources
    const projectMonthMD = Math.round(project.milestones.reduce(
        (sum, ms) => sum + ms.resources.reduce((s, r) => s + calculateMonthlyMD(r, monthDays), 0), 0
    ) * 100) / 100

    const router = useRouter()

    // Find the current milestone
    const currentMilestone = project.current_milestone_config_id
        ? project.milestones.find(ms => ms.milestone_config_id === project.current_milestone_config_id)
        : null

    const handleProjectClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (project.id) {
            onEditProject(project.id)
        } else {
            console.error('Project ID missing:', project)
            alert('ไม่พบรหัสโครงการ (Project ID missing)')
        }
    }

    return (
        <>
            {/* Project row */}
            <tr className="border-b hover:bg-muted/30 cursor-pointer font-medium" onClick={() => {
                console.log('Row clicked, toggling', project.id, project.project_code);
                onToggle();
            }}>
                <td className="py-2 px-2 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span
                            onClick={handleProjectClick}
                            className="font-semibold text-xs hover:underline text-blue-700 cursor-pointer shrink-0"
                        >
                            {project.project_code}
                        </span>
                        <span
                            onClick={handleProjectClick}
                            className="text-xs text-muted-foreground truncate hover:underline hover:text-blue-700 cursor-pointer"
                        >
                            {project.name}
                        </span>
                    </div>
                </td>
                <td className="py-2 px-1">
                    {currentMilestone && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: currentMilestone.milestone_color || '#6B7280' }} />
                            <span className="text-[11px] font-medium text-slate-700 whitespace-nowrap">{currentMilestone.milestone_name}</span>
                        </div>
                    )}
                </td>
                <td className="py-2 px-1 text-center">
                    {currentMilestone?.due_date && (
                        <span className="text-[11px] text-slate-600 whitespace-nowrap">{formatDateShort(currentMilestone.due_date)}</span>
                    )}
                </td>
                <td className="py-2 px-1 text-center text-[10px] font-semibold">
                    {project.sold_mandays > 0 ? project.sold_mandays : '-'}
                </td>
                <td className="py-2 px-1 text-center text-[10px]">
                    {projectMonthMD > 0 ? (
                        <span className="font-semibold" title={`เดือนนี้: ${projectMonthMD} / ทั้งหมด: ${totalMD}`}>
                            <span className="text-blue-600">{projectMonthMD}</span>
                            <span className="text-muted-foreground">/</span>
                            {totalMD}
                        </span>
                    ) : totalMD > 0 ? (
                        <span className="font-semibold">{totalMD}</span>
                    ) : (
                        <span className="text-muted-foreground">0</span>
                    )}
                </td>
                <td className="py-2 px-1"></td>
                {monthDays.map((day, i) => {
                    const weekend = isWeekend(day)
                    const today = isSameDay(day, new Date())
                    // Find milestones with due dates on this day
                    const dueMilestones = project.milestones.filter(
                        ms => ms.due_date && isSameDay(day, new Date(ms.due_date))
                    )
                    return (
                        <td key={i} className={`py-1 px-0 ${weekend ? 'bg-gray-50' : ''} ${today ? 'bg-yellow-50' : ''}`}>
                            {dueMilestones.length > 0 && (
                                <div className="flex flex-col items-center gap-0.5">
                                    {dueMilestones.map(ms => (
                                        <div
                                            key={ms.id}
                                            className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                                            style={{ borderColor: ms.milestone_color || '#6B7280' }}
                                            title={`${ms.milestone_name} Due`}
                                        >
                                            <div className="text-[6px] font-bold" style={{ color: ms.milestone_color || '#6B7280' }}>D</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </td>
                    )
                })}
            </tr>

            {/* Milestone + resource rows */}
            {isExpanded && project.milestones.map((ms) => (
                <MilestoneTimelineRows
                    key={ms.id}
                    milestone={ms}
                    monthDays={monthDays}
                    onAddResource={() => onAddResource(ms)}
                    onRemoveResource={onRemoveResource}
                    onViewTaskDetail={onViewTaskDetail}
                    onEditResource={onEditResource}
                    isDateInRange={isDateInRange}
                />
            ))}

            {isExpanded && project.milestones.length === 0 && (
                <tr className="border-b bg-muted/10">
                    <td colSpan={6 + monthDays.length} className="py-3 text-xs text-muted-foreground text-center">
                        ไม่มี Milestone
                    </td>
                </tr>
            )}
        </>
    )
}

// ============================================
// Milestone Timeline Rows
// ============================================
function MilestoneTimelineRows({
    milestone,
    monthDays,
    onAddResource,
    onRemoveResource,
    onViewTaskDetail,
    onEditResource,
    isDateInRange,
}: {
    milestone: ResourceMilestone
    monthDays: Date[]
    onAddResource: () => void
    onRemoveResource: (resourceId: string, name: string) => void
    onViewTaskDetail: (milestoneId: string, milestoneName: string, employeeId: string, employeeName: string) => void
    onEditResource: (resource: MilestoneResource, milestoneName: string) => void
    isDateInRange: (day: Date, start: string, end: string) => boolean
}) {
    // Check if milestone due_date falls in this month
    const dueDateInMonth = milestone.due_date
        ? monthDays.some(d => isSameDay(d, new Date(milestone.due_date!)))
        : false

    // Calculate milestone-level totals: MD (from hours) for PLAN, days for PM
    const msTotalMD = Math.round(milestone.resources.reduce((s, r) => s + r.working_days, 0) * 100) / 100
    const msMonthMD = Math.round(milestone.resources.reduce((s, r) => s + calculateMonthlyMD(r, monthDays), 0) * 100) / 100

    return (
        <>
            {/* Milestone header */}
            <tr className="border-b bg-muted/20">
                <td className="py-1.5 px-2 sticky left-0 bg-muted/20 z-10">
                    <div className="flex items-center gap-2 pl-5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: milestone.milestone_color || '#6B7280' }} />
                        <span className="text-[11px] font-medium">{milestone.milestone_name}</span>
                    </div>
                </td>
                <td className="py-1.5 px-1 bg-muted/20"></td>
                <td className="py-1.5 px-1 text-center bg-muted/20">
                    {milestone.due_date && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDateShort(milestone.due_date)}</span>
                    )}
                </td>
                <td className="py-1.5 px-1 text-center text-[10px] text-muted-foreground">{milestone.planned_mandays > 0 ? milestone.planned_mandays : '-'}</td>
                <td className="py-1.5 px-1 text-center text-[10px]">
                    {msMonthMD > 0 ? (
                        <span className="font-medium" title={`เดือนนี้: ${msMonthMD} MD / ทั้งหมด: ${msTotalMD} MD`}>
                            <span className="text-blue-600">{msMonthMD}</span>
                            <span className="text-muted-foreground mx-0.5">/</span>
                            {msTotalMD}
                            <span className="text-[8px] text-muted-foreground ml-0.5">MD</span>
                        </span>
                    ) : msTotalMD > 0 && (
                        <span className="font-medium" title={`รวม ${msTotalMD} MD`}>
                            {msTotalMD}<span className="text-[8px] text-muted-foreground ml-0.5">MD</span>
                        </span>
                    )}
                </td>
                <td className="py-1.5 px-1 text-center">
                    <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onAddResource() }} className="text-[10px] text-blue-600 hover:text-blue-800 h-5 px-1">
                        <Plus className="h-3 w-3" />
                    </Button>
                </td>
                {monthDays.map((day, i) => {
                    const isDue = milestone.due_date && isSameDay(day, new Date(milestone.due_date))
                    return (
                        <td key={i} className={`py-1.5 px-0 ${isWeekend(day) ? 'bg-gray-50' : ''} ${isSameDay(day, new Date()) ? 'bg-yellow-50' : ''}`}>
                            {isDue && (
                                <div className="w-5 h-5 mx-auto rounded-full border-2 flex items-center justify-center" style={{ borderColor: milestone.milestone_color || '#6B7280' }}>
                                    <div className="text-[7px] font-bold" style={{ color: milestone.milestone_color || '#6B7280' }}>D</div>
                                </div>
                            )}
                        </td>
                    )
                })}
            </tr>

            {/* Resource rows with timeline cells */}
            {milestone.resources.map((r) => {
                const isPlan = r.source_type === 'PLAN'
                const cellColor = ROLE_CELL_COLORS[r.role] || 'bg-gray-400'
                const sourceClass = isPlan
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'

                // For PLAN with date_ranges, check if day falls in ANY range
                const isDayInResource = (day: Date) => {
                    if (isPlan && r.date_ranges && r.date_ranges.length > 0) {
                        return r.date_ranges.some(range => isDateInRange(day, range.start_date, range.end_date))
                    }
                    return isDateInRange(day, r.start_date, r.end_date)
                }

                // Calculate resource MD for this month
                const resourceMonthMD = Math.round(calculateMonthlyMD(r, monthDays) * 100) / 100

                // Calculate month-filtered task count
                const monthStart = monthDays[0]
                const monthEnd = monthDays[monthDays.length - 1]
                const monthTaskCount = isPlan && r.date_ranges && r.date_ranges.length > 0
                    ? r.date_ranges.filter(range => {
                        const rs = new Date(range.start_date); rs.setHours(0, 0, 0, 0)
                        const re = new Date(range.end_date); re.setHours(0, 0, 0, 0)
                        const ms = new Date(monthStart); ms.setHours(0, 0, 0, 0)
                        const me = new Date(monthEnd); me.setHours(0, 0, 0, 0)
                        return rs <= me && re >= ms
                    }).length
                    : 0
                const totalTaskCount = isPlan && r.date_ranges ? r.date_ranges.length : 0

                const handleRowClick = () => {
                    if (isPlan) {
                        onViewTaskDetail(milestone.id, milestone.milestone_name, r.employee_id, r.employee_name)
                    } else {
                        onEditResource(r, milestone.milestone_name)
                    }
                }

                return (
                    <tr
                        key={`${r.source_type}-${r.id}`}
                        className={`border-b cursor-pointer ${isPlan ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'hover:bg-blue-50/40'}`}
                        onClick={handleRowClick}
                        title={isPlan ? 'คลิกเพื่อดูรายละเอียด Task' : 'คลิกเพื่อแก้ไข'}
                    >
                        <td className={`py-1 px-2 sticky left-0 z-10 ${isPlan ? 'bg-emerald-50/30' : 'bg-white'}`}>
                            <div className="flex items-center gap-1.5 pl-8">
                                <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${sourceClass}`}>
                                    {r.source_type}
                                </span>
                                <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${ROLE_BADGE_COLORS[r.role] || 'bg-gray-100 text-gray-800'}`}>
                                    {r.role}
                                </span>
                                <span className="text-[11px] truncate max-w-[120px]">
                                    {r.employee_name}{r.employee_nickname ? ` (${r.employee_nickname})` : ''}
                                </span>
                                {isPlan && totalTaskCount > 0 && (
                                    <span className="text-[9px] text-emerald-600 inline-flex items-center">
                                        ({monthTaskCount}/{totalTaskCount} tasks)
                                    </span>
                                )}
                                {!isPlan && r.notes && (
                                    <span className="text-[9px] text-muted-foreground truncate max-w-[80px]" title={r.notes}>
                                        - {r.notes}
                                    </span>
                                )}
                            </div>
                        </td>
                        <td className="py-1 px-1"></td>
                        <td className="py-1 px-1 text-center text-[10px] text-muted-foreground whitespace-nowrap">
                            {!isPlan && r.start_date && r.end_date && (
                                <span>{formatDateShort(r.start_date)} - {formatDateShort(r.end_date)}</span>
                            )}
                        </td>
                        <td className="py-1 px-1"></td>
                        <td className="py-1 px-1 text-center text-[10px] font-semibold">
                            {resourceMonthMD > 0 ? (
                                <span title={`เดือนนี้: ${resourceMonthMD} MD / ทั้งหมด: ${r.working_days} MD`}>
                                    <span className="text-blue-600">{resourceMonthMD}</span>
                                    <span className="text-muted-foreground mx-0.5">/</span>
                                    {r.working_days}
                                    <span className="text-[8px] text-muted-foreground ml-0.5">MD</span>
                                </span>
                            ) : (
                                <span>{r.working_days} <span className="text-[8px] text-muted-foreground">MD</span></span>
                            )}
                        </td>
                        <td className="py-2 px-1 text-center">
                            <div className="flex items-center gap-0.5 justify-center">
                                {!isPlan && (
                                    <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onEditResource(r, milestone.milestone_name) }} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-6 w-6 p-0">
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                )}
                                {!isPlan && (
                                    <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onRemoveResource(r.id, r.employee_name) }} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0">
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </td>
                        {monthDays.map((day, i) => {
                            const inRange = isDayInResource(day)
                            const weekend = isWeekend(day)
                            return (
                                <td key={i} className={`py-2 px-0 text-center ${weekend ? 'bg-gray-50' : ''} ${isSameDay(day, new Date()) ? 'bg-yellow-50' : ''}`}>
                                    {inRange && !weekend && (
                                        <div className={`w-full h-4 mx-auto ${cellColor} ${isPlan ? 'opacity-80' : ''}`} title={`${r.employee_name} (${r.role})`} />
                                    )}
                                </td>
                            )
                        })}
                    </tr>
                )
            })}
        </>
    )
}

function calculateMonthlyMD(resource: ResourceMilestone['resources'][number], monthDays: Date[]): number {
    // If ranges exist, use them. Else use start/end.
    const ranges = resource.date_ranges && resource.date_ranges.length > 0
        ? resource.date_ranges
        : [{ start_date: resource.start_date, end_date: resource.end_date }]

    let totalBusinessDays = 0

    // Calculate total business days across all ranges
    for (const range of ranges) {
        const start = new Date(range.start_date)
        const end = new Date(range.end_date)
        start.setHours(0, 0, 0, 0)
        end.setHours(0, 0, 0, 0)

        let iter = new Date(start)
        while (iter <= end) {
            if (!isWeekend(iter)) totalBusinessDays++
            iter.setDate(iter.getDate() + 1)
        }
    }

    if (totalBusinessDays === 0) return 0

    // Calculate month business days
    const monthStart = monthDays[0]
    const monthEnd = monthDays[monthDays.length - 1]

    let monthBusinessDays = 0
    for (const range of ranges) {
        const start = new Date(range.start_date)
        const end = new Date(range.end_date)
        start.setHours(0, 0, 0, 0)
        end.setHours(0, 0, 0, 0)

        const overlapStart = start > monthStart ? start : monthStart
        const overlapEnd = end < monthEnd ? end : monthEnd

        if (overlapStart <= overlapEnd) {
            let curr = new Date(overlapStart)
            while (curr <= overlapEnd) {
                if (!isWeekend(curr)) monthBusinessDays++
                curr.setDate(curr.getDate() + 1)
            }
        }
    }

    return (monthBusinessDays / totalBusinessDays) * resource.working_days
}
