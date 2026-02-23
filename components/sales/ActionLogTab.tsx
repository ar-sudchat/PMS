'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Bot, CheckCircle, Clock, ArrowRight, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { ActionLogDialog } from './ActionLogDialog'
import {
    ActionLog, ActionTypeConfig,
    createActionLog, updateActionLog, deleteActionLog
} from '@/lib/actions/sales-action-log-actions'
import { toast } from 'sonner'

interface ActionLogTabProps {
    projectId: string
    logs: ActionLog[]
    actionTypes: ActionTypeConfig[]
    onRefresh: () => void
}

const ACTION_RESULT_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    DONE: { label: 'สำเร็จ', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
    FOLLOW_UP: { label: 'ติดตามต่อ', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: ArrowRight },
    WAITING: { label: 'รอตอบกลับ', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Clock },
    IN_PROGRESS: { label: 'ดำเนินการ', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: Loader2 },
}

export function ActionLogTab({ projectId, logs, actionTypes, onRefresh }: ActionLogTabProps) {
    const [showDialog, setShowDialog] = useState(false)
    const [editData, setEditData] = useState<ActionLog | null>(null)

    const handleCreate = () => {
        setEditData(null)
        setShowDialog(true)
    }

    const handleEdit = (log: ActionLog) => {
        setEditData(log)
        setShowDialog(true)
    }

    const handleSave = async (data: any) => {
        let result
        if (editData) {
            result = await updateActionLog(editData.log_id, data)
        } else {
            result = await createActionLog({ ...data, projectId })
        }
        if (result.success) {
            handleSaveSuccess()
        }
        return result
    }

    const handleDialogClose = () => {
        setShowDialog(false)
        setEditData(null)
    }

    const handleSaveSuccess = () => {
        onRefresh()
    }

    const handleDelete = async (logId: string) => {
        if (!confirm('ต้องการลบรายการนี้?')) return
        const result = await deleteActionLog(logId)
        if (result.success) {
            toast.success('ลบสำเร็จ')
            onRefresh()
        } else {
            toast.error(result.error || 'เกิดข้อผิดพลาด')
        }
    }

    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'd MMM yyyy, HH:mm', { locale: th })
        } catch { return dateStr }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">Timeline / Action Log</h3>
                <Button onClick={handleCreate} size="sm" className="gap-1">
                    <Plus className="h-4 w-4" /> เพิ่ม Action/Todo
                </Button>
            </div>

            {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <p>ยังไม่มี Action/Todo</p>
                    <p className="text-sm mt-1">คลิก "เพิ่ม Action/Todo" เพื่อบันทึกรายการแรก</p>
                </div>
            ) : (
                <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    <div className="space-y-4">
                        {logs.map((log) => (
                            <div key={log.log_id} className="relative pl-10">
                                <div
                                    className="absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                                    style={{ backgroundColor: log.action_color || '#6B7280' }}
                                />
                                <div className={`rounded-lg border p-4 ${log.is_auto_generated ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                                                    style={{ backgroundColor: (log.action_color || '#6B7280') + '20', color: log.action_color || '#6B7280' }}
                                                >
                                                    {log.action_type_name || log.action_type}
                                                </span>
                                                <span className="font-medium text-sm text-slate-800">{log.title}</span>
                                                {log.new_status && ACTION_RESULT_MAP[log.new_status] && (() => {
                                                    const r = ACTION_RESULT_MAP[log.new_status]
                                                    const Icon = r.icon
                                                    return (
                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${r.color}`}>
                                                            <Icon className="h-3 w-3" /> {r.label}
                                                        </span>
                                                    )
                                                })()}
                                                {log.is_auto_generated && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                                                        <Bot className="h-3 w-3" /> Auto
                                                    </span>
                                                )}
                                            </div>
                                            {log.description && (
                                                <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{log.description}</p>
                                            )}
                                            {log.contact_person && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    ผู้ติดต่อ: {log.contact_person}
                                                    {log.contact_role && ` (${log.contact_role})`}
                                                </p>
                                            )}
                                            {log.participants && (
                                                <p className="text-xs text-slate-500">ผู้เข้าร่วม: {log.participants}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                                <span>{formatDate(log.action_date)}</span>
                                                <span>โดย: {log.created_by_name}</span>
                                                {log.attachment_count > 0 && (
                                                    <span className="text-blue-500">{log.attachment_count} ไฟล์</span>
                                                )}
                                            </div>
                                        </div>
                                        {!log.is_auto_generated && (
                                            <div className="flex gap-1 ml-2">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600"
                                                    onClick={() => handleEdit(log)}>
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600"
                                                    onClick={() => handleDelete(log.log_id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <ActionLogDialog
                open={showDialog}
                onClose={handleDialogClose}
                onSave={handleSave}
                actionTypes={actionTypes}
                editData={editData}
            />
        </div>
    )
}
