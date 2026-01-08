import { Employee } from "@/types/employee";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "./UserAvatar";
import { StatusBadge } from "./StatusBadge";
import { RoleBadge } from "./RoleBadge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface EmployeeTableProps {
    employees: Employee[];
    onRowClick?: (employee: Employee) => void;
}

export function EmployeeTable({ employees, onRowClick }: EmployeeTableProps) {
    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-gray-50/50">
                    <TableRow>
                        <TableHead className="w-[250px] font-semibold">Employee</TableHead>
                        <TableHead className="font-semibold">Department & Position</TableHead>
                        <TableHead className="font-semibold">Role</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Joined</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {employees.map((employee) => (
                        <TableRow
                            key={employee.id}
                            className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                            onClick={() => onRowClick?.(employee)}
                        >
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <UserAvatar
                                        name={`${employee.first_name} ${employee.last_name}`}
                                        src={employee.avatar}
                                        size="md"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">{employee.first_name} {employee.last_name}</span>
                                        <span className="text-xs text-muted-foreground">{employee.email}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium text-sm text-gray-700">{employee.position?.name}</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-normal text-xs text-muted-foreground border-gray-200">
                                            {employee.department?.name}
                                        </Badge>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <RoleBadge role={employee.role} />
                            </TableCell>
                            <TableCell>
                                <StatusBadge status={employee.status} />
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col text-sm text-gray-600">
                                    <span>{format(new Date(employee.start_date), 'MMM d, yyyy')}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {employee.employment_type}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
