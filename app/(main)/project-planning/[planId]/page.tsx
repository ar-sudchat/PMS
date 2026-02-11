import { getProjectPlanById } from '@/lib/actions/project-planning-actions'
import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { PlanDetailPage } from '@/components/project-planning/PlanDetailPage'

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ planId: string }>
}

export default async function PlanDetailRoute(props: Props) {
    const params = await props.params
    const [user, planResult] = await Promise.all([
        getCurrentUser(),
        getProjectPlanById(params.planId),
    ])

    if (!user) redirect('/login')
    if (!planResult.success || !planResult.data) notFound()

    return (
        <PlanDetailPage
            initialPlan={planResult.data}
            currentUserId={user.id}
            userRole={user.role}
        />
    )
}
