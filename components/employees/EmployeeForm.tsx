import { useState } from "react";
import { Employee, Department, Position } from "@/types/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { mockDepartments, mockPositions } from "@/lib/mock-data";
import { User, Mail, Phone, Calendar, Building2, Briefcase, Clock, Shield } from "lucide-react";

interface EmployeeFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee?: Employee; // If provided, we are editing
}

export function EmployeeForm({ open, onOpenChange, employee }: EmployeeFormProps) {
    const isEditing = !!employee;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Update employee details and permissions.' : 'Create a new employee record in the system.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Photo & ID Section */}
                    <div className="flex items-start gap-6">
                        <div className="flex-shrink-0">
                            <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors">
                                <User className="h-8 w-8 text-gray-400" />
                            </div>
                            <Button variant="ghost" size="sm" className="mt-2 w-full text-xs">Upload Photo</Button>
                        </div>
                        <div className="flex-grow grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Employee ID</Label>
                                <Input disabled value={employee?.employee_id || "EMP-0009 (Auto)"} className="bg-gray-50" />
                            </div>
                            <div className="space-y-2">
                                <Label>Employee Code</Label>
                                <Input placeholder="Optional internal code" defaultValue={employee?.employee_code} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-200 my-2" />

                    {/* Personal Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-500" />
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3">
                                <Label>Prefix</Label>
                                <Select defaultValue={employee?.prefix || "mr"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mr">Mr.</SelectItem>
                                        <SelectItem value="mrs">Mrs.</SelectItem>
                                        <SelectItem value="ms">Ms.</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-5">
                                <Label>First Name *</Label>
                                <Input defaultValue={employee?.first_name} />
                            </div>
                            <div className="col-span-4">
                                <Label>Last Name *</Label>
                                <Input defaultValue={employee?.last_name} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Nickname</Label>
                                <Input defaultValue={employee?.nickname} />
                            </div>
                            <div>
                                <Label>Gender</Label>
                                <Select defaultValue={employee?.gender || "male"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Birth Date</Label>
                                <Input type="date" defaultValue={employee?.birth_date} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-200 my-2" />

                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Mail className="h-5 w-5 text-blue-500" />
                            Contact Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email *</Label>
                                <Input type="email" defaultValue={employee?.email} />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input type="tel" defaultValue={employee?.phone} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Address</Label>
                                <Textarea className="h-20" defaultValue={employee?.address} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-200 my-2" />

                    {/* Work Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-blue-500" />
                            Work Information
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Department *</Label>
                                <Select defaultValue={employee?.department_id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Dept" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mockDepartments.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Position *</Label>
                                <Select defaultValue={employee?.position_id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Position" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mockPositions.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select defaultValue={employee?.employment_type || "full-time"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="full-time">Full-time</SelectItem>
                                        <SelectItem value="part-time">Part-time</SelectItem>
                                        <SelectItem value="contract">Contract</SelectItem>
                                        <SelectItem value="intern">Intern</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date *</Label>
                                <Input type="date" defaultValue={employee?.start_date} />
                            </div>
                            <div className="space-y-2">
                                <Label>Manager</Label>
                                <Select defaultValue={employee?.manager_id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Manager" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {/* Mock manager list */}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input defaultValue={employee?.work_location} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-200 my-2" />

                    {/* Working Hours */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            Working Hours
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Hours/Day</Label>
                                <Input type="number" defaultValue={employee?.working_hours_per_day || 8} />
                            </div>
                            <div className="space-y-2">
                                <Label>Days/Week</Label>
                                <Input type="number" defaultValue={employee?.working_days_per_week || 5} />
                            </div>
                            <div className="space-y-2">
                                <Label>Schedule</Label>
                                <Select defaultValue="regular">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Regular 9-18" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="regular">Regular 9-18</SelectItem>
                                        <SelectItem value="shift-a">Shift A</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-200 my-2" />

                    {/* System Access */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-500" />
                            System Access
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Role *</Label>
                                <Select defaultValue={employee?.role || "member"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="member">Member</SelectItem>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select defaultValue={employee?.status || "active"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input type="password" placeholder="••••••••" />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit">Save Employee</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
