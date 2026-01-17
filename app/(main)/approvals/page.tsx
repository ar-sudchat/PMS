import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PendingApprovalsView } from '@/components/approval/PendingApprovalsView'

export default async function ApprovalsPage() {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }

    return (
        <div className="p-6 w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Pending Approvals</h1>
                <p className="text-slate-500 text-sm mt-1">Review and process pending approval requests</p>
            </div>

            <PendingApprovalsView currentUserId={user.id} />
        </div>
    )
}
