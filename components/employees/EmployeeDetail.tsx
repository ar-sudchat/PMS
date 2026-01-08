import { Employee } from "@/types/employee";
import { UserAvatar } from "./UserAvatar";
import { StatusBadge } from "./StatusBadge";
import { RoleBadge } from "./RoleBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Mail, Phone, MapPin, Calendar, Clock, Edit, MoreVertical,
    Briefcase, Building2, CheckCircle, AlertCircle, TrendingUp
} from "lucide-react";
import { format } from "date-fns";

interface EmployeeDetailProps {
    employee: Employee;
    onEdit?: () => void;
}

export function EmployeeDetail({ employee, onEdit }: EmployeeDetailProps) {
    return (
        <div className="flex flex-col gap-6">
            {/* Header Profile Card */}
            <Card className="overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative" />
                <CardContent className="relative pt-0 pb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-12 mb-6 gap-4 sm:gap-6 px-4">
                        <UserAvatar
                            name={`${employee.first_name} ${employee.last_name}`}
                            src={employee.avatar}
                            size="xl"
                            className="ring-4 ring-white shadow-lg"
                        />
                        <div className="flex-1 space-y-1 mt-2 sm:mt-0 pb-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{employee.first_name} {employee.last_name}</h1>
                                <StatusBadge status={employee.status} />
                            </div>
                            <p className="text-gray-500 font-medium flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                {employee.position?.name}
                                <span className="text-gray-300">•</span>
                                <Building2 className="h-4 w-4" />
                                {employee.department?.name}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 mb-1 w-full sm:w-auto">
                            <Button variant="outline" onClick={onEdit}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Profile
                            </Button>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-4">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-500">Email</span>
                                <span className="font-medium">{employee.email}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                <Phone className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-500">Phone</span>
                                <span className="font-medium">{employee.phone || '--'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                <Calendar className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-500">Joined</span>
                                <span className="font-medium">{format(new Date(employee.start_date), 'MMM d, yyyy')}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                <RoleBadge role={employee.role} className="border-0 bg-transparent p-0" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-500">System Role</span>
                                <span className="font-medium capitalize">{employee.role.replace('_', ' ')}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs / Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Stats Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                Work Statistics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm text-gray-500">Tasks Completed</span>
                                <span className="font-bold">45</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm text-gray-500">Hours This Week</span>
                                <span className="font-bold">32h</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm text-gray-500">Avg. Hours/Day</span>
                                <span className="font-bold">6.4h</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-gray-500">On-time Rate</span>
                                <span className="font-bold text-emerald-600">92%</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                Current Tasks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    Design homepage
                                </span>
                                <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">High</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                    Fix login bug
                                </span>
                                <span className="text-xs bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded">Med</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    API integration
                                </span>
                                <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">Normal</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Info Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Clock className="h-4 w-4 text-emerald-500" />
                                Working Schedule
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Work Days</span>
                                <p className="font-medium">Monday - Friday</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Work Hours</span>
                                <p className="font-medium">{employee.work_start_time || '09:00'} - {employee.work_end_time || '18:00'} ({employee.working_hours_per_day} hrs/day)</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Break Time</span>
                                <p className="font-medium">12:00 - 13:00 ({employee.break_duration} mins)</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Total Weekly</span>
                                <p className="font-medium">{employee.working_hours_per_day * employee.working_days_per_week} hours</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <UserAvatar name="User Info" size="sm" className="h-4 w-4 text-indigo-500" />
                                Personal Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-sm text-gray-500">Gender</span>
                                <span className="text-sm font-medium capitalize">{employee.gender || '--'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-sm text-gray-500">Birth Date</span>
                                <span className="text-sm font-medium">{employee.birth_date ? format(new Date(employee.birth_date), 'MMMM d, yyyy') : '--'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-sm text-gray-500">Line ID</span>
                                <span className="text-sm font-medium">{employee.line_id || '--'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-sm text-gray-500">Address</span>
                                <span className="text-sm font-medium truncate max-w-[200px]" title={employee.address}>{employee.address || '--'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-sm text-gray-500">Employee Type</span>
                                <span className="text-sm font-medium capitalize">{employee.employment_type}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-sm text-gray-500">Work Location</span>
                                <span className="text-sm font-medium">{employee.work_location || 'Head Office'}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
