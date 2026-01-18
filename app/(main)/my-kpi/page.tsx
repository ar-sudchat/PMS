import { Suspense } from 'react'
import { MyKPIDashboard } from '@/components/kpi/MyKPIDashboard'
import { getMyKPIDashboardData } from '@/lib/actions/kpi-dashboard-actions'
import { analyzeMyKPI } from '@/lib/actions/kpi-ai-actions'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function MyKPIPage({
  searchParams
}: {
  searchParams: Promise<{
    year?: string
    period?: 'month' | 'quarter' | 'year'
    value?: string
  }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams
  const now = new Date()
  const year = parseInt(params.year || now.getFullYear().toString())
  const period = params.period || 'quarter'
  const periodValue = parseInt(params.value || Math.ceil((now.getMonth() + 1) / 3).toString())

  // Get position code from user (positionCode is camelCase in UserSession)
  const position = user.positionCode || 'PG'

  const [dashboardData, aiAnalysis] = await Promise.all([
    getMyKPIDashboardData(user.id, position, year, period, periodValue),
    analyzeMyKPI(user.id, user.nameTh || user.name || 'User', position, year, period, periodValue)
  ])

  return (
    <div className="p-6">
      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <MyKPIDashboard
          data={dashboardData}
          aiAnalysis={aiAnalysis}
          user={{
            id: user.id,
            name: user.nameTh || user.name || 'User',
            position: position
          }}
          year={year}
          period={period}
          periodValue={periodValue}
        />
      </Suspense>
    </div>
  )
}
