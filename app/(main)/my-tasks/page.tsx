
import { getMyTasks, getMyTaskCounts } from '@/lib/actions/my-tasks-actions'
import { MyTasksView } from '@/components/my-tasks/MyTasksView'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MyTasksPage() {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }

    // Default fetch: all status
    const tasks = await getMyTasks({ status: 'all' })
    const counts = await getMyTaskCounts()

    return (
        <div className="h-full">
            <MyTasksView initialTasks={tasks} initialCounts={counts} />
        </div>
    )
}
