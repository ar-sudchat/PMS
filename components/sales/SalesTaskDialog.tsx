'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { ActionTypeConfig, SalesTask } from '@/lib/actions/sales-action-log-actions'
import { toast } from 'sonner'

interface SalesTaskDialogProps {
    open: boolean
    onClose: () => void
    onSave: (data: any) => Promise<{ success: boolean; error?: string }>
    actionTypes: ActionTypeConfig[]
    employees: { id: string; employee_code: string; first_name: string; last_name: string; nickname?: string }[]
    currentUserId: string
    editData?: SalesTask | null
}

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function SalesTaskDialog({ open, onClose, onSave, actionTypes, employees, currentUserId, editData }: SalesTaskDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [form, setForm] = useState({
        title: '',
        description: '',
        taskType: 'FOLLOW_UP',
        dueDate: '',
        dueTime: '',
        contactPerson: '',
        contactRole: '',
        contactPhone: '',
        location: '',
        priority: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
        assignedTo: currentUserId,
    })

    useEffect(() => {
        if (editData) {
            setForm({
                title: editData.title || '',
                description: editData.description || '',
                taskType: editData.task_type || 'FOLLOW_UP',
                dueDate: editData.due_date ? editData.due_date.slice(0, 10) : '',
                dueTime: editData.due_time ? editData.due_time.slice(0, 5) : '',
                contactPerson: editData.contact_person || '',
                contactRole: editData.contact_role || '',
                contactPhone: editData.contact_phone || '',
                location: editData.location || '',
                priority: editData.priority || 'MEDIUM',
                assignedTo: editData.assigned_to || currentUserId,
            })
        } else {
            setForm({
                title: '', description: '', taskType: 'FOLLOW_UP',
                dueDate: new Date().toISOString().slice(0, 10), dueTime: '09:00',
                contactPerson: '', contactRole: '', contactPhone: '', location: '',
                priority: 'MEDIUM', assignedTo: currentUserId,
            })
        }
    }, [editData, open, currentUserId])

    const handleSubmit = async () => {
        if (!form.title.trim()) { toast.error('กรุณากรอกหัวข้อ'); return }
        if (!form.dueDate) { toast.error('กรุณาเลือกวันที่'); return }
        setIsLoading(true)
        const result = await onSave(form)
        setIsLoading(false)
        if (result.success) {
            toast.success(editData ? 'แก้ไข Task สำเร็จ' : 'เพิ่ม Task สำเร็จ')
            onClose()
        } else {
            toast.error(result.error || 'เกิดข้อผิดพลาด')
        }
    }

    const taskTypes = actionTypes.filter(t => !['STATUS_CHANGE', 'NOTE'].includes(t.type_code))

    return (
        <Modal open={open} onClose={onClose} title={editData ? 'แก้ไข Task' : 'เพิ่ม Task'} size="md">
            <div className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">หัวข้อ <span className="text-red-500">*</span></label>
                    <input className={inputClass} value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="เช่น โทร Follow up PO" />
                </div>

                {/* Task Type & Priority & Assigned */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">ประเภท</label>
                        <select className={inputClass} value={form.taskType}
                            onChange={(e) => setForm({ ...form, taskType: e.target.value })}>
                            {taskTypes.map(t => (
                                <option key={t.type_code} value={t.type_code}>{t.type_name}</option>
                            ))}
                            <option value="FOLLOW_UP">Follow Up</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">ความสำคัญ</label>
                        <select className={inputClass} value={form.priority}
                            onChange={(e) => setForm({ ...form, priority: e.target.value as any })}>
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">มอบหมายให้</label>
                        <select className={inputClass} value={form.assignedTo}
                            onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.nickname || emp.first_name} {emp.last_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Due Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">วันที่ <span className="text-red-500">*</span></label>
                        <input type="date" className={inputClass} value={form.dueDate}
                            onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">เวลา</label>
                        <input type="time" className={inputClass} value={form.dueTime}
                            onChange={(e) => setForm({ ...form, dueTime: e.target.value })} />
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">รายละเอียด</label>
                    <textarea
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="รายละเอียดเพิ่มเติม..."
                    />
                </div>

                {/* Contact & Location */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">ผู้ติดต่อ</label>
                        <input className={inputClass} value={form.contactPerson}
                            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="ชื่อ" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">ตำแหน่ง</label>
                        <input className={inputClass} value={form.contactRole}
                            onChange={(e) => setForm({ ...form, contactRole: e.target.value })} placeholder="ตำแหน่ง" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">โทรศัพท์</label>
                        <input className={inputClass} value={form.contactPhone}
                            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="เบอร์โทร" />
                    </div>
                </div>
                {form.taskType === 'MEETING' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">สถานที่</label>
                        <input className={inputClass} value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="สถานที่นัดพบ" />
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
                <Button onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
            </div>
        </Modal>
    )
}
