import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { MeetingMinutesView } from '@/components/kpi-record/MeetingMinutesView'

export const dynamic = 'force-dynamic'

export default async function MeetingMinutesPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return <MeetingMinutesView currentUserId={user.id} />
}
