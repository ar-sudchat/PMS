import { Suspense } from 'react'
import { getDeliverableConfigsByMilestone, getMilestoneConfigs } from '@/lib/actions/deliverable-config-actions'
import { DeliverableConfigList } from '@/components/settings/DeliverableConfigList'
import { Box } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DeliverablesSettingsPage() {
    const [configsResult, milestonesResult] = await Promise.all([
        getDeliverableConfigsByMilestone(),
        getMilestoneConfigs()
    ])

    if (!configsResult.success || !milestonesResult.success) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-lg">Error loading configuration</h3>
                <p>{configsResult.error || milestonesResult.error}</p>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto p-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Box className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Deliverables Configuration</h1>
                </div>
                <p className="text-slate-500 ml-11 max-w-2xl">
                    Manage the default documents required for each project phase.
                    Changes here will apply to new projects and new milestones, but existing project deliverables won't be modified automatically to preserve history.
                </p>
            </div>

            <Suspense fallback={<div>Loading configs...</div>}>
                <DeliverableConfigList
                    configs={configsResult.data}
                    milestoneConfigs={milestonesResult.data}
                />
            </Suspense>
        </div>
    )
}
