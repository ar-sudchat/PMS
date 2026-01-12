import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import DocsOntimeView from '@/components/kpi-record/DocsOntimeView'

export const dynamic = 'force-dynamic'

export default async function DocsOntimePage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return <DocsOntimeView currentUserId={user.id} currentUserName={user.nameTh || user.name || user.nickname || 'User'} />
}
