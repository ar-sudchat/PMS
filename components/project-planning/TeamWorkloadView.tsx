'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, CheckCircle2, Clock, Briefcase } from 'lucide-react'
import { PlanningTeamMember } from '@/lib/actions/project-planning-actions'

// ============================================
// Types
// ============================================

interface TeamWorkloadViewProps {
    team: PlanningTeamMember[]
}

// ============================================
// Position color mapping
// ============================================

const positionColorMap: Record<string, string> = {
    PM: 'bg-purple-100 text-purple-800',
    SA: 'bg-blue-100 text-blue-800',
    BA: 'bg-cyan-100 text-cyan-800',
    PG: 'bg-green-100 text-green-800',
    QA: 'bg-orange-100 text-orange-800',
    QC: 'bg-orange-100 text-orange-800',
    UX: 'bg-pink-100 text-pink-800',
    UI: 'bg-pink-100 text-pink-800',
    DBA: 'bg-yellow-100 text-yellow-800',
    DEV: 'bg-green-100 text-green-800',
    TL: 'bg-indigo-100 text-indigo-800',
    INFRA: 'bg-slate-100 text-slate-800',
}

const roleColorMap: Record<string, string> = {
    PM: 'bg-purple-600 text-white',
    Owner: 'bg-blue-600 text-white',
    Member: 'bg-slate-100 text-slate-700',
}

// ============================================
// Helper functions
// ============================================

function getPositionColor(positionCode: string): string {
    const upper = positionCode?.toUpperCase() || ''
    return positionColorMap[upper] || 'bg-gray-100 text-gray-800'
}

function getRoleColor(role: string): string {
    return roleColorMap[role] || 'bg-slate-100 text-slate-700'
}

function getProgressPercent(completed: number, assigned: number): number {
    if (assigned === 0) return 0
    return Math.min(Math.round((completed / assigned) * 100), 100)
}

function getProgressBarColor(percent: number): string {
    if (percent >= 80) return 'bg-green-500'
    if (percent >= 50) return 'bg-blue-500'
    if (percent >= 25) return 'bg-yellow-500'
    return 'bg-slate-300'
}

// ============================================
// Component
// ============================================

export function TeamWorkloadView({ team }: TeamWorkloadViewProps) {
    // Calculate summary totals
    const totalMembers = team.length
    const totalAssigned = team.reduce((sum, m) => sum + m.assigned_tasks, 0)
    const totalCompleted = team.reduce((sum, m) => sum + m.completed_tasks, 0)
    const totalInProgress = team.reduce((sum, m) => sum + m.in_progress_tasks, 0)

    // ============================================
    // Empty state
    // ============================================

    if (team.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mb-3 opacity-30" />
                        <p className="text-lg font-medium">ยังไม่มีทีมงาน</p>
                        <p className="text-sm mt-1">ยังไม่มีสมาชิกในโครงการนี้</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // ============================================
    // Render
    // ============================================

    return (
        <div className="space-y-4">
            {/* ============================================ */}
            {/* Summary row */}
            {/* ============================================ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                    <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 p-2">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">สมาชิกทั้งหมด</p>
                                <p className="text-lg font-semibold">
                                    {totalMembers} <span className="text-xs font-normal text-muted-foreground">คน</span>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-orange-50 p-2">
                                <Briefcase className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">งานที่มอบหมาย</p>
                                <p className="text-lg font-semibold">
                                    {totalAssigned} <span className="text-xs font-normal text-muted-foreground">งาน</span>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-green-50 p-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">เสร็จสิ้น</p>
                                <p className="text-lg font-semibold">
                                    {totalCompleted} <span className="text-xs font-normal text-muted-foreground">งาน</span>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-yellow-50 p-2">
                                <Clock className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">กำลังดำเนินการ</p>
                                <p className="text-lg font-semibold">
                                    {totalInProgress} <span className="text-xs font-normal text-muted-foreground">งาน</span>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ============================================ */}
            {/* Team member cards */}
            {/* ============================================ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {team.map((member) => {
                    const progress = getProgressPercent(member.completed_tasks, member.assigned_tasks)
                    const barColor = getProgressBarColor(progress)

                    return (
                        <Card key={member.employee_id}>
                            <CardContent className="pt-4 pb-4 px-4">
                                <div className="space-y-3">
                                    {/* Name and badges */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate">
                                                {member.employee_name}
                                                {member.nickname && (
                                                    <span className="font-normal text-muted-foreground">
                                                        {' '}({member.nickname})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Position and role badges */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge
                                            className={getPositionColor(member.position_code)}
                                            variant="secondary"
                                            size="sm"
                                        >
                                            {member.position_code || member.position_name}
                                        </Badge>
                                        <Badge
                                            className={getRoleColor(member.role_in_project)}
                                            variant="secondary"
                                            size="sm"
                                        >
                                            {member.role_in_project}
                                        </Badge>
                                    </div>

                                    {/* Stats row */}
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-md bg-slate-50 px-2 py-1.5">
                                            <p className="text-[10px] text-muted-foreground">มอบหมาย</p>
                                            <p className="text-sm font-semibold">{member.assigned_tasks}</p>
                                        </div>
                                        <div className="rounded-md bg-green-50 px-2 py-1.5">
                                            <p className="text-[10px] text-muted-foreground">เสร็จสิ้น</p>
                                            <p className="text-sm font-semibold text-green-700">{member.completed_tasks}</p>
                                        </div>
                                        <div className="rounded-md bg-yellow-50 px-2 py-1.5">
                                            <p className="text-[10px] text-muted-foreground">กำลังทำ</p>
                                            <p className="text-sm font-semibold text-yellow-700">{member.in_progress_tasks}</p>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div>
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">ความคืบหน้า</span>
                                            <span className="font-medium">{progress}%</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${barColor}`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Logged hours */}
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>ชั่วโมงที่บันทึก:</span>
                                        <span className="font-semibold text-foreground">
                                            {member.logged_hours.toLocaleString('th-TH', {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 1,
                                            })} ชม.
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
