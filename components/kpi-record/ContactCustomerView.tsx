'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Calendar as CalendarIcon, Loader2, Paperclip, Pencil, Trash2, RefreshCw, CheckCircle2, XCircle, X, Phone, BarChart3 } from 'lucide-react'
import { createCustomerContactRecord, updateCustomerContactRecord, deleteCustomerContactRecord, getPresaleProjects, getCustomerContactMonthlyTrend, Attachment, MonthlyTrendItem } from '@/lib/actions/presale-kpi-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { SmartCombobox } from '@/components/ui/smart-combobox'
import FileUpload from '@/components/ui/FileUpload'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'


interface Record {
    id: string
    project_name: string
    sales_handover_date: string
    customer_contact_date: string
    days_taken?: number
    is_pass?: boolean
    remark?: string
    created_at: string
    attachments?: Attachment[]
}

interface Props {
    initialData: Record[]
    currentYear: number
}

const MONTHS = [
    { value: 1, label: 'ม.ค.' },
    { value: 2, label: 'ก.พ.' },
    { value: 3, label: 'มี.ค.' },
    { value: 4, label: 'เม.ย.' },
    { value: 5, label: 'พ.ค.' },
    { value: 6, label: 'มิ.ย.' },
    { value: 7, label: 'ก.ค.' },
    { value: 8, label: 'ส.ค.' },
    { value: 9, label: 'ก.ย.' },
    { value: 10, label: 'ต.ค.' },
    { value: 11, label: 'พ.ย.' },
    { value: 12, label: 'ธ.ค.' },
]

