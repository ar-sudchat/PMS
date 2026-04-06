import { Suspense } from 'react'
import { TeamDashboardClient } from '@/components/team-dashboard/TeamDashboardClient'
import { getDailyViewData, getDepartmentOptions } from '@/lib/actions/team-dashboard-actions'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Team Dashboard | PMS',
  description: 'Team Dashboard - Daily team overview'
}

interface PageProps {
  searchParams: Promise<{ dept?: string; date?: string }>
}

function LoadingSkeleton() {
  return (
    <div className="p-6 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-gray-500">กำลังโหลดข้อมูลทีม...</p>
      </div>
    </div>
  )
}

export default async function TeamDashboardPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const deptId = params.dept || 'all'
  const today = new Date().toISOString().split('T')[0]
  const date = params.date || today

  const [dailyData, departmentOptions] = await Promise.all([
    getDailyViewData(date, deptId),
    getDepartmentOptions()
  ])

  return (
    <div className="p-6 bg-gray-50/50 min-h-screen">
      <Suspense fallback={<LoadingSkeleton />}>
        <TeamDashboardClient
          initialData={dailyData}
          departmentOptions={departmentOptions}
          initialDepartmentId={deptId}
        />
      </Suspense>
    </div>
  )
}
