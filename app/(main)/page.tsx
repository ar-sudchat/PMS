import { getDashboardData } from '@/lib/actions/dashboard-actions'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const result = await getDashboardData()

  if (!result.success || !result.data) {
    // If not authenticated, redirect to login
    redirect('/login')
  }

  return <DashboardContent data={result.data} />
}
