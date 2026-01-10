'use client'

import { KPIOperationalSummary } from "@/lib/actions/kpi-records-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Rocket, Save, Clock, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPIOperationalCardsProps {
    summary: KPIOperationalSummary
}

export function KPIOperationalCards({ summary }: KPIOperationalCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Deploy Rate */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                        Deploy Success Rate
                    </CardTitle>
                    <Rocket className="h-4 w-4 text-indigo-600" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline justify-between">
                        <div className="text-2xl font-bold">
                            {summary.deploy_success_rate}%
                        </div>
                        <div className={cn("flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
                            summary.deploy_status === 'PASS' ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                        )}>
                            {summary.deploy_status === 'PASS' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                            {summary.deploy_status}
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        {summary.total_deploys - summary.total_rollbacks} successful / {summary.total_deploys} total
                    </p>
                    <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full", summary.deploy_status === 'PASS' ? "bg-green-500" : "bg-red-500")}
                            style={{ width: `${summary.deploy_success_rate}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Target: ≥{summary.deploy_target}%</p>
                </CardContent>
            </Card>

            {/* Backup Rate */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                        Pre-deploy Backup
                    </CardTitle>
                    <Save className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline justify-between">
                        <div className="text-2xl font-bold">
                            {summary.backup_rate}%
                        </div>
                        <div className={cn("flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
                            summary.backup_status === 'PASS' ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                        )}>
                            {summary.backup_status === 'PASS' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                            {summary.backup_status}
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        {summary.weeks_backup_done} weeks completed / {summary.total_weeks} total
                    </p>
                    <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full", summary.backup_status === 'PASS' ? "bg-green-500" : "bg-red-500")}
                            style={{ width: `${summary.backup_rate}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Target: {summary.backup_target}%</p>
                </CardContent>
            </Card>

            {/* Late Minutes */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                        Late Meeting Minutes
                    </CardTitle>
                    <Clock className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline justify-between">
                        <div className="text-2xl font-bold">
                            {summary.late_meeting_count} <span className="text-sm font-normal text-slate-500">times</span>
                        </div>
                        <div className={cn("flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
                            summary.late_meeting_status === 'PASS' ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                        )}>
                            {summary.late_meeting_status === 'PASS' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                            {summary.late_meeting_status}
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Exceeded 24h deadline
                    </p>
                    <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        {/* Inverse progress: less is better. Max 10? */}
                        <div
                            className={cn("h-full", summary.late_meeting_status === 'PASS' ? "bg-green-500" : "bg-red-500")}
                            style={{ width: `${Math.min((summary.late_meeting_count / (summary.late_meeting_target * 2)) * 100, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Target: ≤{summary.late_meeting_target} times</p>
                </CardContent>
            </Card>
        </div>
    )
}
