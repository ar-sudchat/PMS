'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    ChevronDown,
    ChevronRight,
    Plus,
    Trash2,
    Calendar,
} from 'lucide-react'
import {
    ResourceProject,
    ResourceMilestone,
    MilestoneResource,
    ResourceEmployee,
    removeMilestoneResource,
} from '@/lib/actions/resource-planning-actions'
import { AddResourceDialog } from './AddResourceDialog'
import { format, eachDayOfInterval, isWeekend, isSameDay } from 'date-fns'
import { th } from 'date-fns/locale'
import { toast } from 'sonner'

interface ProjectMilestoneCardProps {
    project: ResourceProject
    employees: ResourceEmployee[]
    onRefresh: () => void
}

const ROLE_COLORS: Record<string, { bg: string; text: string; cell: string }> = {
    SA: { bg: 'bg-blue-100', text: 'text-blue-800', cell: 'bg-blue-200' },
    BA: { bg: 'bg-purple-100', text: 'text-purple-800', cell: 'bg-purple-200' },
    PG: { bg: 'bg-green-100', text: 'text-green-800', cell: 'bg-green-200' },
}

export function ProjectMilestoneCard({ project, employees, onRefresh }: ProjectMilestoneCardProps) {
    const [expanded, setExpanded] = useState(false)
    const [addDialog, setAddDialog] = useState<{
        open: boolean
        milestoneId: string
        milestoneName: string
    }>({ open: false, milestoneId: '', milestoneName: '' })

    const totalResources = project.milestones.reduce((sum, m) => sum + m.resources.length, 0)

    const handleRemoveResource = async (resourceId: string, employeeName: string) => {
        if (!confirm(`ต้องการลบ ${employeeName} ออกจาก Milestone นี้?`)) return

        const result = await removeMilestoneResource(resourceId)
        if (result.success) {
            toast.success('ลบสำเร็จ')
            onRefresh()
        } else {
            toast.error(result.error || 'เกิดข้อผิดพลาด')
        }
    }

    const openAddDialog = (milestone: ResourceMilestone) => {
        setAddDialog({
            open: true,
            milestoneId: milestone.id,
            milestoneName: milestone.milestone_name,
        })
    }

    return (
        <>
            <Card>
                <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{project.project_code}</span>
                            <span className="text-sm text-muted-foreground truncate">{project.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {project.customer_name} | PM: {project.project_manager_name}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                            {project.milestones.length} Milestones
                        </Badge>
                        <Badge variant={totalResources > 0 ? 'info' : 'secondary'} className="text-xs">
                            {totalResources} คน
                        </Badge>
                    </div>
                </div>

                {expanded && (
                    <CardContent className="pt-0 pb-4 space-y-3">
                        {project.milestones.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-4">
                                ไม่มี Milestone
                            </div>
                        ) : (
                            project.milestones.map((ms) => (
                                <MilestoneSection
                                    key={ms.id}
                                    milestone={ms}
                                    projectCode={project.project_code}
                                    onAddResource={() => openAddDialog(ms)}
                                    onRemoveResource={handleRemoveResource}
                                />
                            ))
                        )}
                    </CardContent>
                )}
            </Card>

            <AddResourceDialog
                open={addDialog.open}
                onOpenChange={(open) => setAddDialog(prev => ({ ...prev, open }))}
                milestoneId={addDialog.milestoneId}
                milestoneName={addDialog.milestoneName}
                projectCode={project.project_code}
                employees={employees}
                onSuccess={onRefresh}
            />
        </>
    )
}

// ============================================
// Milestone Section with timeline grid
// ============================================

