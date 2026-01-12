import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { DeployBackupView } from '@/components/kpi-record/DeployBackupView'

export const dynamic = 'force-dynamic'

export default async function DeployBackupPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return <DeployBackupView currentUserId={user.id} />
}
