'use client'

import { useRouter } from 'next/navigation'
import { HealthBreakdown, HealthIndicator } from '@/components/dashboard/HealthComponents'
import { type MilestoneHealth } from '@/lib/actions/dashboard-actions'
import { ArrowLeft, ChevronRight, Lock, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProjectHealthDetailClientProps {
    project: {
        id: string
        code: string
        name: string
        customer_name: string
        status: string
        start_date: string
        target_end_date: string
    }
    overallHealth: {
        time: number | null
        resource: number | null
        docs: number | null
        overall: number
    }
    milestones: MilestoneHealth[]
}

export function ProjectHealthDetailClient({
    project,
    overallHealth,
    milestones
}: ProjectHealthDetailClientProps) {
    const router = useRouter()

    const formatDate = (date: string) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('th-TH')
    }

    const formatScore = (score: number | null) => score !== null ? `${Math.round(score)}%` : '-'

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push('/pm-dashboard')}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800">
                        📊 {project.code}: {project.name}
                    </h1>
                    <p className="text-sm text-slate-500">Customer: {project.customer_name}</p>
                </div>
                <span className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                )}>
                    {project.status}
                </span>
            </div>

            {/* Overall Health Breakdown */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Overall Project Health</h2>
                <HealthBreakdown
                    time={overallHealth.time}
                    resource={overallHealth.resource}
                    docs={overallHealth.docs}
                    overall={overallHealth.overall}
                    timeDetail={`${milestones.filter(m => m.is_verified && m.time_score === 100).length}/${milestones.filter(m => m.is_verified).length} On-time`}
                    resourceDetail={`${milestones.reduce((s, m) => s + (m.actual_mandays || 0), 0)}/${milestones.reduce((s, m) => s + (m.planned_mandays || 0), 0)} MD`}
                    docsDetail={`${milestones.reduce((s, m) => s + (m.submitted_docs || 0), 0)}/${milestones.reduce((s, m) => s + (m.required_docs || 0), 0)} Docs`}
                />
            </div>

            {/* Milestones Breakdown */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                    <h2 className="text-lg font-semibold text-slate-700">Milestone Breakdown</h2>
                    <p className="text-sm text-slate-500">Click to drill down to milestone details</p>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="text-left px-4 py-3 font-semibold">Milestone</th>
                            <th className="text-center px-3 py-3 font-semibold w-24">Due Date</th>
                            <th className="text-center px-3 py-3 font-semibold w-24">Completed</th>
                            <th className="text-center px-3 py-3 font-semibold w-16">Time</th>
                            <th className="text-center px-3 py-3 font-semibold w-16">Plan MD</th>
                            <th className="text-center px-3 py-3 font-semibold w-16">Act MD</th>
                            <th className="text-center px-3 py-3 font-semibold w-16">Resource</th>
                            <th className="text-center px-3 py-3 font-semibold w-16">Docs</th>
                            <th className="text-center px-3 py-3 font-semibold w-20">Health</th>
                            <th className="w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {milestones.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="text-center py-8 text-slate-400">
                                    No milestones found
                                </td>
                            </tr>
                        ) : (
                            milestones.map((ms) => (
                                <tr
                                    key={ms.id}
                                    className={cn(
                                        "hover:bg-slate-50 transition-colors",
                                        ms.is_verified && "bg-green-50/50",
                                        !ms.is_verified && "cursor-pointer"
                                    )}
                                    onClick={() => router.push(`/pm-dashboard/${project.id}/${ms.id}`)}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {ms.is_verified ? (
                                                <Lock className="w-4 h-4 text-green-600" />
                                            ) : ms.is_locked ? (
                                                <Lock className="w-4 h-4 text-slate-400" />
                                            ) : (
                                                <Clock className="w-4 h-4 text-slate-400" />
                                            )}
                                            <span className="font-medium text-slate-700">{ms.milestone_name}</span>
                                            {ms.is_verified && (
                                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-center px-3 py-3 text-slate-600">{formatDate(ms.due_date)}</td>
                                    <td className="text-center px-3 py-3">
                                        {ms.completed_date ? (
                                            <span className="text-green-600">{formatDate(ms.completed_date)}</span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="text-center px-3 py-3">
                                        {ms.time_score !== null ? (
                                            ms.time_score >= 100 ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-red-500">❌</span>
                                        ) : <span className="text-slate-400">●</span>}
                                    </td>
                                    <td className="text-center px-3 py-3 text-slate-600">{ms.planned_mandays}</td>
                                    <td className="text-center px-3 py-3 text-slate-600">{ms.actual_mandays}</td>
                                    <td className="text-center px-3 py-3">
                                        {ms.resource_score !== null ? (
                                            ms.resource_score >= 100 ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-red-500">❌</span>
                                        ) : <span className="text-slate-400">●</span>}
                                    </td>
                                    <td className="text-center px-3 py-3">
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded-full text-xs",
                                            ms.submitted_docs === ms.required_docs && ms.required_docs > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'
                                        )}>
                                            {ms.submitted_docs}/{ms.required_docs}
                                        </span>
                                    </td>
                                    <td className="text-center px-3 py-3">
                                        {ms.is_verified ? (
                                            <HealthIndicator health={ms.overall_health} size="sm" />
                                        ) : (
                                            <span className="text-slate-400 text-sm">⏳ -</span>
                                        )}
                                    </td>
                                    <td className="px-2 py-3 text-slate-400">
                                        <ChevronRight className="w-4 h-4" />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Timeline (simplified) */}
            <div className="bg-white rounded-lg border shadow-sm p-4">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Timeline View</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {milestones.map((ms, idx) => (
                        <div
                            key={ms.id}
                            className={cn(
                                "flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium",
                                ms.is_verified ? 'bg-green-100 text-green-800' :
                                    ms.completed_date ? 'bg-blue-100 text-blue-800' :
                                        'bg-slate-100 text-slate-700'
                            )}
                        >
                            <div className="flex items-center gap-1">
                                {ms.is_verified && <CheckCircle2 className="w-3 h-3" />}
                                {ms.milestone_name}
                            </div>
                            <div className="text-xs opacity-75">{formatDate(ms.due_date)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
