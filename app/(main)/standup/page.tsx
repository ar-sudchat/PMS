import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserGroups, getTodayStandup, getPendingTasks } from '@/lib/actions/standup-actions'
import { StandupContainer } from '@/components/standup/StandupContainer'

export default async function StandupPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/auth/login')

    const groupsResult = await getUserGroups()
    const groups = groupsResult.success ? groupsResult.data ?? [] : []

    // Default to first group if exists, or require group creation
    const activeGroup = groups.length > 0 ? groups[0] : null

    let todayStandup = null
    if (activeGroup) {
        const standupResult = await getTodayStandup(activeGroup.id)
        if (standupResult.success) todayStandup = standupResult.data
    }

    const pendingTasksResult = await getPendingTasks()
    const pendingTasks = pendingTasksResult.success ? pendingTasksResult.data : []

    return (
        <div className="container mx-auto py-6 max-w-5xl">
            <h1 className="text-3xl font-bold mb-6">Daily Stand-up</h1>

            <StandupContainer
                user={user}
                groups={groups}
                activeGroup={activeGroup}
                todayStandup={todayStandup ?? null}
                pendingTasks={pendingTasks ?? []}
            />
        </div>
    )
}
