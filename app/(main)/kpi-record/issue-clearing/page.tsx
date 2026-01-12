import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import IssueClearingView from '@/components/kpi-record/IssueClearingView'

export const dynamic = 'force-dynamic'

export default async function IssueClearingPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return <IssueClearingView currentUserId={user.id} currentUserName={user.nameTh || user.name || user.nickname || 'User'} />
}
