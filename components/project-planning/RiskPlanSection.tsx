'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, ShieldAlert } from 'lucide-react'
import {
    getRiskPlans,
    createRiskPlan,
    updateRiskPlan,
    deleteRiskPlan,
    getEmployeesForPlanning,
    RiskPlan,
} from '@/lib/actions/project-planning-actions'

// Impact / Probability options
const IMPACT_OPTIONS: Option[] = [
    { value: 'LOW', label: 'ต่ำ (Low)' },
    { value: 'MEDIUM', label: 'ปานกลาง (Medium)' },
    { value: 'HIGH', label: 'สูง (High)' },
]

const PROBABILITY_OPTIONS: Option[] = [
    { value: 'LOW', label: 'ต่ำ (Low)' },
    { value: 'MEDIUM', label: 'ปานกลาง (Medium)' },
    { value: 'HIGH', label: 'สูง (High)' },
]

// Risk level badge styling
const RISK_LEVEL_STYLE: Record<string, { label: string; className: string }> = {
    CRITICAL: { label: 'วิกฤต', className: 'bg-red-600 text-white border-red-600' },
    HIGH: { label: 'สูง', className: 'bg-orange-500 text-white border-orange-500' },
    MEDIUM: { label: 'ปานกลาง', className: 'bg-yellow-400 text-yellow-900 border-yellow-400' },
    LOW: { label: 'ต่ำ', className: 'bg-green-500 text-white border-green-500' },
}

// Status display
const STATUS_LABEL: Record<string, string> = {
    IDENTIFIED: 'ระบุแล้ว',
    MONITORING: 'กำลังเฝ้าระวัง',
    MITIGATED: 'แก้ไขแล้ว',
    OCCURRED: 'เกิดขึ้นแล้ว',
    CLOSED: 'ปิดแล้ว',
}

