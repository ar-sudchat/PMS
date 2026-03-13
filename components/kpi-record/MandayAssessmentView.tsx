'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Calendar as CalendarIcon, Loader2, Paperclip, Pencil, Trash2, RefreshCw, CheckCircle2, XCircle, X, Calculator, BarChart3 } from 'lucide-react'
import { createMandayAssessmentRecord, updateMandayAssessmentRecord, deleteMandayAssessmentRecord, getPresaleProjects, getMandayAssessmentMonthlyTrend, Attachment, MonthlyTrendItem } from '@/lib/actions/presale-kpi-actions'
import { fetchMktProjectById } from '@/lib/actions/mkt-tracking-actions'
import { MktDetailDialog } from '@/components/mkt-tracking/MktDetailDialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { SmartCombobox } from '@/components/ui/smart-combobox'
import FileUpload from '@/components/ui/FileUpload'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface Record {
    id: string
    project_name: string
    project_code?: string
    project_id?: string
    final_meeting_date: string
    manday_submit_date: string
    days_taken?: number
    is_pass?: boolean
    remark?: string
    created_at: string
    attachments?: Attachment[]
}

interface Props {
    initialData: Record[]
    currentYear: number
    employeeId?: string
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

export function MandayAssessmentView({ initialData, currentYear, employeeId }: Props) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
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

