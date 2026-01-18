import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import TimeToDeliveryView from '@/components/kpi-record/TimeToDeliveryView'

export const dynamic = 'force-dynamic'

export default async function TimeToDeliveryPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return <TimeToDeliveryView />
}
