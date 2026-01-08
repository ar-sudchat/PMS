"use client";

import { TimesheetApprovalList } from "@/components/timesheet/TimesheetApprovalList";

export default function TimesheetApprovalsPage() {
    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
                <p className="text-sm text-muted-foreground">Review and approve employee timesheets for the current period.</p>
            </div>

            <TimesheetApprovalList />
        </div>
    );
}
