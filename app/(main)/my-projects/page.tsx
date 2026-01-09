import { MyProjectsGanttPage } from '@/components/my-projects/MyProjectsGanttPage'
import { getGanttData } from '@/lib/actions/gantt-actions'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Page() {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }

    const { data, success } = await getGanttData()

    // Ensure data structure is valid for DHTMLX Gantt
    const ganttData = success && data ? data : { data: [], links: [] }

    return (
        <MyProjectsGanttPage
            initialData={ganttData}
            currentUser={user}
        />
    )
}
