'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Users, Clock, TrendingUp, Building2, FolderKanban,
  AlertTriangle, Brain, RefreshCw, Send, Download,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { askTimesheetAI } from '@/lib/actions/timesheet-ai-actions'
import { toast } from 'sonner'
import type { TimesheetDashboardData } from '@/lib/actions/timesheet-dashboard-actions'
import type { AnalyzeTimesheetResponse } from '@/lib/actions/timesheet-ai-actions'
import { exportTimesheetToExcel } from '@/lib/utils/export-timesheet-excel'

interface TimesheetDashboardProps {
  data: TimesheetDashboardData
  aiAnalysis: AnalyzeTimesheetResponse
  year: number
  month: number
}

export function TimesheetDashboard({ data, aiAnalysis, year, month }: TimesheetDashboardProps) {
  const router = useRouter()
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [isAskingAI, setIsAskingAI] = useState(false)
  const [showAllEmployees, setShowAllEmployees] = useState(false)

  const { summary, employees, departments, projects, missing, lowUtil } = data
  const analysis = aiAnalysis?.analysis

  // Filter employees by department
  const filteredEmployees = selectedDepartment === 'all'
    ? employees
    : employees.filter(e => e.department_name === selectedDepartment)

  // Handle month change
  const handleMonthChange = (newMonth: string) => {
    router.push(`/timesheet-dashboard?year=${year}&month=${newMonth}`)
  }

  // Handle year change
  const handleYearChange = (newYear: string) => {
    router.push(`/timesheet-dashboard?year=${newYear}&month=${month}`)
  }

  // Ask AI
  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return

    setIsAskingAI(true)
    try {
      const result = await askTimesheetAI(aiQuestion, year, month)

      if (result.success && result.answer) {
        setAiAnswer(result.answer)
      } else {
        toast.error('ไม่สามารถประมวลผลคำถามได้')
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    }
    setIsAskingAI(false)
  }

  // Export to Excel
  const handleExport = () => {
    try {
      exportTimesheetToExcel(data, year, month)
      toast.success('Export สำเร็จ')
    } catch {
      toast.error('ไม่สามารถ Export ได้')
    }
  }

  // Get utilization status
  const getUtilStatus = (util: number) => {
    if (util >= 80) return { icon: '✅', color: 'text-green-600', bg: 'bg-green-100' }
    if (util >= 50) return { icon: '⚠️', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { icon: '❌', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Calculate average utilization
  const avgUtil = employees?.length > 0
    ? Math.round(employees.reduce((sum, e) => sum + (e.utilization_percent || 0), 0) / employees.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Timesheet Dashboard
          </h1>
          <p className="text-gray-500">ภาพรวมการบันทึกเวลาทำงานของทีม</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <Select value={month.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, idx) => (
                <SelectItem key={idx} value={(idx + 1).toString()}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Selector */}
          <Select value={year.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>

          {/* Export Button */}
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_hours || 0} hrs</div>
            <p className={`text-xs ${(summary?.hours_change_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(summary?.hours_change_percent || 0) >= 0 ? '▲' : '▼'} {Math.abs(summary?.hours_change_percent || 0)}% vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Hours/Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.avg_hours_per_day || 0} hrs</div>
            <Progress value={((summary?.avg_hours_per_day || 0) / 7) * 100} className="mt-2 h-2" />
            <p className="text-xs text-gray-500 mt-1">Target: 7 hrs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUtil}%</div>
            <Progress value={avgUtil} className="mt-2 h-2" />
            <p className="text-xs text-gray-500 mt-1">Target: 80% {avgUtil >= 80 ? '✅' : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.active_employees || 0}</div>
            <p className="text-xs text-gray-500">of {employees?.length || 0} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.active_projects || 0}</div>
            <p className="text-xs text-gray-500">projects</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Insights
            <Badge variant="outline" className="ml-2 text-purple-600 border-purple-300">
              {analysis?.risk_level === 'high' ? '🔴 High Risk' :
                analysis?.risk_level === 'medium' ? '🟡 Medium Risk' : '🟢 Low Risk'}
            </Badge>
          </CardTitle>
          <CardDescription>วิเคราะห์โดย AI อัตโนมัติ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis ? (
            <>
              {/* Summary */}
              <div>
                <h4 className="font-medium text-gray-700 mb-1">สรุปภาพรวม</h4>
                <p className="text-gray-600">{analysis.summary}</p>
              </div>

              {/* Highlights */}
              {analysis.highlights?.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-700 mb-1">✅ จุดเด่น</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {analysis.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {analysis.concerns?.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-700 mb-1">⚠️ จุดที่ต้องสังเกต</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {analysis.concerns.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations?.length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-700 mb-1">💡 คำแนะนำ</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {analysis.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trends */}
              {analysis.trends?.length > 0 && (
                <div>
                  <h4 className="font-medium text-purple-700 mb-1">📈 แนวโน้ม</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {analysis.trends.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500">ไม่สามารถวิเคราะห์ข้อมูลได้</p>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hours by Department */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Hours by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {departments?.map((dept, idx) => {
                const maxHours = Math.max(...departments.map(d => d.total_hours || 0))
                const percent = maxHours > 0 ? ((dept.total_hours || 0) / maxHours) * 100 : 0
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{dept.department_name}</span>
                      <span className="font-medium">{dept.total_hours || 0} hrs</span>
                    </div>
                    <Progress value={percent} className="h-3" />
                  </div>
                )
              })}
              {(!departments || departments.length === 0) && (
                <p className="text-gray-500 text-center py-4">ไม่มีข้อมูล</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hours by Project */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Top Projects by Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projects?.slice(0, 5).map((proj, idx) => {
                const maxHours = Math.max(...projects.slice(0, 5).map(p => p.total_hours || 0))
                const percent = maxHours > 0 ? ((proj.total_hours || 0) / maxHours) * 100 : 0
                const isOverBudget = (proj.budget_used_percent || 0) > 100
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="truncate flex-1">{proj.project_name}</span>
                      <span className={`font-medium ${isOverBudget ? 'text-red-600' : ''}`}>
                        {proj.total_hours || 0} hrs
                        {isOverBudget && ' ⚠️'}
                      </span>
                    </div>
                    <Progress
                      value={percent}
                      className={`h-3 ${isOverBudget ? '[&>div]:bg-red-500' : ''}`}
                    />
                  </div>
                )
              })}
              {(!projects || projects.length === 0) && (
                <p className="text-gray-500 text-center py-4">ไม่มีข้อมูล</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Timesheet Overview
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map((d, idx) => (
                    <SelectItem key={idx} value={d.department_name}>
                      {d.department_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Employee</th>
                  <th className="text-left py-3 px-2">Department</th>
                  <th className="text-center py-3 px-2">W1</th>
                  <th className="text-center py-3 px-2">W2</th>
                  <th className="text-center py-3 px-2">W3</th>
                  <th className="text-center py-3 px-2">W4</th>
                  <th className="text-center py-3 px-2">W5</th>
                  <th className="text-center py-3 px-2">Total</th>
                  <th className="text-center py-3 px-2">Util%</th>
                  <th className="py-3 px-2 w-32">Progress</th>
                </tr>
              </thead>
              <tbody>
                {(showAllEmployees ? filteredEmployees : filteredEmployees?.slice(0, 10))?.map((emp, idx) => {
                  const status = getUtilStatus(emp.utilization_percent || 0)
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{emp.employee_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-500">{emp.department_name}</td>
                      <td className="text-center py-3 px-2">{emp.week1_hours || '-'}</td>
                      <td className="text-center py-3 px-2">{emp.week2_hours || '-'}</td>
                      <td className="text-center py-3 px-2">{emp.week3_hours || '-'}</td>
                      <td className="text-center py-3 px-2">{emp.week4_hours || '-'}</td>
                      <td className="text-center py-3 px-2">{emp.week5_hours || '-'}</td>
                      <td className="text-center py-3 px-2 font-medium">{emp.total_hours || 0}</td>
                      <td className="text-center py-3 px-2">
                        <span className={status.color}>{emp.utilization_percent || 0}%</span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Progress value={emp.utilization_percent || 0} className="flex-1 h-2" />
                          <span>{status.icon}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredEmployees?.length > 10 && (
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => setShowAllEmployees(!showAllEmployees)}
              >
                {showAllEmployees ? (
                  <>Show Less <ChevronUp className="h-4 w-4 ml-1" /></>
                ) : (
                  <>View All ({filteredEmployees.length}) <ChevronDown className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500 text-center">
            Target: 35 hrs/week | 140 hrs/month
          </div>
        </CardContent>
      </Card>

      {/* Attention Required */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Low Utilization */}
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Low Utilization (&lt; 70%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowUtil?.length > 0 ? (
              <div className="space-y-2">
                {lowUtil.map((emp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                    <span>{emp.employee_name}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={emp.utilization_percent} className="w-20 h-2" />
                      <span className="text-orange-600 font-medium w-12 text-right">
                        {emp.utilization_percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">ไม่มีพนักงานที่ Utilization ต่ำ</p>
            )}
          </CardContent>
        </Card>

        {/* Missing Timesheet */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Missing Timesheet
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missing?.length > 0 ? (
              <div className="space-y-2">
                {missing.map((emp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <span>{emp.employee_name}</span>
                    <Badge variant="outline" className="text-red-600 border-red-300">
                      {emp.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">ทุกคนบันทึก Timesheet ครบ</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ask AI */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Ask AI
          </CardTitle>
          <CardDescription>ถามคำถามเกี่ยวกับ Timesheet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder='เช่น "ใครทำงานมากสุดเดือนนี้?" "โปรเจค MES ใช้เวลาไปเท่าไหร่แล้ว?"'
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAskAI()
              }}
            />
            <Button onClick={handleAskAI} disabled={isAskingAI || !aiQuestion.trim()}>
              {isAskingAI ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {aiAnswer && (
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{aiAnswer}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-purple-100"
              onClick={() => setAiQuestion('ใครทำงานมากสุดเดือนนี้?')}
            >
              ใครทำงานมากสุด?
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-purple-100"
              onClick={() => setAiQuestion('แผนกไหนใช้เวลามากที่สุด?')}
            >
              แผนกไหนใช้เวลามากสุด?
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-purple-100"
              onClick={() => setAiQuestion('เปรียบเทียบชั่วโมงทำงานกับเดือนที่แล้ว')}
            >
              เปรียบเทียบกับเดือนที่แล้ว
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
