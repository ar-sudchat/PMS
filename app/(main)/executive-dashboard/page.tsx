import { Suspense } from 'react'
import { ExecutiveDashboardClient } from '@/components/executive-dashboard/ExecutiveDashboardClient'
import { getExecutiveDashboardData } from '@/lib/actions/executive-dashboard-actions'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Executive Dashboard | PMS',
  description: 'Executive Dashboard - Organization overview'
}

function LoadingSkeleton() {
  return (
    <div className="p-6 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-gray-500">กำลังโหลดข้อมูลภาพรวม...</p>
      </div>
    </div>
  )
}

export default async function ExecutiveDashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const year = new Date().getFullYear()
  const dashboardData = await getExecutiveDashboardData(year)

  return (
    <div className="p-6 bg-gray-50/50 min-h-screen">
      <Suspense fallback={<LoadingSkeleton />}>
        <ExecutiveDashboardClient
          initialData={dashboardData}
          year={year}
        />
      </Suspense>
    </div>
  )
}
