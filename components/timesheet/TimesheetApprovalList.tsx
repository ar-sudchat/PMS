"use client";

import { useState } from "react";
import { mockWeeklyTimesheets } from "@/lib/mock-timesheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Eye, CheckCircle, XCircle } from "lucide-react";

export function TimesheetApprovalList() {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Mock cloning entries for more list items
    const approvalQueue = [
        { ...mockWeeklyTimesheets[0], id: 'wk-1', employee_name: 'John Doe', status: 'submitted' as const },
        { ...mockWeeklyTimesheets[0], id: 'wk-2', employee_name: 'Sarah Smith', status: 'submitted' as const, total_actual_hours: 38 },
        { ...mockWeeklyTimesheets[0], id: 'wk-3', employee_name: 'Mike Chen', status: 'submitted' as const, total_actual_hours: 42 },
    ];

    const handleSelect = (id: string, checked: boolean) => {
        setSelectedIds(prev =>
            checked ? [...prev, id] : prev.filter(i => i !== id)
        );
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? approvalQueue.map(t => t.id) : []);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="font-semibold">{selectedIds.length} selected</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" disabled={selectedIds.length === 0}>
                        <XCircle className="mr-2 h-4 w-4" /> Reject Selected
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={selectedIds.length === 0}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Approve Selected
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={selectedIds.length === approvalQueue.length}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead>Week</TableHead>
                            <TableHead>Total Hours</TableHead>
                            <TableHead>Billable</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {approvalQueue.map((ts) => (
                            <TableRow key={ts.id}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedIds.includes(ts.id)}
                                        onCheckedChange={(c) => handleSelect(ts.id, !!c)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                                            {ts.employee_name.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                        {ts.employee_name}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {format(new Date(ts.week_start_date), 'MMM d')} - {format(new Date(ts.week_end_date), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>{ts.total_actual_hours}h</TableCell>
                                <TableCell>{ts.total_billable_hours}h</TableCell>
                                <TableCell>
                                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 uppercase text-[10px]">
                                        {ts.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm">
                                        <Eye className="h-4 w-4 mr-1" /> View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
