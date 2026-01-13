'use client'

import { type ProjectHealthSummary } from '@/lib/actions/dashboard-actions'
import { X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ProjectDetailModalProps {
    project: ProjectHealthSummary | null
    isOpen: boolean
    onClose: () => void
    onGoToControlTower: (projectId: string) => void
}

export function ProjectDetailModal({ project, isOpen, onClose, onGoToControlTower }: ProjectDetailModalProps) {
    if (!isOpen || !project) return null

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-start justify-between z-10">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="font-mono text-xs">
                                {project.project_code}
                            </Badge>
                            <Badge className={cn(
                                "text-xs",
                                project.health_status === 'critical' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' :
                                    project.health_status === 'at-risk' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                                        'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            )}>
                                {project.health_status.toUpperCase()}
                            </Badge>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {project.project_name}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {project.customer_name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Health Overview */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
                            Health Overview
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <div className="text-xs text-slate-500 mb-1">Overall Health</div>
                                <div className="text-2xl font-bold text-slate-800">
                                    {project.overall_health}%
                                </div>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                <div className="text-xs text-blue-600 mb-1">Time Score</div>
                                <div className="text-2xl font-bold text-blue-700">
                                    {project.time_score}%
                                </div>
                            </div>
                            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                                <div className="text-xs text-purple-600 mb-1">Resource Score</div>
                                <div className="text-2xl font-bold text-purple-700">
                                    {project.resource_score}%
                                </div>
                            </div>
                            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                                <div className="text-xs text-emerald-600 mb-1">Docs Score</div>
                                <div className="text-2xl font-bold text-emerald-700">
                                    {project.docs_score}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Current Milestone */}
                    {project.current_milestone_name && (
                        <div>
                            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
                                Current Milestone
                            </h3>
                            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                                <div className="font-semibold text-indigo-700">
                                    {project.current_milestone_name}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Project Information */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
                            Project Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Project Code</div>
                                <div className="font-medium text-slate-800">{project.project_code}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Customer</div>
                                <div className="font-medium text-slate-800">{project.customer_name}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Status</div>
                                <div className="font-medium text-slate-800 capitalize">{project.health_status.replace('-', ' ')}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Overall Progress</div>
                                <div className="font-medium text-slate-800">{project.overall_health}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 border-t border-slate-200">
                        <Button
                            onClick={() => onGoToControlTower(project.project_id)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            <span>Go to Control Tower</span>
                            <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
