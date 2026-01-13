'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrackingProject, TrackingMilestone } from '@/lib/actions/tracking-dashboard-actions'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

interface TimelineTableProps {
    projects: TrackingProject[]
    year: number
    onYearChange: (year: number) => void
    onProjectClick?: (projectId: string) => void
}

export function TimelineTable({ projects, year, onYearChange, onProjectClick }: TimelineTableProps) {
    const getMilestoneForMonth = (milestones: TrackingMilestone[], month: number): TrackingMilestone | undefined => {
        return milestones.find(m => m.month === month && m.year === year)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200'
            case 'current': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'overdue': return 'bg-red-100 text-red-700 border-red-200'
            default: return 'bg-slate-100 text-slate-600 border-slate-200'
        }
    }

    const getStatusEmoji = (status: string) => {
        switch (status) {
            case 'completed': return '✓'
            case 'current': return '●'
            case 'overdue': return '!'
            default: return ''
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Year Navigation */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <button
                    onClick={() => onYearChange(year - 1)}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <span className="font-bold text-lg text-slate-700">{year}</span>
                <button
                    onClick={() => onYearChange(year + 1)}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
            </div>

            {/* Table with Horizontal Scroll */}
            <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 min-w-[1200px]">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="text-center px-3 py-3 font-semibold text-slate-500 text-sm w-12 border-b border-slate-200 sticky left-0 bg-slate-50 z-10">
                                No.
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-700 w-64 border-b border-slate-200 sticky left-12 bg-slate-50 z-10">
                                Project
                            </th>
                            <th className="text-center px-3 py-3 font-semibold text-slate-700 w-24 border-b border-slate-200">
                                Progress
                            </th>
                            {MONTHS.map(month => (
                                <th
                                    key={month}
                                    className="text-center px-2 py-3 font-semibold text-slate-500 text-xs w-20 border-b border-slate-200"
                                >
                                    {month}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {projects.length === 0 ? (
                            <tr>
                                <td colSpan={15} className="text-center py-16 text-slate-400">
                                    No projects found for {year}
                                </td>
                            </tr>
                        ) : (
                            projects.map((project, index) => (
                                <tr
                                    key={project.project_id}
                                    className={cn(
                                        "hover:bg-indigo-50/50 cursor-pointer transition-colors",
                                        index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                    )}
                                    onClick={() => onProjectClick?.(project.project_id)}
                                >
                                    {/* Row Number */}
                                    <td className="text-center px-3 py-4 border-b border-slate-100 sticky left-0 bg-inherit z-10">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                                            {index + 1}
                                        </span>
                                    </td>

                                    {/* Project Info */}
                                    <td className="px-4 py-4 border-b border-slate-100 sticky left-12 bg-inherit z-10">
                                        <div className="flex items-start gap-2">
                                            <span
                                                className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                                                style={{ backgroundColor: project.project_type_color }}
                                            >
                                                {project.project_type?.substring(0, 3)?.toUpperCase() || 'N/A'}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="font-mono text-sm text-indigo-600 font-medium">
                                                    {project.project_code}
                                                </div>
                                                <div className="text-slate-700 text-sm truncate max-w-[180px]" title={project.project_name}>
                                                    {project.project_name}
                                                </div>
                                                <div className="text-slate-400 text-xs truncate">
                                                    {project.customer_name}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Progress */}
                                    <td className="px-3 py-4 border-b border-slate-100">
                                        <div className="space-y-1">
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all"
                                                    style={{ width: `${Math.min(project.progress_percent || 0, 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-500">
                                                <span>{project.used_mandays?.toFixed(1) || 0}/{project.sold_mandays || 0}</span>
                                                <span className="font-medium">{project.progress_percent || 0}%</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Month Cells */}
                                    {MONTHS.map((_, monthIndex) => {
                                        const milestone = getMilestoneForMonth(project.milestones, monthIndex + 1)
                                        return (
                                            <td
                                                key={monthIndex}
                                                className="px-1 py-4 border-b border-slate-100 text-center"
                                            >
                                                {milestone ? (
                                                    <div
                                                        className={cn(
                                                            "inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-medium border",
                                                            getStatusColor(milestone.status)
                                                        )}
                                                        title={`${milestone.name} (${milestone.status})`}
                                                    >
                                                        <span>{getStatusEmoji(milestone.status)}</span>
                                                        <span className="truncate max-w-[50px]">{milestone.code || milestone.name.substring(0, 4)}</span>
                                                    </div>
                                                ) : null}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
