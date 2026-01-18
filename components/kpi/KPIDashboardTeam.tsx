'use client'

import { useRouter } from 'next/navigation'
import {
  Target, AlertTriangle,
  CheckCircle, XCircle, Brain, Download, Building2, User,
  TrendingUp, TrendingDown, Sparkles, Award, Zap, Activity
} from 'lucide-react'

interface KPIDashboardTeamProps {
  data: any
  aiAnalysis: any
  year: number
  period: 'month' | 'quarter' | 'year'
  periodValue: number
}

export function KPIDashboardTeam({ data, aiAnalysis, year, period, periodValue }: KPIDashboardTeamProps) {
  const router = useRouter()
  const analysis = aiAnalysis?.analysis

  const handlePeriodChange = (newPeriod: string) => {
    router.push(`/kpi-dashboard?year=${year}&period=${newPeriod}&value=${periodValue}`)
  }

  const handleYearChange = (newYear: string) => {
    router.push(`/kpi-dashboard?year=${newYear}&period=${period}&value=${periodValue}`)
  }

  const handleValueChange = (newValue: string) => {
    router.push(`/kpi-dashboard?year=${year}&period=${period}&value=${newValue}`)
  }

  const getStatusColor = (isPass: number) => {
    return isPass === 1 ? 'text-emerald-600' : 'text-rose-600'
  }

  const getStatusIcon = (isPass: number) => {
    return isPass === 1
      ? <CheckCircle className="h-5 w-5 text-emerald-500" />
      : <XCircle className="h-5 w-5 text-rose-500" />
  }

  const getOverallStatus = () => {
    const status = analysis?.overall_status
    if (status === 'good') return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Award }
    if (status === 'warning') return { label: 'Warning', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle }
    return { label: 'Critical', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: Zap }
  }

  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

  const getScoreGradient = (percent: number) => {
    if (percent >= 80) return 'from-emerald-500 to-teal-500'
    if (percent >= 60) return 'from-amber-500 to-orange-500'
    return 'from-rose-500 to-pink-500'
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Delivery': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'Quality': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'Availability': return 'bg-teal-100 text-teal-700 border-teal-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                KPI Dashboard
                <Sparkles className="h-5 w-5 text-yellow-300" />
              </h1>
              <p className="text-white/80">ภาพรวม KPI ของทีม • {period === 'month' ? monthNames[periodValue - 1] : period === 'quarter' ? `Q${periodValue}` : ''} {year}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Period Type */}
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="px-4 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-sm text-white focus:ring-2 focus:ring-white/50 focus:outline-none"
            >
              <option value="month" className="text-slate-900">รายเดือน</option>
              <option value="quarter" className="text-slate-900">รายไตรมาส</option>
              <option value="year" className="text-slate-900">รายปี</option>
            </select>

            {/* Period Value */}
            {period === 'month' && (
              <select
                value={periodValue}
                onChange={(e) => handleValueChange(e.target.value)}
                className="px-4 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-sm text-white focus:ring-2 focus:ring-white/50 focus:outline-none"
              >
                {monthNames.map((month, i) => (
                  <option key={i + 1} value={i + 1} className="text-slate-900">{month}</option>
                ))}
              </select>
            )}

            {period === 'quarter' && (
              <select
                value={periodValue}
                onChange={(e) => handleValueChange(e.target.value)}
                className="px-4 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-sm text-white focus:ring-2 focus:ring-white/50 focus:outline-none"
              >
                <option value="1" className="text-slate-900">Q1</option>
                <option value="2" className="text-slate-900">Q2</option>
                <option value="3" className="text-slate-900">Q3</option>
                <option value="4" className="text-slate-900">Q4</option>
              </select>
            )}

            {/* Year */}
            <select
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              className="px-4 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-sm text-white focus:ring-2 focus:ring-white/50 focus:outline-none"
            >
              <option value="2024" className="text-slate-900">2024</option>
              <option value="2025" className="text-slate-900">2025</option>
              <option value="2026" className="text-slate-900">2026</option>
            </select>

            {/* Export */}
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-white/90 transition-all text-sm font-medium shadow-lg">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Score - Featured Card */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all group">
          <div className={`absolute inset-0 bg-gradient-to-br ${getScoreGradient(data.summary.deptKPIPercent)} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${getScoreGradient(data.summary.deptKPIPercent)}`}>
                  <Target className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium">Overall Score</span>
              </div>
              {data.summary.deptKPIPercent >= 80 ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-rose-500" />
              )}
            </div>
            <div className={`text-4xl font-bold bg-gradient-to-r ${getScoreGradient(data.summary.deptKPIPercent)} bg-clip-text text-transparent`}>
              {data.summary.deptKPIPercent}%
            </div>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getScoreGradient(data.summary.deptKPIPercent)} rounded-full transition-all duration-500`}
                style={{ width: `${data.summary.deptKPIPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dept KPI Pass */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all hover:border-blue-200">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-medium">Department KPI</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-blue-600">{data.summary.deptKPIPass}</span>
            <span className="text-xl text-slate-400">/ {data.summary.deptKPITotal}</span>
          </div>
          <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            {data.summary.deptKPIPercent}% ผ่านเกณฑ์
          </p>
        </div>

        {/* Personal KPI */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all hover:border-purple-200">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <User className="h-4 w-4 text-purple-600" />
            </div>
            <span className="font-medium">Personal KPI</span>
          </div>
          <div className="text-4xl font-bold text-purple-600">
            {Object.keys(data.personalKPIGroups).length}
          </div>
          <p className="text-sm text-slate-500 mt-2">
            KPIs being tracked
          </p>
        </div>

        {/* At Risk */}
        <div className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-lg transition-all ${data.summary.atRiskCount > 0 ? 'border-rose-200 hover:border-rose-300' : 'border-emerald-200 hover:border-emerald-300'}`}>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <div className={`p-2 rounded-lg ${data.summary.atRiskCount > 0 ? 'bg-rose-100' : 'bg-emerald-100'}`}>
              <AlertTriangle className={`h-4 w-4 ${data.summary.atRiskCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
            </div>
            <span className="font-medium">At Risk</span>
          </div>
          <div className={`text-4xl font-bold ${data.summary.atRiskCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {data.summary.atRiskCount}
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {data.summary.atRiskCount > 0 ? 'พนักงานต้องดูแล' : 'ทุกคนผ่านเกณฑ์'}
          </p>
        </div>
      </div>

      {/* AI Insights */}
      {analysis && (
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 rounded-2xl border border-purple-200 p-6 shadow-sm">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-200/30 rounded-full blur-2xl"></div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">AI Insights</h2>
                <p className="text-xs text-slate-500">Powered by Claude AI</p>
              </div>
              <span className={`ml-auto px-3 py-1.5 text-xs font-medium rounded-full border ${getOverallStatus().color} flex items-center gap-1.5`}>
                {(() => { const Icon = getOverallStatus().icon; return <Icon className="h-3.5 w-3.5" />; })()}
                {getOverallStatus().label}
              </span>
            </div>

            <p className="text-slate-700 mb-5 leading-relaxed">{analysis.summary}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.strengths?.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-emerald-100">
                  <h4 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    จุดแข็ง
                  </h4>
                  <ul className="space-y-2">
                    {analysis.strengths.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.concerns?.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-amber-100">
                  <h4 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    จุดที่ต้องปรับปรุง
                  </h4>
                  <ul className="space-y-2">
                    {analysis.concerns.map((c: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <XCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {analysis.recommendations?.length > 0 && (
              <div className="mt-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-blue-100">
                <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  คำแนะนำ
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {analysis.recommendations.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <Zap className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Department KPI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Department KPI</h2>
              <p className="text-sm text-slate-500">KPI ระดับแผนก/ทีม - ถ้าไม่ผ่านกระทบทั้งทีม</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left py-4 px-6 font-semibold text-slate-600">KPI</th>
                <th className="text-center py-4 px-4 font-semibold text-slate-600">Category</th>
                <th className="text-center py-4 px-4 font-semibold text-slate-600">Target</th>
                <th className="text-center py-4 px-4 font-semibold text-slate-600">Actual</th>
                <th className="text-center py-4 px-4 font-semibold text-slate-600">Status</th>
                <th className="text-center py-4 px-4 font-semibold text-slate-600">Affected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.departmentKPIs.map((kpi: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-medium text-slate-800">{kpi.kpi_name}</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className={`px-3 py-1.5 text-xs font-medium rounded-full border ${getCategoryColor(kpi.category)}`}>
                      {kpi.category}
                    </span>
                  </td>
                  <td className="text-center py-4 px-4 text-slate-600">{kpi.target}</td>
                  <td className="text-center py-4 px-4">
                    <span className={`text-lg font-bold ${getStatusColor(kpi.is_pass)}`}>
                      {kpi.actual_value}%
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="flex justify-center">
                      {getStatusIcon(kpi.is_pass)}
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="flex justify-center gap-1">
                      {kpi.affected_positions?.split(',').map((pos: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                          {pos.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Personal KPI Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Personal KPI Summary</h2>
              <p className="text-sm text-slate-500">KPI ระดับบุคคล - กระทบเฉพาะตัว</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left py-4 px-6 font-semibold text-slate-600">KPI</th>
                <th className="text-center py-4 px-4 font-semibold text-slate-600">Target</th>
                <th className="text-center py-4 px-4 font-semibold text-slate-600">Pass</th>
                <th className="text-center py-4 px-4 font-semibold text-slate-600">Fail</th>
                <th className="text-center py-4 px-4 font-semibold text-slate-600">Affected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(data.personalKPIGroups).map(([name, stats]: [string, any], idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-medium text-slate-800">{name}</span>
                  </td>
                  <td className="text-center py-4 px-4 text-slate-600">
                    {name.includes('Meeting') ? '≤3 ครั้ง' : '≥85%'}
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {stats.pass}
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-medium">
                      <XCircle className="h-3.5 w-3.5" />
                      {stats.fail}
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="flex justify-center gap-1">
                      {stats.affected_positions?.split(',').map((pos: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                          {pos.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* At Risk Employees */}
      {data.atRiskEmployees.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-rose-700">At Risk Employees</h2>
                <p className="text-sm text-slate-500">พนักงานที่มี KPI ไม่ผ่าน ({data.atRiskEmployees.length} คน)</p>
              </div>
            </div>
          </div>

          <div className="p-4 grid gap-3">
            {data.atRiskEmployees.map((emp: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-rose-50 to-white rounded-xl border border-rose-100 hover:border-rose-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {emp.employee_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{emp.employee_name}</p>
                    <p className="text-sm text-slate-500">{emp.position}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-rose-600 mb-1">{emp.failed_kpis}</p>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                    <XCircle className="h-3.5 w-3.5" />
                    {emp.failed_count} KPI ไม่ผ่าน
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
