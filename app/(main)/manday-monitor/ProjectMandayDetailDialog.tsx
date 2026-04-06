'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Users, Milestone, BarChart3, TrendingUp, TrendingDown, Minus, CalendarDays } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts'
import {
    getProjectMandayDetail,
    ProjectMandayDetail,
    FilterParams
} from '@/lib/actions/manday-monitor-actions'

// Helper function to format numbers to 2 decimal places
const formatNumber = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '0.00'
    return Number(value).toFixed(2)
}

interface ProjectMandayDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string | null
    filters: FilterParams
}

export function ProjectMandayDetailDialog({
    open,
    onOpenChange,
    projectId,
    filters
}: ProjectMandayDetailDialogProps) {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<ProjectMandayDetail | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open && projectId) {
            loadData()
        }
    }, [open, projectId])

    const loadData = async () => {
        if (!projectId) return

        setLoading(true)
        setError(null)

        try {
            const result = await getProjectMandayDetail(projectId, filters)
            if (result.success && result.data) {
                setData(result.data)
            } else {
                setError(result.error || 'Failed to load data')
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (percent: number) => {
        if (percent > 100) return 'bg-red-100 text-red-700 border-red-300'
        if (percent > 90) return 'bg-amber-100 text-amber-700 border-amber-300'
        return 'bg-emerald-100 text-emerald-700 border-emerald-300'
    }

    // Custom tooltip for pie chart
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border">
                    <p className="font-medium">{data.milestone_name || data.employee_name}</p>
                    <p className="text-sm text-gray-600">{formatNumber(data.mandays)} MD ({formatNumber(data.percent)}%)</p>
                </div>
            )
        }
        return null
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto pt-6 flex flex-col">
                <DialogHeader className="flex-shrink-0 mb-2">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            {data ? (
                                <>
                                    <span className="font-bold">{data.project_code}</span>
                                    <span className="text-gray-500 ml-2 font-normal">{data.project_name}</span>
                                </>
                            ) : (
                                <span>Project Man-day Detail</span>
                            )}
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : error ? (
                    <div className="text-center py-12 text-red-600">
                        {error}
                    </div>
                ) : data ? (
                    <div className="flex-1 flex flex-col">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-5 gap-3">
                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                                <p className="text-sm text-blue-600">Budget</p>
                                <p className="text-xl font-bold text-blue-900">{formatNumber(data.budget_mandays)} MD</p>
                            </div>
                            <div className="bg-indigo-50 rounded-lg p-3 text-center">
                                <p className="text-sm text-indigo-600">Plan</p>
                                <p className="text-xl font-bold text-indigo-900">{formatNumber(data.total_planned_mandays)} MD</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3 text-center">
                                <p className="text-sm text-purple-600">Actual</p>
                                <p className="text-xl font-bold text-purple-900">{formatNumber(data.actual_mandays)} MD</p>
                            </div>
                            <div className={`rounded-lg p-3 text-center ${data.remaining_mandays < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                <p className={`text-sm ${data.remaining_mandays < 0 ? 'text-red-600' : 'text-emerald-600'}`}>Remaining</p>
                                <p className={`text-xl font-bold ${data.remaining_mandays < 0 ? 'text-red-900' : 'text-emerald-900'}`}>
                                    {formatNumber(data.remaining_mandays)} MD
                                </p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3 text-center">
                                <p className="text-sm text-amber-600">Progress</p>
                                <p className="text-xl font-bold text-amber-900">{formatNumber(data.percent_used)}%</p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <Tabs defaultValue="employee" className="mt-3 flex-1 flex flex-col">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="employee" className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    By Employee
                                </TabsTrigger>
                                <TabsTrigger value="milestone" className="flex items-center gap-2">
                                    <Milestone className="h-4 w-4" />
                                    By Milestone
                                </TabsTrigger>
                                <TabsTrigger value="matrix" className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4" />
                                    Matrix
                                </TabsTrigger>
                                <TabsTrigger value="daily" className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    Daily Log
                                </TabsTrigger>
                            </TabsList>

                            {/* By Milestone Tab */}
                            <TabsContent value="milestone" className="mt-4">
                                {/* Plan vs Actual Comparison Table */}
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="text-left p-3 font-medium">Milestone</th>
                                                <th className="text-right p-3 font-medium w-24">Plan MD</th>
                                                <th className="text-right p-3 font-medium w-24">Actual MD</th>
                                                <th className="text-right p-3 font-medium w-24">Variance</th>
                                                <th className="text-center p-3 font-medium w-48">Progress</th>
                                                <th className="text-center p-3 font-medium w-20">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.milestones.map((ms, idx) => {
                                                const progressPercent = ms.progress_percent || 0
                                                const isOverBudget = progressPercent > 100
                                                const isWarning = progressPercent > 90 && progressPercent <= 100
                                                const variance = ms.variance || 0

                                                return (
                                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: ms.color }}
                                                                />
                                                                <span className="font-medium">{ms.milestone_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="text-right p-3 text-indigo-600 font-medium">
                                                            {formatNumber(ms.planned_mandays)}
                                                        </td>
                                                        <td className="text-right p-3 text-purple-600 font-medium">
                                                            {formatNumber(ms.mandays)}
                                                        </td>
                                                        <td className={`text-right p-3 font-medium ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                                                            <div className="flex items-center justify-end gap-1">
                                                                {variance < 0 ? (
                                                                    <TrendingDown className="h-4 w-4" />
                                                                ) : variance > 0 ? (
                                                                    <TrendingUp className="h-4 w-4" />
                                                                ) : (
                                                                    <Minus className="h-4 w-4" />
                                                                )}
                                                                {variance >= 0 ? '+' : ''}{formatNumber(variance)}
                                                            </div>
                                                        </td>
                                                        <td className="p-3">
                                                            {ms.planned_mandays > 0 ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Progress
                                                                        value={Math.min(progressPercent, 100)}
                                                                        className={`h-2 flex-1 ${isOverBudget ? '[&>div]:bg-red-500' : isWarning ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
                                                                    />
                                                                    <span className={`text-sm font-medium w-14 text-right ${isOverBudget ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                                        {formatNumber(progressPercent)}%
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 text-center block">-</span>
                                                            )}
                                                        </td>
                                                        <td className="text-center p-3">
                                                            {ms.planned_mandays > 0 ? (
                                                                <Badge className={
                                                                    isOverBudget
                                                                        ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                                                        : isWarning
                                                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                                                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                                                }>
                                                                    {isOverBudget ? 'Over' : isWarning ? 'Warning' : 'Normal'}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-gray-400">N/A</Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-100 font-medium">
                                                <td className="p-3">รวม</td>
                                                <td className="text-right p-3 text-indigo-600">{formatNumber(data.total_planned_mandays)}</td>
                                                <td className="text-right p-3 text-purple-600">{formatNumber(data.actual_mandays)}</td>
                                                <td className={`text-right p-3 ${(data.total_planned_mandays - data.actual_mandays) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {(data.total_planned_mandays - data.actual_mandays) >= 0 ? '+' : ''}
                                                    {formatNumber(data.total_planned_mandays - data.actual_mandays)}
                                                </td>
                                                <td className="p-3">
                                                    {data.total_planned_mandays > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <Progress
                                                                value={Math.min((data.actual_mandays / data.total_planned_mandays) * 100, 100)}
                                                                className="h-2 flex-1"
                                                            />
                                                            <span className="text-sm font-medium w-14 text-right">
                                                                {formatNumber((data.actual_mandays / data.total_planned_mandays) * 100)}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                {data.milestones.length === 0 && (
                                    <p className="text-center text-gray-500 py-8">ไม่พบข้อมูล</p>
                                )}
                            </TabsContent>

                            {/* By Employee Tab */}
                            <TabsContent value="employee" className="mt-4">
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Donut Chart for Employees */}
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={data.employees.slice(0, 10).map(e => ({ ...e }))}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={80}
                                                    outerRadius={140}
                                                    paddingAngle={2}
                                                    dataKey="mandays"
                                                    nameKey="employee_name"
                                                    label={({ percent }) =>
                                                        (percent ?? 0) > 5 ? `${percent}%` : ''
                                                    }
                                                    labelLine={false}
                                                >
                                                    {data.employees.slice(0, 10).map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={[
                                                                '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                                                                '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
                                                            ][index % 10]}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Employee List */}
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                        {data.employees.map((emp, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                                <div
                                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                                    style={{
                                                        backgroundColor: [
                                                            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                                                            '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
                                                        ][idx % 10]
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{emp.employee_name}</p>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        {emp.position_code && <Badge variant="outline" className="text-xs">{emp.position_code}</Badge>}
                                                        <span>{formatNumber(emp.mandays)} MD</span>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary">{formatNumber(emp.percent)}%</Badge>
                                            </div>
                                        ))}
                                        {data.employees.length === 0 && (
                                            <p className="text-center text-gray-500 py-8">ไม่พบข้อมูล</p>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Matrix Tab */}
                            <TabsContent value="matrix" className="mt-4">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="text-left p-2 font-medium sticky left-0 bg-gray-100">พนักงาน</th>
                                                {data.milestones.map((ms, idx) => (
                                                    <th key={idx} className="text-center p-2 font-medium min-w-[100px]">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <div
                                                                className="w-3 h-3 rounded-full"
                                                                style={{ backgroundColor: ms.color }}
                                                            />
                                                            <span className="truncate max-w-[80px]">{ms.milestone_name}</span>
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className="text-center p-2 font-medium bg-blue-100">รวม</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.employees.map((emp, empIdx) => {
                                                const empTotal = data.matrix
                                                    .filter(m => m.employee_id === emp.employee_id)
                                                    .reduce((sum, m) => sum + m.mandays, 0)

                                                return (
                                                    <tr key={empIdx} className="border-b hover:bg-gray-50">
                                                        <td className="p-2 sticky left-0 bg-white">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{emp.employee_name}</span>
                                                                {emp.position_code && (
                                                                    <Badge variant="outline" className="text-xs">{emp.position_code}</Badge>
                                                                )}
                                                            </div>
                                                        </td>
                                                        {data.milestones.map((ms, msIdx) => {
                                                            const matrixItem = data.matrix.find(
                                                                m => m.employee_id === emp.employee_id && m.milestone_id === ms.milestone_id
                                                            )
                                                            return (
                                                                <td key={msIdx} className="text-center p-2">
                                                                    {matrixItem ? (
                                                                        <span className="text-gray-900">{formatNumber(matrixItem.mandays)}</span>
                                                                    ) : (
                                                                        <span className="text-gray-300">-</span>
                                                                    )}
                                                                </td>
                                                            )
                                                        })}
                                                        <td className="text-center p-2 bg-blue-50 font-medium">
                                                            {formatNumber(empTotal)}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-100 font-medium">
                                                <td className="p-2 sticky left-0 bg-gray-100">รวม</td>
                                                {data.milestones.map((ms, idx) => (
                                                    <td key={idx} className="text-center p-2">{formatNumber(ms.mandays)}</td>
                                                ))}
                                                <td className="text-center p-2 bg-blue-100">{formatNumber(data.actual_mandays)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </TabsContent>

                            {/* Daily Log Tab */}
                            <TabsContent value="daily" className="mt-4">
                                {data.dailyLog && data.dailyLog.length > 0 ? (
                                    (() => {
                                        // Group by date
                                        const grouped = data.dailyLog.reduce<Record<string, typeof data.dailyLog>>((acc, entry) => {
                                            const date = entry.entry_date
                                            if (!acc[date]) acc[date] = []
                                            acc[date].push(entry)
                                            return acc
                                        }, {})

                                        return (
                                            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                                {Object.entries(grouped).map(([date, entries]) => {
                                                    const dayTotal = entries.reduce((s, e) => s + (e.hours || 0), 0)
                                                    const dayMandays = entries.reduce((s, e) => s + (e.mandays || 0), 0)
                                                    const d = new Date(date)
                                                    const dayName = d.toLocaleDateString('th-TH', { weekday: 'short' })
                                                    const dateDisplay = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

                                                    return (
                                                        <div key={date} className="border rounded-lg overflow-hidden">
                                                            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b">
                                                                <div className="flex items-center gap-2">
                                                                    <CalendarDays className="h-4 w-4 text-blue-500" />
                                                                    <span className="font-semibold text-slate-800">{dayName} {dateDisplay}</span>
                                                                    <Badge variant="secondary" className="text-xs">{entries.length} รายการ</Badge>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-sm">
                                                                    <span className="text-slate-500">{formatNumber(dayTotal)} ชม.</span>
                                                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{formatNumber(dayMandays)} MD</Badge>
                                                                </div>
                                                            </div>
                                                            <table className="min-w-full text-sm">
                                                                <thead>
                                                                    <tr className="bg-gray-50 text-xs text-gray-500">
                                                                        <th className="text-left px-4 py-1.5 font-medium">พนักงาน</th>
                                                                        <th className="text-left px-3 py-1.5 font-medium">Milestone</th>
                                                                        <th className="text-left px-3 py-1.5 font-medium">Task</th>
                                                                        <th className="text-right px-3 py-1.5 font-medium w-16">ชม.</th>
                                                                        <th className="text-right px-4 py-1.5 font-medium w-16">MD</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {entries.map((entry, idx) => (
                                                                        <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                                                                            <td className="px-4 py-2">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="font-medium text-slate-800">{entry.employee_name}</span>
                                                                                    {entry.position_code && (
                                                                                        <Badge variant="outline" className="text-[10px] px-1 py-0">{entry.position_code}</Badge>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-3 py-2 text-slate-600">{entry.milestone_name || '-'}</td>
                                                                            <td className="px-3 py-2 text-slate-600">
                                                                                <div className="truncate max-w-[200px]" title={entry.task_name || ''}>
                                                                                    {entry.task_name || '-'}
                                                                                </div>
                                                                            </td>
                                                                            <td className="text-right px-3 py-2 font-medium text-purple-600">{formatNumber(entry.hours)}</td>
                                                                            <td className="text-right px-4 py-2 font-medium text-blue-600">{formatNumber(entry.mandays)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })()
                                ) : (
                                    <p className="text-center text-gray-500 py-8">ไม่พบข้อมูลการลงเวลา</p>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}
