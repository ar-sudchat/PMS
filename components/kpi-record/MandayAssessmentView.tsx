'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Plus, Loader2, Paperclip, Pencil, Trash2, RefreshCw, CheckCircle2, XCircle, Calculator } from 'lucide-react'
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
    const [selectedMonth, setSelectedMonth] = useState<string>('all')
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [projectOptions, setProjectOptions] = useState<any[]>([])
    const [loadingProjects, setLoadingProjects] = useState(false)

    // Monthly Trend State
    const [trendData, setTrendData] = useState<MonthlyTrendItem[]>([])
    const [loadingTrend, setLoadingTrend] = useState(false)

    // Edit/Delete State
    const [editingId, setEditingId] = useState<string | null>(null)

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
            const matchMonth = selectedMonth !== 'all'
                ? new Date(d.final_meeting_date).getMonth() + 1 === parseInt(selectedMonth)
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

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    return (
        <div className="p-6 space-y-4 w-full bg-slate-50 min-h-screen">
            {/* Compact Header Bar */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                {/* Top Row: Icon + Title + Score + Summary + Filters */}
                <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Calculator size={18} className="text-purple-600" />
                        </div>
                        <h1 className="text-lg font-bold text-slate-800">Manday Assessment</h1>
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
                            <span className="text-rose-600 font-medium">{failedRecords} เกิน</span>
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        {/* Search */}
                        <input
                            type="text"
                            placeholder="ค้นหา..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg outline-none bg-white text-sm w-40 focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
                        />
                        {/* Year */}
                        <select
                            value={currentYear}
                            disabled
                            className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        {/* Month */}
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
                        {/* Refresh */}
                        <button
                            onClick={() => router.refresh()}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                            <RefreshCw size={16} className={loadingTrend ? 'animate-spin' : ''} />
                        </button>
                        {/* Add Button */}
                        <button
                            onClick={() => { resetForm(); setOpen(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm shadow-purple-600/20 font-medium text-sm"
                        >
                            <Plus size={14} />
                            เพิ่ม
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Monthly Trend inline + Scoring Legend */}
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
                                            ? 'ring-2 ring-purple-300 border-purple-400 shadow-sm bg-purple-50'
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
                        <span className="text-emerald-600 font-medium">&le;3 วัน: Pass</span>
                        <span className="text-rose-600 font-medium">&gt;3 วัน: Fail</span>
                        <span className="text-slate-500">(Target &ge;85%)</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700">รหัส</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700">Project Name</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-28">Meeting Date</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-28">Submit Date</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">Days</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-16">ผล</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700">Remark</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-16">ไฟล์</th>
                                <th className="w-[80px]"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-400">
                                        <Calculator className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <div className="text-sm">ไม่พบข้อมูล</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((record) => (
                                    <tr key={record.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                        <td className="px-4 py-2.5">
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
                                        </td>
                                        <td className="px-4 py-2.5 font-medium text-slate-700">{record.project_name}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600">
                                            {format(new Date(record.final_meeting_date), 'd MMM yy', { locale: th })}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-slate-600">
                                            {format(new Date(record.manday_submit_date), 'd MMM yy', { locale: th })}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-full text-xs font-bold ${
                                                record.is_pass
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-rose-100 text-rose-700'
                                            }`}>
                                                {record.days_taken}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            {record.is_pass ? (
                                                <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                                            ) : (
                                                <XCircle size={16} className="text-rose-500 mx-auto" />
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate" title={record.remark || '-'}>
                                            {record.remark || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            {record.attachments && record.attachments.length > 0 ? (
                                                <div className="flex gap-1 justify-center">
                                                    {record.attachments.map((file, i) => (
                                                        <a
                                                            href={`/api/files/${file.path.split('/').map(encodeURIComponent).join('/')}`}
                                                            key={i}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-purple-600 hover:text-purple-800"
                                                            title={file.name}
                                                        >
                                                            <Paperclip className="h-3.5 w-3.5" />
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-0.5 justify-end">
                                                <button
                                                    onClick={() => handleEdit(record)}
                                                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(record.id)}
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
            <p className="text-center text-xs text-slate-400">
                ส่ง Manday หลังการประชุมครั้งสุดท้าย - Target: ภายใน 3 วันทำการ (ไม่นับเสาร์-อาทิตย์) | Pass Rate &ge; 85% = KPI ผ่าน
            </p>

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
