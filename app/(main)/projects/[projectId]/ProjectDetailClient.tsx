'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StoryCard } from '@/components/projects/detail/StoryCard'

interface ProjectDetailClientProps {
    project: any
    stories: any[]
}

export function ProjectDetailClient({ project, stories: initialStories }: ProjectDetailClientProps) {
    const router = useRouter()

    const handleRefresh = () => {
        router.refresh()
    }

    const healthColors = {
        on_track: 'bg-green-100 text-green-800',
        at_risk: 'bg-yellow-100 text-yellow-800',
        overdue: 'bg-red-100 text-red-800'
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Project Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="font-mono text-sm text-slate-500">{project.project_code}</span>
                                <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${healthColors[project.health_status as keyof typeof healthColors]}`}>
                                    {project.health_status.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="text-slate-600">
                                {project.customer_name} • {project.owner_nickname}
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-sm text-slate-500">Progress</div>
                            <div className="text-2xl font-bold text-slate-900">{project.progress_percent}%</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: `${project.progress_percent}%` }}
                            />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-5 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900">{project.total_stories}</div>
                            <div className="text-sm text-slate-500">Stories</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900">{project.total_tasks}</div>
                            <div className="text-sm text-slate-500">Tasks</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900">{project.sold_mandays}</div>
                            <div className="text-sm text-slate-500">Sold MD</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900">{project.used_mandays.toFixed(1)}</div>
                            <div className="text-sm text-slate-500">Used MD</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{project.defect_ratio.toFixed(1)}%</div>
                            <div className="text-sm text-slate-500">Defect Ratio</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stories Section */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Stories & Tasks</h2>
                    <div className="text-sm text-slate-600">
                        {initialStories.length} stories • {initialStories.reduce((acc, s) => acc + s.total_tasks, 0)} tasks
                    </div>
                </div>

                <div className="space-y-3">
                    {initialStories.length > 0 ? (
                        initialStories.map((story) => (
                            <StoryCard
                                key={story.id}
                                story={story}
                                tasks={story.tasks || []}
                                projectId={project.id}
                                onRefresh={handleRefresh}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
                            <div className="text-slate-500 mb-2">No stories yet</div>
                            <div className="text-sm text-slate-400">Create a story to get started</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
