import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import DefectRatioView from '@/components/kpi-record/DefectRatioView'

export const dynamic = 'force-dynamic'

export default async function DefectRatioPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return <DefectRatioView />
}