function MilestoneSection({
    milestone,
    projectCode,
    onAddResource,
    onRemoveResource,
}: {
    milestone: ResourceMilestone
    projectCode: string
    onAddResource: () => void
    onRemoveResource: (resourceId: string, name: string) => void
}) {
    // Calculate date range for timeline grid
    const allDates = milestone.resources.flatMap(r => [new Date(r.start_date), new Date(r.end_date)])
    if (milestone.due_date) allDates.push(new Date(milestone.due_date))

    let timelineDays: Date[] = []
    if (allDates.length >= 2) {
        const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
        const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
        timelineDays = eachDayOfInterval({ start: minDate, end: maxDate })
    }

    const formatDate = (d: string | null) => {
        if (!d) return '-'
        try {
            return format(new Date(d), 'd MMM yy', { locale: th })
        } catch {
            return d
        }
    }

    const isDateInRange = (day: Date, startDate: string, endDate: string) => {
        const s = new Date(startDate)
        const e = new Date(endDate)
        s.setHours(0, 0, 0, 0)
        e.setHours(0, 0, 0, 0)
        const d = new Date(day)
        d.setHours(0, 0, 0, 0)
        return d >= s && d <= e
    }

    return (
        <div className="border rounded-lg">
            {/* Milestone header */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: milestone.milestone_color || '#6B7280' }}
                    />
                    <span className="text-sm font-medium">{milestone.milestone_name}</span>
                    {milestone.due_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {formatDate(milestone.due_date)}
                        </span>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="xs"
                    onClick={onAddResource}
                    className="text-xs"
                >
                    <Plus className="h-3 w-3 mr-1" />
                    เพิ่มคน
                </Button>
            </div>

            {/* Resources list or empty */}
            {milestone.resources.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-4">
                    ยังไม่มีพนักงาน
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b bg-muted/20">
                                <th className="text-left py-1.5 px-2 font-medium w-[200px] sticky left-0 bg-white z-10">
                                    พนักงาน
                                </th>
                                <th className="text-center py-1.5 px-2 font-medium w-[50px]">Role</th>
                                <th className="text-center py-1.5 px-2 font-medium w-[60px]">Days</th>
                                <th className="text-center py-1.5 px-2 font-medium w-[130px]">ช่วงวันที่</th>
                                {timelineDays.map((day, i) => (
                                    <th
                                        key={i}
                                        className={`text-center py-1.5 px-0.5 font-normal w-[24px] min-w-[24px] ${isWeekend(day) ? 'bg-gray-100' : ''}`}
                                    >
                                        <div className="text-[9px] leading-tight text-muted-foreground">
                                            {format(day, 'd')}
                                        </div>
                                        <div className="text-[8px] leading-tight text-muted-foreground">
                                            {format(day, 'EEE', { locale: th })}
                                        </div>
                                    </th>
                                ))}
                                <th className="w-[40px]"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {milestone.resources.map((r) => {
                                const roleStyle = ROLE_COLORS[r.role] || { bg: 'bg-gray-100', text: 'text-gray-800', cell: 'bg-gray-200' }
                                return (
                                    <tr key={r.id} className="border-b hover:bg-muted/20">
                                        <td className="py-1.5 px-2 sticky left-0 bg-white z-10">
                                            <div className="font-medium truncate max-w-[180px]">
                                                {r.employee_name}
                                            </div>
                                            {r.employee_nickname && (
                                                <div className="text-[10px] text-muted-foreground">
                                                    ({r.employee_nickname})
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-2 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${roleStyle.bg} ${roleStyle.text}`}>
                                                {r.role}
                                            </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-center font-semibold">
                                            {r.working_days}
                                        </td>
                                        <td className="py-1.5 px-2 text-center text-muted-foreground">
                                            {formatDate(r.start_date)} - {formatDate(r.end_date)}
                                        </td>
                                        {timelineDays.map((day, i) => {
                                            const inRange = isDateInRange(day, r.start_date, r.end_date)
                                            const weekend = isWeekend(day)
                                            return (
                                                <td
                                                    key={i}
                                                    className={`py-1.5 px-0.5 text-center ${weekend ? 'bg-gray-50' : ''}`}
                                                >
                                                    {inRange && !weekend && (
                                                        <div className={`w-4 h-4 rounded-sm mx-auto ${roleStyle.cell}`} />
                                                    )}
                                                    {inRange && weekend && (
                                                        <div className="w-4 h-4 rounded-sm mx-auto bg-gray-200 opacity-50" />
                                                    )}
                                                </td>
                                            )
                                        })}
                                        <td className="py-1.5 px-1 text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => onRemoveResource(r.id, r.employee_name)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
