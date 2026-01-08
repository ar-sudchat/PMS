"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash } from "lucide-react";

export function ProjectForm() {
    const [milestones, setMilestones] = useState([
        { name: 'Mapping Data', percent: 35 },
        { name: 'System Test', percent: 20 },
        { name: 'User Acceptance Test', percent: 30 },
        { name: 'Go-Live', percent: 15 },
    ]);

    const addMilestone = () => {
        setMilestones([...milestones, { name: '', percent: 0 }]);
    };

    return (
        <div className="grid gap-6">
            {/* 1. Basic Info & Sales */}
            <Card>
                <CardHeader>
                    <CardTitle>Project Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Project Code</Label>
                            <Input placeholder="PRJ-2025-XXX" />
                        </div>
                        <div className="space-y-2">
                            <Label>Project Name</Label>
                            <Input placeholder="Project Name" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                        <div className="space-y-2">
                            <Label>Sold Mandays</Label>
                            <Input type="number" placeholder="0" />
                        </div>
                        <div className="space-y-2">
                            <Label>Rate (THB)</Label>
                            <Input type="number" placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Total Value</Label>
                            <Input type="number" disabled className="bg-gray-50" placeholder="Auto-calculated" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Milestones */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Milestone Configuration (KPI)</CardTitle>
                    <Button size="sm" onClick={addMilestone}><Plus className="h-4 w-4 mr-2" /> Add Milestone</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Milestone Name</TableHead>
                                <TableHead className="w-[150px]">Time Weight (%)</TableHead>
                                <TableHead className="w-[150px]">Start Date</TableHead>
                                <TableHead className="w-[150px]">End Date</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {milestones.map((ms, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>
                                        <Input defaultValue={ms.name} placeholder="Milestone Name" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" defaultValue={ms.percent} />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="date" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="date" />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" className="text-red-500"><Trash className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="font-bold bg-muted/50">
                                <TableCell>Total</TableCell>
                                <TableCell>100%</TableCell>
                                <TableCell colSpan={3}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <div className="mt-4 text-sm text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                        ⚠️ Milestone weights must sum to exactly 100% for correct KPI calculation.
                    </div>
                </CardContent>
            </Card>

            {/* 3. Actions */}
            <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Create Project</Button>
            </div>
        </div>
    );
}
