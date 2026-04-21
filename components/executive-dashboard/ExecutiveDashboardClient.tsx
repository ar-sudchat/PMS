'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Building2, Users, FolderKanban, CheckCircle, AlertTriangle,
  AlertOctagon, Clock, TrendingUp, RefreshCw, Loader2,
  BarChart3, Target, Zap, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getExecutiveDashboardData,
  type ExecutiveDashboardData,
  type DepartmentSummary,
  type ProjectHealth,
  type MonthlyTrend,
  type LongBlockedTask
} from '@/lib/actions/executive-dashboard-actions'

interface ExecutiveDashboardClientProps {
  initialData: ExecutiveDashboardData
  year: number
}

const healthColors = {
  green: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'On Track' },
  yellow: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500', label: 'At Risk' },
  red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-500', label: 'Critical' },
}

export function ExecutiveDashboardClient({ initialData, year }: ExecutiveDashboardClientProps) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<ExecutiveDashboardData>(initialData)
  const [selectedYear, setSelectedYear] = useState(year)

  const { overview, departments, projectHealth, monthlyTrend, longBlockedTasks } = data

  const handleRefresh = () => {
    startTransition(async () => {
      const newData = await getExecutiveDashboardData(selectedYear)
      setData(newData)
    })
  }

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear)
    startTransition(async () => {
      const newData = await getExecutiveDashboardData(newYear)
      setData(newData)
    })
  }

  const greenCount = projectHealth.filter(p => p.health === 'green').length
  const yellowCount = projectHealth.filter(p => p.health === 'yellow').length
  const redCount = projectHealth.filter(p => p.health === 'red').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-7 w-7" />
              Executive Dashboard
            </h1>
            <p className="text-indigo-200 mt-1">ภาพรวมองค์กร - ปี {selectedYear + 543}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[year - 1, year].map(y => (
                <Button key={y} size="sm" variant="outline"
                  className={cn('text-white border-white/30',
                    selectedYear === y ? 'bg-white/20' : 'bg-transparent hover:bg-white/10'
                  )}
                  onClick={() => handleYearChange(y)}>
                  {y + 543}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}
              className="text-white border-white/30 hover:bg-white/20 bg-white/10">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KPICard icon={Users} label="พนักงาน" value={overview.total_employees} unit="คน" color="bg-blue-50 text-blue-700" />
        <KPICard icon={FolderKanban} label="โครงการ Active" value={overview.total_active_projects} unit="โครงการ" color="bg-purple-50 text-purple-700" />
        <KPICard icon={Target} label="Utilization" value={overview.avg_utilization_percent} unit="%" color="bg-teal-50 text-teal-700"
          status={overview.avg_utilization_percent >= 70 ? 'good' : overview.avg_utilization_percent >= 50 ? 'warn' : 'bad'} />
        <KPICard icon={CheckCircle} label="Done Rate" value={overview.done_rate} unit="%" color="bg-emerald-50 text-emerald-700" />
        <KPICard icon={AlertTriangle} label="Overdue Rate" value={overview.overdue_rate} unit="%" color="bg-orange-50 text-orange-700"
          status={overview.overdue_rate <= 10 ? 'good' : overview.overdue_rate <= 20 ? 'warn' : 'bad'} />
        <KPICard icon={AlertOctagon} label="Blocked" value={overview.blocked_tasks} unit="task" color="bg-red-50 text-red-700"
          status={overview.blocked_tasks === 0 ? 'good' : 'bad'} />
      </div>

      {/* Project Health Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-indigo-600" />
              สุขภาพโครงการ ({projectHealth.length} โครงการ)
            </span>
            <div className="flex gap-3">
              <span className="text-sm flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> ปกติ {greenCount}
              </span>
              <span className="text-sm flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> เสี่ยง {yellowCount}
              </span>
              <span className="text-sm flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> วิกฤต {redCount}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Health bar */}
          {projectHealth.length > 0 && (
            <div className="flex h-4 rounded-full overflow-hidden mb-6">
              {greenCount > 0 && <div className="bg-emerald-500" style={{ width: `${(greenCount / projectHealth.length) * 100}%` }} />}
              {yellowCount > 0 && <div className="bg-amber-400" style={{ width: `${(yellowCount / projectHealth.length) * 100}%` }} />}
              {redCount > 0 && <div className="bg-red-500" style={{ width: `${(redCount / projectHealth.length) * 100}%` }} />}
            </div>
          )}

          {/* Project List */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left p-3 font-medium text-gray-600">โครงการ</th>
                  <th className="text-left p-3 font-medium text-gray-600">PM</th>
                  <th className="text-center p-3 font-medium text-gray-600">สถานะ</th>
                  <th className="text-center p-3 font-medium text-gray-600">Task (Done/All)</th>
                  <th className="text-center p-3 font-medium text-gray-600">Blocked</th>
                  <th className="text-center p-3 font-medium text-gray-600">Overdue</th>
                  <th className="text-center p-3 font-medium text-gray-600">Manday (%)</th>
                  <th className="text-center p-3 font-medium text-gray-600">Health</th>
                </tr>
              </thead>
              <tbody>
                {projectHealth.map(p => {
                  const hc = healthColors[p.health]
                  return (
                    <tr key={p.project_id} className={cn('border-b hover:bg-gray-50 transition-colors', p.health === 'red' && 'bg-red-50/30')}>
                      <td className="p-3">
                        <p className="font-medium">{p.project_name}</p>
                        <p className="text-xs text-gray-500">{p.project_code}</p>
                      </td>
                      <td className="p-3 text-gray-600">{p.project_manager}</td>
                      <td className="text-center p-3">
                        <Badge variant="outline" className="text-xs">{p.status_name}</Badge>
                      </td>
                      <td className="text-center p-3">{p.done_tasks}/{p.total_tasks}</td>
                      <td className="text-center p-3">
                        {p.blocked_tasks > 0 && <Badge className="bg-red-100 text-red-700">{p.blocked_tasks}</Badge>}
                      </td>
                      <td className="text-center p-3">
                        {p.overdue_tasks > 0 && <Badge className="bg-orange-100 text-orange-700">{p.overdue_tasks}</Badge>}
                      </td>
                      <td className="text-center p-3">
                        {p.sold_mandays > 0 ? (
                          <span className={cn('font-medium', p.budget_used_percent > 100 ? 'text-red-600' : '')}>
                            {p.actual_mandays}/{p.sold_mandays} ({p.budget_used_percent}%)
                          </span>
                        ) : '-'}
                      </td>
                      <td className="text-center p-3">
                        <Badge className={cn('text-xs', hc.bg, hc.text)}>
                          <span className={cn('w-2 h-2 rounded-full inline-block mr-1', hc.dot)} />
                          {hc.label}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
                {projectHealth.length === 0 && (
                  <tr><td colSpan={8} className="text-center p-8 text-gray-400">ไม่พบข้อมูลโครงการ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Department Comparison + Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              เปรียบเทียบแผนก
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {departments.map(dept => (
              <div key={dept.department_id} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{dept.department_name}</span>
                    <span className="text-xs text-gray-500 ml-2">({dept.employee_count} คน)</span>
                  </div>
                  <UtilBadge percent={dept.avg_utilization} />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>Task: {dept.total_tasks}</span>
                  <span className="text-emerald-600">Done: {dept.done_tasks} ({dept.done_rate}%)</span>
                  {dept.blocked_tasks > 0 && <span className="text-red-600">Blocked: {dept.blocked_tasks}</span>}
                  {dept.overdue_tasks > 0 && <span className="text-orange-600">Overdue: {dept.overdue_tasks}</span>}
                  <span>ชม.: {dept.total_hours.toFixed(0)}</span>
                </div>
                <div className="mt-2">
                  <Progress value={dept.done_rate} className="h-1.5" />
                </div>
              </div>
            ))}
            {departments.length === 0 && <p className="text-center text-gray-400 py-4">ไม่พบข้อมูลแผนก</p>}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Trend รายเดือน (ปี {selectedYear + 543})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-1 text-xs text-gray-500 text-center">
                {monthlyTrend.map(m => (
                  <div key={m.month}>{m.month_name}</div>
                ))}
              </div>

              {/* Hours bar chart */}
              <div>
                <p className="text-xs text-gray-500 mb-1">ชั่วโมงทำงาน</p>
                <div className="grid grid-cols-12 gap-1 items-end h-20">
                  {monthlyTrend.map(m => {
                    const maxHours = Math.max(...monthlyTrend.map(t => t.total_hours), 1)
                    const height = (m.total_hours / maxHours) * 100
                    return (
                      <div key={m.month} className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 mb-0.5">{m.total_hours > 0 ? Math.round(m.total_hours) : ''}</span>
                        <div className="w-full bg-indigo-400 rounded-t" style={{ height: `${Math.max(height, 2)}%` }} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Utilization bar chart */}
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1">Utilization %</p>
                <div className="grid grid-cols-12 gap-1 items-end h-16">
                  {monthlyTrend.map(m => {
                    const color = m.avg_utilization >= 70 ? 'bg-emerald-400' :
                      m.avg_utilization >= 50 ? 'bg-amber-400' : 'bg-red-400'
                    return (
                      <div key={m.month} className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 mb-0.5">{m.avg_utilization > 0 ? `${m.avg_utilization}%` : ''}</span>
                        <div className={cn('w-full rounded-t', color)} style={{ height: `${Math.max(m.avg_utilization, 2)}%` }} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Done tasks trend */}
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1">Task สำเร็จ / เกินกำหนด</p>
                <div className="grid grid-cols-12 gap-1">
                  {monthlyTrend.map(m => (
                    <div key={m.month} className="text-center">
                      <p className="text-xs text-emerald-600 font-medium">{m.done_tasks || '-'}</p>
                      {m.overdue_tasks > 0 && <p className="text-[10px] text-red-500">{m.overdue_tasks}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Long Blocked Tasks */}
      {longBlockedTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertOctagon className="h-5 w-5" />
              งาน Block นาน (3+ วัน) - ต้องยกระดับ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium text-gray-600">Task</th>
                    <th className="text-left p-2 font-medium text-gray-600">ผู้รับผิดชอบ</th>
                    <th className="text-left p-2 font-medium text-gray-600">แผนก</th>
                    <th className="text-left p-2 font-medium text-gray-600">โครงการ</th>
                    <th className="text-center p-2 font-medium text-gray-600">Block (วัน)</th>
                  </tr>
                </thead>
                <tbody>
                  {longBlockedTasks.map(t => (
                    <tr key={t.task_id} className="border-b hover:bg-red-50">
                      <td className="p-2">
                        <p className="font-medium">{t.task_title}</p>
                        <p className="text-xs text-gray-500">{t.task_code}</p>
                      </td>
                      <td className="p-2">{t.assignee_name}</td>
                      <td className="p-2 text-gray-500">{t.department_name}</td>
                      <td className="p-2 text-gray-500">{t.project_code}</td>
                      <td className="text-center p-2">
                        <Badge className={cn('text-xs',
                          t.days_blocked >= 7 ? 'bg-red-200 text-red-800' : 'bg-orange-100 text-orange-700'
                        )}>{t.days_blocked} วัน</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Sub-components

function KPICard({ icon: Icon, label, value, unit, color, status }: {
  icon: any; label: string; value: number; unit: string; color: string; status?: 'good' | 'warn' | 'bad'
}) {
  const statusRing = status === 'good' ? 'ring-1 ring-emerald-300' :
    status === 'bad' ? 'ring-1 ring-red-300' :
    status === 'warn' ? 'ring-1 ring-amber-300' : ''

  return (
    <Card className={cn('transition-all', statusRing)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}<span className="text-sm text-gray-400 ml-1">{unit}</span></p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UtilBadge({ percent }: { percent: number }) {
  const color = percent >= 70 ? 'bg-emerald-100 text-emerald-700' :
    percent >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  return <Badge className={cn('text-xs', color)}>{percent}%</Badge>
}
