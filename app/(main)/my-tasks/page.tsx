
import { getMyTasks, getMyTaskCounts } from '@/lib/actions/my-tasks-actions'
import { MyTasksView } from '@/components/my-tasks/MyTasksView'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveEmployees } from '@/lib/actions/employee-actions'

export const dynamic = 'force-dynamic'

export default async function MyTasksPage() {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }

    const currentUserId = (user as any).employeeId || user.id
    const currentUserName = (user as any).nameTh || user.name || (user as any).nickname || 'User'
    const userRole = (user as any).role || 'member'

    // Default fetch: todo status for current user
    const tasks = await getMyTasks({ status: 'todo' })
    const counts = await getMyTaskCounts()

    // Get employee list for managers to view others' tasks
    const employeesResult = await getActiveEmployees()
    const employees = employeesResult.success ? employeesResult.data : []

    return (
        <div className="h-full">
            <MyTasksView
                initialTasks={tasks}
                initialCounts={counts}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                userRole={userRole}
                employees={employees}
            />
        </div>
    )
}
