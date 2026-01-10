"use client";

import { useState, useEffect } from "react";
import { TimesheetEntry, ActivityCode, ProjectPhase, ProjectTask } from "@/types/timesheet";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
// import { mockActivityCodes, mockProjects, mockPhases, mockTasks } from "@/lib/mock-timesheet";
import { format } from "date-fns";

interface TimesheetEntryFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry?: TimesheetEntry | null; // Null means new entry
    date?: Date; // Pre-selected date for new entry
}

export function TimesheetEntryForm({ open, onOpenChange, entry, date }: TimesheetEntryFormProps) {
    const isEditing = !!entry;

    // Mock data (empty arrays for now)
    const mockProjects: any[] = [];
    const mockPhases: any[] = [];
    const mockTasks: any[] = [];
    const mockActivityCodes: any[] = [];

    // Local state for form fields
    const [selectedProject, setSelectedProject] = useState(entry?.project_id || "");
    const [selectedPhase, setSelectedPhase] = useState(entry?.phase_id || "");
    const [selectedMilestone, setSelectedMilestone] = useState(entry?.milestone_id || "");
    const [selectedTask, setSelectedTask] = useState(entry?.task_id || "");
    const [selectedActivity, setSelectedActivity] = useState(entry?.activity_code || "");
    const [workType, setWorkType] = useState(entry?.work_type || "normal");

    const [hours, setHours] = useState(entry?.actual_hours?.toString() || "8");
    const [dateStr, setDateStr] = useState(entry?.work_date || (date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')));

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setSelectedProject(entry?.project_id || "");
            setSelectedPhase(entry?.phase_id || "");
            setSelectedMilestone(entry?.milestone_id || "");
            setSelectedTask(entry?.task_id || "");
            setSelectedActivity(entry?.activity_code || "");
            setWorkType(entry?.work_type || "normal");
            setHours(entry?.actual_hours?.toString() || "8");
            setDateStr(entry?.work_date || (date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')));
        }
    }, [open, entry, date]);

    // Mock Milestones (In real app, fetch from project)
    const availableMilestones = [
        { id: 'ms-1', name: 'Mapping Data' },
        { id: 'ms-2', name: 'System Test' },
        { id: 'ms-3', name: 'UAT' },
        { id: 'ms-4', name: 'Go-Live' },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Time Entry (CMMI)' : 'Add Time Entry (CMMI)'}</DialogTitle>
                    <DialogDescription>
                        Record work hours with CMMI classifications for accurate KPI tracking.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Row 1: Project, Phase, Milestone */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Project *</Label>
                            <Select value={selectedProject} onValueChange={setSelectedProject}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {mockProjects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Milestone (for KPI)</Label>
                            <Select value={selectedMilestone} onValueChange={setSelectedMilestone} disabled={!selectedProject}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Linked Milestone" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMilestones.map(ms => (
                                        <SelectItem key={ms.id} value={ms.id}>{ms.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2: Work Type & Activity (Critical for KPI) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Work Type *</Label>
                            <Select value={workType} onValueChange={(value) => setWorkType(value as typeof workType)}>
                                <SelectTrigger className={workType !== 'normal' ? 'border-orange-300 bg-orange-50' : ''}>
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">Normal Work</SelectItem>
                                    <SelectItem value="defect_fix">Defect Fix (Bug)</SelectItem>
                                    <SelectItem value="rework">Rework (Internal)</SelectItem>
                                    <SelectItem value="post_golive">Post Go-Live Support</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Activity *</Label>
                            <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Activity Code" />
                                </SelectTrigger>
                                <SelectContent>
                                    {mockActivityCodes.map(a => (
                                        <SelectItem key={a.id} value={a.code}>{a.code} - {a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Row 3: Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date *</Label>
                            <Input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Hours *</Label>
                            <Input
                                type="number"
                                step="0.5"
                                value={hours}
                                onChange={e => setHours(e.target.value)}
                                className="font-mono"
                            />
                        </div>
                    </div>

                    {/* Row 4: Description */}
                    <div className="space-y-2">
                        <Label>Work Description *</Label>
                        <Textarea
                            placeholder={workType === 'defect_fix' ? "Describe the bug ID and fix applied..." : "Detail what you did today..."}
                            className="h-24"
                            defaultValue={entry?.work_description}
                        />
                        {workType === 'defect_fix' && (
                            <p className="text-xs text-orange-600 font-medium">Please include the Defect ID in the description for tracking.</p>
                        )}
                    </div>

                    {/* Row 5: Flags */}
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" className="rounded border-gray-300" defaultChecked={entry?.is_billable ?? true} />
                            Billable
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" className="rounded border-gray-300" defaultChecked={entry?.is_overtime ?? false} />
                            Overtime
                        </label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit">Save Entry</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
