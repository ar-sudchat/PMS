import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ApprovalFlowManagement } from '@/components/approval/ApprovalFlowManagement'

export default async function ApprovalSettingsPage() {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }

    return (
        <div className="p-6 w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Approval Flow Management</h1>
                <p className="text-slate-500 text-sm mt-1">Configure approval workflows and templates</p>
            </div>

            <ApprovalFlowManagement />
        </div>
    )
}
