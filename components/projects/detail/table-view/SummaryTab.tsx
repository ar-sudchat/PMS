'use client'

import { format } from 'date-fns'
import { ProjectSummary } from '@/lib/actions/project-detail-actions'
import { Progress } from "@/components/ui/progress"

interface SummaryTabProps {
    summary: ProjectSummary | null
    isLoading: boolean
}

export function SummaryTab({ summary, isLoading }: SummaryTabProps) {
    if (isLoading || !summary) {
        return <div className="p-8 text-center text-slate-500">Loading summary...</div>
    }

    const { milestone_summary } = summary

    return (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50">
                <h4 className="font-semibold text-slate-700">Milestones Progress</h4>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                        <tr>
                            <th className="px-6 py-3">Milestone</th>
                            <th className="px-4 py-3 text-center">Weight</th>
                            <th className="px-4 py-3 text-center">Stories</th>
                            <th className="px-4 py-3 text-center">Tasks</th>
                            <th className="px-4 py-3 w-[250px]">Progress</th>
                            <th className="px-4 py-3 text-center">Plan MD</th>
                            <th className="px-4 py-3 text-center">Act MD</th>
                            <th className="px-4 py-3 text-right">Due Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {milestone_summary.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-800">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.milestone_color }} />
                                        {m.milestone_name} <span className="text-slate-400 font-normal">({m.milestone_code})</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center text-slate-600">
                                    {m.weight_percent}%
                                </td>
                                <td className="px-4 py-4 text-center text-slate-500">
                                    {m.stories_count}
                                </td>
                                <td className="px-4 py-4 text-center text-slate-500">
                                    {m.tasks_count}
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <Progress value={m.progress_percent} className="h-2 flex-1 bg-slate-100" indicatorColor={m.progress_percent === 100 ? "bg-green-500" : "bg-blue-500"} />
                                        <span className="text-xs font-medium w-9 text-right text-slate-600">{m.progress_percent}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center text-slate-600">
                                    {m.planned_mandays || '-'}
                                </td>
                                <td className="px-4 py-4 text-center text-slate-600">
                                    {m.actual_mandays?.toFixed(1) || '-'}
                                </td>
                                <td className="px-4 py-4 text-right text-slate-500">
                                    {m.due_date ? format(new Date(m.due_date), 'dd MMM yyyy') : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
