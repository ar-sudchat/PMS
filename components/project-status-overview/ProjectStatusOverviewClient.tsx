'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import { StatusOverviewData, StatusProject, StatusFilterOptions, StatusOverviewFilters, getProjectStatusOverview } from '@/lib/actions/project-status-overview-actions'
import { ProjectModal } from '@/components/modals/ProjectModal'
import { getProjectById } from '@/lib/actions/project-actions'

function getThaiMonthShort(m: number) {
    const MONTHS = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    return MONTHS[m] || ''
}

// Milestone color map
const MS_COLORS: Record<string, { c: string; b: string }> = {
    'Finish':       { c: '#16a34a', b: '#f0fdf4' },
    'System Test':  { c: '#d97706', b: '#fffbeb' },
    'UAT':          { c: '#7c3aed', b: '#f5f3ff' },
    'Mapping Data': { c: '#2563eb', b: '#eff6ff' },
    'Go-Live':      { c: '#0891b2', b: '#ecfeff' },
    'Wait':         { c: '#64748b', b: '#f8fafc' },
}

function getMsStyle(label: string, dbColor: string) {
    const preset = MS_COLORS[label]
    if (preset) return preset
    return { c: dbColor || '#64748b', b: `${dbColor}15` || '#f8fafc' }
}

const THAI_M = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function fmtDate(d: string | null): string {
    if (!d) return '—'
    const dt = new Date(d)
    return `${dt.getDate()} ${THAI_M[dt.getMonth() + 1]}`
}

const MS_DISPLAY_ORDER: string[] = ['Mapping Data', 'System Test', 'UAT', 'Go-Live', 'Wait', 'Finish']

