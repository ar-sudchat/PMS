'use client'

import { useState, useEffect } from 'react'
import { MilestoneGroup, ProjectWorkItemsGroup } from '@/lib/actions/work-items-actions'
import { ProjectDetailTwoPanel } from '@/components/projects/detail/two-panel/ProjectDetailTwoPanel'
import { SmartCombobox } from '@/components/shared/SmartCombobox'

interface AllWorkItemsViewProps {
    data: ProjectWorkItemsGroup[]
    filters: any
    onRefresh: () => void
}

export function AllWorkItemsView({ data, filters, onRefresh }: AllWorkItemsViewProps) {
    const [selectedProjectId, setSelectedProjectId] = useState<string>('')

    // Auto-select first project
    useEffect(() => {
        if (data.length > 0 && !selectedProjectId) {
            setSelectedProjectId(data[0].projectId)
        }
    }, [data])

    // Update selection if data changes and selected is not in data
    useEffect(() => {
        if (data.length > 0 && !data.find(p => p.projectId === selectedProjectId)) {
            setSelectedProjectId(data[0].projectId)
        }
    }, [data, selectedProjectId])


    const selectedProject = data.find(p => p.projectId === selectedProjectId)
    const options = data.map(p => ({ value: p.projectId, label: `${p.projectCode} | ${p.projectName}` }))

    return (
        <div className="h-full flex flex-col p-4 gap-4">
            {/* Project Selector */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm shrink-0 z-20">
                <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Select Project:</span>
                <div className="max-w-md w-full">
                    <SmartCombobox
                        options={options}
                        value={options.find(o => o.value === selectedProjectId) || null}
                        onChange={(val: any) => setSelectedProjectId(val?.value as string || '')}
                        placeholder="Search project..."
                    />
                </div>
            </div>

            {/* Project Content */}
            <div className="flex-1 min-h-0 bg-white border rounded-xl shadow-sm overflow-hidden">
                {selectedProject ? (
                    <div className="h-full flex flex-col">
                        <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                            <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                {selectedProject.projectCode}
                                <span className="text-slate-400 font-normal">|</span>
                                {selectedProject.projectName}
                            </h2>

                        </div>
                        <div className="flex-1 overflow-hidden p-0">
                            <ProjectDetailTwoPanel projectId={selectedProject.projectId} />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <p>Please select a project to view details.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
