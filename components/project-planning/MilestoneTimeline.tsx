'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Pencil, Save, X, Lock, CheckCircle2, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import { PlanningMilestone, updateMilestonePlan } from '@/lib/actions/project-planning-actions'

interface MilestoneTimelineProps {
    milestones: PlanningMilestone[]
    onRefresh: () => void
}

interface EditState {
    milestoneId: string
    dueDate: string
    plannedMandays: number
}

// Format ISO date string to dd/mm/yyyy Thai format
function formatDateThai(dateStr: string | null): string {
    if (!dateStr) return '-'
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return '-'
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear() + 543 // Buddhist year
        return `${day}/${month}/${year}`
    } catch {
        return '-'
    }
}

// Convert ISO date string to yyyy-MM-dd for input[type=date]
function toInputDate(dateStr: string | null): string {
    if (!dateStr) return ''
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return ''
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    } catch {
        return ''
    }
}

// Format number with Thai locale
function formatNumber(n: number): string {
    return n.toLocaleString('th-TH')
}

export function MilestoneTimeline({ milestones, onRefresh }: MilestoneTimelineProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [editState, setEditState] = useState<EditState | null>(null)
    const [saving, setSaving] = useState(false)

    // Toggle expanded deliverables for a milestone
    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    // Start inline editing
    const handleEdit = (milestone: PlanningMilestone) => {
        setEditState({
            milestoneId: milestone.id,
            dueDate: toInputDate(milestone.due_date),
            plannedMandays: milestone.planned_mandays,
        })
    }

    // Cancel inline editing
    const handleCancel = () => {
        setEditState(null)
    }

    // Save inline edits
    const handleSave = async () => {
        if (!editState) return

        setSaving(true)
        try {
            const result = await updateMilestonePlan(editState.milestoneId, {
                dueDate: editState.dueDate || undefined,
                plannedMandays: editState.plannedMandays,
            })

            if (result.success) {
                toast.success('บันทึกข้อมูลสำเร็จ')
                setEditState(null)
                onRefresh()
            } else {
                toast.error(result.error || 'ไม่สามารถบันทึกข้อมูลได้')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการบันทึก')
        } finally {
            setSaving(false)
        }
    }

    // Calculate summary totals
    const totalPlannedMandays = milestones.reduce((sum, m) => sum + m.planned_mandays, 0)
    const totalActualMandays = milestones.reduce((sum, m) => sum + m.actual_mandays, 0)
    const totalVariance = totalPlannedMandays - totalActualMandays

    // Empty state
    if (milestones.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">ยังไม่มีข้อมูล Milestone สำหรับโปรเจกต์นี้</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="text-left font-medium px-4 py-3 w-[40px]" />
                                <th className="text-left font-medium px-4 py-3">Milestone</th>
                                <th className="text-left font-medium px-4 py-3 w-[130px]">กำหนดส่ง</th>
                                <th className="text-right font-medium px-4 py-3 w-[110px]">แผน (วัน)</th>
                                <th className="text-right font-medium px-4 py-3 w-[110px]">จริง (วัน)</th>
                                <th className="text-right font-medium px-4 py-3 w-[100px]">ส่วนต่าง</th>
                                <th className="text-left font-medium px-4 py-3 w-[160px]">ความคืบหน้า</th>
                                <th className="text-center font-medium px-4 py-3 w-[90px]">สถานะ</th>
                                <th className="text-center font-medium px-4 py-3 w-[70px]" />
                            </tr>
                        </thead>
                        <tbody>
                            {milestones.map((milestone) => {
                                const isExpanded = expandedIds.has(milestone.id)
                                const isEditing = editState?.milestoneId === milestone.id
                                const variance = milestone.planned_mandays - milestone.actual_mandays
                                const progressPercent = milestone.progress_percent
                                const hasDeliverables = milestone.deliverables.length > 0

                                return (
                                    <MilestoneRow
                                        key={milestone.id}
                                        milestone={milestone}
                                        isExpanded={isExpanded}
                                        isEditing={isEditing}
                                        editState={editState}
                                        setEditState={setEditState}
                                        saving={saving}
                                        variance={variance}
                                        progressPercent={progressPercent}
                                        hasDeliverables={hasDeliverables}
                                        onToggleExpand={() => toggleExpand(milestone.id)}
                                        onEdit={() => handleEdit(milestone)}
                                        onSave={handleSave}
                                        onCancel={handleCancel}
                                    />
                                )
                            })}

                            {/* Summary row */}
                            <tr className="border-t-2 bg-muted/50 font-semibold">
                                <td className="px-4 py-3" />
                                <td className="px-4 py-3 text-right" colSpan={1}>
                                    รวมทั้งหมด
                                </td>
                                <td className="px-4 py-3" />
                                <td className="px-4 py-3 text-right">
                                    {formatNumber(totalPlannedMandays)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {formatNumber(totalActualMandays)}
                                </td>
                                <td className={`px-4 py-3 text-right ${totalVariance < 0 ? 'text-red-600' : totalVariance > 0 ? 'text-green-600' : ''}`}>
                                    {totalVariance > 0 ? '+' : ''}{formatNumber(totalVariance)}
                                </td>
                                <td className="px-4 py-3" />
                                <td className="px-4 py-3" />
                                <td className="px-4 py-3" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}

// ============================================
// Milestone Row Sub-component
// ============================================
interface MilestoneRowProps {
    milestone: PlanningMilestone
    isExpanded: boolean
    isEditing: boolean
    editState: EditState | null
    setEditState: React.Dispatch<React.SetStateAction<EditState | null>>
    saving: boolean
    variance: number
    progressPercent: number
    hasDeliverables: boolean
    onToggleExpand: () => void
    onEdit: () => void
    onSave: () => void
    onCancel: () => void
}

function MilestoneRow({
    milestone,
    isExpanded,
    isEditing,
    editState,
    setEditState,
    saving,
    variance,
    progressPercent,
    hasDeliverables,
    onToggleExpand,
    onEdit,
    onSave,
    onCancel,
}: MilestoneRowProps) {
    return (
        <>
            {/* Main milestone row */}
            <tr className="border-b hover:bg-muted/30 transition-colors">
                {/* Expand toggle */}
                <td className="px-4 py-3">
                    {hasDeliverables ? (
                        <button
                            type="button"
                            onClick={onToggleExpand}
                            className="p-0.5 rounded hover:bg-muted transition-colors"
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>
                    ) : (
                        <span className="inline-block w-5" />
                    )}
                </td>

                {/* Milestone name with color dot */}
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: milestone.milestone_color || '#6B7280' }}
                        />
                        <span className="font-medium">{milestone.milestone_name}</span>
                    </div>
                </td>

                {/* Due date */}
                <td className="px-4 py-3">
                    {isEditing && editState ? (
                        <Input
                            type="date"
                            className="h-8 w-[130px] text-sm"
                            value={editState.dueDate}
                            onChange={(e) =>
                                setEditState({ ...editState, dueDate: e.target.value })
                            }
                        />
                    ) : (
                        <span className="text-sm">{formatDateThai(milestone.due_date)}</span>
                    )}
                </td>

                {/* Planned mandays */}
                <td className="px-4 py-3 text-right">
                    {isEditing && editState ? (
                        <Input
                            type="number"
                            min={0}
                            step={0.5}
                            className="h-8 w-[90px] text-sm text-right ml-auto"
                            value={editState.plannedMandays}
                            onChange={(e) =>
                                setEditState({
                                    ...editState,
                                    plannedMandays: Number(e.target.value) || 0,
                                })
                            }
                        />
                    ) : (
                        <span>{formatNumber(milestone.planned_mandays)}</span>
                    )}
                </td>

                {/* Actual mandays (read-only) */}
                <td className="px-4 py-3 text-right">
                    <span>{formatNumber(milestone.actual_mandays)}</span>
                </td>

                {/* Variance */}
                <td className={`px-4 py-3 text-right font-medium ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {variance > 0 ? '+' : ''}{formatNumber(variance)}
                </td>

                {/* Progress bar */}
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${Math.min(progressPercent, 100)}%`,
                                    backgroundColor: milestone.milestone_color || '#3B82F6',
                                }}
                            />
                        </div>
                        <span className="text-xs text-muted-foreground w-[60px] text-right">
                            {milestone.completed_tasks}/{milestone.tasks_count} ({progressPercent}%)
                        </span>
                    </div>
                </td>

                {/* Status badges */}
                <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                        {milestone.is_locked && (
                            <Badge variant="secondary" size="sm" className="gap-0.5">
                                <Lock className="h-3 w-3" />
                            </Badge>
                        )}
                        {milestone.is_verified && (
                            <Badge variant="success" size="sm" className="gap-0.5">
                                <CheckCircle2 className="h-3 w-3" />
                            </Badge>
                        )}
                        {!milestone.is_locked && !milestone.is_verified && (
                            <span className="text-xs text-muted-foreground">-</span>
                        )}
                    </div>
                </td>

                {/* Action buttons */}
                <td className="px-4 py-3 text-center">
                    {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={onSave}
                                disabled={saving}
                                title="บันทึก"
                            >
                                <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={onCancel}
                                disabled={saving}
                                title="ยกเลิก"
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ) : !milestone.is_locked ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={onEdit}
                            title="แก้ไข"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    ) : null}
                </td>
            </tr>

            {/* Expanded deliverables rows */}
            {isExpanded && hasDeliverables && milestone.deliverables.map((deliverable) => (
                <tr key={deliverable.id} className="border-b bg-muted/20">
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2" colSpan={2}>
                        <div className="flex items-center gap-2 pl-5">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm">{deliverable.name}</span>
                            {deliverable.is_required && (
                                <Badge variant="warning" size="sm">จำเป็น</Badge>
                            )}
                        </div>
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-muted-foreground" colSpan={2}>
                        {deliverable.submitted_date ? (
                            <span>ส่งเมื่อ {formatDateThai(deliverable.submitted_date)}</span>
                        ) : (
                            <span className="text-muted-foreground/60">ยังไม่ได้ส่ง</span>
                        )}
                    </td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2 text-center">
                        {deliverable.is_verified ? (
                            <Badge variant="success" size="sm" className="gap-0.5">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>ตรวจแล้ว</span>
                            </Badge>
                        ) : deliverable.submitted_date ? (
                            <Badge variant="outline" size="sm">รอตรวจ</Badge>
                        ) : null}
                    </td>
                    <td className="px-4 py-2" />
                </tr>
            ))}
        </>
    )
}
