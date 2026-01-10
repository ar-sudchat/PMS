"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { mockPhases, mockProjects } from "@/lib/mock-timesheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function EffortSummaryReport() {
    const mockProjects: any[] = [];
    const mockPhases: any[] = [];
    const projectSummaries = mockProjects.filter(p => p.id !== 'proj-non').map(project => {
        const phases = mockPhases.filter(ph => ph.project_id === project.id);
        const planned = phases.reduce((sum, ph) => sum + ph.planned_hours, 0);
        const actual = phases.reduce((sum, ph) => sum + ph.actual_hours, 0);
        const variance = actual - planned;
        const variancePercent = planned > 0 ? (variance / planned) * 100 : 0;

        return {
            name: project.name,
            planned,
            actual,
            variance,
            variancePercent,
            status: variancePercent > 10 ? 'over_budget' : variancePercent < -10 ? 'under_budget' : 'on_track'
        };
    });

    const totalPlanned = projectSummaries.reduce((sum, p) => sum + p.planned, 0);
    const totalActual = projectSummaries.reduce((sum, p) => sum + p.actual, 0);
    const totalVariance = totalActual - totalPlanned;

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Project Effort Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead className="text-right">Planned (h)</TableHead>
                            <TableHead className="text-right">Actual (h)</TableHead>
                            <TableHead className="text-right">Variance</TableHead>
                            <TableHead className="text-right">%</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projectSummaries.map((proj) => (
                            <TableRow key={proj.name}>
                                <TableCell className="font-medium">{proj.name}</TableCell>
                                <TableCell className="text-right">{proj.planned}</TableCell>
                                <TableCell className="text-right">{proj.actual}</TableCell>
                                <TableCell className={cn("text-right", proj.variance > 0 ? "text-red-600" : "text-green-600")}>
                                    {proj.variance > 0 ? `+${proj.variance}` : proj.variance}h
                                </TableCell>
                                <TableCell className="text-right">{proj.variancePercent.toFixed(1)}%</TableCell>
                                <TableCell>
                                    <Badge variant={proj.status === 'over_budget' ? "destructive" : proj.status === 'under_budget' ? "secondary" : "default"}>
                                        {proj.status === 'over_budget' ? 'Over Budget' : proj.status === 'under_budget' ? 'Under Budget' : 'On Track'}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold border-t-2">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">{totalPlanned}</TableCell>
                            <TableCell className="text-right">{totalActual}</TableCell>
                            <TableCell className={cn("text-right", totalVariance > 0 ? "text-red-600" : "text-green-600")}>
                                {totalVariance > 0 ? `+${totalVariance}` : totalVariance}h
                            </TableCell>
                            <TableCell className="text-right">
                                {((totalVariance / totalPlanned) * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
