'use client'

import { useRouter } from 'next/navigation'
import {
  Target, CheckCircle, XCircle, Brain, Building2, User, AlertTriangle, Award,
  TrendingUp, TrendingDown, Sparkles, Zap, Trophy, Star, Flame, Heart
} from 'lucide-react'

interface MyKPIDashboardProps {
  data: any
  aiAnalysis: any
  user: { id: string; name: string; position: string }
  year: number
  period: 'month' | 'quarter' | 'year'
  periodValue: number
}

export function MyKPIDashboard({ data, aiAnalysis, user, year, period, periodValue }: MyKPIDashboardProps) {
  const router = useRouter()
  const analysis = aiAnalysis?.analysis

  const handlePeriodChange = (newPeriod: string) => {
    router.push(`/my-kpi?year=${year}&period=${newPeriod}&value=${periodValue}`)
  }

  const handleYearChange = (newYear: string) => {
    router.push(`/my-kpi?year=${newYear}&period=${period}&value=${periodValue}`)
  }

  const handleValueChange = (newValue: string) => {
    router.push(`/my-kpi?year=${year}&period=${period}&value=${newValue}`)
  }

  const getStatusBadge = () => {
    const status = data.summary.status
    if (status === 'pass') return { label: 'ผ่านทั้งหมด', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Trophy }
    if (status === 'at_risk') return { label: 'At Risk', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle }
    return { label: 'ต้องปรับปรุง', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: Flame }
  }

  const getRiskBadge = () => {
    const risk = analysis?.risk_level
    if (risk === 'low') return { label: 'Low Risk', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Star }
    if (risk === 'medium') return { label: 'Medium Risk', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle }
    return { label: 'High Risk', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: Zap }
  }

  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

  const getScoreGradient = (percent: number) => {
    if (percent >= 80) return 'from-emerald-500 to-teal-500'
    if (percent >= 60) return 'from-amber-500 to-orange-500'
    return 'from-rose-500 to-pink-500'
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'PM': return 'from-blue-500 to-indigo-600'
      case 'PG': return 'from-emerald-500 to-teal-600'
      case 'SA': return 'from-purple-500 to-violet-600'
      default: return 'from-slate-500 to-slate-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with User Profile */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getPositionColor(user.position)} flex items-center justify-center text-2xl font-bold shadow-lg border-2 border-white/30`}>
              {user.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                My KPI Dashboard
                <Sparkles className="h-5 w-5 text-yellow-300" />
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/90">{user.name}</span>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full bg-white/20 backdrop-blur-sm`}>
                  {user.position}
                </span>
              </div>
              <p className="text-white/70 text-sm mt-0.5">
                {period === 'month' ? monthNames[periodValue - 1] : period === 'quarter' ? `Q${periodValue}` : ''} {year}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="px-4 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-sm text-white focus:ring-2 focus:ring-white/50 focus:outline-none"
            >
              <option value="month" className="text-slate-900">รายเดือน</option>
              <option value="quarter" className="text-slate-900">รายไตรมาส</option>
              <option value="year" className="text-slate-900">รายปี</option>
            </select>

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

            <select
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              className="px-4 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-sm text-white focus:ring-2 focus:ring-white/50 focus:outline-none"
            >
              <option value="2024" className="text-slate-900">2024</option>
              <option value="2025" className="text-slate-900">2025</option>
              <option value="2026" className="text-slate-900">2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Score - Featured Card */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all group">
          <div className={`absolute inset-0 bg-gradient-to-br ${getScoreGradient(data.summary.passPercent)} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${getScoreGradient(data.summary.passPercent)}`}>
                  <Target className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium">Overall Score</span>
              </div>
              {data.summary.passPercent >= 80 ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-rose-500" />
              )}
            </div>
            <div className={`text-4xl font-bold bg-gradient-to-r ${getScoreGradient(data.summary.passPercent)} bg-clip-text text-transparent`}>
              {data.summary.passPercent}%
            </div>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getScoreGradient(data.summary.passPercent)} rounded-full transition-all duration-500`}
                style={{ width: `${data.summary.passPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI Passed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all hover:border-emerald-200">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="font-medium">KPI Passed</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-emerald-600">{data.summary.passCount}</span>
            <span className="text-xl text-slate-400">/ {data.summary.totalKPIs}</span>
          </div>
          <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
            <Star className="h-4 w-4 text-amber-500" />
            {data.summary.passPercent}% ผ่านเกณฑ์
          </p>
        </div>

        {/* KPI Failed */}
        <div className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-lg transition-all ${data.summary.failCount > 0 ? 'border-rose-200 hover:border-rose-300' : 'border-emerald-200'}`}>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <div className={`p-2 rounded-lg ${data.summary.failCount > 0 ? 'bg-rose-100' : 'bg-emerald-100'}`}>
              <XCircle className={`h-4 w-4 ${data.summary.failCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
            </div>
            <span className="font-medium">KPI Failed</span>
          </div>
          <div className={`text-4xl font-bold ${data.summary.failCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {data.summary.failCount}
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {data.summary.failCount > 0 ? 'ต้องปรับปรุง' : 'ยอดเยี่ยม!'}
          </p>
        </div>

        {/* Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Award className="h-4 w-4 text-purple-600" />
            </div>
            <span className="font-medium">Status</span>
          </div>
          <span className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border ${getStatusBadge().color}`}>
            {(() => { const Icon = getStatusBadge().icon; return <Icon className="h-4 w-4" />; })()}
            {getStatusBadge().label}
          </span>
        </div>
      </div>

      {/* AI Coach */}
      {analysis && (
        <div className="relative overflow-hidden bg-gradient-to-br from-fuchsia-50 via-purple-50 to-violet-50 rounded-2xl border border-purple-200 p-6 shadow-sm">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-200/30 rounded-full blur-2xl"></div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl shadow-lg">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">AI Performance Coach</h2>
                <p className="text-xs text-slate-500">Personalized insights powered by Claude AI</p>
              </div>
              <span className={`ml-auto px-3 py-1.5 text-xs font-medium rounded-full border ${getRiskBadge().color} flex items-center gap-1.5`}>
                {(() => { const Icon = getRiskBadge().icon; return <Icon className="h-3.5 w-3.5" />; })()}
                {getRiskBadge().label}
              </span>
            </div>

            <p className="text-slate-700 mb-5 leading-relaxed">{analysis.summary}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.achievements?.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-emerald-100">
                  <h4 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    ความสำเร็จ
                  </h4>
                  <ul className="space-y-2">
                    {analysis.achievements.map((a: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <Star className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.improvement_areas?.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-amber-100">
                  <h4 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    สิ่งที่ต้องปรับปรุง
                  </h4>
                  <ul className="space-y-2">
                    {analysis.improvement_areas.map((a: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {analysis.action_items?.length > 0 && (
              <div className="mt-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-blue-100">
                <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Action Items
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {analysis.action_items.map((a: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.motivation && (
              <div className="mt-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 border border-purple-200 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <span className="text-sm font-medium text-purple-700">ข้อความให้กำลังใจ</span>
                </div>
                <p className="text-purple-800 font-medium text-lg">&ldquo;{analysis.motivation}&rdquo;</p>
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
              <p className="text-sm text-slate-500">KPI ที่กระทบตำแหน่ง {user.position}</p>
            </div>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.departmentKPIs.map((kpi: any, idx: number) => (
            <div key={idx} className={`relative overflow-hidden p-5 rounded-xl border-2 transition-all hover:shadow-md ${kpi.is_pass ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white hover:border-emerald-300' : 'border-rose-200 bg-gradient-to-br from-rose-50 to-white hover:border-rose-300'}`}>
              <div className="flex justify-between items-start mb-3">
                <span className="font-semibold text-slate-800">{kpi.kpi_name}</span>
                <div className={`p-1.5 rounded-full ${kpi.is_pass ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  {kpi.is_pass ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-600" />
                  )}
                </div>
              </div>
              <div className={`text-3xl font-bold ${kpi.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpi.actual_value}%
              </div>
              <p className="text-sm text-slate-500 mt-1">Target: {kpi.target}</p>
              <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${kpi.is_pass ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-rose-400 to-pink-500'}`}
                  style={{ width: `${Math.min(kpi.actual_value, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Personal KPI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Personal KPI</h2>
              <p className="text-sm text-slate-500">KPI ส่วนบุคคลของคุณ</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {data.personalKPIs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <User className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>ไม่มี Personal KPI สำหรับตำแหน่ง {user.position}</p>
            </div>
          ) : (
            data.personalKPIs.map((kpi: any, idx: number) => (
              <div key={idx} className={`relative overflow-hidden p-5 rounded-xl border-2 transition-all hover:shadow-md ${kpi.is_pass ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-white hover:border-emerald-300' : 'border-rose-200 bg-gradient-to-r from-rose-50 to-white hover:border-rose-300'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-lg">{kpi.kpi_name}</h4>
                    <p className="text-sm text-slate-500">
                      Target: {kpi.kpi_name.includes('Meeting') ? `≤${kpi.target_value} ครั้ง` : `≥${kpi.target_value}%`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${kpi.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {kpi.actual_value}{kpi.kpi_name.includes('Meeting') ? '' : '%'}
                      {kpi.kpi_name.includes('Meeting') && <span className="text-base ml-1 text-slate-500">ครั้ง</span>}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${kpi.is_pass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {kpi.is_pass ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {kpi.is_pass ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${kpi.is_pass ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-rose-400 to-pink-500'}`}
                    style={{
                      width: `${kpi.kpi_name.includes('Meeting')
                        ? Math.max(0, 100 - (kpi.actual_value / kpi.target_value * 100))
                        : Math.min(kpi.actual_value, 100)
                        }%`
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Failed KPI Details */}
      {data.failedKPIs.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-rose-700">KPI ที่ต้องปรับปรุง</h2>
                <p className="text-sm text-slate-500">{data.failedKPIs.length} รายการที่ไม่ผ่านเกณฑ์</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {data.failedKPIs.map((kpi: any, idx: number) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-rose-50 to-white rounded-xl border border-rose-100 hover:border-rose-200 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-rose-500" />
                    <h4 className="font-semibold text-rose-700">{kpi.kpi_name}</h4>
                  </div>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                    Gap: {Math.abs(kpi.actual_value - kpi.target_value).toFixed(1)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-2 rounded-lg text-center">
                    <span className="text-slate-500 block text-xs mb-1">Target</span>
                    <span className="font-bold text-slate-700">{kpi.target_value}</span>
                  </div>
                  <div className="bg-rose-100 p-2 rounded-lg text-center">
                    <span className="text-rose-600 block text-xs mb-1">Actual</span>
                    <span className="font-bold text-rose-700">{kpi.actual_value}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg text-center">
                    <span className="text-slate-500 block text-xs mb-1">Type</span>
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${kpi.type === 'department' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {kpi.type === 'department' ? 'Dept' : 'Personal'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
