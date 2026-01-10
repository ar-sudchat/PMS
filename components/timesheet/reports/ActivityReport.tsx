"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
// import { mockActivityCodes } from "@/lib/mock-timesheet";

export function ActivityReport() {
    // Mock aggregated data based on activity codes
    const data = [
        { name: 'Development', value: 280, color: '#10b981' },
        { name: 'Testing', value: 85, color: '#f59e0b' },
        { name: 'Review', value: 45, color: '#6366f1' },
        { name: 'Documentation', value: 28, color: '#64748b' },
        { name: 'Meetings', value: 25, color: '#94a3b8' },
    ];

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Effort by Activity Type</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number | undefined) => [`${value || 0}h`, 'Hours']} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
