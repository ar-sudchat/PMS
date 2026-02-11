'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Lightbulb, Lock } from 'lucide-react'
import {
    getAssumptionPlans,
    createAssumptionPlan,
    deleteAssumptionPlan,
    AssumptionPlan,
} from '@/lib/actions/project-planning-actions'

// Category options
const CATEGORY_OPTIONS: Option[] = [
    { value: 'Technical', label: 'Technical' },
    { value: 'Resource', label: 'Resource' },
    { value: 'Schedule', label: 'Schedule' },
    { value: 'Budget', label: 'Budget' },
    { value: 'Other', label: 'Other' },
]

interface AssumptionPlanSectionProps {
    planId: string
    readOnly: boolean
}

interface FormData {
    type: 'ASSUMPTION' | 'CONSTRAINT'
    description: string
    category: string
}

const emptyForm: FormData = {
    type: 'ASSUMPTION',
    description: '',
    category: '',
}

export function AssumptionPlanSection({ planId, readOnly }: AssumptionPlanSectionProps) {
    const [items, setItems] = useState<AssumptionPlan[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<FormData>(emptyForm)

    // Separate assumptions and constraints
    const assumptions = useMemo(
        () => items.filter((i) => i.type === 'ASSUMPTION'),
        [items]
    )
    const constraints = useMemo(
        () => items.filter((i) => i.type === 'CONSTRAINT'),
        [items]
    )

    // Load data
    const loadData = async () => {
        setLoading(true)
        try {
            const result = await getAssumptionPlans(planId)
            if (result.success && result.data) {
                setItems(result.data)
            } else {
                toast.error(result.error || 'ไม่สามารถโหลดข้อมูลได้')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planId])

    // Selected category for form
    const selectedCategory = useMemo(
        () => CATEGORY_OPTIONS.find((c) => c.value === formData.category) || null,
        [formData.category]
    )

    // Open dialog for adding
    const handleAdd = (type: 'ASSUMPTION' | 'CONSTRAINT') => {
        setFormData({ ...emptyForm, type })
        setDialogOpen(true)
    }

    // Open delete confirmation
    const handleDeleteClick = (id: string) => {
        setDeletingId(id)
        setDeleteDialogOpen(true)
    }

    // Submit form (create only - no edit for assumptions/constraints)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.description.trim()) {
            toast.error('กรุณากรอกรายละเอียด')
            return
        }

        setSaving(true)
        try {
            const result = await createAssumptionPlan({
                planId,
                type: formData.type,
                description: formData.description.trim(),
                category: formData.category || undefined,
            })
            if (result.success) {
                toast.success(
                    formData.type === 'ASSUMPTION'
                        ? 'เพิ่มข้อสมมติสำเร็จ'
                        : 'เพิ่มข้อจำกัดสำเร็จ'
                )
                setDialogOpen(false)
                await loadData()
            } else {
                toast.error(result.error || 'ไม่สามารถเพิ่มได้')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดที่ไม่คาดคิด')
        } finally {
            setSaving(false)
        }
    }

    // Delete
    const handleDelete = async () => {
        if (!deletingId) return
        setSaving(true)
        try {
            const result = await deleteAssumptionPlan(deletingId)
            if (result.success) {
                toast.success('ลบรายการสำเร็จ')
                setDeleteDialogOpen(false)
                setDeletingId(null)
                await loadData()
            } else {
                toast.error(result.error || 'ไม่สามารถลบได้')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการลบ')
        } finally {
            setSaving(false)
        }
    }

    // Render a list section
    const renderSection = (
        title: string,
        icon: React.ReactNode,
        list: AssumptionPlan[],
        type: 'ASSUMPTION' | 'CONSTRAINT'
    ) => (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {icon}
                    <h4 className="text-md font-semibold">{title}</h4>
                    <span className="text-sm text-muted-foreground">({list.length})</span>
                </div>
                {!readOnly && (
                    <Button variant="outline" size="sm" onClick={() => handleAdd(type)}>
                        <Plus className="h-4 w-4 mr-1" />
                        เพิ่ม
                    </Button>
                )}
            </div>

            {list.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground border rounded-md bg-muted/30">
                    ยังไม่มีรายการ
                </div>
            ) : (
                <div className="space-y-2">
                    {list.map((item, idx) => (
                        <div
                            key={item.id}
                            className="flex items-start gap-3 p-3 border rounded-md bg-white hover:bg-muted/30 transition-colors"
                        >
                            <span className="text-sm text-muted-foreground font-medium min-w-[24px]">
                                {idx + 1}.
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm">{item.description}</p>
                                {item.category && (
                                    <Badge variant="outline" className="mt-1 text-xs">
                                        {item.category}
                                    </Badge>
                                )}
                            </div>
                            {!readOnly && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 flex-shrink-0 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteClick(item.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Assumptions & Constraints</h3>
                <span className="text-sm text-muted-foreground">
                    ({assumptions.length} ข้อสมมติ, {constraints.length} ข้อจำกัด)
                </span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">กำลังโหลด...</span>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Assumptions Section */}
                    {renderSection(
                        'ข้อสมมติ (Assumptions)',
                        <Lightbulb className="h-4 w-4 text-amber-500" />,
                        assumptions,
                        'ASSUMPTION'
                    )}

                    <Separator />

                    {/* Constraints Section */}
                    {renderSection(
                        'ข้อจำกัด (Constraints)',
                        <Lock className="h-4 w-4 text-slate-500" />,
                        constraints,
                        'CONSTRAINT'
                    )}
                </div>
            )}

            {/* Add Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {formData.type === 'ASSUMPTION' ? 'เพิ่มข้อสมมติ' : 'เพิ่มข้อจำกัด'}
                        </DialogTitle>
                        <DialogDescription>
                            {formData.type === 'ASSUMPTION'
                                ? 'กรอกข้อสมมติสำหรับแผนโครงการ'
                                : 'กรอกข้อจำกัดสำหรับแผนโครงการ'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="ap-desc">
                                    รายละเอียด <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="ap-desc"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={
                                        formData.type === 'ASSUMPTION'
                                            ? 'เช่น ลูกค้าจะให้ข้อมูล Requirement ภายใน 2 สัปดาห์'
                                            : 'เช่น ต้องใช้เทคโนโลยีที่กำหนดเท่านั้น'
                                    }
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>หมวดหมู่</Label>
                                <SmartCombobox
                                    options={CATEGORY_OPTIONS}
                                    value={selectedCategory}
                                    onChange={(opt) =>
                                        setFormData({ ...formData, category: (opt?.value as string) || '' })
                                    }
                                    placeholder="เลือกหมวดหมู่..."
                                    searchable={false}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                disabled={saving}
                            >
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                เพิ่ม
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                        <AlertDialogDescription>
                            คุณต้องการลบรายการนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={saving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            ลบ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
