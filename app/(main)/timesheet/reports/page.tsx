"use client";

import { EmployeeWorkReportView } from "@/components/timesheet/reports/EmployeeWorkReportView";

export default function TimesheetReportsPage() {
    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <EmployeeWorkReportView />
        </div>
    );
}
