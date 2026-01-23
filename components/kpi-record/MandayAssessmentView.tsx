'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { createMandayAssessmentRecord } from '@/lib/actions/presale-kpi-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Record {
    id: string
    project_name: string
    final_meeting_date: string
    manday_submit_date: string
    days_taken?: number
    is_pass?: boolean
    remark?: string
    created_at: string
}

interface Props {
    initialData: Record[]
    currentYear: number
}

export function MandayAssessmentView({ initialData, currentYear }: Props) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        project_name: '',
        final_meeting_date: '',
        manday_submit_date: '',
        remark: ''
    })

    const filteredData = initialData.filter(d =>
        d.project_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.project_name || !formData.final_meeting_date || !formData.manday_submit_date) {
            toast.error('Please fill all required fields')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await createMandayAssessmentRecord({
                project_name: formData.project_name,
                final_meeting_date: formData.final_meeting_date,
                manday_submit_date: formData.manday_submit_date,
                remark: formData.remark
            })

            if (res.success) {
                toast.success('Record created successfully')
                setOpen(false)
                setFormData({ project_name: '', final_meeting_date: '', manday_submit_date: '', remark: '' })
                router.refresh()
            } else {
                toast.error('Failed to create record')
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
                    <h2 className="text-2xl font-bold tracking-tight">Manday Assessment Records</h2>
                    <p className="text-muted-foreground">
                        Track response time for submitting Manday (Target: within 3 days after final meeting)
                    </p>
                </div>
                <Button onClick={() => setOpen(true)}>
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
                                <TableHead>Meeting Date</TableHead>
                                <TableHead>Submit Date</TableHead>
                                <TableHead>Days Taken</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Remark</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No records found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium">{record.project_name}</TableCell>
                                        <TableCell>{new Date(record.final_meeting_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{new Date(record.manday_submit_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{record.days_taken} Days</TableCell>
                                        <TableCell>
                                            {record.is_pass ? (
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">PASS</Badge>
                                            ) : (
                                                <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">FAIL</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{record.remark || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Manday Assessment Record</DialogTitle>
                        <DialogDescription>
                            Record the date of final meeting and when you submitted the manday.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Project Name</label>
                            <Input
                                placeholder="e.g. Mobile App Revamp"
                                value={formData.project_name}
                                onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                                required
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
                                <p className="text-[10px] text-muted-foreground">Date meeting with customer</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Submit Date</label>
                                <Input
                                    type="date"
                                    value={formData.manday_submit_date}
                                    onChange={e => setFormData({ ...formData, manday_submit_date: e.target.value })}
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">Date submitted to Sales</p>
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
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Record
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
