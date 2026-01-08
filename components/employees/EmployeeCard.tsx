import { Employee } from "@/types/employee";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { UserAvatar } from "./UserAvatar";
import { StatusBadge } from "./StatusBadge";
import { RoleBadge } from "./RoleBadge";
import { Mail, Phone, MapPin, Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmployeeCardProps {
    employee: Employee;
    onClick?: () => void;
}

export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" onClick={onClick}>
            <CardHeader className="p-0">
                <div className="h-20 bg-gradient-to-r from-blue-500 to-indigo-500 relative">
                    <div className="absolute -bottom-10 left-6">
                        <UserAvatar
                            name={`${employee.first_name} ${employee.last_name}`}
                            src={employee.avatar}
                            size="lg"
                            className="group-hover:ring-4 group-hover:ring-blue-100 transition-all duration-300"
                        />
                    </div>
                    <div className="absolute top-3 right-3">
                        <StatusBadge status={employee.status} showLabel={false} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-12 pb-4 px-6">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                        {employee.first_name} {employee.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium mb-1">
                        {employee.position?.name || 'No Position'}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                        <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {employee.department?.name || 'No Dept'}
                        </span>
                        <span>•</span>
                        <span className="font-mono">{employee.employee_id}</span>
                    </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{employee.email}</span>
                    </div>
                    {employee.phone && (
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{employee.phone}</span>
                        </div>
                    )}
                    {employee.work_location && (
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{employee.work_location}</span>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
                <RoleBadge role={employee.role} />
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    View Profile
                </Button>
            </CardFooter>
        </Card>
    );
}
