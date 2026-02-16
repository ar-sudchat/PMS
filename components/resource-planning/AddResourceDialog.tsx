'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { addMilestoneResource, ResourceEmployee } from '@/lib/actions/resource-planning-actions'
import { toast } from 'sonner'
import { Loader2, Search, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddResourceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    milestoneId: string
    milestoneName: string
    projectCode: string
    employees: ResourceEmployee[]
    onSuccess: () => void
}

export function AddResourceDialog({
    open,
    onOpenChange,
    milestoneId,
    milestoneName,
    projectCode,
    employees,
    onSuccess,
}: AddResourceDialogProps) {
    const [role, setRole] = useState<string>('')
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [workingDays, setWorkingDays] = useState('')
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Inline combobox state
    const [comboOpen, setComboOpen] = useState(false)
    const [employeeSearch, setEmployeeSearch] = useState('')
    const [showAll, setShowAll] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const MAX_DISPLAY = 10

    // Filter employees by selected role + search
    const filteredEmployees = useMemo(() => {
        let list = role
            ? employees.filter(e => e.position_code === role)
            : employees

        if (employeeSearch) {
            const q = employeeSearch.toLowerCase().replace(/\s+/g, '')
            list = list.filter(e =>
                e.employee_name.toLowerCase().replace(/\s+/g, '').includes(q) ||
                (e.nickname && e.nickname.toLowerCase().includes(q)) ||
                e.position_code.toLowerCase().includes(q)
            )
        }

        return list
    }, [employees, role, employeeSearch])

    const displayEmployees = useMemo(() => {
        if (showAll || filteredEmployees.length <= MAX_DISPLAY) return filteredEmployees
        return filteredEmployees.slice(0, MAX_DISPLAY)
    }, [filteredEmployees, showAll])

    const hasMore = filteredEmployees.length > MAX_DISPLAY && !showAll

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId)

    // Auto-focus search when dropdown opens
    useEffect(() => {
        if (comboOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50)
        }
    }, [comboOpen])

    // Reset showAll when search changes
    useEffect(() => {
        setShowAll(false)
    }, [employeeSearch])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setComboOpen(false)
                setEmployeeSearch('')
            }
        }
        if (comboOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [comboOpen])

    const handleSubmit = async () => {
        if (!role) {
            toast.error('กรุณาเลือก Role')
            return
        }
        if (!selectedEmployeeId) {
            toast.error('กรุณาเลือกพนักงาน')
            return
        }
        if (!startDate || !endDate) {
            toast.error('กรุณากรอกวันที่เริ่มต้นและสิ้นสุด')
            return
        }
        if (!workingDays || parseInt(workingDays) <= 0) {
            toast.error('กรุณากรอก Working Days')
            return
        }
        if (new Date(startDate) > new Date(endDate)) {
            toast.error('วันที่เริ่มต้นต้องก่อนวันที่สิ้นสุด')
            return
        }

        setIsSubmitting(true)
        try {
            const result = await addMilestoneResource({
                project_milestone_id: milestoneId,
                employee_id: selectedEmployeeId,
                role,
                start_date: startDate,
                end_date: endDate,
                working_days: parseInt(workingDays),
                notes: notes || undefined,
            })

            if (result.success) {
                if (result.conflict) {
                    toast.warning(
                        `เพิ่มสำเร็จ แต่พบ Conflict กับ ${result.conflict.project_a_code} / ${result.conflict.milestone_a_name}`,
                        { duration: 5000 }
                    )
                } else {
                    toast.success('เพิ่มพนักงานสำเร็จ')
                }
                resetForm()
                onOpenChange(false)
                onSuccess()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการบันทึก')
        } finally {
            setIsSubmitting(false)
        }
    }

    const resetForm = () => {
        setRole('')
        setSelectedEmployeeId('')
        setEmployeeSearch('')
        setComboOpen(false)
        setShowAll(false)
        setStartDate('')
        setEndDate('')
        setWorkingDays('')
        setNotes('')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        เพิ่มพนักงาน - {projectCode} / {milestoneName}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Role */}
                    <div className="space-y-1.5">
                        <Label>Role <span className="text-red-500">*</span></Label>
                        <Select value={role} onValueChange={(val) => { setRole(val); setSelectedEmployeeId(''); setEmployeeSearch('') }}>
                            <SelectTrigger>
                                <SelectValue placeholder="เลือก Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SA">SA (System Analyst)</SelectItem>
                                <SelectItem value="BA">BA (Business Analyst)</SelectItem>
                                <SelectItem value="PG">PG (Programmer)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Employee - Inline Smart Combobox */}
                    <div className="space-y-1.5">
                        <Label>พนักงาน <span className="text-red-500">*</span></Label>
                        <div className="relative" ref={containerRef}>
                            {/* Trigger button - looks like SmartCombobox */}
                            <button
                                type="button"
                                className={cn(
                                    "w-full px-3 py-2 text-left border rounded-md bg-white text-gray-900",
                                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                    "cursor-pointer hover:border-input",
                                    comboOpen && "ring-2 ring-ring ring-offset-2"
                                )}
                                onClick={() => {
                                    setComboOpen(!comboOpen)
                                    if (!comboOpen) setEmployeeSearch('')
                                }}
                            >
                                <span className={cn(
                                    "block truncate text-sm",
                                    !selectedEmployee && "text-gray-400"
                                )}>
                                    {selectedEmployee
                                        ? `${selectedEmployee.employee_name}${selectedEmployee.nickname ? ` (${selectedEmployee.nickname})` : ''} [${selectedEmployee.position_code}]`
                                        : 'พิมพ์ค้นหาพนักงาน...'
                                    }
                                </span>
                                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                </span>
                            </button>

                            {/* Dropdown panel */}
                            {comboOpen && (
                                <div className="absolute z-50 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black/5 border border-slate-200">
                                    {/* Search input */}
                                    <div className="p-2 border-b">
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                            placeholder="ค้นหา..."
                                            value={employeeSearch}
                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                        />
                                    </div>

                                    {/* Count header */}
                                    <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-b">
                                        <span className="font-medium">
                                            {employeeSearch ? (
                                                <>
                                                    <Search className="inline w-3 h-3 mr-1" />
                                                    แสดง {displayEmployees.length}/{filteredEmployees.length} รายการ
                                                    {filteredEmployees.length < employees.length && ` (จากทั้งหมด ${employees.length})`}
                                                </>
                                            ) : (
                                                hasMore
                                                    ? `แสดง ${displayEmployees.length}/${filteredEmployees.length} รายการ`
                                                    : `ทั้งหมด ${filteredEmployees.length} รายการ`
                                            )}
                                        </span>
                                        {role && <span className="ml-1 text-blue-600">(กรอง: {role})</span>}
                                    </div>

                                    {/* Options list */}
                                    <div className="max-h-60 overflow-auto py-1">
                                        {filteredEmployees.length === 0 ? (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                <p>ไม่พบรายการที่ค้นหา</p>
                                                {employeeSearch && <p className="text-xs mt-1">ลองค้นหาด้วยคำอื่น</p>}
                                            </div>
                                        ) : (
                                            <>
                                                {displayEmployees.map((emp) => {
                                                    const isSelected = selectedEmployeeId === emp.id
                                                    return (
                                                        <button
                                                            key={emp.id}
                                                            type="button"
                                                            className={cn(
                                                                "w-full text-left px-3 py-2 text-sm cursor-pointer",
                                                                "hover:bg-accent hover:text-accent-foreground",
                                                                "flex items-center gap-2",
                                                                isSelected && "bg-accent/50"
                                                            )}
                                                            onClick={() => {
                                                                setSelectedEmployeeId(emp.id)
                                                                setComboOpen(false)
                                                                setEmployeeSearch('')
                                                                setShowAll(false)
                                                            }}
                                                        >
                                                            <div className="w-4 flex-shrink-0">
                                                                {isSelected && <Check className="h-4 w-4 text-primary" />}
                                                            </div>
                                                            <div className={cn("flex-1 truncate", isSelected && "font-medium")}>
                                                                {emp.employee_name}
                                                                {emp.nickname ? ` (${emp.nickname})` : ''}
                                                                {' '}
                                                                <span className="text-muted-foreground">[{emp.position_code}]</span>
                                                            </div>
                                                        </button>
                                                    )
                                                })}

                                                {/* Show more button */}
                                                {hasMore && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setShowAll(true) }}
                                                        className="w-full py-2.5 px-4 text-sm font-medium text-primary hover:text-primary/80 hover:bg-accent border-t transition-colors"
                                                    >
                                                        แสดงทั้งหมด ({filteredEmployees.length - MAX_DISPLAY} รายการเพิ่มเติม)
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>วันเริ่มต้น <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>วันสิ้นสุด <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Working Days */}
                    <div className="space-y-1.5">
                        <Label>Working Days <span className="text-red-500">*</span></Label>
                        <Input
                            type="number"
                            min="1"
                            value={workingDays}
                            onChange={(e) => setWorkingDays(e.target.value)}
                            placeholder="จำนวนวันทำงาน"
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label>หมายเหตุ</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        ยกเลิก
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        บันทึก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