export function ContactCustomerView({ initialData, currentYear }: Props) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [projectOptions, setProjectOptions] = useState<any[]>([])
    const [loadingProjects, setLoadingProjects] = useState(false)

    // Monthly Trend State
    const [trendData, setTrendData] = useState<MonthlyTrendItem[]>([])
    const [loadingTrend, setLoadingTrend] = useState(false)

    // Edit/Delete State
    const [editingId, setEditingId] = useState<string | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        project_name: '',
        sales_handover_date: '',
        customer_contact_date: '',
        remark: '',
        attachments: [] as any[]
    })

    // Fetch Monthly Trend on mount
    useEffect(() => {
        const fetchTrend = async () => {
            setLoadingTrend(true)
            try {
                const result = await getCustomerContactMonthlyTrend(currentYear)
                if (result.success) {
                    setTrendData(result.data)
                }
            } catch (error) {
                console.error('Error fetching trend:', error)
            } finally {
                setLoadingTrend(false)
            }
        }
        fetchTrend()
    }, [currentYear])

    useEffect(() => {
        if (open) {
            setLoadingProjects(true)
            getPresaleProjects().then(res => {
                setProjectOptions(res)
                setLoadingProjects(false)
            })
        }
    }, [open])

    const filteredData = initialData.filter(d =>
        d.project_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Calculate KPI stats
    const totalRecords = filteredData.length
    const passedRecords = filteredData.filter(d => d.is_pass).length
    const failedRecords = totalRecords - passedRecords
    const passRate = totalRecords > 0 ? Math.round((passedRecords / totalRecords) * 100) : 100
    const isKpiPassed = passRate >= 85

    const resetForm = () => {
        setFormData({ project_name: '', sales_handover_date: '', customer_contact_date: '', remark: '', attachments: [] })
        setEditingId(null)
        setOpen(false)
    }

    const handleEdit = (record: Record) => {
        setEditingId(record.id)
        setFormData({
            project_name: record.project_name,
            sales_handover_date: new Date(record.sales_handover_date).toISOString().split('T')[0],
            customer_contact_date: new Date(record.customer_contact_date).toISOString().split('T')[0],
            remark: record.remark || '',
            attachments: record.attachments || []
        })
        setOpen(true)
    }

    const handleDelete = async () => {
        if (!deleteId) return

        if (!confirm('Are you sure you want to delete this record? This cannot be undone.')) {
            setDeleteId(null)
            return
        }

        try {
            const res = await deleteCustomerContactRecord(deleteId)
            if (res.success) {
                toast.success('Record deleted')
                router.refresh()
            } else {
                toast.error('Failed to delete')
            }
        } catch (error) {
            toast.error('Error deleting record')
        } finally {
            setDeleteId(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.project_name || !formData.sales_handover_date || !formData.customer_contact_date) {
            toast.error('Please fill all required fields')
            return
        }

        setIsSubmitting(true)
        try {
            let res
            if (editingId) {
                res = await updateCustomerContactRecord(editingId, {
                    project_name: formData.project_name,
                    sales_handover_date: formData.sales_handover_date,
                    customer_contact_date: formData.customer_contact_date,
                    remark: formData.remark,
                    attachments: formData.attachments
                })
            } else {
                res = await createCustomerContactRecord({
                    project_name: formData.project_name,
                    sales_handover_date: formData.sales_handover_date,
                    customer_contact_date: formData.customer_contact_date,
                    remark: formData.remark,
                    attachments: formData.attachments
                })
            }

            if (res.success) {
                toast.success(editingId ? 'Record updated' : 'Record created')
                resetForm()
                router.refresh()
            } else {
                toast.error('Operation failed')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const clearFilters = () => {
        setSearchTerm('')
    }

    return (
        <div className="p-6 w-full">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Phone className="w-6 h-6 text-blue-600" />
                        Contact Customer Records
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">ติดต่อลูกค้าหลังจากได้รับข้อมูลจาก Sales - Target: ภายใน 2 วัน</p>
                </div>
                <button
                    onClick={() => { resetForm(); setOpen(true); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 font-medium text-sm"
                >
                    <Plus size={16} />
                    New Record
                </button>
            </div>

            {/* KPI Summary */}
            <div className={`rounded-xl border p-4 mb-6 ${isKpiPassed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-slate-800">KPI Summary {currentYear}</h3>
                    <span className="text-sm text-slate-500">Target: &ge; 85% Pass</span>
                </div>

                <div className="flex items-center gap-6">
                    <div>
                        <span className="text-slate-500 text-sm">Total:</span>
                        <span className="font-bold ml-2 text-slate-800">{totalRecords} records</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <CheckCircle2 size={16} className="text-green-600" />
                        <span className="text-sm text-green-600">Pass:</span>
                        <span className="font-bold text-green-600">{passedRecords}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <XCircle size={16} className="text-red-600" />
                        <span className="text-sm text-red-600">Fail:</span>
                        <span className="font-bold text-red-600">{failedRecords}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 text-sm">Rate:</span>
                        <span className="font-bold ml-2">{passRate}%</span>
                    </div>
                    <div className={`font-bold px-3 py-1 rounded-full text-sm ${isKpiPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isKpiPassed ? '✅ KPI Passed' : '❌ KPI Failed'}
                    </div>
                </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <BarChart3 size={18} className="text-blue-600" />
                    Monthly Trend - {currentYear}
                </h3>
                <div className="grid grid-cols-12 gap-2">
                    {MONTHS.map((month) => {
                        const monthData = trendData.find(t => t.month === month.value)
                        if (!monthData || monthData.total === 0) {
                            return (
                                <div key={month.value} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                                    <div className="text-xs font-medium text-slate-400 mb-1">{month.label}</div>
                                    <div className="text-sm font-bold text-slate-300">-</div>
                                </div>
                            )
                        }
                        return (
                            <div
                                key={month.value}
                                className={`rounded-lg p-2 text-center border ${monthData.is_pass ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}
                            >
                                <div className={`text-xs font-medium mb-1 ${monthData.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {month.label}
                                </div>
                                <div className={`text-sm font-bold ${monthData.is_pass ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {monthData.pass_rate}%
                                </div>
                                <div className={`text-xs ${monthData.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {monthData.pass}/{monthData.total}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search project name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => router.refresh()}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>

                    {/* Clear Filters */}
                    {searchTerm && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <X size={16} />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead className="font-semibold">Project Name</TableHead>
                            <TableHead className="font-semibold">Handover Date</TableHead>
                            <TableHead className="font-semibold">Contact Date</TableHead>
                            <TableHead className="font-semibold text-center">Days Taken</TableHead>
                            <TableHead className="font-semibold text-center">Status</TableHead>
                            <TableHead className="font-semibold">Remark</TableHead>
                            <TableHead className="font-semibold text-center">Files</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Phone className="w-8 h-8 text-slate-300" />
                                        <span>No records found</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((record) => (
                                <TableRow key={record.id} className="hover:bg-slate-50/50">
                                    <TableCell className="font-medium text-slate-700">{record.project_name}</TableCell>
                                    <TableCell className="text-slate-600">
                                        {format(new Date(record.sales_handover_date), 'd MMM yyyy', { locale: th })}
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {format(new Date(record.customer_contact_date), 'd MMM yyyy', { locale: th })}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded-full text-xs font-bold ${
                                            record.is_pass
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {record.days_taken} Days
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {record.is_pass ? (
                                            <span className="inline-flex items-center gap-1 text-green-600">
                                                <CheckCircle2 size={16} />
                                                <span className="text-xs font-medium">Pass</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-600">
                                                <XCircle size={16} />
                                                <span className="text-xs font-medium">Fail</span>
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-slate-500 max-w-[200px] truncate" title={record.remark || '-'}>
                                        {record.remark || '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {record.attachments && record.attachments.length > 0 ? (
                                            <div className="flex gap-1 justify-center">
                                                {record.attachments.map((file, i) => (
                                                    <a
                                                        href={`/api/files/${file.path}`}
                                                        key={i}
                                                        target="_blank"
                                                        className="text-blue-600 hover:text-blue-800"
                                                        title={file.name}
                                                    >
                                                        <Paperclip className="h-4 w-4" />
                                                    </a>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 justify-end">
                                            <button
                                                onClick={() => handleEdit(record)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(record.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={open} onOpenChange={(val: boolean) => { if (!val) resetForm(); else setOpen(true); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Phone className="w-5 h-5 text-blue-600" />
                            {editingId ? 'Edit Record' : 'Add Contact Customer Record'}
                        </DialogTitle>
                        <DialogDescription>
                            บันทึกวันที่ได้รับข้อมูลจาก Sales และวันที่ติดต่อลูกค้า (Target: ภายใน 2 วัน)
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Project Name</label>
                            <SmartCombobox
                                options={projectOptions}
                                value={formData.project_name}
                                onChange={(val) => setFormData({ ...formData, project_name: val })}
                                placeholder="Select Project..."
                                searchPlaceholder="Search Project..."
                                isLoading={loadingProjects}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sales Handover Date</label>
                                <Input
                                    type="date"
                                    value={formData.sales_handover_date}
                                    onChange={e => setFormData({ ...formData, sales_handover_date: e.target.value })}
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">วันที่ได้รับข้อมูลจาก Sales</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Contact Date</label>
                                <Input
                                    type="date"
                                    value={formData.customer_contact_date}
                                    onChange={e => setFormData({ ...formData, customer_contact_date: e.target.value })}
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">วันที่ติดต่อลูกค้า</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Remark (Optional)</label>
                            <Input
                                placeholder="Any notes..."
                                value={formData.remark}
                                onChange={e => setFormData({ ...formData, remark: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Attachments</label>
                            <FileUpload
                                value={formData.attachments}
                                onChange={(files) => setFormData({ ...formData, attachments: files })}
                                maxFiles={3}
                                maxSizeMB={10}
                                subFolder="kpi-records"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingId ? 'Update' : 'Save'} Record
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            {deleteId && (
                <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="text-red-600">Confirm Delete</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this record? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete}>Delete</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
