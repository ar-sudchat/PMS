"use client";

import { WeeklyTimesheet } from "@/types/timesheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, DollarSign, Zap } from "lucide-react";

interface TimesheetSummaryProps {
    timesheet: WeeklyTimesheet;
}

export function TimesheetSummary({ timesheet }: TimesheetSummaryProps) {
    const efficiency = Math.round((timesheet.total_billable_hours / timesheet.total_actual_hours) * 100) || 0;
    const variance = timesheet.total_actual_hours - timesheet.total_planned_hours;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-muted-foreground">Total Hours</span>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{timesheet.total_actual_hours}h</div>
                        <p className="text-xs text-muted-foreground">
                            Target: {timesheet.total_planned_hours}h ({variance > 0 ? `+${variance}` : variance}h)
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-muted-foreground">Billable</span>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{timesheet.total_billable_hours}h</div>
                        <p className="text-xs text-muted-foreground">
                            {efficiency}% of total time
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-muted-foreground">Non-Billable</span>
                        <Activity className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{timesheet.total_non_billable_hours}h</div>
                        <p className="text-xs text-muted-foreground">
                            Meetings, Training, Admin
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-muted-foreground">Efficiency</span>
                        <Zap className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{efficiency}%</div>
                        <p className="text-xs text-muted-foreground">
                            Target: 80% (On Track)
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
