import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { KPIDashboard } from '@/components/kpi-record/KPIDashboard'

export const dynamic = 'force-dynamic'

export default async function KPIRecordPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return <KPIDashboard currentUserId={user.id} />
}