// ============================================
// Month Project Table
// ============================================
function MonthProjectTable({ title, projects, isFocus, onProjectClick }: { title: string; projects: StatusProject[]; isFocus: boolean; onProjectClick?: (p: StatusProject) => void }) {
    if (!projects.length) return null
    return (
        <div style={{
            background: '#fff', borderRadius: 10,
            border: isFocus ? '2px solid #3b82f6' : '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: isFocus ? '0 2px 8px rgba(59,130,246,0.08)' : 'none',
        }}>
            <div style={{
                padding: '8px 14px', fontSize: 13, fontWeight: 700,
                color: isFocus ? '#1d4ed8' : '#334155',
                background: isFocus ? '#eff6ff' : '#fafbfc',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span>
                    {isFocus && <span style={{ background: '#3b82f6', color: '#fff', padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700, marginRight: 6 }}>FOCUS</span>}
                    {title}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{projects.length} รายการ</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#fafbfc' }}>
                        {['#', 'โปรเจกต์', 'สถานะปัจจุบัน', 'Mapping', 'System Test', 'UAT', 'GO-LIVE'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '6px 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {projects.map((p, i) => {
                        const style = getMsStyle(p.current_milestone_label, p.current_milestone_color)
                        return (
                            <tr key={p.project_id + '-' + i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                <td style={{ padding: '7px 8px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textAlign: 'center', width: 28 }}>{i + 1}</td>
                                <td style={{ padding: '7px 12px', fontSize: 12, fontWeight: 500, color: '#1e293b', maxWidth: 350, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <span
                                        onClick={() => onProjectClick?.(p)}
                                        style={{ cursor: onProjectClick ? 'pointer' : 'default' }}
                                        onMouseEnter={e => onProjectClick && (e.currentTarget.style.textDecoration = 'underline')}
                                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                    >
                                        {p.project_name}
                                    </span>
                                    <span style={{ color: '#b0b8c4', fontSize: 10, marginLeft: 4 }}>#{p.project_code}</span>
                                </td>
                                <td style={{ padding: '7px 8px' }}>
                                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: style.b, color: style.c }}>{p.current_milestone_label}</span>
                                </td>
                                <td style={{ padding: '7px 8px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(p.mapping_due_date)}</td>
                                <td style={{ padding: '7px 8px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(p.systemtest_due_date)}</td>
                                <td style={{ padding: '7px 8px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(p.uat_due_date)}</td>
                                <td style={{ padding: '7px 8px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(p.golive_due_date)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

// ============================================
// Main Component
// ============================================
interface Props {
    initialData: StatusOverviewData
    filterOptions: StatusFilterOptions | null
    currentYear: number
}

export function ProjectStatusOverviewClient({ initialData, filterOptions, currentYear }: Props) {
    const [data, setData] = useState(initialData)
    const [focusMonth, setFocusMonth] = useState(initialData.focus_month)
    const [isLoading, setIsLoading] = useState(false)
    const [isMilestoneDropdownOpen, setIsMilestoneDropdownOpen] = useState(false)
    const [editModal, setEditModal] = useState<{ open: boolean; project: any | null }>({ open: false, project: null })
    const [customerPopup, setCustomerPopup] = useState<{ open: boolean; name: string } | null>(null)

    const handleProjectClick = async (p: StatusProject) => {
        try {
            const res = await getProjectById(p.project_id)
            if (res.success && res.data) {
                setEditModal({ open: true, project: res.data })
            }
        } catch (e) {
            console.error('Failed to load project', e)
        }
    }

    const handleModalClose = () => {
        setEditModal({ open: false, project: null })
    }

    const handleModalSuccess = async () => {
        setEditModal({ open: false, project: null })
        // Reload data
        setIsLoading(true)
        try {
            const result = await getProjectStatusOverview({
                year: filters.year || undefined,
                customerId: filters.customerId || undefined,
                managerId: filters.managerId || undefined,
                ownerId: filters.ownerId || undefined,
                statusId: filters.statusId || undefined,
                projectTypeId: filters.projectTypeId || undefined,
                milestoneIds: filters.milestoneIds.length > 0 ? filters.milestoneIds : undefined,
                search: filters.search || undefined,
            })
            setData(result)
        } finally {
            setIsLoading(false)
        }
    }

    const fo = filterOptions || { customers: [], managers: [], owners: [], years: [], statuses: [], milestones: [], projectTypes: [] }

    // Find default "Active" status and "DEV" project type
    const activeStatusId = fo.statuses.find(s => s.code?.toLowerCase() === 'active')?.id || ''
    const devProjectTypeId = fo.projectTypes.find(t => t.code?.toUpperCase() === 'DEV')?.id || ''

    const [filters, setFilters] = useState({
        year: currentYear,
        customerId: '',
        managerId: '',
        ownerId: '',
        statusId: activeStatusId,
        projectTypeId: devProjectTypeId,
        milestoneIds: [] as string[],
        search: '',
    })

    const { projects, summary } = data

    // Reload data when filters change
    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const result = await getProjectStatusOverview({
                    year: filters.year || undefined,
                    customerId: filters.customerId || undefined,
                    managerId: filters.managerId || undefined,
                    ownerId: filters.ownerId || undefined,
                    statusId: filters.statusId || undefined,
                    projectTypeId: filters.projectTypeId || undefined,
                    milestoneIds: filters.milestoneIds.length > 0 ? filters.milestoneIds : undefined,
                    search: filters.search || undefined,
                })
                setData(result)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [filters])

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const toggleMilestone = (id: string) => {
        setFilters(prev => ({
            ...prev,
            milestoneIds: prev.milestoneIds.includes(id)
                ? prev.milestoneIds.filter(x => x !== id)
                : [...prev.milestoneIds, id]
        }))
    }

    // Helper: get months for table grouping (based on milestone-relevant date)
    const getProjectMonths = (p: StatusProject): number[] => {
        const label = p.current_milestone_label
        const ms = new Set<number>()

        if (label === 'Go-Live' || label === 'Finish') {
            // Go-Live/Finish: use GoLive date only
            if (p.golive_due_date) ms.add(new Date(p.golive_due_date).getMonth() + 1)
        } else {
            // Mapping Data / System Test / UAT / Wait: show in all months that have any milestone date
            if (p.mapping_due_date) ms.add(new Date(p.mapping_due_date).getMonth() + 1)
            if (p.systemtest_due_date) ms.add(new Date(p.systemtest_due_date).getMonth() + 1)
            if (p.uat_due_date) ms.add(new Date(p.uat_due_date).getMonth() + 1)
            if (p.golive_due_date) ms.add(new Date(p.golive_due_date).getMonth() + 1)
        }

        if (ms.size === 0 && p.grouping_month > 0) ms.add(p.grouping_month)
        return Array.from(ms)
    }

    // Months list
    const allMonths = useMemo(() => {
        const mc = new Map<number, number>()
        for (const p of projects) {
            for (const m of getProjectMonths(p)) {
                mc.set(m, (mc.get(m) || 0) + 1)
            }
        }
        return Array.from(mc.entries())
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month - b.month)
    }, [projects])

    // Group projects by month
    const { focusProjects, otherMonths } = useMemo(() => {
        const fp: StatusProject[] = []
        const otherMap: Record<number, StatusProject[]> = {}

        for (const p of projects) {
            const pMonths = getProjectMonths(p)
            if (pMonths.includes(focusMonth)) fp.push(p)
            for (const m of pMonths) {
                if (m === focusMonth) continue
                if (!otherMap[m]) otherMap[m] = []
                otherMap[m].push(p)
            }
        }

        const om = Object.entries(otherMap)
            .map(([m, ps]) => ({ month: Number(m), projects: ps }))
            .sort((a, b) => a.month - b.month)
        return { focusProjects: fp, otherMonths: om }
    }, [projects, focusMonth])

    // Matrix: count by actual UAT / GO-LIVE dates
    const matrixData = useMemo(() => {
        const m1 = focusMonth
        const m2 = m1 + 1 > 12 ? 1 : m1 + 1
        const m3 = m2 + 1 > 12 ? 1 : m2 + 1
        const cols = [m1, m2, m3]

        const SHORT_M = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        const getDateMonth = (d: string | null): number => {
            if (!d) return 0
            return new Date(d).getMonth() + 1
        }

        type DateKey = 'mapping' | 'systemtest' | 'uat' | 'golive'
        const getDateField = (p: StatusProject, key: DateKey) => {
            if (key === 'mapping') return p.mapping_due_date
            if (key === 'systemtest') return p.systemtest_due_date
            if (key === 'uat') return p.uat_due_date
            return p.golive_due_date
        }

        const countByDateMonth = (dateKey: DateKey, targetMonth: number) =>
            projects.filter(p => {
                const m = getDateMonth(getDateField(p, dateKey))
                return m === targetMonth
            }).length

        const countByDateOther = (dateKey: DateKey) =>
            projects.filter(p => {
                const m = getDateMonth(getDateField(p, dateKey))
                return m > 0 && !cols.includes(m)
            }).length

        const labels: { label: string; key: DateKey; color: string }[] = [
            { label: 'MAPPING', key: 'mapping', color: '#2563eb' },
            { label: 'System Test', key: 'systemtest', color: '#d97706' },
            { label: 'UAT', key: 'uat', color: '#7c3aed' },
            { label: 'GO-LIVE', key: 'golive', color: '#0891b2' },
        ]

        return {
            colHeaders: [...cols.map(m => SHORT_M[m]), 'Other'],
            rows: labels.map(({ label, key, color }) => {
                const v1 = countByDateMonth(key, m1)
                const v2 = countByDateMonth(key, m2)
                const v3 = countByDateMonth(key, m3)
                const vo = countByDateOther(key)
                return { label, color, values: [v1, v2, v3, vo] }
            })
        }
    }, [projects, focusMonth])

    // Customer counts with budget mandays
    const customerCounts = useMemo(() => {
        const map: Record<string, { count: number; budgetMd: number }> = {}
        projects.forEach(p => {
            const name = p.customer_name || 'ไม่ระบุ'
            if (!map[name]) map[name] = { count: 0, budgetMd: 0 }
            map[name].count += 1
            map[name].budgetMd += p.budget_mandays || 0
        })
        const entries = Object.entries(map)
            .map(([name, v]) => ({ name, count: v.count, budgetMd: v.budgetMd }))
        // Internal first, then sort by budget mandays desc
        entries.sort((a, b) => {
            const aInternal = a.name.toLowerCase().includes('internal') ? 1 : 0
            const bInternal = b.name.toLowerCase().includes('internal') ? 1 : 0
            if (aInternal !== bInternal) return bInternal - aInternal
            return b.budgetMd - a.budgetMd
        })
        return entries
    }, [projects])

    const today = new Date()
    const dateStr = `${today.getDate()} ${THAI_M[today.getMonth() + 1]} ${today.getFullYear()}`

    return (
        <div style={{ fontFamily: "'Noto Sans Thai', sans-serif", background: '#f1f5f9', minHeight: '100vh', padding: '16px 18px' }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>

                {/* Header + KPI */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Project Status Overview</h1>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>ข้อมูล ณ {dateStr}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {[
                            { l: 'ทั้งหมด', v: String(summary.total), cl: '#0f172a' },
                            { l: 'เสร็จสิ้น', v: `${summary.finished} (${summary.finished_pct}%)`, cl: '#16a34a' },
                            { l: 'ดำเนินการ', v: String(summary.active), cl: '#2563eb' },
                        ].map((k, i) => (
                            <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '10px 16px', border: '1px solid #e2e8f0', textAlign: 'center', minWidth: 80 }}>
                                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 3 }}>{k.l}</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: k.cl, lineHeight: 1 }}>{k.v}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px 16px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
                        {/* Year */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>Fiscal Year</label>
                            <select
                                value={filters.year}
                                onChange={e => handleFilterChange('year', e.target.value ? parseInt(e.target.value) : '')}
                                style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 90 }}
                            >
                                <option value="">All</option>
                                {fo.years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        {/* Customer */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>Customer</label>
                            <select
                                value={filters.customerId}
                                onChange={e => handleFilterChange('customerId', e.target.value)}
                                style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 150 }}
                            >
                                <option value="">All Customers</option>
                                {fo.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* PM */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>Project Manager</label>
                            <select
                                value={filters.managerId}
                                onChange={e => handleFilterChange('managerId', e.target.value)}
                                style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 140 }}
                            >
                                <option value="">All PMs</option>
                                {fo.managers.map(m => <option key={m.id} value={m.id}>{m.name_th || m.name}</option>)}
                            </select>
                        </div>

                        {/* Owner */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>Owner</label>
                            <select
                                value={filters.ownerId}
                                onChange={e => handleFilterChange('ownerId', e.target.value)}
                                style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 140 }}
                            >
                                <option value="">All Owners</option>
                                {fo.owners.map(o => <option key={o.id} value={o.id}>{o.name_th || o.name}</option>)}
                            </select>
                        </div>

                        {/* Type */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>Type</label>
                            <select
                                value={filters.projectTypeId}
                                onChange={e => handleFilterChange('projectTypeId', e.target.value)}
                                style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 90 }}
                            >
                                <option value="">All Types</option>
                                {fo.projectTypes.map(t => <option key={t.id} value={t.id}>{t.code}</option>)}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>Status</label>
                            <select
                                value={filters.statusId}
                                onChange={e => handleFilterChange('statusId', e.target.value)}
                                style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 100 }}
                            >
                                <option value="">All Status</option>
                                {fo.statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        {/* Milestone Multi-Select */}
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>Milestone</label>
                            <button
                                type="button"
                                onClick={() => setIsMilestoneDropdownOpen(!isMilestoneDropdownOpen)}
                                style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, background: '#fff', cursor: 'pointer' }}
                            >
                                <span style={{ color: filters.milestoneIds.length > 0 ? '#0f172a' : '#94a3b8' }}>
                                    {filters.milestoneIds.length > 0 ? `${filters.milestoneIds.length} selected` : 'All Milestones'}
                                </span>
                                <ChevronDown size={14} color="#94a3b8" />
                            </button>
                            {isMilestoneDropdownOpen && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setIsMilestoneDropdownOpen(false)} />
                                    <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, marginTop: 4, width: 200, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: 240, overflowY: 'auto' }}>
                                        {filters.milestoneIds.length > 0 && (
                                            <button onClick={() => handleFilterChange('milestoneIds', [])} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                                                Clear all
                                            </button>
                                        )}
                                        {fo.milestones.map(m => (
                                            <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}
                                                onClick={() => toggleMilestone(m.id)}>
                                                <div style={{
                                                    width: 16, height: 16, borderRadius: 3, border: '1px solid',
                                                    borderColor: filters.milestoneIds.includes(m.id) ? '#3b82f6' : '#d1d5db',
                                                    background: filters.milestoneIds.includes(m.id) ? '#3b82f6' : '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    {filters.milestoneIds.includes(m.id) && <Check size={12} color="#fff" />}
                                                </div>
                                                <span style={{ color: m.color }}>{m.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Search */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>Search</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={e => handleFilterChange('search', e.target.value)}
                                    placeholder="Search..."
                                    style={{ padding: '6px 10px 6px 28px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, width: 180 }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Month pills */}
                <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginRight: 4 }}>เดือน:</span>
                    {allMonths.map(m => (
                        <div key={m.month} onClick={() => setFocusMonth(m.month)}
                            style={{
                                padding: '5px 14px', borderRadius: 99, cursor: 'pointer', userSelect: 'none',
                                fontSize: 12, fontWeight: 700,
                                background: m.month === focusMonth ? '#1e40af' : '#fff',
                                color: m.month === focusMonth ? '#fff' : '#475569',
                                border: m.month === focusMonth ? 'none' : '1px solid #e2e8f0',
                                transition: 'all .12s',
                            }}>
                            {getThaiMonthShort(m.month)}
                            <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>({m.count})</span>
                        </div>
                    ))}
                </div>

                {/* Main 2-col layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14 }}>
                    {/* Left: Tables */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {isLoading ? (
                            <div style={{ background: '#fff', borderRadius: 10, padding: 40, textAlign: 'center', color: '#94a3b8' }}>กำลังโหลด...</div>
                        ) : (
                            <>
                                <MonthProjectTable
                                    title={`${getThaiMonthShort(focusMonth)} ${filters.year}`}
                                    projects={focusProjects}
                                    isFocus={true}
                                    onProjectClick={handleProjectClick}
                                />
                                {otherMonths.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>เดือนอื่น ๆ</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {otherMonths.map(om => (
                                                <MonthProjectTable key={om.month} title={`${getThaiMonthShort(om.month)} ${filters.year}`} projects={om.projects} isFocus={false} onProjectClick={handleProjectClick} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right: Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Date Count Matrix */}
                        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <div style={{ padding: '8px 12px', fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>จำนวนตามวันที่</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(4, 1fr)', padding: '6px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                <div />
                                {matrixData.colHeaders.map(h => (
                                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'center' }}>{h}</div>
                                ))}
                            </div>
                            {matrixData.rows.map(row => (
                                <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '100px repeat(4, 1fr)', padding: '8px 12px', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <div style={{ width: 7, height: 7, borderRadius: 2, background: row.color }} />
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{row.label}</span>
                                    </div>
                                    {row.values.map((v, j) => (
                                        <div key={j} style={{ textAlign: 'center', fontSize: 14, fontWeight: v > 0 ? 800 : 400, color: v > 0 ? row.color : '#e2e8f0' }}>
                                            {v > 0 ? v : '–'}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Customer Count */}
                        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <div style={{ padding: '8px 12px', fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>จำนวนตามลูกค้า</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 60px', padding: '6px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>ลูกค้า</div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'center' }}>จำนวน</div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'center' }}>Budget MD</div>
                            </div>
                            {customerCounts.map((cc, i) => (
                                <div key={i} onClick={() => setCustomerPopup({ open: true, name: cc.name })} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 60px', padding: '7px 12px', borderBottom: '1px solid #f8fafc', alignItems: 'center', cursor: 'pointer' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span style={{ fontSize: 12, fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cc.name}</span>
                                    <span style={{ fontSize: 14, fontWeight: 800, color: '#1e40af', textAlign: 'center' }}>{cc.count}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>{cc.budgetMd > 0 ? cc.budgetMd : '—'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Projects Popup */}
            {customerPopup?.open && (() => {
                const custName = customerPopup.name
                const custProjects = projects.filter(p => (p.customer_name || 'ไม่ระบุ') === custName)
                const totalBudget = custProjects.reduce((s, p) => s + (p.budget_mandays || 0), 0)
                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setCustomerPopup(null)} />
                        <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 860, height: '70vh', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{custName}</div>
                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{custProjects.length} โปรเจกต์ | Budget MD รวม {totalBudget}</div>
                                </div>
                                <button onClick={() => setCustomerPopup(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: '4px 8px' }}>×</button>
                            </div>
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#fafbfc' }}>
                                            {['#', 'โปรเจกต์', 'สถานะปัจจุบัน', 'Budget MD', 'UAT', 'GO-LIVE'].map(h => (
                                                <th key={h} style={{ textAlign: 'left', padding: '6px 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {custProjects.map((p, i) => {
                                            const ms = getMsStyle(p.current_milestone_label, p.current_milestone_color)
                                            return (
                                                <tr key={p.project_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                    <td style={{ padding: '7px 8px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textAlign: 'center', width: 28 }}>{i + 1}</td>
                                                    <td style={{ padding: '7px 12px', fontSize: 12, fontWeight: 500, color: '#1e293b' }}>
                                                        <span
                                                            onClick={() => { setCustomerPopup(null); handleProjectClick(p) }}
                                                            style={{ cursor: 'pointer' }}
                                                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                                        >
                                                            {p.project_name}
                                                        </span>
                                                        <span style={{ color: '#b0b8c4', fontSize: 10, marginLeft: 4 }}>#{p.project_code}</span>
                                                    </td>
                                                    <td style={{ padding: '7px 8px' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: ms.b, color: ms.c }}>{p.current_milestone_label}</span>
                                                    </td>
                                                    <td style={{ padding: '7px 8px', fontSize: 11, color: '#64748b', textAlign: 'center' }}>{p.budget_mandays > 0 ? p.budget_mandays : '—'}</td>
                                                    <td style={{ padding: '7px 8px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(p.uat_due_date)}</td>
                                                    <td style={{ padding: '7px 8px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(p.golive_due_date)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Edit Project Modal */}
            <ProjectModal
                open={editModal.open}
                onClose={handleModalClose}
                mode="edit"
                project={editModal.project}
                onSuccess={handleModalSuccess}
            />
        </div>
    )
}
