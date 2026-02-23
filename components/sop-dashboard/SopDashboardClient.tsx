'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { SuperTable } from '@/components/shared/SuperTable/SuperTable'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { ColumnDef } from '@tanstack/react-table'
import {
    AlertCircle,
    AlertTriangle,
    DollarSign,
    Clock,
    Plus,
    RefreshCw,
    Loader2,
    Search,
    Pencil,
    ArrowUpCircle,
    CheckCircle,
    XCircle,
    MoreHorizontal,
    Settings2,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import {
    fetchSopDashboardSummary,
    fetchProjectIssues,
    fetchPaymentPipeline,
    fetchSalesCashInPlan,
    escalateIssue,
    resolveIssue,
    closeIssue,
    updateProjectBillingStatus,
    type SopDashboardSummary,
    type SopFilterOptions,
    type ProjectIssue,
    type PaymentMilestone,
    type SopFilters,
    type SalesCashInPlanData,
} from '@/lib/actions/sop-actions'
import {
    ISSUE_TYPES,
    ISSUE_SEVERITIES,
    ISSUE_STATUSES,
    PAYMENT_STATUSES,
    BILLING_STATUSES,
    type IssueTypeCode,
    type IssueSeverityCode,
    type IssueStatusCode,
    type PaymentStatusCode,
    type BillingStatusCode,
} from '@/lib/constants/sop-constants'
import { IssueFormDialog } from './IssueFormDialog'
import { PaymentUpdateDialog } from './PaymentUpdateDialog'
import { SalesCashInTable } from './SalesCashInTable'

interface SopDashboardClientProps {
    initialSummary: SopDashboardSummary | null
    filterOptions: SopFilterOptions | null
}

export function SopDashboardClient({ initialSummary, filterOptions }: SopDashboardClientProps) {
    // Tab
    const [activeTab, setActiveTab] = useState('overview')

    // Data
    const [summary, setSummary] = useState<SopDashboardSummary | null>(initialSummary)
    const [issues, setIssues] = useState<ProjectIssue[]>([])
    const [payments, setPayments] = useState<PaymentMilestone[]>([])
    const [salesCashInData, setSalesCashInData] = useState<SalesCashInPlanData | null>(null)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [isLoading, setIsLoading] = useState(false)
    const [issueTotal, setIssueTotal] = useState(0)

    // Filters
    const [selectedProject, setSelectedProject] = useState<Option | null>(null)
    const [selectedCustomer, setSelectedCustomer] = useState<Option | null>(null)
    const [searchText, setSearchText] = useState('')
    const [issueTypeFilter, setIssueTypeFilter] = useState<IssueTypeCode | 'ALL'>('ALL')
    const [severityFilter, setSeverityFilter] = useState<IssueSeverityCode | 'ALL'>('ALL')
    const [statusFilter, setStatusFilter] = useState<IssueStatusCode | 'ALL'>('ALL')
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusCode | 'ALL'>('ALL')
    const [billingFilter, setBillingFilter] = useState<BillingStatusCode | 'ALL'>('BILLING')

    // Dialogs
    const [issueDialog, setIssueDialog] = useState<{ open: boolean; issue: ProjectIssue | null }>({ open: false, issue: null })
    const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; milestone: PaymentMilestone | null }>({ open: false, milestone: null })
    const [escalateDialog, setEscalateDialog] = useState<{ open: boolean; issueId: string }>({ open: false, issueId: '' })
    const [resolveDialog, setResolveDialog] = useState<{ open: boolean; issueId: string }>({ open: false, issueId: '' })
    const [billingDialog, setBillingDialog] = useState<{ open: boolean; projectId: string; projectCode: string; current: BillingStatusCode }>({ open: false, projectId: '', projectCode: '', current: 'BILLING' })
    const [escalateTarget, setEscalateTarget] = useState<Option | null>(null)
    const [escalateNotes, setEscalateNotes] = useState('')
    const [resolveNotes, setResolveNotes] = useState('')
    const [isActionLoading, setIsActionLoading] = useState(false)

    // Build filters
    const buildFilters = useCallback((): SopFilters => ({
        projectId: selectedProject ? String(selectedProject.value) : undefined,
        customerId: selectedCustomer ? String(selectedCustomer.value) : undefined,
        search: searchText || undefined,
        issueType: issueTypeFilter,
        severity: severityFilter,
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        billingStatus: billingFilter,
    }), [selectedProject, selectedCustomer, searchText, issueTypeFilter, severityFilter, statusFilter, paymentStatusFilter, billingFilter])

    // Load data
    const loadSummary = useCallback(async () => {
        const filters = buildFilters()
        const result = await fetchSopDashboardSummary(filters)
        if (result.success && result.data) setSummary(result.data)
    }, [buildFilters])

    const loadIssues = useCallback(async () => {
        setIsLoading(true)
        const filters = buildFilters()
        const result = await fetchProjectIssues({ ...filters, limit: 100 })
        if (result.success && result.data) {
            setIssues(result.data)
            setIssueTotal(result.total || 0)
        }
        setIsLoading(false)
    }, [buildFilters])

    const loadPayments = useCallback(async () => {
        setIsLoading(true)
        const filters = buildFilters()
        const result = await fetchPaymentPipeline(filters)
        if (result.success && result.data) setPayments(result.data)
        setIsLoading(false)
    }, [buildFilters])

    const loadSalesCashIn = useCallback(async () => {
        setIsLoading(true)
        const filters = buildFilters()
        // Show all projects regardless of billing status in sales-cashin view
        const result = await fetchSalesCashInPlan(selectedYear, { ...filters, billingStatus: 'ALL' })
        if (result.success && result.data) setSalesCashInData(result.data)
        setIsLoading(false)
    }, [selectedYear, buildFilters])

    const refreshAll = useCallback(async () => {
        setIsLoading(true)
        await Promise.all([loadSummary(), loadIssues(), loadPayments()])
        setIsLoading(false)
    }, [loadSummary, loadIssues, loadPayments])

    // Load on tab change
    useEffect(() => {
        if (activeTab === 'overview') loadSummary()
        else if (activeTab === 'issues') loadIssues()
        else if (activeTab === 'payments') loadPayments()
        else if (activeTab === 'escalation') loadIssues()
        else if (activeTab === 'sales-cashin') loadSalesCashIn()
    }, [activeTab])

    // Reload on filter change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'issues' || activeTab === 'escalation') loadIssues()
            if (activeTab === 'payments') loadPayments()
            if (activeTab === 'sales-cashin') loadSalesCashIn()
            loadSummary()
        }, 300)
        return () => clearTimeout(timer)
    }, [selectedProject, selectedCustomer, searchText, issueTypeFilter, severityFilter, statusFilter, paymentStatusFilter, billingFilter])

    // Reload sales-cashin when year changes
    useEffect(() => {
        if (activeTab === 'sales-cashin') loadSalesCashIn()
    }, [selectedYear])

    // Escalation items (filtered from issues)
    const escalationItems = useMemo(() =>
        issues.filter(i => i.status === 'ESCALATED' || (i.severity === 'CRITICAL' && i.status !== 'RESOLVED' && i.status !== 'CLOSED'))
    , [issues])

    // Options
    const projectOptions: Option[] = useMemo(() =>
        (filterOptions?.projects || []).map(p => ({ value: p.id, label: `${p.project_code} - ${p.name}` }))
    , [filterOptions])

    const customerOptions: Option[] = useMemo(() =>
        (filterOptions?.customers || []).map(c => ({ value: c.id, label: c.name }))
    , [filterOptions])

    const employeeOptions: Option[] = useMemo(() =>
        (filterOptions?.employees || []).map(e => ({ value: e.id, label: e.full_name }))
    , [filterOptions])

    // Actions
    const handleEscalate = async () => {
        if (!escalateTarget) {
            toast.error('กรุณาเลือกผู้รับ Escalation')
            return
        }
        setIsActionLoading(true)
        const result = await escalateIssue(escalateDialog.issueId, String(escalateTarget.value), escalateNotes || undefined)
        if (result.success) {
            toast.success('Escalate สำเร็จ')
            setEscalateDialog({ open: false, issueId: '' })
            setEscalateTarget(null)
            setEscalateNotes('')
            refreshAll()
        } else {
            toast.error(result.error || 'เกิดข้อผิดพลาด')
        }
        setIsActionLoading(false)
    }

    const handleResolve = async () => {
        if (!resolveNotes.trim()) {
            toast.error('กรุณากรอกรายละเอียดการแก้ไข')
            return
        }
        setIsActionLoading(true)
        const result = await resolveIssue(resolveDialog.issueId, resolveNotes)
        if (result.success) {
            toast.success('Resolve สำเร็จ')
            setResolveDialog({ open: false, issueId: '' })
            setResolveNotes('')
            refreshAll()
        } else {
            toast.error(result.error || 'เกิดข้อผิดพลาด')
        }
        setIsActionLoading(false)
    }

    const handleClose = async (issueId: string) => {
        const result = await closeIssue(issueId)
        if (result.success) {
            toast.success('ปิด Issue สำเร็จ')
            refreshAll()
        } else {
            toast.error(result.error || 'เกิดข้อผิดพลาด')
        }
    }

    const handleBillingStatusChange = async (status: BillingStatusCode) => {
        setIsActionLoading(true)
        const result = await updateProjectBillingStatus(billingDialog.projectId, status)
        if (result.success) {
            toast.success('อัพเดตสถานะการเก็บเงินสำเร็จ')
            setBillingDialog({ open: false, projectId: '', projectCode: '', current: 'BILLING' })
            loadPayments()
            loadSummary()
        } else {
            toast.error(result.error || 'เกิดข้อผิดพลาด')
        }
        setIsActionLoading(false)
    }

    // Format helpers
    const fmtCurrency = (n: number | null | undefined) => {
        if (n == null) return '-'
        return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }

    const fmtDate = (d: string | null | undefined) => {
        if (!d) return '-'
        try {
            return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
        } catch { return '-' }
    }

    // Badge helpers
    const getTypeBadge = (type: IssueTypeCode) => {
        const t = ISSUE_TYPES.find(x => x.code === type)
        return <Badge style={{ backgroundColor: t?.color, color: '#fff' }}>{t?.labelTh || type}</Badge>
    }

    const getSeverityBadge = (severity: IssueSeverityCode) => {
        const s = ISSUE_SEVERITIES.find(x => x.code === severity)
        return <Badge style={{ backgroundColor: s?.color, color: '#fff' }}>{s?.labelTh || severity}</Badge>
    }

    const getStatusBadge = (status: IssueStatusCode) => {
        const s = ISSUE_STATUSES.find(x => x.code === status)
        return <Badge style={{ backgroundColor: s?.color, color: '#fff' }}>{s?.labelTh || status}</Badge>
    }

    const getPaymentBadge = (status: string | null) => {
        const s = PAYMENT_STATUSES.find(x => x.code === status)
        if (!s) return <Badge variant="secondary">-</Badge>
        return <Badge style={{ backgroundColor: s.color, color: '#fff' }}>{s.labelTh}</Badge>
    }

    const getBillingBadge = (status: string) => {
        const s = BILLING_STATUSES.find(x => x.code === status)
        if (!s) return <Badge variant="secondary">-</Badge>
        return <Badge style={{ backgroundColor: s.color, color: '#fff' }}>{s.labelTh}</Badge>
    }

    // ============================================
    // Issue Columns (SuperTable)
    // ============================================
    const issueColumns: ColumnDef<ProjectIssue, any>[] = [
        {
            accessorKey: 'project_code',
            header: 'โครงการ',
            cell: ({ row }) => (
                <div className="min-w-[160px]">
                    <div className="font-semibold text-sm text-slate-800">{row.original.project_code}</div>
                    <div className="text-xs text-muted-foreground">{row.original.project_name}</div>
                </div>
            ),
            size: 200,
        },
        {
            accessorKey: 'title',
            header: 'หัวข้อ',
            cell: ({ row }) => (
                <div className="min-w-[180px]">
                    <div className="font-medium text-sm">{row.original.title}</div>
                    {row.original.milestone_name && (
                        <div className="text-xs text-muted-foreground">{row.original.milestone_name}</div>
                    )}
                </div>
            ),
            size: 250,
        },
        {
            accessorKey: 'issue_type',
            header: 'ประเภท',
            cell: ({ row }) => getTypeBadge(row.original.issue_type),
            size: 110,
        },
        {
            accessorKey: 'severity',
            header: 'ความรุนแรง',
            cell: ({ row }) => getSeverityBadge(row.original.severity),
            size: 110,
        },
        {
            accessorKey: 'status',
            header: 'สถานะ',
            cell: ({ row }) => getStatusBadge(row.original.status),
            size: 120,
        },
        {
            accessorKey: 'assigned_to_name',
            header: 'ผู้รับผิดชอบ',
            cell: ({ row }) => <span className="text-sm">{row.original.assigned_to_name || '-'}</span>,
            size: 140,
        },
        {
            accessorKey: 'reported_date',
            header: 'วันที่แจ้ง',
            cell: ({ row }) => <span className="text-sm">{fmtDate(row.original.reported_date)}</span>,
            size: 100,
        },
        {
            accessorKey: 'target_resolve_date',
            header: 'กำหนดแก้ไข',
            cell: ({ row }) => (
                <span className={`text-sm ${row.original.is_overdue ? 'text-red-600 font-semibold' : ''}`}>
                    {fmtDate(row.original.target_resolve_date)}
                    {row.original.is_overdue && ' (เกิน)'}
                </span>
            ),
            size: 120,
        },
        {
            accessorKey: 'days_open',
            header: 'วัน',
            cell: ({ row }) => <span className="text-sm">{row.original.days_open}d</span>,
            size: 60,
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const issue = row.original
                const canAction = issue.status !== 'CLOSED'
                if (!canAction) return null
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-7 w-7 hover:bg-accent hover:text-accent-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIssueDialog({ open: true, issue })}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> แก้ไข
                            </DropdownMenuItem>
                            {issue.status !== 'ESCALATED' && issue.status !== 'RESOLVED' && (
                                <DropdownMenuItem onClick={() => { setEscalateDialog({ open: true, issueId: issue.id }); setEscalateTarget(null); setEscalateNotes('') }}>
                                    <ArrowUpCircle className="h-3.5 w-3.5 mr-2" /> Escalate
                                </DropdownMenuItem>
                            )}
                            {issue.status !== 'RESOLVED' && (
                                <DropdownMenuItem onClick={() => { setResolveDialog({ open: true, issueId: issue.id }); setResolveNotes('') }}>
                                    <CheckCircle className="h-3.5 w-3.5 mr-2" /> Resolve
                                </DropdownMenuItem>
                            )}
                            {issue.status === 'RESOLVED' && (
                                <DropdownMenuItem onClick={() => handleClose(issue.id)}>
                                    <XCircle className="h-3.5 w-3.5 mr-2" /> ปิด Issue
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
            size: 50,
            enableSorting: false,
        },
    ]

    // ============================================
    // Payment Columns (SuperTable)
    // ============================================
    const paymentColumns: ColumnDef<PaymentMilestone, any>[] = [
        {
            accessorKey: 'project_code',
            header: 'โครงการ',
            cell: ({ row }) => (
                <div className="min-w-[180px]">
                    <div className="font-semibold text-sm text-slate-800">{row.original.project_code}</div>
                    <div className="text-xs text-muted-foreground">{row.original.project_name}</div>
                    {row.original.customer_name && (
                        <div className="text-xs text-blue-600">{row.original.customer_name}</div>
                    )}
                </div>
            ),
            size: 220,
        },
        {
            accessorKey: 'milestone_name',
            header: 'Milestone',
            cell: ({ row }) => <span className="text-sm font-medium">{row.original.milestone_name}</span>,
            size: 160,
        },
        {
            accessorKey: 'invoice_no',
            header: 'Invoice No.',
            cell: ({ row }) => <span className="text-sm font-mono">{row.original.invoice_no || '-'}</span>,
            size: 130,
        },
        {
            accessorKey: 'invoice_amount',
            header: 'จำนวนเงิน',
            cell: ({ row }) => (
                <span className="text-sm font-semibold text-right block">
                    {row.original.invoice_amount ? `${fmtCurrency(row.original.invoice_amount)} ฿` : '-'}
                </span>
            ),
            size: 120,
        },
        {
            accessorKey: 'payment_status',
            header: 'สถานะ',
            cell: ({ row }) => getPaymentBadge(row.original.payment_status),
            size: 140,
        },
        {
            accessorKey: 'payment_due_date',
            header: 'กำหนดชำระ',
            cell: ({ row }) => (
                <span className={`text-sm ${row.original.is_overdue ? 'text-red-600 font-semibold' : ''}`}>
                    {fmtDate(row.original.payment_due_date)}
                    {row.original.is_overdue && row.original.days_overdue > 0 && ` (+${row.original.days_overdue}d)`}
                </span>
            ),
            size: 130,
        },
        {
            accessorKey: 'payment_amount',
            header: 'ได้รับ',
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    {row.original.payment_amount ? `${fmtCurrency(row.original.payment_amount)} ฿` : '-'}
                </span>
            ),
            size: 110,
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setPaymentDialog({ open: true, milestone: row.original })}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setBillingDialog({
                            open: true,
                            projectId: row.original.project_id,
                            projectCode: row.original.project_code,
                            current: (row.original.billing_status || 'BILLING') as BillingStatusCode
                        })}
                    >
                        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                </div>
            ),
            size: 80,
            enableSorting: false,
        },
    ]

    // ============================================
    // Chart data
    // ============================================
    const issueByTypeData = useMemo(() => {
        const counts: Record<string, number> = {}
        issues.forEach(i => { counts[i.issue_type] = (counts[i.issue_type] || 0) + 1 })
        return ISSUE_TYPES.map(t => ({
            name: t.labelTh,
            value: counts[t.code] || 0,
            color: t.color,
        })).filter(d => d.value > 0)
    }, [issues])

    const paymentStatusData = useMemo(() => {
        const counts: Record<string, number> = {}
        payments.forEach(p => { counts[p.payment_status || 'NOT_INVOICED'] = (counts[p.payment_status || 'NOT_INVOICED'] || 0) + 1 })
        return PAYMENT_STATUSES.map(s => ({
            name: s.labelTh,
            value: counts[s.code] || 0,
            color: s.color,
        })).filter(d => d.value > 0)
    }, [payments])

    // ============================================
    // Render
    // ============================================
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">S&OP Dashboard</h1>
                    <p className="text-sm text-muted-foreground">ภาพรวม Issue/Blocker และสถานะการชำระเงิน</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={refreshAll} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-1">รีเฟรช</span>
                    </Button>
                    <Button size="sm" onClick={() => setIssueDialog({ open: true, issue: null })}>
                        <Plus className="h-4 w-4 mr-1" /> สร้าง Issue
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="w-64">
                    <SmartCombobox
                        options={projectOptions}
                        value={selectedProject}
                        onChange={setSelectedProject}
                        placeholder="ทุกโครงการ"
                        searchable
                    />
                </div>
                <div className="w-48">
                    <SmartCombobox
                        options={customerOptions}
                        value={selectedCustomer}
                        onChange={setSelectedCustomer}
                        placeholder="ทุกลูกค้า"
                        searchable
                    />
                </div>
                <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        placeholder="ค้นหา..."
                        className="pl-8 h-9"
                    />
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
                    <TabsTrigger value="issues">ปัญหา/Blockers</TabsTrigger>
                    <TabsTrigger value="payments">สถานะการชำระ</TabsTrigger>
                    <TabsTrigger value="sales-cashin">แผนการเก็บเงิน</TabsTrigger>
                    <TabsTrigger value="escalation">Escalation Board</TabsTrigger>
                </TabsList>

                {/* ==================== Overview Tab ==================== */}
                <TabsContent value="overview">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <Card className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground">ปัญหาที่เปิดอยู่</p>
                                        <p className="text-2xl font-bold">{summary?.open_issues || 0}</p>
                                    </div>
                                    <AlertCircle className="h-8 w-8 text-blue-500 opacity-50" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-red-500">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Escalated</p>
                                        <p className="text-2xl font-bold text-red-600">{summary?.escalated_issues || 0}</p>
                                    </div>
                                    <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-amber-500">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground">รอรับชำระ</p>
                                        <p className="text-2xl font-bold">{summary?.upcoming_payments || 0}</p>
                                        <p className="text-xs text-muted-foreground">{fmtCurrency(summary?.total_invoiced)} ฿</p>
                                    </div>
                                    <DollarSign className="h-8 w-8 text-amber-500 opacity-50" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-red-600">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground">เกินกำหนดชำระ</p>
                                        <p className="text-2xl font-bold text-red-600">{summary?.overdue_payments || 0}</p>
                                    </div>
                                    <Clock className="h-8 w-8 text-red-600 opacity-50" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="text-sm font-semibold mb-3">Issue แยกตามประเภท</h3>
                                {issueByTypeData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie data={issueByTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                                                {issueByTypeData.map((d, i) => (
                                                    <Cell key={i} fill={d.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">ไม่มีข้อมูล</div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <h3 className="text-sm font-semibold mb-3">สถานะการชำระเงิน</h3>
                                {paymentStatusData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie data={paymentStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                                                {paymentStatusData.map((d, i) => (
                                                    <Cell key={i} fill={d.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">ไม่มีข้อมูล</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ==================== Issues Tab ==================== */}
                <TabsContent value="issues">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Select value={issueTypeFilter} onValueChange={v => setIssueTypeFilter(v as IssueTypeCode | 'ALL')}>
                            <SelectTrigger className="w-36 h-9">
                                <SelectValue placeholder="ประเภท" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">ทุกประเภท</SelectItem>
                                {ISSUE_TYPES.map(t => <SelectItem key={t.code} value={t.code}>{t.labelTh}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={severityFilter} onValueChange={v => setSeverityFilter(v as IssueSeverityCode | 'ALL')}>
                            <SelectTrigger className="w-36 h-9">
                                <SelectValue placeholder="ความรุนแรง" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">ทุกระดับ</SelectItem>
                                {ISSUE_SEVERITIES.map(s => <SelectItem key={s.code} value={s.code}>{s.labelTh}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as IssueStatusCode | 'ALL')}>
                            <SelectTrigger className="w-40 h-9">
                                <SelectValue placeholder="สถานะ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">ทุกสถานะ</SelectItem>
                                {ISSUE_STATUSES.map(s => <SelectItem key={s.code} value={s.code}>{s.labelTh}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">ทั้งหมด {issueTotal} รายการ</span>
                    </div>

                    <SuperTable
                        data={issues}
                        columns={issueColumns}
                        size="sm"
                        enableSorting
                        enablePagination
                        pageSize={20}
                        enableGlobalFilter
                        searchPlaceholder="ค้นหา Issue..."
                        isLoading={isLoading}
                        emptyMessage="ไม่พบ Issue"
                    />
                </TabsContent>

                {/* ==================== Payments Tab ==================== */}
                <TabsContent value="payments">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Select value={paymentStatusFilter} onValueChange={v => setPaymentStatusFilter(v as PaymentStatusCode | 'ALL')}>
                            <SelectTrigger className="w-48 h-9">
                                <SelectValue placeholder="สถานะการชำระ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">ทุกสถานะ</SelectItem>
                                {PAYMENT_STATUSES.map(s => <SelectItem key={s.code} value={s.code}>{s.labelTh}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={billingFilter} onValueChange={v => setBillingFilter(v as BillingStatusCode | 'ALL')}>
                            <SelectTrigger className="w-48 h-9">
                                <SelectValue placeholder="สถานะโครงการ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">ทุกโครงการ</SelectItem>
                                {BILLING_STATUSES.map(s => <SelectItem key={s.code} value={s.code}>{s.labelTh}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">ทั้งหมด {payments.length} รายการ</span>
                    </div>

                    <SuperTable
                        data={payments}
                        columns={paymentColumns}
                        size="sm"
                        enableSorting
                        enablePagination
                        pageSize={20}
                        enableGlobalFilter
                        searchPlaceholder="ค้นหาโครงการ/Invoice..."
                        isLoading={isLoading}
                        emptyMessage="ไม่พบข้อมูลการชำระ"
                        enableExport
                        exportFileName="sop-payment-pipeline"
                    />
                </TabsContent>

                {/* ==================== Sales x Cash In Tab ==================== */}
                <TabsContent value="sales-cashin">
                    <SalesCashInTable
                        data={salesCashInData}
                        year={selectedYear}
                        onYearChange={setSelectedYear}
                        onProjectClick={(projectId) => {
                            const proj = projectOptions.find(p => String(p.value) === projectId)
                            if (proj) setSelectedProject(proj)
                            setActiveTab('issues')
                        }}
                        onMilestoneClick={(milestone, project) => {
                            setPaymentDialog({
                                open: true,
                                milestone: {
                                    milestone_id: milestone.milestone_id,
                                    project_id: project.project_id,
                                    project_code: project.project_code,
                                    project_name: project.project_name,
                                    customer_name: project.customer_name,
                                    milestone_name: milestone.milestone_name,
                                    milestone_due_date: milestone.milestone_due_date,
                                    milestone_status: milestone.milestone_status,
                                    billing_status: project.billing_status,
                                    invoice_no: milestone.invoice_no,
                                    invoice_date: milestone.invoice_date,
                                    invoice_amount: milestone.invoice_amount,
                                    payment_status: milestone.payment_status,
                                    payment_due_date: milestone.payment_due_date,
                                    payment_received_date: milestone.payment_received_date,
                                    payment_amount: milestone.payment_amount,
                                    payment_notes: milestone.payment_notes,
                                    is_overdue: false,
                                    days_overdue: 0,
                                } as PaymentMilestone,
                            })
                        }}
                        isLoading={isLoading}
                    />
                </TabsContent>

                {/* ==================== Escalation Tab ==================== */}
                <TabsContent value="escalation">
                    <div className="mb-4">
                        <p className="text-sm text-muted-foreground">รายการที่ต้องการ decision จากผู้บริหาร (Escalated + Critical)</p>
                    </div>

                    {escalationItems.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>ไม่มีรายการ Escalation</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {escalationItems.map(item => (
                                <Card key={item.id} className="border-l-4" style={{ borderLeftColor: ISSUE_SEVERITIES.find(s => s.code === item.severity)?.color }}>
                                    <CardContent className="p-4 space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-semibold text-sm">{item.title}</p>
                                                <p className="text-xs text-muted-foreground">{item.project_code} - {item.project_name}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                {getSeverityBadge(item.severity)}
                                                {getStatusBadge(item.status)}
                                            </div>
                                        </div>
                                        {item.impact_description && (
                                            <p className="text-xs bg-red-50 text-red-700 p-2 rounded">
                                                ผลกระทบ: {item.impact_description}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>ผู้รับผิดชอบ: {item.assigned_to_name || '-'}</span>
                                            <span>{item.days_open} วัน</span>
                                        </div>
                                        {item.escalated_to_name && (
                                            <p className="text-xs">Escalated ถึง: <strong>{item.escalated_to_name}</strong></p>
                                        )}
                                        <div className="flex gap-1 pt-1">
                                            {item.status !== 'RESOLVED' && (
                                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setResolveDialog({ open: true, issueId: item.id }); setResolveNotes('') }}>
                                                    Resolve
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIssueDialog({ open: true, issue: item })}>
                                                แก้ไข
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* ==================== Dialogs ==================== */}

            {/* Issue Form Dialog */}
            <IssueFormDialog
                open={issueDialog.open}
                onOpenChange={(open) => setIssueDialog(prev => ({ ...prev, open }))}
                issue={issueDialog.issue}
                filterOptions={filterOptions}
                onSuccess={refreshAll}
            />

            {/* Payment Update Dialog */}
            <PaymentUpdateDialog
                open={paymentDialog.open}
                onOpenChange={(open) => setPaymentDialog(prev => ({ ...prev, open }))}
                milestone={paymentDialog.milestone}
                onSuccess={refreshAll}
            />

            {/* Escalate Dialog */}
            <Dialog open={escalateDialog.open} onOpenChange={(open) => setEscalateDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Escalate Issue</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Escalate ถึง <span className="text-red-500">*</span></Label>
                            <SmartCombobox
                                options={employeeOptions}
                                value={escalateTarget}
                                onChange={setEscalateTarget}
                                placeholder="เลือกผู้รับ Escalation"
                                searchable
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>หมายเหตุ</Label>
                            <Textarea
                                value={escalateNotes}
                                onChange={e => setEscalateNotes(e.target.value)}
                                placeholder="เหตุผลในการ Escalate"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEscalateDialog({ open: false, issueId: '' })} disabled={isActionLoading}>ยกเลิก</Button>
                        <Button onClick={handleEscalate} disabled={isActionLoading} className="bg-red-600 hover:bg-red-700">
                            {isActionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Escalate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Resolve Dialog */}
            <Dialog open={resolveDialog.open} onOpenChange={(open) => setResolveDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Resolve Issue</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>รายละเอียดการแก้ไข <span className="text-red-500">*</span></Label>
                            <Textarea
                                value={resolveNotes}
                                onChange={e => setResolveNotes(e.target.value)}
                                placeholder="อธิบายวิธีการแก้ไข"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResolveDialog({ open: false, issueId: '' })} disabled={isActionLoading}>ยกเลิก</Button>
                        <Button onClick={handleResolve} disabled={isActionLoading} className="bg-green-600 hover:bg-green-700">
                            {isActionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Resolve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Billing Status Dialog */}
            <Dialog open={billingDialog.open} onOpenChange={(open) => setBillingDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>ตั้งค่าสถานะการเก็บเงิน</DialogTitle>
                        <p className="text-sm text-muted-foreground">{billingDialog.projectCode}</p>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        {BILLING_STATUSES.map(s => (
                            <button
                                key={s.code}
                                type="button"
                                onClick={() => handleBillingStatusChange(s.code as BillingStatusCode)}
                                disabled={isActionLoading}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                                    billingDialog.current === s.code
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                        : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                                <div>
                                    <div className="font-medium text-sm">{s.labelTh}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {s.code === 'BILLING' && 'โครงการนี้ยังมีการเก็บเงินอยู่'}
                                        {s.code === 'COMPLETED' && 'เก็บเงินครบแล้ว ไม่ต้องติดตาม'}
                                        {s.code === 'NOT_APPLICABLE' && 'โครงการนี้ไม่มีการเก็บเงิน'}
                                    </div>
                                </div>
                                {billingDialog.current === s.code && (
                                    <CheckCircle className="h-5 w-5 text-primary ml-auto flex-shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBillingDialog(prev => ({ ...prev, open: false }))} disabled={isActionLoading}>
                            ปิด
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
