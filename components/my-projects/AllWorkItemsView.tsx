'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { MilestoneGroup, ProjectWorkItemsGroup } from '@/lib/actions/work-items-actions'
import { WorkItemsTable } from '@/components/projects/detail/work-items/WorkItemsTable'
import Link from 'next/link'
import { getEmployees } from '@/lib/actions/project-actions'

interface AllWorkItemsViewProps {
    data: ProjectWorkItemsGroup[]
    filters: any
    onRefresh: () => void
}

export function AllWorkItemsView({ data, filters, onRefresh }: AllWorkItemsViewProps) {
    // We need employees for the assignee dropdowns.
    // Fetching here or passing? Should pass. 
    // But since this is a new component in MyProjectsGanttPage ecosystem, 
    // and MyProjectsGanttPage doesn't fetch all employees (it fetches filter options).
    // Let's fetch employees here.
    const [employees, setEmployees] = useState<{ id: string, name: string }[]>([])

    useEffect(() => {
        getEmployees().then(res => {
            if (res) setEmployees(res.map((e: any) => ({ id: e.id, name: e.full_name, nickname: e.nickname })))
        })
    }, [])

    return (
        <div className="h-full overflow-y-auto p-4 space-y-6">
            {data.length === 0 ? (
                <div className="text-center py-20 text-slate-500 border border-dashed rounded-lg">
                    <p>No projects found matching filters.</p>
                </div>
            ) : (
                data.map(project => (
                    <ProjectGroup
                        key={project.projectId}
                        project={project}
                        employees={employees}
                        onRefresh={onRefresh}
                    />
                ))
            )}
        </div>
    )
}

function ProjectGroup({ project, employees, onRefresh }: { project: ProjectWorkItemsGroup, employees: any[], onRefresh: () => void }) {
    const [expanded, setExpanded] = useState(true)

    return (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div
                className="flex items-center gap-2 p-3 bg-slate-50 border-b cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="p-1 text-slate-400">
                    {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
                <div>
                    <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        {project.projectCode}
                        <span className="text-slate-400 font-normal">|</span>
                        {project.projectName}
                    </h2>
                </div>
                <div className="ml-auto">
                    <Link
                        href={`/projects/${project.projectId}?tab=work-items`}
                        className="text-xs flex items-center gap-1 text-indigo-600 hover:underline px-2 py-1 rounded hover:bg-indigo-50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Open Detail <ExternalLink className="w-3 h-3" />
                    </Link>
                </div>
            </div>

            {expanded && (
                <div className="p-4">
                    <WorkItemsTable
                        data={project.milestones}
                        isLoading={false}
                        employees={employees}
                        onRefresh={onRefresh}
                        onAddStory={() => {
                            // Redirect to project detail to add? Or simple alert
                            // Currently WorkItemsTable expects a handler.
                            // If we want to support adding here, we need to pass projectId context.
                            // For global view, maybe redirect is better?
                            window.location.href = `/projects/${project.projectId}?tab=work-items`
                        }}
                    />
                </div>
            )}
        </div>
    )
}
