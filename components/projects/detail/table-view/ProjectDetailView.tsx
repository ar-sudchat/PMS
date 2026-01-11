'use client'

import { useState, useEffect } from 'react'
import { getProjectSummary, ProjectSummary } from '@/lib/actions/project-detail-actions'
import { ProjectDetailTwoPanel } from '../two-panel/ProjectDetailTwoPanel'
import { Loader2 } from 'lucide-react'

interface ProjectDetailViewProps {
    projectId: string
    currentUserId: string
}

export function ProjectDetailView({ projectId, currentUserId }: ProjectDetailViewProps) {
    const [summary, setSummary] = useState<ProjectSummary | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Fetch summary for header stats
        getProjectSummary(projectId).then(res => {
            setSummary(res)
            setIsLoading(false)
        })
    }, [projectId])

    if (isLoading) {
        return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white rounded-lg border p-4 shadow-sm">
                        <div className="text-sm text-slate-500 font-medium mb-1">Stories</div>
                        <div className="text-2xl font-bold text-slate-800">{summary.totals.stories}</div>
                    </div>
                    <div className="bg-white rounded-lg border p-4 shadow-sm">
                        <div className="text-sm text-slate-500 font-medium mb-1">Tasks</div>
                        <div className="text-2xl font-bold text-slate-800">{summary.totals.tasks}</div>
                    </div>
                    <div className="bg-white rounded-lg border p-4 shadow-sm">
                        <div className="text-sm text-slate-500 font-medium mb-1">Progress</div>
                        <div className="text-2xl font-bold text-blue-600">{summary.totals.progress_percent}%</div>
                    </div>
                    <div className="bg-white rounded-lg border p-4 shadow-sm">
                        <div className="text-sm text-slate-500 font-medium mb-1">Plan MD</div>
                        <div className="text-2xl font-bold text-slate-800">{summary.totals.planned_mandays}</div>
                    </div>
                    <div className="bg-white rounded-lg border p-4 shadow-sm">
                        <div className="text-sm text-slate-500 font-medium mb-1">Act MD</div>
                        <div className="text-2xl font-bold text-slate-800">{summary.totals.actual_mandays?.toFixed(1)}</div>
                    </div>
                </div>
            )}

            {/* New Two-Panel Layout */}
            <ProjectDetailTwoPanel projectId={projectId} currentUserId={currentUserId} />
        </div>
    )
}
