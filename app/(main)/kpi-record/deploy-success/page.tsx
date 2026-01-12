import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { DeploySuccessView } from '@/components/kpi-record/DeploySuccessView'

export const dynamic = 'force-dynamic'

export default async function DeploySuccessPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return <DeploySuccessView currentUserId={user.id} />
}
