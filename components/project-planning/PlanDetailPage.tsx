'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
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
import {
    ArrowLeft,
    Calendar,
    Users,
    Banknote,
    Clock,
    Milestone,
    Package,
    AlertTriangle,
    FileText,
    Send,
    CheckCircle,
    RotateCcw,
    Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
    ProjectPlan,
    submitPlanForApproval,
    approvePlan,
    requestPlanRevision,
    revertPlanToDraft,
} from '@/lib/actions/project-planning-actions'
import { MilestonePlanSection } from './MilestonePlanSection'
import { ResourcePlanSection } from './ResourcePlanSection'
import { DeliverablePlanSection } from './DeliverablePlanSection'
import { RiskPlanSection } from './RiskPlanSection'
import { AssumptionPlanSection } from './AssumptionPlanSection'
import { PlanInfoSection } from './PlanInfoSection'

// ============================================
// Types
// ============================================

interface PlanDetailPageProps {
    initialPlan: ProjectPlan
    currentUserId: string
    userRole: string
}

type TabKey = 'milestones' | 'resources' | 'deliverables' | 'risks' | 'assumptions' | 'info'

type ConfirmAction = 'submit' | 'approve' | 'revision' | 'revert' | null

// ============================================
// Status badge styling
// ============================================

const statusConfig: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
    SUBMITTED: { label: 'รออนุมัติ', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
    APPROVED: { label: 'อนุมัติแล้ว', className: 'bg-green-100 text-green-800 hover:bg-green-200' },
    REVISION: { label: 'ต้องแก้ไข', className: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
    CANCELLED: { label: 'ยกเลิก', className: 'bg-red-100 text-red-800 hover:bg-red-200' },
}

// ============================================
// Helper functions
// ============================================

function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value)
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-'
    try {
        return format(new Date(dateStr), 'dd/MM/yyyy')
    } catch {
        return '-'
    }
}

// ============================================
// Component
// ============================================

