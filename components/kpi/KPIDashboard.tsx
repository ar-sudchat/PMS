"use client";

import { Project } from "@/types/project";
import { TimesheetEntry } from "@/types/timesheet";
import { calculateProjectKPI } from "@/services/kpiService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIDashboardProps {
    project: Project;
    timesheets: TimesheetEntry[];
}

function KPIStatusCard({ title, score, target, isSuccess, suffix = '%' }: any) {
    return (
        <Card>
            <CardContent className="p-4 pt-6 flex flex-col items-center text-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{score.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">{suffix}</span>
                </div>
                <div className="flex items-center gap-2 text-xs mt-1">
                    <span className="text-muted-foreground">Target: {target}</span>
                    <Badge variant={isSuccess ? "default" : "destructive"} className={cn("px-1.5 py-0 h-5", isSuccess ? "bg-emerald-600" : "")}>
                        {isSuccess ? 'PASS' : 'FAIL'}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}

export function KPIDashboard({ project, timesheets }: KPIDashboardProps) {
    const kpi = calculateProjectKPI(project, timesheets);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        CMMI Performance Indicators
                        {kpi.overallStatus === 'pass' && <CheckCircle2 className="text-emerald-500 h-5 w-5" />}
                        {kpi.overallStatus === 'warning' && <AlertTriangle className="text-yellow-500 h-5 w-5" />}
                        {kpi.overallStatus === 'fail' && <XCircle className="text-red-500 h-5 w-5" />}
                    </h2>
                    <p className="text-sm text-muted-foreground">Real-time tracking against configured targets.</p>
                </div>
                <div className="text-right">
                    <Badge variant="outline" className="text-xs">Period: Q1 2025</Badge>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPIStatusCard
                    title="Time to Delivery"
                    score={kpi.timeToDelivery.score}
                    target="≥ 80%"
                    isSuccess={kpi.timeToDelivery.status === 'pass'}
                />
                <KPIStatusCard
                    title="Man-day Control"
                    score={kpi.mandayControl.score}
                    target="≥ 85%"
                    isSuccess={kpi.mandayControl.status === 'pass'}
                />
                <KPIStatusCard
                    title="Defect Ratio"
                    score={kpi.defectRatio.score}
                    target="≤ 15%"
                    isSuccess={kpi.defectRatio.status === 'pass'}
                />
                <KPIStatusCard
                    title="Post Go-live Rework"
                    score={kpi.postGoLiveRework.score}
                    target="≤ 8%"
                    isSuccess={kpi.postGoLiveRework.status === 'pass'}
                />
            </div>

            {/* Breakdown Table (Time to Delivery) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Milestone Performance Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-2 pl-2">Milestone</th>
                                    <th className="py-2">Weight</th>
                                    <th className="py-2">Planned</th>
                                    <th className="py-2">Actual</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2 pr-2 text-right">Score Contrib.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {project.milestones.map(ms => (
                                    <tr key={ms.id}>
                                        <td className="py-3 pl-2 font-medium">{ms.name}</td>
                                        <td className="py-3">{ms.time_delivery_ratio}%</td>
                                        <td className="py-3 text-muted-foreground">{ms.planned_end_date}</td>
                                        <td className="py-3">{ms.actual_end_date || '-'}</td>
                                        <td className="py-3">
                                            <Badge variant={ms.is_on_time ? "secondary" : "destructive"} className="text-[10px]">
                                                {ms.is_on_time ? "ON TIME" : "LATE"}
                                            </Badge>
                                        </td>
                                        <td className="py-3 pr-2 text-right font-mono">
                                            {ms.status === 'completed' ? (ms.is_on_time ? ms.time_delivery_ratio : 0).toFixed(1) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
