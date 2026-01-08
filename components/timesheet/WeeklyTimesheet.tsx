"use client";

import { WeeklyTimesheet, TimesheetEntry } from "@/types/timesheet";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WeeklyTimesheetProps {
    timesheet: WeeklyTimesheet;
    weekStartDate: Date;
    onPrevWeek: () => void;
    onNextWeek: () => void;
    onAddEntry: () => void;
    onEditEntry: (entry: TimesheetEntry) => void;
}

export function WeeklyTimesheetGrid({
    timesheet,
    weekStartDate,
    onPrevWeek,
    onNextWeek,
    onAddEntry,
    onEditEntry,
}: WeeklyTimesheetProps) {
    const weekDates = Array.from({ length: 7 }).map((_, i) => addDays(weekStartDate, i));
    const today = new Date();

    // Group entries by Project -> Activity
    const groupedEntries: Record<string, Record<string, TimesheetEntry[]>> = {};

    timesheet.entries.forEach(entry => {
        const projKey = `${entry.project_id}|${entry.project_name}`;
        const activityKey = `${entry.activity_code}|${entry.activity_name}`;

        if (!groupedEntries[projKey]) groupedEntries[projKey] = {};
        if (!groupedEntries[projKey][activityKey]) groupedEntries[projKey][activityKey] = [];

        groupedEntries[projKey][activityKey].push(entry);
    });

    const getDailyTotal = (dateStr: string) => {
        return timesheet.entries
            .filter(e => e.work_date === dateStr)
            .reduce((sum, e) => sum + e.actual_hours, 0);
    };

    return (
        <div className="space-y-4">
            {/* Navigation & Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 rounded-md p-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrevWeek}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="flex items-center px-4 text-sm font-medium">
                            Week {format(weekStartDate, 'w')}, {format(weekStartDate, 'MMM yyyy')}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNextWeek}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <span className="text-muted-foreground text-sm">
                        {format(weekStartDate, 'dd MMM')} - {format(weekDates[6], 'dd MMM')}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                        Status: <span className="font-semibold ml-1">{timesheet.status}</span>
                    </Badge>
                    <Button onClick={onAddEntry}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Entry
                    </Button>
                </div>
            </div>

            {/* Grid */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="text-left p-4 font-semibold min-w-[200px]">Project / Activity</th>
                                {weekDates.map(date => (
                                    <th key={date.toISOString()} className={cn("p-2 text-center w-[100px]", isSameDay(date, today) && "bg-blue-50/50")}>
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs text-muted-foreground uppercase">{format(date, 'EEE')}</span>
                                            <span className={cn("text-lg font-medium", isSameDay(date, today) && "text-blue-600")}>
                                                {format(date, 'd')}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                                <th className="text-center p-4 font-semibold w-[80px]">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {Object.entries(groupedEntries).map(([projKey, activities]) => {
                                const [projId, projName] = projKey.split('|');
                                return Object.entries(activities).map(([actKey, entries], idx) => {
                                    const [actCode, actName] = actKey.split('|');
                                    const rowTotal = entries.reduce((sum, e) => sum + e.actual_hours, 0);

                                    return (
                                        <tr key={`${projId}-${actCode}`} className="hover:bg-gray-50/50 group">
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{projName}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-mono">
                                                            {actCode}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">{actName}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            {weekDates.map(date => {
                                                const dateStr = format(date, 'yyyy-MM-dd');
                                                const entry = entries.find(e => e.work_date === dateStr);
                                                return (
                                                    <td key={dateStr} className="p-2 text-center relative border-l border-dashed border-gray-100">
                                                        {entry ? (
                                                            <div
                                                                onClick={() => onEditEntry(entry)}
                                                                className="mx-auto w-12 h-9 flex items-center justify-center bg-blue-50 text-blue-700 font-medium rounded cursor-pointer hover:bg-blue-100 transition-colors"
                                                            >
                                                                {entry.actual_hours}h
                                                            </div>
                                                        ) : (
                                                            <div className="h-9 w-full group-hover:bg-gray-50/50" />
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-4 text-center font-bold text-gray-700 border-l">
                                                {rowTotal}h
                                            </td>
                                        </tr>
                                    );
                                });
                            })}

                            {/* Daily Totals Footer */}
                            <tr className="bg-gray-50/80 font-semibold border-t-2 border-gray-100">
                                <td className="p-4 text-right">Daily Total</td>
                                {weekDates.map(date => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const total = getDailyTotal(dateStr);
                                    return (
                                        <td key={dateStr} className={cn("p-2 text-center", total > 8 ? "text-orange-600" : total < 8 && total > 0 ? "text-yellow-600" : "text-emerald-700")}>
                                            {total > 0 && `${total}h`}
                                        </td>
                                    );
                                })}
                                <td className="p-4 text-center text-lg">
                                    {timesheet.total_actual_hours}h
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend / Status */}
            <div className="flex gap-6 text-xs text-gray-500 px-2">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-blue-50 border border-blue-100"></span> Billable
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-gray-50 border border-gray-100"></span> Non-Billable
                </div>
            </div>
        </div>
    );
}
