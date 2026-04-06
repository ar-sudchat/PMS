import { Suspense } from 'react'
import { KanbanBoardClient } from '@/components/kanban/KanbanBoardClient'
import { getKanbanTasks, getProjectOptions, getEmployeeOptions, getPositionOptions } from '@/lib/actions/kanban-actions'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Kanban Board | PMS',
  description: 'Kanban Board - Drag and drop task management'
}

function LoadingSkeleton() {
  return (
    <div className="p-6 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <p className="text-gray-500">กำลังโหลด Kanban Board...</p>
      </div>
    </div>
  )
}

export default async function KanbanPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Default filter: current logged-in user + today
  const currentEmployeeId = (user as any).employeeId || user.id
  const today = new Date().toISOString().split('T')[0]

  const [tasks, projectOptions, employeeOptions, positionOptions] = await Promise.all([
    getKanbanTasks({ assigneeId: currentEmployeeId, dateFrom: today, dateTo: today }),
    getProjectOptions(),
    getEmployeeOptions(),
    getPositionOptions()
  ])

  return (
    <div className="p-4 bg-gray-50/50 min-h-screen">
      <Suspense fallback={<LoadingSkeleton />}>
        <KanbanBoardClient
          initialTasks={tasks}
          projectOptions={projectOptions}
          employeeOptions={employeeOptions}
          positionOptions={positionOptions}
          currentUser={{
            id: user.id,
            employeeId: currentEmployeeId,
            name: (user as any).nameTh || user.name || 'User'
          }}
        />
      </Suspense>
    </div>
  )
}
