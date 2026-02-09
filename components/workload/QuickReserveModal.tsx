'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Clock, User, Loader2, Zap, AlertCircle } from 'lucide-react'
import { createQuickReserveTask, getEmployeesForReserve } from '@/lib/actions/workload-actions'
import { toast } from 'sonner'

interface QuickReserveModalProps {
    open: boolean
    onClose: () => void
    onSuccess?: () => void
    defaultDate?: string
    dates?: Date[]
}

export function QuickReserveModal({
    open,
    onClose,
    onSuccess,
    defaultDate,
    dates = []
}: QuickReserveModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [employees, setEmployees] = useState<{ id: string; name: string; nickname: string; position_code: string }[]>([])
    const [loadingEmployees, setLoadingEmployees] = useState(false)

    // Project options
    const projectOptions = [
        { code: '260010', name: 'Issue ภายใน (ห้ามลง Manday)', color: 'amber' },
        { code: '260011', name: 'ลาหยุด', color: 'purple' }
    ]

    // Form state
    const [projectCode, setProjectCode] = useState('260010')
    const [title, setTitle] = useState('')
    const [estimatedHours, setEstimatedHours] = useState(7)
    const [assigneeId, setAssigneeId] = useState('')
    const [dueDate, setDueDate] = useState(defaultDate || '')

    // Load employees on mount
    useEffect(() => {
        if (open) {
            setLoadingEmployees(true)
            getEmployeesForReserve().then(result => {
                if (result.success) {
                    setEmployees(result.data)
                }
                setLoadingEmployees(false)
            })

            // Reset form
            setProjectCode('260010')
            setTitle('')
            setEstimatedHours(7)
            setAssigneeId('')
            setDueDate(defaultDate || new Date().toISOString().split('T')[0])
        }
    }, [open, defaultDate])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!title.trim()) {
            toast.error('กรุณาระบุรายละเอียดงาน')
            return
        }

        setIsSubmitting(true)

        try {
            const result = await createQuickReserveTask({
                title: title.trim(),
                estimated_hours: estimatedHours,
                assignee_id: assigneeId || undefined,
                due_date: dueDate || undefined,
                project_code: projectCode
            })

            if (result.success) {
                toast.success(`สร้าง Task สำเร็จ: ${result.data?.task_code}`)
                onSuccess?.()
                onClose()
            } else {
                toast.error(result.error || 'ไม่สามารถสร้าง Task ได้')
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Group employees by position
    const groupedEmployees = {
        PG: employees.filter(e => e.position_code === 'PG'),
        SA: employees.filter(e => e.position_code === 'SA'),
        BA: employees.filter(e => e.position_code === 'BA')
    }

    // Format date for display
    const formatDateOption = (date: Date) => {
        const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
        return {
            value: date.toISOString().split('T')[0],
            label: `${dayNames[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`
        }
    }

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Zap className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                            <div className="text-base">Quick Reserve</div>
                            <div className="text-xs font-normal text-slate-500">Issue ภายใน (ห้ามลง Manday)</div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Project Selector */}
                    <div className="flex gap-2">
                        {projectOptions.map(opt => (
                            <button
                                key={opt.code}
                                type="button"
                                onClick={() => setProjectCode(opt.code)}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                                    projectCode === opt.code
                                        ? opt.color === 'amber'
                                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                                            : 'border-purple-500 bg-purple-50 text-purple-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                <div className="font-bold">{opt.code}</div>
                                <div className="text-xs opacity-80">{opt.name}</div>
                            </button>
                        ))}
                    </div>

                    {/* Info Banner */}
                    <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
                        projectCode === '260010'
                            ? 'bg-amber-50 border border-amber-200 text-amber-700'
                            : 'bg-purple-50 border border-purple-200 text-purple-700'
                    }`}>
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium">Task นี้จะถูกสร้างในโปรเจค {projectCode}</p>
                            <p className={projectCode === '260010' ? 'text-amber-600' : 'text-purple-600'}>
                                {projectCode === '260010'
                                    ? 'ไม่นับเป็น Manday KPI และจะแสดงสถานะ "รอจ่ายงาน"'
                                    : 'สำหรับบันทึกวันลาหยุดของพนักงาน'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">รายละเอียดงาน *</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="เช่น: ประชุม Sprint Planning, Support ลูกค้า..."
                            className="text-sm"
                            autoFocus
                        />
                    </div>

                    {/* Due Date & Hours in row */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Due Date */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                วันที่
                            </Label>
                            <select
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full h-9 px-3 text-sm border rounded-md bg-white"
                            >
                                <option value="">ไม่ระบุ</option>
                                {dates.length > 0 ? (
                                    dates.map(date => {
                                        const opt = formatDateOption(date)
                                        return (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        )
                                    })
                                ) : (
                                    // Default to current week if no dates provided
                                    Array.from({ length: 7 }, (_, i) => {
                                        const date = new Date()
                                        date.setDate(date.getDate() + i)
                                        const opt = formatDateOption(date)
                                        return (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        )
                                    })
                                )}
                            </select>
                        </div>

                        {/* Estimated Hours */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                ชั่วโมง
                            </Label>
                            <div className="flex gap-1">
                                {[4, 7].map(h => (
                                    <button
                                        key={h}
                                        type="button"
                                        onClick={() => setEstimatedHours(h)}
                                        className={`flex-1 h-9 rounded-md text-sm font-medium transition-all ${
                                            estimatedHours === h
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        {h}h
                                    </button>
                                ))}
                                <Input
                                    type="number"
                                    min={1}
                                    max={24}
                                    value={estimatedHours}
                                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                                    className="w-16 h-9 text-center text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Assignee (PG) */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            PG (ผู้รับผิดชอบ)
                        </Label>
                        <select
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            className="w-full h-9 px-3 text-sm border rounded-md bg-white"
                            disabled={loadingEmployees}
                        >
                            <option value="">-- ยังไม่ระบุ (รอจ่ายงาน) --</option>
                            {Object.entries(groupedEmployees).map(([position, emps]) => (
                                emps.length > 0 && (
                                    <optgroup key={position} label={position}>
                                        {emps.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.nickname || emp.name.split(' ')[0]} - {emp.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                )
                            ))}
                        </select>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !title.trim()}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                    กำลังสร้าง...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 mr-1.5" />
                                    สร้าง Task
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
