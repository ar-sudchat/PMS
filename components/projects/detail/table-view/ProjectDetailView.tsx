'use client'

import { useState, useEffect } from 'react'
import { getProjectSummary, ProjectSummary } from '@/lib/actions/project-detail-actions'
import { SummaryTab } from './SummaryTab'
import { StoriesTab } from './StoriesTab'
import { TasksTab } from './TasksTab'
import { cn } from "@/lib/utils"
import { BarChart3, List, CheckSquare } from 'lucide-react'

interface ProjectDetailViewProps {
    projectId: string
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
    const [activeTab, setActiveTab] = useState<'summary' | 'stories' | 'tasks'>('summary')
    const [summary, setSummary] = useState<ProjectSummary | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        getProjectSummary(projectId).then(res => {
            setSummary(res)
            setIsLoading(false)
        })
    }, [projectId])

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex items-center space-x-1 border-b pb-1">
                <button
                    onClick={() => setActiveTab('summary')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 border-b-2 transition-colors",
                        activeTab === 'summary'
                            ? "border-blue-600 text-blue-600 bg-blue-50/50"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                >
                    <BarChart3 className="w-4 h-4" />
                    Summary
                </button>
                <button
                    onClick={() => setActiveTab('stories')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 border-b-2 transition-colors",
                        activeTab === 'stories'
                            ? "border-blue-600 text-blue-600 bg-blue-50/50"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                >
                    <List className="w-4 h-4" />
                    Stories
                    {summary && <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">{summary.totals.stories}</span>}
                </button>
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 border-b-2 transition-colors",
                        activeTab === 'tasks'
                            ? "border-blue-600 text-blue-600 bg-blue-50/50"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                >
                    <CheckSquare className="w-4 h-4" />
                    Tasks
                    {summary && <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">{summary.totals.tasks}</span>}
                </button>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[500px]">
                {activeTab === 'summary' && <SummaryTab summary={summary} isLoading={isLoading} />}
                {activeTab === 'stories' && <StoriesTab projectId={projectId} />}
                {activeTab === 'tasks' && <TasksTab projectId={projectId} />}
            </div>
        </div>
    )
}
