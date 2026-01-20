'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, FileText, User, ShieldCheck, Target, Layers, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type MilestoneHealth } from '@/lib/actions/dashboard-actions'

interface ProjectCustomerViewProps {
    project: {
        id: string
        customer_name: string
        end_date?: string
    }
    overallHealth: {
        overall: number
    }
    milestones: MilestoneHealth[]
    currentDeliverables: any[]
}

export function ProjectCustomerView({
    project,
    overallHealth,
    milestones,
    currentDeliverables
}: ProjectCustomerViewProps) {

    const formatStrictDate = (date: string | null | undefined) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const currentMilestoneIndex = milestones.findIndex(m => !m.is_verified)
    const isProjectCompleted = currentMilestoneIndex === -1 && milestones.length > 0
    const activeStep = isProjectCompleted ? milestones.length - 1 : (currentMilestoneIndex === -1 ? 0 : currentMilestoneIndex)
    const currentMilestone = milestones[activeStep]

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* 1. Project Snapshot Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Hero */}
                <Card className="md:col-span-2 bg-white border-slate-100 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-32 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full blur-3xl opacity-50 -z-10" />
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-xl text-slate-800">Project Status Report</CardTitle>
                                <CardDescription>As of {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</CardDescription>
                            </div>
                            <Badge className={cn(
                                "text-sm px-3 py-1 capitalize",
                                overallHealth.overall >= 80 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" :
                                    overallHealth.overall >= 60 ? "bg-amber-100 text-amber-700 hover:bg-amber-100" :
                                        "bg-rose-100 text-rose-700 hover:bg-rose-100"
                            )}>
                                {overallHealth.overall >= 80 ? "On Track" : overallHealth.overall >= 60 ? "At Risk" : "Critical"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-8">
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Phase</div>
                            <div className="text-2xl font-bold text-indigo-700">{currentMilestone?.milestone_name || 'Project Completed'}</div>
                            <p className="text-sm text-slate-500 mt-1">Target: {formatStrictDate(currentMilestone?.due_date)}</p>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Next Key Milestone</div>
                            {milestones[activeStep + 1] ? (
                                <>
                                    <div className="text-xl font-bold text-slate-700">{milestones[activeStep + 1].milestone_name}</div>
                                    <p className="text-sm text-slate-500 mt-1">Due: {formatStrictDate(milestones[activeStep + 1].due_date)}</p>
                                </>
                            ) : (
                                <div className="text-slate-500 italic">No future milestones planned.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Stats */}
                <div className="space-y-4">
                    <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-emerald-600 uppercase">Completed Phases</p>
                                <p className="text-2xl font-black text-emerald-700">{milestones.filter(m => m.is_verified).length}</p>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-100 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-blue-600 uppercase">Docs Submitted</p>
                                <p className="text-2xl font-black text-blue-700">{currentDeliverables.filter(d => d.verification_status === 'submitted' || d.status === 'verified').length}/{currentDeliverables.length}</p>
                            </div>
                            <FileText className="w-8 h-8 text-blue-300" />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 2. Simplified Timeline */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-slate-400" /> Project Timeline
                </h3>
                <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm overflow-x-auto">
                    <div className="flex items-center justify-between min-w-max px-4">
                        {milestones.map((m: any, index: number) => {
                            const status = index < activeStep ? 'completed' : index === activeStep ? 'current' : 'upcoming'
                            return (
                                <div key={m.id} className="flex flex-col items-center relative group flex-1 min-w-[120px]">
                                    {/* Connector */}
                                    {index !== 0 && (
                                        <div className="absolute top-4 right-[50%] w-full h-[2px] -z-10">
                                            <div className={`h-full w-full ${index <= activeStep ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                                        </div>
                                    )}

                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 transition-colors duration-300",
                                        status === 'completed' ? "bg-indigo-600 border-indigo-600" :
                                            status === 'current' ? "bg-white border-indigo-600 ring-4 ring-indigo-50" :
                                                "bg-white border-slate-200"
                                    )}>
                                        {status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-white" /> :
                                            status === 'current' ? <div className="w-3 h-3 bg-indigo-600 rounded-full" /> :
                                                <div className="w-2 h-2 bg-slate-300 rounded-full" />}
                                    </div>

                                    <div className="text-center mt-3 space-y-1">
                                        <p className={cn(
                                            "text-xs font-bold",
                                            status === 'current' ? "text-indigo-700" : "text-slate-600"
                                        )}>
                                            {m.milestone_name}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono">
                                            {formatStrictDate(m.due_date)}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* 3. Pending Actions / Deliverables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pending Client Actions */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-amber-500" /> Pending Client Actions
                    </h3>
                    <Card className="border-amber-100 bg-amber-50/30">
                        <CardContent className="p-4 space-y-3">
                            {currentDeliverables.filter(d => !d.status || d.status !== 'verified').length > 0 ? (
                                currentDeliverables.filter(d => !d.status || d.status !== 'verified').map((doc: any) => (
                                    <div key={doc.id} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                                        <div className="p-1.5 bg-amber-100 rounded text-amber-600 mt-0.5">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700">{doc.name}</p>
                                            <p className="text-xs text-slate-500">Requires review & verification</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-slate-400 text-sm">
                                    No pending actions required from you at this time.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                {/* Recent Completed */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" /> Recently Completed
                    </h3>
                    <Card className="border-slate-100">
                        <CardContent className="p-4 space-y-3">
                            {currentDeliverables.filter(d => d.status === 'verified').length > 0 ? (
                                currentDeliverables.filter(d => d.status === 'verified').slice(0, 3).map((doc: any) => (
                                    <div key={doc.id} className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div className="p-1.5 bg-emerald-100 rounded text-emerald-600 mt-0.5">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700">{doc.name}</p>
                                            <p className="text-xs text-slate-500">Verified & Approved</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-slate-400 text-sm">
                                    No recent completions in this phase yet.
                                </div>
                            )}
                            {milestones.filter(m => m.is_verified).length > 0 && (
                                <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="p-1.5 bg-indigo-100 rounded text-indigo-600 mt-0.5">
                                        <Target className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700">{milestones.filter(m => m.is_verified).pop()?.milestone_name}</p>
                                        <p className="text-xs text-slate-500">Milestone Achieved</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
