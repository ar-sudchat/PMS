"use client";

import { useState } from "react";
import { WeeklyTimesheetGrid } from "@/components/timesheet/WeeklyTimesheet";
import { TimesheetSummary } from "@/components/timesheet/TimesheetSummary";
import { TimesheetEntryForm } from "@/components/timesheet/TimesheetEntryForm";
import { mockWeeklyTimesheets } from "@/lib/mock-timesheet";
import { TimesheetEntry } from "@/types/timesheet";
import { addDays, startOfWeek } from "date-fns";

export default function TimesheetPage() {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);

    // Mock data retrieval - in a real app this would fetch based on date
    const timesheet = mockWeeklyTimesheets[0];

    const handlePrevWeek = () => setCurrentWeekStart(d => addDays(d, -7));
    const handleNextWeek = () => setCurrentWeekStart(d => addDays(d, 7));

    const handleAddEntry = () => {
        setEditingEntry(null);
        setIsFormOpen(true);
    };

    const handleEditEntry = (entry: TimesheetEntry) => {
        setEditingEntry(entry);
        setIsFormOpen(true);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <TimesheetSummary timesheet={timesheet} />

            <WeeklyTimesheetGrid
                timesheet={timesheet}
                weekStartDate={currentWeekStart}
                onPrevWeek={handlePrevWeek}
                onNextWeek={handleNextWeek}
                onAddEntry={handleAddEntry}
                onEditEntry={handleEditEntry}
            />

            <TimesheetEntryForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                entry={editingEntry}
            />
        </div>
    );
}
