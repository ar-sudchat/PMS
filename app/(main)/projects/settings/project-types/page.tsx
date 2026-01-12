import { Suspense } from 'react'
import { getProjectTypes } from '@/lib/actions/project-type-actions'
import { ProjectTypeList } from '@/components/settings/ProjectTypeList'
import { Layers } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProjectTypesSettingsPage() {
    const result = await getProjectTypes(true) // Include inactive

    if (!result.success) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-lg">Error loading project types</h3>
                <p>{result.error}</p>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto p-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Layers className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Project Types</h1>
                </div>
                <p className="text-slate-500 ml-11 max-w-2xl">
                    Manage project type categories. Each type can have different settings for milestones and deliverables tracking.
                </p>
            </div>

            <Suspense fallback={<div>Loading project types...</div>}>
                <ProjectTypeList types={result.data || []} />
            </Suspense>
        </div>
    )
}
