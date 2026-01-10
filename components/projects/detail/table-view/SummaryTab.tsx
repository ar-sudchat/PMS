'use client'

import { format } from 'date-fns'
import { ProjectSummary } from '@/lib/actions/project-detail-actions'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckSquare, Flag, Layers, Timer } from 'lucide-react'

interface SummaryTabProps {
    summary: ProjectSummary | null
    isLoading: boolean
}

export function SummaryTab({ summary, isLoading }: SummaryTabProps) {
    if (isLoading || !summary) {
        return <div className="p-8 text-center text-slate-500">Loading summary...</div>
    }

    const { totals, milestone_summary } = summary

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                📊 Project Summary
            </h3>

            {/* Top Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-sm font-medium text-slate-500">Milestones</CardTitle>
                        <Flag className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold">{totals.milestones}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-sm font-medium text-slate-500">Stories</CardTitle>
                        <Layers className="h-4 w-4 text-indigo-400" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold">{totals.stories}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-sm font-medium text-slate-500">Tasks</CardTitle>
                        <CheckSquare className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold">{totals.tasks}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-sm font-medium text-slate-500">Progress</CardTitle>
                        {/* Circle logic could go here */}
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold text-green-600">{totals.progress_percent}%</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-sm font-medium text-slate-500">Mandays</CardTitle>
                        <Timer className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold">{totals.actual_mandays?.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ {totals.planned_mandays}</span></div>
                    </CardContent>
                </Card>
            </div>

            {/* Milestones Table */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-slate-50">
                    <h4 className="font-semibold text-slate-800">Milestones Breakdown</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-3">Milestone</th>
                                <th className="px-4 py-3 text-center">Weight</th>
                                <th className="px-4 py-3 text-center">Stories</th>
                                <th className="px-4 py-3 text-center">Tasks</th>
                                <th className="px-4 py-3 w-[200px]">Progress</th>
                                <th className="px-4 py-3 text-center">Plan MD</th>
                                <th className="px-4 py-3 text-center">Act MD</th>
                                <th className="px-4 py-3 text-right">Due Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {milestone_summary.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.milestone_color }} />
                                            {m.milestone_name} ( {m.milestone_code} )
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center text-slate-600 font-medium">
                                        {m.weight_percent}%
                                    </td>
                                    <td className="px-4 py-4 text-center text-slate-500">
                                        {m.stories_count}
                                    </td>
                                    <td className="px-4 py-4 text-center text-slate-500">
                                        {m.tasks_count}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <Progress value={m.progress_percent} className="h-2 flex-1" indicatorColor="bg-green-500" />
                                            <span className="text-xs font-medium w-8 text-right">{m.progress_percent}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center text-slate-600">
                                        {m.planned_mandays || '-'}
                                    </td>
                                    <td className="px-4 py-4 text-center text-slate-600">
                                        {m.actual_mandays?.toFixed(1) || '-'}
                                    </td>
                                    <td className="px-4 py-4 text-right text-slate-500">
                                        {format(new Date(m.due_date), 'dd MMM yyyy')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
