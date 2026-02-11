'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Loader2, Search, Plus, Target, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { getAllPlans, getProjectsForPlanning, ProjectPlan } from '@/lib/actions/project-planning-actions'
import { CreatePlanDialog } from '@/components/project-planning/CreatePlanDialog'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
    { value: 'ALL', label: 'ทั้งหมด' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SUBMITTED', label: 'รอนุมัติ' },
    { value: 'APPROVED', label: 'อนุมัติแล้ว' },
    { value: 'REVISION', label: 'ต้องแก้ไข' },
]

const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SUBMITTED: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REVISION: 'bg-orange-100 text-orange-700',
    CANCELLED: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'รอนุมัติ',
    APPROVED: 'อนุมัติแล้ว',
    REVISION: 'ต้องแก้ไข',
    CANCELLED: 'ยกเลิก',
}

export default function ProjectPlanningPage() {
    const router = useRouter()
    const [plans, setPlans] = useState<ProjectPlan[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedStatus, setSelectedStatus] = useState<Option | null>(null)
    const [selectedProject, setSelectedProject] = useState<Option | null>(null)
    const [projectOptions, setProjectOptions] = useState<{ id: string; project_code: string; name: string }[]>([])
    const [createDialogOpen, setCreateDialogOpen] = useState(false)

    useEffect(() => {
        const loadOptions = async () => {
            const result = await getProjectsForPlanning()
            if (result.success && result.data) {
                setProjectOptions(result.data)
            }
        }
        loadOptions()
    }, [])

    const loadData = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await getAllPlans({
                status: (selectedStatus?.value as string) || undefined,
                search: searchTerm || undefined,
                projectId: (selectedProject?.value as string) || undefined,
            })
            if (result.success && result.data) {
                setPlans(result.data)
            }
        } catch (error) {
            console.error('Failed to load plans:', error)
        } finally {
            setIsLoading(false)
        }
    }, [selectedStatus, searchTerm, selectedProject])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleClearFilters = () => {
        setSearchTerm('')
        setSelectedStatus(null)
        setSelectedProject(null)
    }

    const formatDate = (date: string | null | undefined) => {
        if (!date) return '-'
        return format(new Date(date), 'dd/MM/yyyy')
    }

    const formatCurrency = (value: number | null | undefined) => {
        if (!value) return '-'
        return new Intl.NumberFormat('th-TH').format(value)
    }

    return (
        <div className="container mx-auto py-4 space-y-4">
            <Card>
                <CardContent className="pt-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-semibold">Project Planning</h2>
                            <span className="text-sm text-muted-foreground">วางแผนโครงการ</span>
                        </div>
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            สร้างแผนใหม่
                        </Button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div className="relative flex-1 min-w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ค้นหา รหัสโครงการ, ชื่อโครงการ, ชื่อแผน..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="w-[150px]">
                            <SmartCombobox
                                placeholder="สถานะ..."
                                options={STATUS_OPTIONS.map(s => ({
                                    value: s.value,
                                    label: s.label
                                }))}
                                value={selectedStatus}
                                onChange={setSelectedStatus}
                                searchable={false}
                            />
                        </div>
                        <div className="w-[300px]">
                            <SmartCombobox
                                placeholder="โครงการ..."
                                options={projectOptions.map(p => ({
                                    value: p.id,
                                    label: `${p.project_code} - ${p.name}`
                                }))}
                                value={selectedProject}
                                onChange={setSelectedProject}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={handleClearFilters} title="ล้างตัวกรอง">
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Table */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">รหัสโครงการ</TableHead>
                                        <TableHead>ชื่อโครงการ</TableHead>
                                        <TableHead>ชื่อแผน</TableHead>
                                        <TableHead>ลูกค้า</TableHead>
                                        <TableHead className="text-center">Version</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead>เริ่ม</TableHead>
                                        <TableHead>สิ้นสุด</TableHead>
                                        <TableHead className="text-right">Man-days</TableHead>
                                        <TableHead className="text-right">งบประมาณ</TableHead>
                                        <TableHead className="text-center">Milestones</TableHead>
                                        <TableHead className="text-center">ทีม</TableHead>
                                        <TableHead>ผู้สร้าง</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {plans.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                                                ไม่พบข้อมูลแผนโครงการ
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        plans.map((plan) => (
                                            <TableRow
                                                key={plan.plan_id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => router.push(`/project-planning/${plan.plan_id}`)}
                                            >
                                                <TableCell className="font-medium text-blue-600">
                                                    {plan.project_code}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="max-w-[180px] truncate font-medium">
                                                        {plan.project_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="max-w-[150px] truncate">
                                                        {plan.plan_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="truncate block max-w-[120px]">
                                                        {plan.customer_name || '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline">v{plan.version}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={statusColors[plan.status] || 'bg-gray-100'}>
                                                        {statusLabels[plan.status] || plan.status}
                                                    </Badge>
                                                    {plan.is_baseline && (
                                                        <Badge variant="outline" className="ml-1 text-xs">
                                                            Baseline
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm">
                                                    {formatDate(plan.planned_start_date)}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm">
                                                    {formatDate(plan.planned_end_date)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {plan.total_mandays || 0}
                                                </TableCell>
                                                <TableCell className="text-right text-sm">
                                                    {formatCurrency(plan.total_budget)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {plan.milestone_count || 0}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {plan.total_team_size || 0}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {plan.created_by_name}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Plan Dialog */}
            <CreatePlanDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                projectOptions={projectOptions}
                onSuccess={(planId) => {
                    setCreateDialogOpen(false)
                    router.push(`/project-planning/${planId}`)
                }}
            />
        </div>
    )
}
