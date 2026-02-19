'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { ActionTypeConfig, ActionLog } from '@/lib/actions/sales-action-log-actions'
import { toast } from 'sonner'

interface ActionLogDialogProps {
    open: boolean
    onClose: () => void
    onSave: (data: any) => Promise<{ success: boolean; error?: string }>
    actionTypes: ActionTypeConfig[]
    editData?: ActionLog | null
    defaultActionType?: string
}

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const ACTION_RESULTS = [
    { value: 'DONE', label: 'สำเร็จ', color: '#10B981', bgColor: 'bg-green-50 border-green-200 text-green-700' },
    { value: 'FOLLOW_UP', label: 'ติดตามต่อ', color: '#F59E0B', bgColor: 'bg-amber-50 border-amber-200 text-amber-700' },
    { value: 'WAITING', label: 'รอตอบกลับ', color: '#3B82F6', bgColor: 'bg-blue-50 border-blue-200 text-blue-700' },
    { value: 'IN_PROGRESS', label: 'อยู่ระหว่างดำเนินการ', color: '#8B5CF6', bgColor: 'bg-purple-50 border-purple-200 text-purple-700' },
] as const

export function ActionLogDialog({ open, onClose, onSave, actionTypes, editData, defaultActionType }: ActionLogDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [form, setForm] = useState({
        actionType: 'CALL',
        actionDate: new Date().toISOString().slice(0, 10),
        title: '',
        description: '',
        contactPerson: '',
        contactRole: '',
        participants: '',
        actionResult: 'DONE',
        followUpDate: '',
        followUpTitle: '',
    })

    useEffect(() => {
        if (editData) {
            setForm({
                actionType: editData.action_type,
                actionDate: editData.action_date ? new Date(editData.action_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                title: editData.title || '',
                description: editData.description || '',
                contactPerson: editData.contact_person || '',
                contactRole: editData.contact_role || '',
                participants: editData.participants || '',
                actionResult: editData.new_status || 'DONE',
                followUpDate: '',
                followUpTitle: '',
            })
        } else {
            setForm({
                actionType: defaultActionType || 'CALL',
                actionDate: new Date().toISOString().slice(0, 10),
                title: '', description: '', contactPerson: '', contactRole: '', participants: '',
                actionResult: 'DONE', followUpDate: '', followUpTitle: '',
            })
        }
    }, [editData, open, defaultActionType])

    const handleSubmit = async () => {
        if (!form.title.trim()) {
            toast.error('กรุณากรอกหัวข้อ')
            return
        }
        if (needsFollowUp && form.followUpDate && !form.followUpTitle.trim()) {
            setForm(f => ({ ...f, followUpTitle: 'ติดตาม: ' + form.title }))
        }
        setIsLoading(true)
        const result = await onSave({
            ...form,
            followUpTitle: form.followUpTitle || (needsFollowUp ? 'ติดตาม: ' + form.title : ''),
        })
        setIsLoading(false)
        if (result.success) {
            toast.success(editData ? 'แก้ไขสำเร็จ' : 'บันทึกสำเร็จ')
            onClose()
        } else {
            toast.error(result.error || 'เกิดข้อผิดพลาด')
        }
    }

    const showContact = ['CALL', 'MEETING', 'SEND_QUOTATION', 'SEND_DOCUMENT', 'EMAIL', 'PRESENTATION', 'DEMO'].includes(form.actionType)
    const needsFollowUp = ['FOLLOW_UP', 'WAITING'].includes(form.actionResult)

    return (
        <Modal open={open} onClose={onClose} title={editData ? 'แก้ไข Action/Todo' : 'บันทึก Action/Todo'} size="md">
            <div className="space-y-4">
                {/* Action Type */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">ประเภท Action</label>
                    <div className="grid grid-cols-5 gap-2">
                        {actionTypes.filter(t => t.type_code !== 'STATUS_CHANGE').map(t => (
                            <button
                                key={t.type_code}
                                type="button"
                                onClick={() => setForm({ ...form, actionType: t.type_code })}
                                className={`px-2 py-2 rounded-lg border text-xs font-medium text-center transition-all ${form.actionType === t.type_code
                                    ? 'border-2 shadow-sm'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                style={form.actionType === t.type_code ? { borderColor: t.color, backgroundColor: t.color + '15', color: t.color } : {}}
                            >
                                {t.type_name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date & Title */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">วันที่</label>
                        <input type="date" className={inputClass} value={form.actionDate}
                            onChange={(e) => setForm({ ...form, actionDate: e.target.value })} />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <label className="text-sm font-medium">หัวข้อ <span className="text-red-500">*</span></label>
                        <input className={inputClass} value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="เช่น โทร Follow up PO" />
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

                {/* Contact Info */}
                {showContact && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ผู้ติดต่อ</label>
                            <input className={inputClass} value={form.contactPerson}
                                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                                placeholder="ชื่อผู้ติดต่อ" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ตำแหน่ง</label>
                            <input className={inputClass} value={form.contactRole}
                                onChange={(e) => setForm({ ...form, contactRole: e.target.value })}
                                placeholder="ตำแหน่งผู้ติดต่อ" />
                        </div>
                    </div>
                )}

                {/* Participants (for MEETING) */}
                {form.actionType === 'MEETING' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">ผู้เข้าร่วม</label>
                        <input className={inputClass} value={form.participants}
                            onChange={(e) => setForm({ ...form, participants: e.target.value })}
                            placeholder="ชื่อผู้เข้าร่วม (คั่นด้วย comma)" />
                    </div>
                )}

                {/* Action Result / Status */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">ผลลัพธ์ / สถานะ</label>
                    <div className="grid grid-cols-4 gap-2">
                        {ACTION_RESULTS.map(r => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => setForm({ ...form, actionResult: r.value })}
                                className={`px-2 py-2 rounded-lg border text-xs font-medium text-center transition-all ${
                                    form.actionResult === r.value
                                        ? r.bgColor + ' border-2 shadow-sm'
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Follow-up section */}
                {needsFollowUp && (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 space-y-3">
                        <label className="text-sm font-medium text-amber-700">สร้าง Follow-up Todo</label>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-amber-600">วันที่ Follow-up</label>
                                <input type="date" className={inputClass} value={form.followUpDate}
                                    onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-xs text-amber-600">หัวข้อ Todo</label>
                                <input className={inputClass} value={form.followUpTitle}
                                    onChange={(e) => setForm({ ...form, followUpTitle: e.target.value })}
                                    placeholder={`ติดตาม: ${form.title || '...'}`} />
                            </div>
                        </div>
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
