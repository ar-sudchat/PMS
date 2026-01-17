import { Suspense } from 'react'
import { TimesheetDashboard } from '@/components/timesheet/TimesheetDashboard'
import { getTimesheetDataForAI } from '@/lib/actions/timesheet-dashboard-actions'
import { analyzeTimesheetWithAI } from '@/lib/actions/timesheet-ai-actions'
import { Loader2 } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>
}

async function DashboardContent({ year, month }: { year: number; month: number }) {
  const [dashboardData, aiAnalysis] = await Promise.all([
    getTimesheetDataForAI(year, month),
    analyzeTimesheetWithAI(year, month)
  ])

  return (
    <TimesheetDashboard
      data={dashboardData}
      aiAnalysis={aiAnalysis}
      year={year}
      month={month}
    />
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-slate-500">Loading dashboard...</p>
      </div>
    </div>
  )
}

export default async function TimesheetDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const now = new Date()
  const year = parseInt(params.year || now.getFullYear().toString())
  const month = parseInt(params.month || (now.getMonth() + 1).toString())

  return (
    <div className="p-6">
      <Suspense fallback={<LoadingSpinner />}>
        <DashboardContent year={year} month={month} />
      </Suspense>
    </div>
  )
}