    // MktDetailDialog State
    const [mktDialogOpen, setMktDialogOpen] = useState(false)
    const [mktProject, setMktProject] = useState<any>(null)
    const [loadingMktProject, setLoadingMktProject] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        project_name: '',
        final_meeting_date: '',
        manday_submit_date: '',
        remark: '',
        attachments: [] as any[]
    })

    // Fetch Monthly Trend on mount
    useEffect(() => {
        const fetchTrend = async () => {
            setLoadingTrend(true)
            try {
                const result = await getMandayAssessmentMonthlyTrend(currentYear, employeeId)
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

    // Filtered data: search + month filter
    const filteredData = useMemo(() => {
        return initialData.filter(d => {
            const matchSearch = d.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.project_code && d.project_code.toLowerCase().includes(searchTerm.toLowerCase()))
            const matchMonth = selectedMonth
                ? new Date(d.final_meeting_date).getMonth() + 1 === selectedMonth
                : true
            return matchSearch && matchMonth
        })
    }, [initialData, searchTerm, selectedMonth])

    // Calculate KPI stats
    const totalRecords = filteredData.length
    const passedRecords = filteredData.filter(d => d.is_pass).length
    const failedRecords = totalRecords - passedRecords
    const passRate = totalRecords > 0 ? Math.round((passedRecords / totalRecords) * 100) : 100
    const isKpiPassed = passRate >= 85

    const resetForm = () => {
        setFormData({ project_name: '', final_meeting_date: '', manday_submit_date: '', remark: '', attachments: [] })
        setEditingId(null)
        setOpen(false)
    }

    const handleEdit = (record: Record) => {
        setEditingId(record.id)
        setFormData({
            project_name: record.project_name,
            final_meeting_date: new Date(record.final_meeting_date).toISOString().split('T')[0],
            manday_submit_date: new Date(record.manday_submit_date).toISOString().split('T')[0],
            remark: record.remark || '',
            attachments: record.attachments || []
        })
        setOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record? This cannot be undone.')) {
            return
        }

        try {
            const res = await deleteMandayAssessmentRecord(id)
            if (res.success) {
                toast.success('Record deleted')
                router.refresh()
            } else {
                toast.error('Failed to delete')
            }
        } catch (error) {
            toast.error('Error deleting record')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.project_name || !formData.final_meeting_date || !formData.manday_submit_date) {
            toast.error('Please fill all required fields')
            return
        }

        setIsSubmitting(true)
        try {
            let res
            if (editingId) {
                res = await updateMandayAssessmentRecord(editingId, {
                    project_name: formData.project_name,
                    final_meeting_date: formData.final_meeting_date,
                    manday_submit_date: formData.manday_submit_date,
                    remark: formData.remark,
                    attachments: formData.attachments
                })
            } else {
                res = await createMandayAssessmentRecord({
                    project_name: formData.project_name,
                    final_meeting_date: formData.final_meeting_date,
                    manday_submit_date: formData.manday_submit_date,
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

    const handleOpenMktDialog = async (projectId: string) => {
        setLoadingMktProject(true)
        setMktDialogOpen(true)
        try {
            const res = await fetchMktProjectById(projectId)
            if (res.success && res.data) {
                setMktProject(res.data)
            } else {
                toast.error('ไม่พบข้อมูลโครงการ')
                setMktDialogOpen(false)
            }
        } catch (error) {
            toast.error('Error loading project')
            setMktDialogOpen(false)
        } finally {
            setLoadingMktProject(false)
        }
    }

    const clearFilters = () => {
        setSearchTerm('')
        setSelectedMonth(null)
    }

    const selectedMonthLabel = selectedMonth
        ? MONTHS.find(m => m.value === selectedMonth)?.label
        : null

    return (
        <div className="p-6 w-full">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="w-6 h-6 text-purple-600" />
                        Manday Assessment Records
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">ส่ง Manday หลังการประชุมครั้งสุดท้าย - Target: ภายใน 3 วันทำการ (ไม่นับเสาร์-อาทิตย์)</p>
                </div>
                <button
                    onClick={() => { resetForm(); setOpen(true); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm shadow-purple-600/20 font-medium text-sm"
                >
                    <Plus size={16} />
                    New Record
                </button>
            </div>

            {/* KPI Summary */}
            <div className={`rounded-xl border p-4 mb-6 ${isKpiPassed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        KPI Summary {currentYear}
                        {selectedMonthLabel && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                เดือน {selectedMonthLabel}
                                <button onClick={() => setSelectedMonth(null)} className="ml-1 hover:text-purple-900">
                                    <X size={12} />
                                </button>
                            </Badge>
                        )}
                    </h3>
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
                        {isKpiPassed ? 'KPI Passed' : 'KPI Failed'}
                    </div>
                </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 size={18} className="text-purple-600" />
                        Monthly Trend - {currentYear}
                    </h3>
                    {selectedMonth && (
                        <button
                            onClick={() => setSelectedMonth(null)}
                            className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-purple-50 transition-colors"
                        >
                            <X size={14} />
                            แสดงทั้งหมด
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-12 gap-2">
                    {MONTHS.map((month) => {
                        const monthData = trendData.find(t => t.month === month.value)
                        const isSelected = selectedMonth === month.value
                        if (!monthData || monthData.total === 0) {
                            return (
                                <div
                                    key={month.value}
                                    onClick={() => setSelectedMonth(isSelected ? null : month.value)}
                                    className={`bg-slate-50 border rounded-lg p-2 text-center cursor-pointer transition-all hover:shadow-sm ${
                                        isSelected ? 'border-purple-400 ring-2 ring-purple-200' : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="text-xs font-medium text-slate-400 mb-1">{month.label}</div>
                                    <div className="text-sm font-bold text-slate-300">-</div>
                                </div>
                            )
                        }
                        return (
                            <div
                                key={month.value}
                                onClick={() => setSelectedMonth(isSelected ? null : month.value)}
                                className={`rounded-lg p-2 text-center border cursor-pointer transition-all hover:shadow-sm ${
                                    isSelected
                                        ? 'ring-2 ring-purple-300 border-purple-400 shadow-md'
                                        : monthData.is_pass
                                            ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                                            : 'bg-rose-50 border-rose-200 hover:border-rose-300'
                                } ${monthData.is_pass ? 'bg-emerald-50' : 'bg-rose-50'}`}
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
                            placeholder="Search project name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
                        />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => router.refresh()}
                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>

                    {/* Clear Filters */}
                    {(searchTerm || selectedMonth) && (
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
                            <TableHead className="font-semibold">รหัส</TableHead>
                            <TableHead className="font-semibold">Project Name</TableHead>
                            <TableHead className="font-semibold">Meeting Date</TableHead>
                            <TableHead className="font-semibold">Submit Date</TableHead>
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
                                <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Calculator className="w-8 h-8 text-slate-300" />
                                        <span>No records found</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((record) => (
                                <TableRow key={record.id} className="hover:bg-slate-50/50">
                                    <TableCell>
                                        {record.project_code && record.project_id ? (
                                            <button
                                                onClick={() => handleOpenMktDialog(record.project_id!)}
                                                className="text-purple-600 hover:text-purple-800 hover:underline font-medium text-sm"
                                            >
                                                {record.project_code}
                                            </button>
                                        ) : (
                                            <span className="text-slate-300 text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-700">{record.project_name}</TableCell>
                                    <TableCell className="text-slate-600">
                                        {format(new Date(record.final_meeting_date), 'd MMM yyyy', { locale: th })}
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {format(new Date(record.manday_submit_date), 'd MMM yyyy', { locale: th })}
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
                                                        className="text-purple-600 hover:text-purple-800"
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
                                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(record.id)}
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
                            <Calculator className="w-5 h-5 text-purple-600" />
                            {editingId ? 'Edit Record' : 'Add Manday Assessment Record'}
                        </DialogTitle>
                        <DialogDescription>
                            บันทึกวันประชุมครั้งสุดท้ายและวันส่ง Manday ให้ Sales (Target: ภายใน 3 วันทำการ)
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
                                <label className="text-sm font-medium">Final Meeting Date</label>
                                <Input
                                    type="date"
                                    value={formData.final_meeting_date}
                                    onChange={e => setFormData({ ...formData, final_meeting_date: e.target.value })}
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">วันประชุมครั้งสุดท้ายกับลูกค้า</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Submit Date</label>
                                <Input
                                    type="date"
                                    value={formData.manday_submit_date}
                                    onChange={e => setFormData({ ...formData, manday_submit_date: e.target.value })}
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">วันที่ส่ง Manday ให้ Sales</p>
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
                            <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingId ? 'Update' : 'Save'} Record
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MKT Detail Dialog */}
            <MktDetailDialog
                open={mktDialogOpen}
                onOpenChange={setMktDialogOpen}
                project={mktProject}
                onSuccess={() => {}}
            />
        </div>
    )
}
