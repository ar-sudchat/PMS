import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllStandupGroups, getUserGroups } from '@/lib/actions/standup-actions'
import { StandupContainer } from '@/components/standup/StandupContainer'

export default async function StandupPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/auth/login')

    const groupsResult = await getAllStandupGroups()
    const groups = (groupsResult.success && groupsResult.data) ? groupsResult.data : []

    // Determine default active group:
    // 1. First group the user is a member of
    // 2. Or the first group in the list
    // 3. Or null
    let activeGroup = null
    if (groups.length > 0) {
        const userGroupsResult = await getUserGroups()
        const userGroups = (userGroupsResult.success && userGroupsResult.data) ? userGroupsResult.data : []

        if (userGroups.length > 0) {
            // Find the full group object from 'groups' that matches the user's first group
            activeGroup = groups.find(g => g.id === userGroups[0].id) || groups[0]
        } else {
            activeGroup = groups[0]
        }
    }

    return (
        <div className="container mx-auto py-6 max-w-5xl">
            <h1 className="text-3xl font-bold mb-6">Daily Stand-up</h1>

            <StandupContainer
                user={user}
                groups={groups}
                activeGroup={activeGroup}
            />
        </div>
    )
}
