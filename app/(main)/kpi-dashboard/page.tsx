import { Suspense } from 'react'
import { KPIDashboardTeam } from '@/components/kpi/KPIDashboardTeam'
import { getKPIDashboardData } from '@/lib/actions/kpi-dashboard-actions'
import { analyzeKPIDashboard } from '@/lib/actions/kpi-ai-actions'
import { getCurrentUser } from '@/lib/auth'

export default async function KPIDashboardPage({
  searchParams
}: {
  searchParams: Promise<{
    year?: string
    period?: 'month' | 'quarter' | 'year'
    value?: string
  }>
}) {
  const params = await searchParams
  const now = new Date()
  const year = parseInt(params.year || now.getFullYear().toString())
  const period = params.period || 'quarter'
  const periodValue = parseInt(params.value || Math.ceil((now.getMonth() + 1) / 3).toString())

  const [dashboardData, aiAnalysis, currentUser] = await Promise.all([
    getKPIDashboardData(year, period, periodValue),
    analyzeKPIDashboard(year, period, periodValue),
    getCurrentUser()
  ])

  return (
    <div className="p-6">
      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <KPIDashboardTeam
          data={dashboardData}
          aiAnalysis={aiAnalysis}
          year={year}
          period={period}
          periodValue={periodValue}
          currentUserId={currentUser?.id}
        />
      </Suspense>
    </div>
  )
}
