'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { CheckCircle2, XCircle, Plus, Loader2, Paperclip, Pencil, Trash2, RefreshCw, Phone } from 'lucide-react'
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
    const [selectedMonth, setSelectedMonth] = useState<string>('all')
    const [selectedYear, setSelectedYear] = useState<number>(currentYear)
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
                const result = await getCustomerContactMonthlyTrend(selectedYear)
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
    }, [selectedYear])

    useEffect(() => {
        if (open) {
            setLoadingProjects(true)
            getPresaleProjects().then(res => {
                setProjectOptions(res)
                setLoadingProjects(false)
            })
        }
    }, [open])

    const filteredData = initialData.filter(d => {
        const matchSearch = d.project_name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchMonth = selectedMonth !== 'all'
            ? new Date(d.sales_handover_date).getMonth() + 1 === parseInt(selectedMonth)
            : true
        return matchSearch && matchMonth
    })

    // Calculate KPI stats
    const totalRecords = filteredData.length
    const passedRecords = filteredData.filter(d => d.is_pass).length
    const failedRecords = totalRecords - passedRecords
    const passRate = totalRecords > 0 ? Math.round((passedRecords / totalRecords) * 100) : 100
    const isKpiPassed = passRate >= 85

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

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

    const handleRefresh = () => {
        router.refresh()
    }

    return (
        <div className="p-6 space-y-4 w-full bg-slate-50 min-h-screen">
            {/* Compact Header Bar */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                {/* Top row: Icon + Title + Score + Summary + Filters */}
                <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Phone size={18} className="text-blue-600" />
                        </div>
                        <h1 className="text-lg font-bold text-slate-800">Contact Customer</h1>
                    </div>

                    <div className="h-6 w-px bg-slate-200" />

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${isKpiPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {isKpiPassed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            {passRate}%
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{totalRecords} รายการ</span>
                            <span className="text-emerald-600 font-medium">{passedRecords} ผ่าน</span>
                            <span className="text-rose-600 font-medium">{failedRecords} ไม่ผ่าน</span>
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm"
                        >
                            <option value="all">ทั้งปี</option>
                            {MONTHS.map(m => (
                                <option key={m.value} value={m.value.toString()}>{m.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleRefresh}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <RefreshCw size={16} className={loadingTrend ? 'animate-spin' : ''} />
                        </button>
                        <div className="h-6 w-px bg-slate-200" />
                        <button
                            onClick={() => { resetForm(); setOpen(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
                        >
                            <Plus size={14} />
                            เพิ่มรายการ
                        </button>
                    </div>
                </div>

                {/* Bottom row: Monthly Trend inline + Scoring legend */}
                <div className="flex items-center gap-3 px-5 py-2.5">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {MONTHS.map((month) => {
                            const monthData = trendData.find(t => t.month === month.value)
                            const isSelected = selectedMonth === String(month.value)
                            const hasData = monthData && monthData.total > 0

                            return (
                                <button
                                    key={month.value}
                                    onClick={() => setSelectedMonth(isSelected ? 'all' : String(month.value))}
                                    className={`flex-1 rounded-md px-1 py-1 text-center transition-all min-w-0 ${
                                        isSelected
                                            ? 'ring-2 ring-blue-300 border-blue-400 shadow-sm bg-blue-50'
                                            : hasData
                                                ? (monthData.is_pass ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-rose-50 hover:bg-rose-100')
                                                : 'bg-slate-50 hover:bg-slate-100'
                                    }`}
                                >
                                    <div className={`text-[9px] font-medium ${hasData ? (monthData.is_pass ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>
                                        {month.label}
                                    </div>
                                    <div className={`text-xs font-bold leading-tight ${hasData ? (monthData.is_pass ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-300'}`}>
                                        {hasData ? `${monthData.pass_rate}%` : '-'}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    <div className="h-8 w-px bg-slate-200 shrink-0" />

                    <div className="flex items-center gap-3 text-[10px] shrink-0">
                        <span className="text-emerald-600 font-medium">&lt;=2 วัน: Pass</span>
                        <span className="text-rose-600 font-medium">&gt;2 วัน: Fail</span>
                        <span className="text-slate-500">(Target: &gt;=85%)</span>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            {initialData.length > 0 && (
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อโครงการ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg outline-none bg-white text-sm w-64 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="text-xs text-slate-400 hover:text-slate-600"
                        >
                            ล้าง
                        </button>
                    )}
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700">โครงการ</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-28">วันรับงาน</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-28">วันติดต่อ</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">จำนวนวัน</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-16">ผล</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700">หมายเหตุ</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-16">ไฟล์</th>
                                <th className="w-[80px]"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500">
                                        <Phone size={24} className="mx-auto mb-3 text-slate-300" />
                                        <div className="text-sm">ไม่มีข้อมูล</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((record) => (
                                    <tr key={record.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${!record.is_pass ? 'bg-rose-50/30' : ''}`}>
                                        <td className="px-4 py-2.5 font-medium text-slate-700">{record.project_name}</td>
                                        <td className="text-center px-4 py-2.5 text-slate-600 text-xs">
                                            {format(new Date(record.sales_handover_date), 'd MMM yyyy', { locale: th })}
                                        </td>
                                        <td className="text-center px-4 py-2.5 text-slate-600 text-xs">
                                            {format(new Date(record.customer_contact_date), 'd MMM yyyy', { locale: th })}
                                        </td>
                                        <td className="text-center px-4 py-2.5">
                                            <span className={`inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-full text-xs font-bold ${
                                                record.is_pass
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-rose-100 text-rose-700'
                                            }`}>
                                                {record.days_taken} วัน
                                            </span>
                                        </td>
                                        <td className="text-center px-4 py-2.5">
                                            {record.is_pass ? (
                                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                                    <CheckCircle2 size={14} />
                                                    <span className="text-xs font-medium">Pass</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-rose-600">
                                                    <XCircle size={14} />
                                                    <span className="text-xs font-medium">Fail</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate" title={record.remark || '-'}>
                                            {record.remark || '-'}
                                        </td>
                                        <td className="text-center px-4 py-2.5">
                                            {record.attachments && record.attachments.length > 0 ? (
                                                <div className="flex gap-1 justify-center">
                                                    {record.attachments.map((file, i) => (
                                                        <a
                                                            href={`/api/files/${file.path.split('/').map(encodeURIComponent).join('/')}`}
                                                            key={i}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
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
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button
                                                    onClick={() => handleEdit(record)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(record.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-600">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Pass (&lt;= 2 วัน)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Fail (&gt; 2 วัน)</span>
                </div>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">ติดต่อลูกค้าหลังจากได้รับข้อมูลจาก Sales - Target: ภายใน 2 วัน (&gt;= 85% Pass)</span>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={open} onOpenChange={(val: boolean) => { if (!val) resetForm(); else setOpen(true); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Phone className="w-5 h-5 text-blue-600" />
                            {editingId ? 'แก้ไขรายการ' : 'เพิ่มรายการติดต่อลูกค้า'}
                        </DialogTitle>
                        <DialogDescription>
                            บันทึกวันที่ได้รับข้อมูลจาก Sales และวันที่ติดต่อลูกค้า (Target: ภายใน 2 วัน)
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ชื่อโครงการ</label>
                            <SmartCombobox
                                options={projectOptions}
                                value={formData.project_name}
                                onChange={(val) => setFormData({ ...formData, project_name: val })}
                                placeholder="เลือกโครงการ..."
                                searchPlaceholder="ค้นหาโครงการ..."
                                isLoading={loadingProjects}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">วันรับงานจาก Sales</label>
                                <Input
                                    type="date"
                                    value={formData.sales_handover_date}
                                    onChange={e => setFormData({ ...formData, sales_handover_date: e.target.value })}
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">วันที่ได้รับข้อมูลจาก Sales</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">วันที่ติดต่อลูกค้า</label>
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
                            <label className="text-sm font-medium">หมายเหตุ (ไม่บังคับ)</label>
                            <Input
                                placeholder="บันทึกเพิ่มเติม..."
                                value={formData.remark}
                                onChange={e => setFormData({ ...formData, remark: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">ไฟล์แนบ</label>
                            <FileUpload
                                value={formData.attachments}
                                onChange={(files) => setFormData({ ...formData, attachments: files })}
                                maxFiles={3}
                                maxSizeMB={10}
                                subFolder="kpi-records"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetForm}>ยกเลิก</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingId ? 'อัปเดต' : 'บันทึก'}
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
                            <DialogTitle className="text-red-600">ยืนยันการลบ</DialogTitle>
                            <DialogDescription>
                                คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>ยกเลิก</Button>
                            <Button variant="danger" onClick={handleDelete}>ลบ</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
