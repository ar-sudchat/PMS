import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import IssueClearingKPIView from '@/components/kpi-record/IssueClearingKPIView'

export const dynamic = 'force-dynamic'

export default async function IssueClearingPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return <IssueClearingKPIView currentUserId={user.id} currentUserName={user.nameTh || user.name || user.nickname || 'User'} />
}