export function PlanDetailPage({ initialPlan, currentUserId, userRole }: PlanDetailPageProps) {
    const router = useRouter()
    const plan = initialPlan

    const [activeTab, setActiveTab] = useState<TabKey>('milestones')
    const [isLoading, setIsLoading] = useState(false)
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
    const [comments, setComments] = useState('')

    const isReadOnly = plan.status === 'APPROVED' || plan.status === 'CANCELLED'
    const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin'

    // ============================================
    // Tab configuration
    // ============================================

    const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
        {
            key: 'milestones',
            label: 'แผน Milestone',
            icon: <Milestone className="h-4 w-4" />,
            count: plan.milestone_count,
        },
        {
            key: 'resources',
            label: 'ทรัพยากร',
            icon: <Users className="h-4 w-4" />,
            count: plan.resource_count,
        },
        {
            key: 'deliverables',
            label: 'สิ่งส่งมอบ',
            icon: <Package className="h-4 w-4" />,
            count: plan.deliverable_count,
        },
        {
            key: 'risks',
            label: 'ความเสี่ยง',
            icon: <AlertTriangle className="h-4 w-4" />,
            count: plan.risk_count,
        },
        {
            key: 'assumptions',
            label: 'ข้อสมมติ',
            icon: <FileText className="h-4 w-4" />,
            count: (plan.assumption_count || 0) + (plan.constraint_count || 0),
        },
        {
            key: 'info',
            label: 'ข้อมูลแผน',
            icon: <FileText className="h-4 w-4" />,
        },
    ]

    // ============================================
    // Approval action handlers
    // ============================================

    const handleSubmitForApproval = async () => {
        setIsLoading(true)
        try {
            const result = await submitPlanForApproval(plan.plan_id)
            if (result.success) {
                toast.success('ส่งขออนุมัติเรียบร้อยแล้ว')
                router.refresh()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการส่งขออนุมัติ')
        } finally {
            setIsLoading(false)
            setConfirmAction(null)
            setComments('')
        }
    }

    const handleApprove = async () => {
        setIsLoading(true)
        try {
            const result = await approvePlan(plan.plan_id, comments || undefined)
            if (result.success) {
                toast.success('อนุมัติแผนเรียบร้อยแล้ว')
                router.refresh()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการอนุมัติ')
        } finally {
            setIsLoading(false)
            setConfirmAction(null)
            setComments('')
        }
    }

    const handleRequestRevision = async () => {
        if (!comments.trim()) {
            toast.error('กรุณาระบุเหตุผลในการขอแก้ไข')
            return
        }
        setIsLoading(true)
        try {
            const result = await requestPlanRevision(plan.plan_id, comments)
            if (result.success) {
                toast.success('ส่งขอแก้ไขเรียบร้อยแล้ว')
                router.refresh()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการขอแก้ไข')
        } finally {
            setIsLoading(false)
            setConfirmAction(null)
            setComments('')
        }
    }

    const handleRevertToDraft = async () => {
        setIsLoading(true)
        try {
            const result = await revertPlanToDraft(plan.plan_id)
            if (result.success) {
                toast.success('เปลี่ยนสถานะกลับเป็น Draft เรียบร้อยแล้ว')
                router.refresh()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ')
        } finally {
            setIsLoading(false)
            setConfirmAction(null)
            setComments('')
        }
    }

    const handleConfirmAction = () => {
        switch (confirmAction) {
            case 'submit':
                handleSubmitForApproval()
                break
            case 'approve':
                handleApprove()
                break
            case 'revision':
                handleRequestRevision()
                break
            case 'revert':
                handleRevertToDraft()
                break
        }
    }

    const getConfirmTitle = () => {
        switch (confirmAction) {
            case 'submit':
                return 'ยืนยันการส่งขออนุมัติ'
            case 'approve':
                return 'ยืนยันการอนุมัติแผน'
            case 'revision':
                return 'ยืนยันการขอแก้ไข'
            case 'revert':
                return 'ยืนยันการเปลี่ยนกลับเป็น Draft'
            default:
                return ''
        }
    }

    const getConfirmDescription = () => {
        switch (confirmAction) {
            case 'submit':
                return `คุณต้องการส่งแผน "${plan.plan_name}" (v${plan.version}) ขออนุมัติหรือไม่?`
            case 'approve':
                return `คุณต้องการอนุมัติแผน "${plan.plan_name}" (v${plan.version}) หรือไม่? แผนนี้จะถูกตั้งเป็น Baseline ของโครงการ`
            case 'revision':
                return `คุณต้องการส่งแผน "${plan.plan_name}" (v${plan.version}) กลับไปแก้ไขหรือไม่? กรุณาระบุเหตุผล`
            case 'revert':
                return `คุณต้องการเปลี่ยนสถานะแผน "${plan.plan_name}" (v${plan.version}) กลับเป็น Draft หรือไม่?`
            default:
                return ''
        }
    }

    const showCommentsField = confirmAction === 'approve' || confirmAction === 'revision'

    // ============================================
    // Render
    // ============================================

    return (
        <>
            <div className="space-y-6">
                {/* ============================================ */}
                {/* Header Section */}
                {/* ============================================ */}
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                        <Link href="/project-planning">
                            <Button variant="ghost" size="icon" className="mt-0.5">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {plan.project_code} - {plan.project_name}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                                <h1 className="text-2xl font-bold">{plan.plan_name}</h1>
                                <Badge variant="outline" className="text-xs">
                                    v{plan.version}
                                </Badge>
                                <Badge
                                    className={statusConfig[plan.status]?.className || 'bg-gray-100 text-gray-800'}
                                    variant="secondary"
                                >
                                    {statusConfig[plan.status]?.label || plan.status}
                                </Badge>
                                {plan.is_baseline && (
                                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200" variant="secondary">
                                        Baseline
                                    </Badge>
                                )}
                            </div>
                            {plan.customer_name && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    ลูกค้า: {plan.customer_name}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-12 md:ml-0">
                        {(plan.status === 'DRAFT' || plan.status === 'REVISION') && (
                            <Button
                                onClick={() => setConfirmAction('submit')}
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                )}
                                ส่งขออนุมัติ
                            </Button>
                        )}

                        {plan.status === 'SUBMITTED' && isManagerOrAdmin && (
                            <>
                                <Button
                                    onClick={() => setConfirmAction('approve')}
                                    disabled={isLoading}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                    )}
                                    อนุมัติ
                                </Button>
                                <Button
                                    onClick={() => setConfirmAction('revision')}
                                    disabled={isLoading}
                                    className="bg-orange-500 hover:bg-orange-600"
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    ขอแก้ไข
                                </Button>
                            </>
                        )}

                        {plan.status === 'APPROVED' && (
                            <Button
                                variant="outline"
                                onClick={() => setConfirmAction('revert')}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                )}
                                กลับเป็น Draft
                            </Button>
                        )}
                    </div>
                </div>

                {/* ============================================ */}
                {/* Plan Info Summary Cards */}
                {/* ============================================ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-4 pb-4 px-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-blue-50 p-2">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">ระยะเวลา</p>
                                    <p className="text-sm font-semibold">
                                        {formatDate(plan.planned_start_date)} - {formatDate(plan.planned_end_date)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {plan.calculated_duration || plan.duration_days || 0} วัน
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-4 pb-4 px-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-purple-50 p-2">
                                    <Clock className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Man-days รวม</p>
                                    <p className="text-lg font-semibold">
                                        {formatCurrency(plan.total_mandays)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-4 pb-4 px-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-green-50 p-2">
                                    <Banknote className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">งบประมาณรวม</p>
                                    <p className="text-lg font-semibold">
                                        {formatCurrency(plan.total_budget)} <span className="text-xs font-normal text-muted-foreground">บาท</span>
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-4 pb-4 px-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-orange-50 p-2">
                                    <Users className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">ทีมงาน</p>
                                    <p className="text-lg font-semibold">
                                        {plan.total_team_size || 0} <span className="text-xs font-normal text-muted-foreground">คน</span>
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ============================================ */}
                {/* Tabs */}
                {/* ============================================ */}
                <div className="flex border-b overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                                activeTab === tab.key
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ============================================ */}
                {/* Tab Content */}
                {/* ============================================ */}
                <div className="min-h-[400px]">
                    {activeTab === 'milestones' && (
                        <MilestonePlanSection planId={plan.plan_id} readOnly={isReadOnly} />
                    )}

                    {activeTab === 'resources' && (
                        <ResourcePlanSection planId={plan.plan_id} readOnly={isReadOnly} />
                    )}

                    {activeTab === 'deliverables' && (
                        <DeliverablePlanSection planId={plan.plan_id} readOnly={isReadOnly} />
                    )}

                    {activeTab === 'risks' && (
                        <RiskPlanSection planId={plan.plan_id} readOnly={isReadOnly} />
                    )}

                    {activeTab === 'assumptions' && (
                        <AssumptionPlanSection planId={plan.plan_id} readOnly={isReadOnly} />
                    )}

                    {activeTab === 'info' && (
                        <PlanInfoSection planId={plan.plan_id} readOnly={isReadOnly} />
                    )}
                </div>
            </div>

            {/* ============================================ */}
            {/* Confirmation Dialog */}
            {/* ============================================ */}
            <AlertDialog
                open={confirmAction !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfirmAction(null)
                        setComments('')
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{getConfirmTitle()}</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                <p>{getConfirmDescription()}</p>
                                {showCommentsField && (
                                    <div className="mt-4">
                                        <label className="text-sm font-medium text-foreground">
                                            {confirmAction === 'revision' ? 'เหตุผลในการขอแก้ไข *' : 'ความเห็น (ถ้ามี)'}
                                        </label>
                                        <Textarea
                                            className="mt-2"
                                            rows={3}
                                            value={comments}
                                            onChange={(e) => setComments(e.target.value)}
                                            placeholder={
                                                confirmAction === 'revision'
                                                    ? 'ระบุสิ่งที่ต้องแก้ไข...'
                                                    : 'ระบุความเห็น...'
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmAction}
                            disabled={isLoading || (confirmAction === 'revision' && !comments.trim())}
                            className={
                                confirmAction === 'approve'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : confirmAction === 'revision'
                                    ? 'bg-orange-500 hover:bg-orange-600'
                                    : ''
                            }
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {confirmAction === 'submit' && 'ส่งขออนุมัติ'}
                            {confirmAction === 'approve' && 'อนุมัติ'}
                            {confirmAction === 'revision' && 'ขอแก้ไข'}
                            {confirmAction === 'revert' && 'เปลี่ยนเป็น Draft'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
