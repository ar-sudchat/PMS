'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { createMktProject, fetchCustomersForMkt, fetchEmployeesForMkt } from '@/lib/actions/mkt-tracking-actions'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'

interface CreateMktProjectDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function CreateMktProjectDialog({ open, onOpenChange, onSuccess }: CreateMktProjectDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [customers, setCustomers] = useState<Option[]>([])
    const [employees, setEmployees] = useState<Option[]>([])

    const [formData, setFormData] = useState({
        project_code: '',
        name: '',
        name_th: '',
        description: '',
    })
    const [selectedCustomer, setSelectedCustomer] = useState<Option | null>(null)
    const [selectedPM, setSelectedPM] = useState<Option | null>(null)
    const [selectedOwner, setSelectedOwner] = useState<Option | null>(null)

    // Load dropdown options
    useEffect(() => {
        const loadOptions = async () => {
            const [customersResult, employeesResult] = await Promise.all([
                fetchCustomersForMkt(),
                fetchEmployeesForMkt(),
            ])

            if (customersResult.success && customersResult.data) {
                setCustomers(customersResult.data.map(c => ({
                    value: c.id,
                    label: c.name
                })))
            }

            if (employeesResult.success && employeesResult.data) {
                setEmployees(employeesResult.data.map(e => ({
                    value: e.id,
                    label: e.full_name
                })))
            }
        }

        if (open) {
            loadOptions()
            // Generate project code
            const year = new Date().getFullYear()
            const timestamp = Date.now().toString().slice(-4)
            setFormData(prev => ({
                ...prev,
                project_code: `MKT-${year}-${timestamp}`
            }))
        }
    }, [open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.project_code || !formData.name) {
            toast.error('กรุณากรอกรหัสโครงการและชื่อโครงการ')
            return
        }

        setIsLoading(true)
        try {
            const result = await createMktProject({
                project_code: formData.project_code,
                name: formData.name,
                name_th: formData.name_th || undefined,
                description: formData.description || undefined,
                customer_id: selectedCustomer?.value as string | undefined,
                project_manager_id: selectedPM?.value as string | undefined,
                project_owner_id: selectedOwner?.value as string | undefined,
            })

            if (result.success) {
                toast.success('สร้างโครงการ MKT สำเร็จ')
                onOpenChange(false)
                onSuccess()
                // Reset form
                setFormData({
                    project_code: '',
                    name: '',
                    name_th: '',
                    description: '',
                })
                setSelectedCustomer(null)
                setSelectedPM(null)
                setSelectedOwner(null)
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        สร้างโครงการ MKT ใหม่
                    </DialogTitle>
                    <DialogDescription>
                        กรอกข้อมูลเบื้องต้นสำหรับโครงการ Marketing ใหม่
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Project Code & Name */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="project_code">
                                    รหัสโครงการ <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="project_code"
                                    value={formData.project_code}
                                    onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                                    placeholder="MKT-2025-0001"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    ชื่อโครงการ (EN) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Project Name"
                                />
                            </div>
                        </div>

                        {/* Thai Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name_th">ชื่อโครงการ (TH)</Label>
                            <Input
                                id="name_th"
                                value={formData.name_th}
                                onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                                placeholder="ชื่อโครงการภาษาไทย"
                            />
                        </div>

                        {/* Customer */}
                        <div className="space-y-2">
                            <Label>ลูกค้า</Label>
                            <SmartCombobox
                                options={customers}
                                value={selectedCustomer}
                                onChange={setSelectedCustomer}
                                placeholder="เลือกลูกค้า..."
                            />
                        </div>

                        {/* PM & Owner */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Project Manager</Label>
                                <SmartCombobox
                                    options={employees}
                                    value={selectedPM}
                                    onChange={setSelectedPM}
                                    placeholder="เลือก PM..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Owner</Label>
                                <SmartCombobox
                                    options={employees}
                                    value={selectedOwner}
                                    onChange={setSelectedOwner}
                                    placeholder="เลือก Owner..."
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">รายละเอียด</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="รายละเอียดเพิ่มเติม..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            ยกเลิก
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            สร้างโครงการ
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
