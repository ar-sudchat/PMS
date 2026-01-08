'use client'

import { useState, useEffect } from 'react'
import { X, Edit, Calendar, User, Building, Target, FileText, DollarSign } from 'lucide-react'
import { getProjectById } from '@/lib/actions/project-actions'

interface ProjectDetailModalProps {
    open: boolean
    onClose: () => void
    projectId: string | null
    onEdit: (project: any) => void
}

export function ProjectDetailModal({ open, onClose, projectId, onEdit }: ProjectDetailModalProps) {
    const [project, setProject] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (open && projectId) {
            loadProject(projectId)
        } else {
            setProject(null)
        }
    }, [open, projectId])

    const loadProject = async (id: string) => {
        setIsLoading(true)
        try {
            const result = await getProjectById(id)
            if (result.success && result.data) {
                setProject(result.data)
            }
        } catch (error) {
            console.error('Failed to load project:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleEdit = () => {
        if (project) {
            onEdit(project)
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Project Details
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : project ? (
                        <div className="space-y-6">
                            {/* Project Header */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                                        <span className="font-mono">{project.project_code}</span>
                                        <span>•</span>
                                        <span>{project.project_year}</span>
                                    </div>
                                    <h3 className="text-xl font-semibold">{project.name}</h3>
                                    {project.name_th && (
                                        <p className="text-slate-600">{project.name_th}</p>
                                    )}
                                    {project.description && (
                                        <p className="text-sm text-slate-500 mt-2">{project.description}</p>
                                    )}
                                </div>
                                <span
                                    className="px-3 py-1 rounded-full text-sm font-medium"
                                    style={{
                                        backgroundColor: project.status_color ? `${project.status_color}20` : '#e2e8f0',
                                        color: project.status_color || '#64748b'
                                    }}
                                >
                                    {project.status_name || 'Unknown'}
                                </span>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <Building className="w-5 h-5 text-slate-400" />
                                    <div>
                                        <p className="text-xs text-slate-500">Customer</p>
                                        <p className="font-medium">{project.customer_name || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <User className="w-5 h-5 text-slate-400" />
                                    <div>
                                        <p className="text-xs text-slate-500">Project Manager</p>
                                        <p className="font-medium">{project.pm_name || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <Calendar className="w-5 h-5 text-slate-400" />
                                    <div>
                                        <p className="text-xs text-slate-500">Warranty End</p>
                                        <p className="font-medium">
                                            {project.warranty_end_date
                                                ? new Date(project.warranty_end_date).toLocaleDateString('th-TH')
                                                : '-'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <Target className="w-5 h-5 text-slate-400" />
                                    <div>
                                        <p className="text-xs text-slate-500">Current Milestone</p>
                                        <p
                                            className="font-medium"
                                            style={{ color: project.current_milestone_color || 'inherit' }}
                                        >
                                            {project.current_milestone_name || 'Not started'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Manday Summary */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    Manday Summary
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                                        <p className="text-2xl font-bold text-blue-700">{project.sold_mandays || 0}</p>
                                        <p className="text-xs text-blue-600">Planned MD</p>
                                    </div>
                                    <div className="p-4 bg-amber-50 rounded-lg text-center">
                                        <p className="text-2xl font-bold text-amber-700">{project.total_actual_mandays || 0}</p>
                                        <p className="text-xs text-amber-600">Actual MD</p>
                                    </div>
                                    <div className="p-4 bg-green-50 rounded-lg text-center">
                                        <p className="text-2xl font-bold text-green-700">{project.progress_percent || 0}%</p>
                                        <p className="text-xs text-green-600">Progress</p>
                                    </div>
                                </div>
                            </div>

                            {/* Financial */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" />
                                    Financial
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-3 border rounded-lg">
                                        <p className="text-xs text-slate-500">Sold Mandays</p>
                                        <p className="text-lg font-semibold">{project.sold_mandays || 0} MD</p>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                        <p className="text-xs text-slate-500">Rate / Day</p>
                                        <p className="text-lg font-semibold">฿{(project.manday_rate || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                        <p className="text-xs text-slate-500">Total Value</p>
                                        <p className="text-lg font-semibold text-blue-600">฿{(project.total_value || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Milestones */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    Milestones ({project.milestones?.length || 0})
                                </h4>

                                {project.milestones && project.milestones.length > 0 ? (
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-medium text-slate-600">Milestone</th>
                                                    <th className="px-4 py-2 text-center font-medium text-slate-600">Weight</th>
                                                    <th className="px-4 py-2 text-center font-medium text-slate-600">Due Date</th>
                                                    <th className="px-4 py-2 text-center font-medium text-slate-600">MD</th>
                                                    <th className="px-4 py-2 text-center font-medium text-slate-600">Status</th>
                                                    <th className="px-4 py-2 text-center font-medium text-slate-600">Docs</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {project.milestones.map((ms: any, index: number) => (
                                                    <tr key={ms.id || index} className={ms.is_current ? 'bg-blue-50' : ''}>
                                                        <td className="px-4 py-2">
                                                            <div className="flex items-center gap-2">
                                                                {ms.is_current && (
                                                                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                                                )}
                                                                <span style={{ color: ms.milestone_color || 'inherit' }}>
                                                                    {ms.milestone_name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 text-center">{ms.weight_percent || 0}%</td>
                                                        <td className="px-4 py-2 text-center">
                                                            {ms.due_date
                                                                ? new Date(ms.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                                                                : '-'
                                                            }
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            {ms.actual_mandays || 0}/{ms.planned_mandays || 0}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-xs ${ms.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                    ms.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                {ms.status === 'completed' ? 'Done' :
                                                                    ms.status === 'in_progress' ? 'In Progress' : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-center text-slate-500">
                                                            {ms.submitted_count || 0}/{ms.deliverable_count || 0}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500 border rounded-lg">
                                        No milestones configured
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            Project not found
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleEdit}
                        disabled={!project}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Edit className="w-4 h-4" />
                        Edit Project
                    </button>
                </div>
            </div>
        </div>
    )
}
