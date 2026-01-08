"use client";

import { EffortSummaryReport } from "@/components/timesheet/reports/EffortSummaryReport";
import { ActivityReport } from "@/components/timesheet/reports/ActivityReport";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TimesheetReportsPage() {
    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">CMMI Reports</h2>
                    <p className="text-sm text-muted-foreground">Timesheet analytics and effortless tracking.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select defaultValue="jan-2025">
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="jan-2025">January 2025</SelectItem>
                            <SelectItem value="dec-2024">December 2024</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Export PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <EffortSummaryReport />
                <ActivityReport />
            </div>
        </div>
    );
}
