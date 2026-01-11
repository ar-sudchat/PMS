'use client'

import { useRouter } from 'next/navigation'
import { HealthGauge } from '@/components/dashboard/HealthComponents'
import { ArrowLeft, Clock, Users, FileText, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MilestoneHealthDetailClientProps {
    projectId: string
    milestone: {
        id: string
        name: string
        code: string
        project_name: string
        due_date: string
        completed_date?: string
        support_end_date?: string
        is_verified: boolean
        planned_mandays: number
        actual_mandays: number
    }
    health: {
        time: { score: number | null; daysRemaining: number; status: string }
        resource: { score: number | null; planned: number; actual: number; status: string }
        docs: { score: number | null; submitted: number; total: number; status: string }
    }
    tasks: Array<{
        id: string
        task_code: string
        title: string
        assignee_name: string
        estimated_hours: number
        actual_hours: number
        progress: number
        status: string
    }>
    deliverables: Array<{
        id: string
        name: string
        is_required: boolean
        submitted_date?: string
        is_on_time: boolean
    }>
    resources: Array<{
        employee_id: string
        employee_name: string
        position: string
        planned_hours: number
        actual_hours: number
        utilization: number
    }>
}

export function MilestoneHealthDetailClient({
    projectId,
    milestone,
    health,
    tasks,
    deliverables,
    resources
}: MilestoneHealthDetailClientProps) {
    const router = useRouter()

    const formatDate = (date?: string) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('th-TH')
    }

    const overall = Math.round(
        Math.pow(
            (health.time.score || 0) * (health.resource.score || 0) * (health.docs.score || 0) / 10000,
            1 / 3
        ) * Math.pow(100, 2 / 3)
    ) || 0

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/pm-dashboard/${projectId}`)}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Project
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800">
                        📊 {milestone.project_name} → {milestone.name}
                    </h1>
                    <p className="text-sm text-slate-500">
                        Due: {formatDate(milestone.due_date)}
                        {health.time.daysRemaining > 0 ? ` (${health.time.daysRemaining} days remaining)` : ' (Overdue)'}
                    </p>
                </div>
                {milestone.is_verified && (
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Verified
                    </span>
                )}
            </div>

            {/* Health Gauges */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Milestone Health: {overall}%</h2>
                <div className="grid grid-cols-3 gap-6">
                    {/* Time */}
                    <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold text-blue-900">TIME: {health.time.score !== null ? `${health.time.score}%` : '-'}</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${health.time.score || 0}%` }}></div>
                        </div>
                        <p className="text-sm text-blue-700">{health.time.daysRemaining} days remaining</p>
                        <p className={cn("text-sm font-medium", health.time.status === 'On track' ? 'text-green-600' : 'text-red-600')}>
                            {health.time.status} ✓
                        </p>
                    </div>

                    {/* Resource */}
                    <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="w-5 h-5 text-purple-600" />
                            <span className="font-semibold text-purple-900">RESOURCE: {health.resource.score !== null ? `${health.resource.score}%` : '-'}</span>
                        </div>
                        <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
                            <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(health.resource.score || 0, 100)}%` }}></div>
                        </div>
                        <p className="text-sm text-purple-700">{health.resource.actual}/{health.resource.planned} MD used</p>
                        <p className={cn("text-sm font-medium", health.resource.status === 'On budget' ? 'text-green-600' : 'text-red-600')}>
                            {health.resource.status} ✓
                        </p>
                    </div>

                    {/* Docs */}
                    <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-green-900">DOCS: {health.docs.score !== null ? `${health.docs.score}%` : '-'}</span>
                        </div>
                        <div className="w-full bg-green-200 rounded-full h-2 mb-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: `${health.docs.score || 0}%` }}></div>
                        </div>
                        <p className="text-sm text-green-700">{health.docs.submitted}/{health.docs.total} submitted</p>
                        <p className={cn("text-sm font-medium", health.docs.status === 'Complete' ? 'text-green-600' : 'text-amber-600')}>
                            {health.docs.status} {health.docs.status === 'Complete' ? '✓' : '⚠️'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Two columns: Tasks + Deliverables */}
            <div className="grid grid-cols-2 gap-6">
                {/* Tasks */}
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b bg-slate-50">
                        <h3 className="font-semibold text-slate-700">📋 Tasks (Stories)</h3>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="text-left px-3 py-2">Task</th>
                                <th className="text-left px-3 py-2">Assignee</th>
                                <th className="text-center px-2 py-2 w-12">Est</th>
                                <th className="text-center px-2 py-2 w-12">Act</th>
                                <th className="text-center px-2 py-2 w-12">%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {tasks.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-4 text-slate-400">No tasks</td></tr>
                            ) : tasks.map((task) => (
                                <tr key={task.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 text-slate-700">{task.title}</td>
                                    <td className="px-3 py-2 text-slate-600">{task.assignee_name || '-'}</td>
                                    <td className="text-center px-2 py-2 text-slate-600">{task.estimated_hours}h</td>
                                    <td className="text-center px-2 py-2 text-slate-600">{task.actual_hours}h</td>
                                    <td className="text-center px-2 py-2">
                                        <span className={cn(
                                            "text-xs font-medium",
                                            task.status === 'done' ? 'text-green-600' : 'text-slate-600'
                                        )}>
                                            {task.progress}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Deliverables */}
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b bg-slate-50">
                        <h3 className="font-semibold text-slate-700">📄 Deliverables</h3>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="text-left px-3 py-2">Document</th>
                                <th className="text-center px-2 py-2 w-16">Status</th>
                                <th className="text-center px-2 py-2 w-16">On-time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {deliverables.length === 0 ? (
                                <tr><td colSpan={3} className="text-center py-4 text-slate-400">No deliverables</td></tr>
                            ) : deliverables.map((doc) => (
                                <tr key={doc.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2">
                                        <span className="text-slate-700">{doc.name}</span>
                                        {doc.is_required && <span className="ml-1 text-red-500 text-xs">*</span>}
                                    </td>
                                    <td className="text-center px-2 py-2">
                                        {doc.submitted_date ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                                        ) : (
                                            <span className="text-slate-400">⏳</span>
                                        )}
                                    </td>
                                    <td className="text-center px-2 py-2">
                                        {doc.submitted_date ? (
                                            doc.is_on_time ?
                                                <span className="text-green-600">✓ Yes</span> :
                                                <span className="text-red-600">✗ No</span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Resource Utilization */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                    <h3 className="font-semibold text-slate-700">👥 Resource Utilization</h3>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="text-left px-4 py-3">Team Member</th>
                            <th className="text-left px-3 py-3 w-20">Role</th>
                            <th className="text-center px-3 py-3 w-20">Planned</th>
                            <th className="text-center px-3 py-3 w-20">Actual</th>
                            <th className="text-left px-3 py-3 w-48">Utilization</th>
                            <th className="text-center px-3 py-3 w-24">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {resources.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-4 text-slate-400">No resource data</td></tr>
                        ) : resources.map((res) => (
                            <tr key={res.employee_id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-700">{res.employee_name}</td>
                                <td className="px-3 py-3 text-slate-600">{res.position}</td>
                                <td className="text-center px-3 py-3 text-slate-600">{res.planned_hours} MD</td>
                                <td className="text-center px-3 py-3 text-slate-600">{res.actual_hours} MD</td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-200 rounded-full h-2.5">
                                            <div
                                                className={cn(
                                                    "h-2.5 rounded-full",
                                                    res.utilization <= 100 ? 'bg-green-500' : 'bg-red-500'
                                                )}
                                                style={{ width: `${Math.min(res.utilization, 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-medium text-slate-600 w-12">{res.utilization}%</span>
                                    </div>
                                </td>
                                <td className="text-center px-3 py-3">
                                    <span className={cn(
                                        "text-xs px-2 py-1 rounded-full font-medium",
                                        res.utilization >= 100 ? 'bg-yellow-100 text-yellow-700' :
                                            res.utilization >= 50 ? 'bg-green-100 text-green-700' :
                                                'bg-blue-100 text-blue-700'
                                    )}>
                                        {res.utilization >= 100 ? '🟡 Full' : res.utilization >= 50 ? '🟢 On track' : '🔵 Available'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
