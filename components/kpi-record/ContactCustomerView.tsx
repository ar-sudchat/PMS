'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Calendar as CalendarIcon, Loader2, Paperclip, Pencil, Trash2 } from 'lucide-react'
import { createCustomerContactRecord, updateCustomerContactRecord, deleteCustomerContactRecord, getPresaleProjects, Attachment } from '@/lib/actions/presale-kpi-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { SmartCombobox } from '@/components/ui/smart-combobox'
import FileUpload from '@/components/ui/FileUpload'


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

export function ContactCustomerView({ initialData, currentYear }: Props) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [projectOptions, setProjectOptions] = useState<any[]>([])
    const [loadingProjects, setLoadingProjects] = useState(false)

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Contact Customer Records</h2>
                    <p className="text-muted-foreground">
                        Track response time for new project assessments (Target: within 2 days)
                    </p>
                </div>
                <Button onClick={() => { resetForm(); setOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Record
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                        <CardTitle>Records ({currentYear})</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search Project..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Project Name</TableHead>
                                <TableHead>Handover Date</TableHead>
                                <TableHead>Contact Date</TableHead>
                                <TableHead>Days Taken</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Remark</TableHead>
                                <TableHead>Attachments</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No records found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium">{record.project_name}</TableCell>
                                        <TableCell>{new Date(record.sales_handover_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{new Date(record.customer_contact_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{record.days_taken} Days</TableCell>
                                        <TableCell>
                                            {record.is_pass ? (
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">PASS</Badge>
                                            ) : (
                                                <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">FAIL</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{record.remark || '-'}</TableCell>
                                        <TableCell>
                                            {record.attachments && record.attachments.length > 0 ? (
                                                <div className="flex gap-1">
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
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleEdit(record)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setDeleteId(record.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={(val: boolean) => { if (!val) resetForm(); else setOpen(true); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Record' : 'Add Contact Customer Record'}</DialogTitle>
                        <DialogDescription>
                            Record the date you received data and the date you contacted the customer.
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
                                <p className="text-[10px] text-muted-foreground">Date received from sales</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Contact Date</label>
                                <Input
                                    type="date"
                                    value={formData.customer_contact_date}
                                    onChange={e => setFormData({ ...formData, customer_contact_date: e.target.value })}
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">Date you contacted customer</p>
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
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingId ? 'Update' : 'Save'} Record
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>


        </div>
    )
}