// Calculate risk level from impact and probability
function calculateRiskLevel(impact: string, probability: string): string {
    const matrix: Record<string, Record<string, string>> = {
        HIGH: { HIGH: 'CRITICAL', MEDIUM: 'HIGH', LOW: 'MEDIUM' },
        MEDIUM: { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' },
        LOW: { HIGH: 'MEDIUM', MEDIUM: 'LOW', LOW: 'LOW' },
    }
    return matrix[impact]?.[probability] || 'MEDIUM'
}

interface RiskPlanSectionProps {
    planId: string
    readOnly: boolean
}

interface FormData {
    riskName: string
    description: string
    impact: string
    probability: string
    mitigationPlan: string
    contingencyPlan: string
    riskOwnerId: string
}

const emptyForm: FormData = {
    riskName: '',
    description: '',
    impact: '',
    probability: '',
    mitigationPlan: '',
    contingencyPlan: '',
    riskOwnerId: '',
}

export function RiskPlanSection({ planId, readOnly }: RiskPlanSectionProps) {
    const [risks, setRisks] = useState<RiskPlan[]>([])
    const [employees, setEmployees] = useState<{ id: string; full_name: string; position_name: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<RiskPlan | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<FormData>(emptyForm)

    // Load data
    const loadData = async () => {
        setLoading(true)
        try {
            const [riskResult, empResult] = await Promise.all([
                getRiskPlans(planId),
                getEmployeesForPlanning(),
            ])
            if (riskResult.success && riskResult.data) setRisks(riskResult.data)
            if (empResult.success && empResult.data) setEmployees(empResult.data)
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

    // Combobox options
    const employeeOptions: Option[] = useMemo(
        () => employees.map((e) => ({ value: e.id, label: `${e.full_name} (${e.position_name})` })),
        [employees]
    )

    // Selected options for form
    const selectedImpact = useMemo(
        () => IMPACT_OPTIONS.find((o) => o.value === formData.impact) || null,
        [formData.impact]
    )
    const selectedProbability = useMemo(
        () => PROBABILITY_OPTIONS.find((o) => o.value === formData.probability) || null,
        [formData.probability]
    )
    const selectedOwner = useMemo(
        () => employeeOptions.find((e) => e.value === formData.riskOwnerId) || null,
        [employeeOptions, formData.riskOwnerId]
    )

    // Calculated risk level preview
    const previewRiskLevel = useMemo(() => {
        if (!formData.impact || !formData.probability) return null
        return calculateRiskLevel(formData.impact, formData.probability)
    }, [formData.impact, formData.probability])

    // Dialog actions
    const handleAdd = () => {
        setEditingItem(null)
        setFormData(emptyForm)
        setDialogOpen(true)
    }

    const handleEdit = (item: RiskPlan) => {
        setEditingItem(item)
        setFormData({
            riskName: item.risk_name || '',
            description: item.description || '',
            impact: item.impact || '',
            probability: item.probability || '',
            mitigationPlan: item.mitigation_plan || '',
            contingencyPlan: item.contingency_plan || '',
            riskOwnerId: item.risk_owner_id || '',
        })
        setDialogOpen(true)
    }

    const handleDeleteClick = (id: string) => {
        setDeletingId(id)
        setDeleteDialogOpen(true)
    }

    // Submit form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.riskName.trim()) {
            toast.error('กรุณากรอกชื่อความเสี่ยง')
            return
        }
        if (!formData.impact) {
            toast.error('กรุณาเลือกระดับผลกระทบ')
            return
        }
        if (!formData.probability) {
            toast.error('กรุณาเลือกระดับความน่าจะเป็น')
            return
        }

        setSaving(true)
        try {
            if (editingItem) {
                const result = await updateRiskPlan(editingItem.id, {
                    riskName: formData.riskName.trim(),
                    description: formData.description.trim() || null,
                    impact: formData.impact,
                    probability: formData.probability,
                    mitigationPlan: formData.mitigationPlan.trim() || null,
                    contingencyPlan: formData.contingencyPlan.trim() || null,
                    riskOwnerId: formData.riskOwnerId || null,
                })
                if (result.success) {
                    toast.success('อัปเดตความเสี่ยงสำเร็จ')
                    setDialogOpen(false)
                    await loadData()
                } else {
                    toast.error(result.error || 'ไม่สามารถอัปเดตได้')
                }
            } else {
                const result = await createRiskPlan({
                    planId,
                    riskName: formData.riskName.trim(),
                    description: formData.description.trim() || undefined,
                    impact: formData.impact,
                    probability: formData.probability,
                    mitigationPlan: formData.mitigationPlan.trim() || undefined,
                    contingencyPlan: formData.contingencyPlan.trim() || undefined,
                    riskOwnerId: formData.riskOwnerId || undefined,
                })
                if (result.success) {
                    toast.success('เพิ่มความเสี่ยงสำเร็จ')
                    setDialogOpen(false)
                    await loadData()
                } else {
                    toast.error(result.error || 'ไม่สามารถเพิ่มได้')
                }
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
            const result = await deleteRiskPlan(deletingId)
            if (result.success) {
                toast.success('ลบความเสี่ยงสำเร็จ')
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

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Risk Plan</h3>
                    <span className="text-sm text-muted-foreground">({risks.length} รายการ)</span>
                </div>
                {!readOnly && (
                    <Button size="sm" onClick={handleAdd}>
                        <Plus className="h-4 w-4 mr-1" />
                        เพิ่มความเสี่ยง
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">กำลังโหลด...</span>
                </div>
            ) : risks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <ShieldAlert className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>ยังไม่มีความเสี่ยง</p>
                    {!readOnly && (
                        <Button variant="outline" size="sm" className="mt-2" onClick={handleAdd}>
                            <Plus className="h-4 w-4 mr-1" />
                            เพิ่มความเสี่ยงแรก
                        </Button>
                    )}
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ความเสี่ยง</TableHead>
                            <TableHead className="w-[80px] text-center">ผลกระทบ</TableHead>
                            <TableHead className="w-[100px] text-center">ความน่าจะเป็น</TableHead>
                            <TableHead className="w-[90px] text-center">ระดับ</TableHead>
                            <TableHead>แผนรับมือ</TableHead>
                            <TableHead className="w-[100px] text-center">สถานะ</TableHead>
                            {!readOnly && <TableHead className="w-[100px] text-center">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {risks.map((r) => {
                            const levelStyle = RISK_LEVEL_STYLE[r.risk_level] || RISK_LEVEL_STYLE.MEDIUM
                            return (
                                <TableRow key={r.id}>
                                    <TableCell>
                                        <div>
                                            <span className="font-medium">{r.risk_name}</span>
                                            {r.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                    {r.description}
                                                </p>
                                            )}
                                            {r.risk_owner_name && (
                                                <p className="text-xs text-muted-foreground">
                                                    Owner: {r.risk_owner_name}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-sm">
                                        {r.impact === 'HIGH' ? 'สูง' : r.impact === 'MEDIUM' ? 'กลาง' : 'ต่ำ'}
                                    </TableCell>
                                    <TableCell className="text-center text-sm">
                                        {r.probability === 'HIGH' ? 'สูง' : r.probability === 'MEDIUM' ? 'กลาง' : 'ต่ำ'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={levelStyle.className}>
                                            {levelStyle.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                                        <p className="line-clamp-2">{r.mitigation_plan || '-'}</p>
                                    </TableCell>
                                    <TableCell className="text-center text-sm">
                                        {STATUS_LABEL[r.status] || r.status || '-'}
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleEdit(r)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={() => handleDeleteClick(r.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'แก้ไขความเสี่ยง' : 'เพิ่มความเสี่ยง'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem
                                ? 'แก้ไขข้อมูลความเสี่ยงที่เลือก'
                                : 'กรอกข้อมูลสำหรับความเสี่ยงใหม่'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="rk-name">
                                    ชื่อความเสี่ยง <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="rk-name"
                                    value={formData.riskName}
                                    onChange={(e) => setFormData({ ...formData, riskName: e.target.value })}
                                    placeholder="เช่น ทรัพยากรไม่เพียงพอ, Requirement เปลี่ยนแปลง"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rk-desc">รายละเอียด</Label>
                                <Textarea
                                    id="rk-desc"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="รายละเอียดเพิ่มเติม..."
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>
                                        ผลกระทบ (Impact) <span className="text-red-500">*</span>
                                    </Label>
                                    <SmartCombobox
                                        options={IMPACT_OPTIONS}
                                        value={selectedImpact}
                                        onChange={(opt) =>
                                            setFormData({ ...formData, impact: (opt?.value as string) || '' })
                                        }
                                        placeholder="เลือกระดับผลกระทบ"
                                        searchable={false}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>
                                        ความน่าจะเป็น (Probability) <span className="text-red-500">*</span>
                                    </Label>
                                    <SmartCombobox
                                        options={PROBABILITY_OPTIONS}
                                        value={selectedProbability}
                                        onChange={(opt) =>
                                            setFormData({ ...formData, probability: (opt?.value as string) || '' })
                                        }
                                        placeholder="เลือกความน่าจะเป็น"
                                        searchable={false}
                                    />
                                </div>
                            </div>

                            {/* Risk level preview */}
                            {previewRiskLevel && (
                                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                    <span className="text-sm text-muted-foreground">ระดับความเสี่ยง:</span>
                                    <Badge className={RISK_LEVEL_STYLE[previewRiskLevel]?.className || ''}>
                                        {RISK_LEVEL_STYLE[previewRiskLevel]?.label || previewRiskLevel}
                                    </Badge>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="rk-mitigation">แผนรับมือ (Mitigation Plan)</Label>
                                <Textarea
                                    id="rk-mitigation"
                                    value={formData.mitigationPlan}
                                    onChange={(e) => setFormData({ ...formData, mitigationPlan: e.target.value })}
                                    placeholder="แผนการป้องกันและลดผลกระทบ..."
                                    rows={2}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rk-contingency">แผนสำรอง (Contingency Plan)</Label>
                                <Textarea
                                    id="rk-contingency"
                                    value={formData.contingencyPlan}
                                    onChange={(e) => setFormData({ ...formData, contingencyPlan: e.target.value })}
                                    placeholder="แผนสำรองเมื่อความเสี่ยงเกิดขึ้น..."
                                    rows={2}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Risk Owner</Label>
                                <SmartCombobox
                                    options={employeeOptions}
                                    value={selectedOwner}
                                    onChange={(opt) =>
                                        setFormData({ ...formData, riskOwnerId: (opt?.value as string) || '' })
                                    }
                                    placeholder="เลือกผู้รับผิดชอบ..."
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
                                {editingItem ? 'บันทึก' : 'เพิ่ม'}
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
                            คุณต้องการลบความเสี่ยงนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
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
