'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
    AlertTriangle, 
    Calendar, 
    ArrowRight, 
    Clock, 
    Layers, 
    Milestone,
    ShieldAlert
} from 'lucide-react'
import { ChangeImpactReport } from '@/lib/actions/dependency-actions'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface ImpactAlertDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    report: ChangeImpactReport | null
    onConfirm: () => void
    onCancel: () => void
    isSaving?: boolean
}

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
        return format(new Date(dateStr), 'd MMM yyyy', { locale: th })
    } catch {
        return dateStr
    }
}

export function ImpactAlertDialog({
    open,
    onOpenChange,
    report,
    onConfirm,
    onCancel,
    isSaving = false,
}: ImpactAlertDialogProps) {
    if (!report || !report.hasImpact) return null

    // Determine severity styles
    const severityConfig = {
        minor: {
            title: 'ผลกระทบระดับเล็กน้อย (Minor Impact)',
            badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25',
            iconColor: 'text-emerald-500',
            bgGlow: 'from-emerald-500/5 to-transparent',
            bannerColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            btnColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        },
        moderate: {
            title: 'ผลกระทบระดับปานกลาง (Moderate Impact)',
            badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
            iconColor: 'text-amber-500',
            bgGlow: 'from-amber-500/5 to-transparent',
            bannerColor: 'bg-amber-50 text-amber-800 border-amber-200',
            btnColor: 'bg-amber-600 hover:bg-amber-700 text-white',
        },
        major: {
            title: 'ผลกระทบระดับสูง (Major Impact)',
            badgeColor: 'bg-red-500/10 text-red-500 border-red-500/25',
            iconColor: 'text-red-500',
            bgGlow: 'from-red-500/5 to-transparent',
            bannerColor: 'bg-red-50 text-red-800 border-red-200',
            btnColor: 'bg-red-600 hover:bg-red-700 text-white',
        },
    }[report.severity]

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel() }}>
            <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-hidden flex flex-col border border-white/20 bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl">
                {/* Background decorative glow */}
                <div className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${severityConfig.bgGlow} pointer-events-none rounded-t-2xl`} />

                <DialogHeader className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm ${severityConfig.iconColor}`}>
                            <ShieldAlert className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                วิเคราะห์ผลกระทบการเปลี่ยนแผนงาน
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 mt-0.5">
                                ระบบตรวจพบว่าการขยับวันดังกล่าวจะส่งผลกระทบต่อเนื่องไปยังงานปลายทางตามทฤษฎี Finish-to-Start (FS)
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="relative z-10 flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-slate-700 text-xs">
                    {/* Summary Banner */}
                    <div className={`p-4 border rounded-xl flex items-start gap-3 ${severityConfig.bannerColor}`}>
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-sm">{severityConfig.title}</h4>
                            <p className="mt-1 leading-relaxed text-slate-600">
                                การเปลี่ยนแปลงนี้ทำให้มีงานในโครงการต้องเลื่อนตามทั้งหมด <strong className="text-slate-900">{report.totalTasksShifted} งาน</strong> และอาจส่งผลให้มี Milestone ล่าช้าออกไปสูงสุด <strong className="text-slate-900">{report.maxDelayDays} วันทำการ</strong>
                            </p>
                        </div>
                    </div>

                    {/* Affected Milestones Section */}
                    {report.impactedMilestones.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 px-1">
                                <Milestone className="h-4 w-4 text-slate-500" />
                                Milestone ที่ได้รับผลกระทบล่าช้า ({report.impactedMilestones.length})
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {report.impactedMilestones.map((ms) => (
                                    <div key={ms.id} className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-slate-800 text-xs">{ms.name}</div>
                                            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 font-mono">
                                                <span>{formatDate(ms.original_due_date)}</span>
                                                <ArrowRight className="h-3 w-3" />
                                                <span className="text-red-600 font-bold">{formatDate(ms.new_due_date)}</span>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="border-red-200 bg-red-100 text-red-700 font-mono font-bold text-[10px] py-0.5 px-2">
                                            ดีเลย์ {ms.delay_days} วันทำการ
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Affected Tasks Section */}
                    <div className="space-y-2">
                        <h3 className="font-bold text-slate-800 flex items-center gap-1.5 px-1">
                            <Layers className="h-4 w-4 text-slate-500" />
                            งานที่ต้อง Reschedule เลื่อนวันตามอัตโนมัติ ({report.impactedTasks.length})
                        </h3>
                        <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden bg-slate-50/50">
                            <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100">
                                {report.impactedTasks.map((task) => (
                                    <div key={task.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                        <div className="space-y-1 pr-4 min-w-0 flex-1">
                                            <div className="font-medium text-slate-800 truncate" title={task.title}>
                                                {task.title}
                                            </div>
                                            {task.milestone_name && (
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    📌 {task.milestone_name}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="flex items-center justify-end gap-1.5 font-mono text-[10px] text-slate-500">
                                                <span>{formatDate(task.original_due_date)}</span>
                                                <ArrowRight className="h-3 w-3" />
                                                <span className="text-amber-600 font-semibold">{formatDate(task.new_due_date)}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                ขยับออก {task.delay_days} วัน
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="relative z-10 border-t pt-4 mt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="rounded-xl px-4 py-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        ยกเลิกและกลับตำแหน่งเดิม
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSaving}
                        className={`rounded-xl px-5 py-2 flex items-center gap-2 ${severityConfig.btnColor}`}
                    >
                        {isSaving ? (
                            <>
                                <Clock className="h-4 w-4 animate-spin" />
                                กำลังบันทึกแผน...
                            </>
                        ) : (
                            <>
                                ยืนยันปรับปรุงแผนต่อเนื่อง (Cascade)
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
