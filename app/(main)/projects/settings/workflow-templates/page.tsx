import { Suspense } from 'react'
import { getAllWorkflowTemplates } from '@/lib/actions/project-request-actions'
import { WorkflowTemplateSettings } from '@/components/settings/WorkflowTemplateSettings'
import { GitBranch } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function WorkflowTemplatesPage() {
    const templates = await getAllWorkflowTemplates()

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <GitBranch className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Workflow Templates</h1>
                </div>
                <p className="text-slate-500 ml-11 max-w-2xl">
                    จัดการ Workflow Template สำหรับคำขอโครงการ กำหนดขั้นตอนการทำงานและผู้รับผิดชอบแต่ละขั้นตอน
                </p>
            </div>

            <Suspense fallback={<div className="p-4">Loading workflow templates...</div>}>
                <WorkflowTemplateSettings templates={templates} />
            </Suspense>
        </div>
    )
}
