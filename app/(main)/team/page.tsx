"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { SuperTable, ColumnFilter, ContextMenuItem } from "@/components/shared/SuperTable/SuperTable";
import { UserAvatar } from "@/components/employees/UserAvatar";
import {
    Eye,
    Edit,
    Trash2,
    Mail,
    Plus,
    KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEmployees, deleteEmployee } from "@/lib/actions/employee-actions";
import { EmployeeModal } from "@/components/modals/EmployeeModal";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";

// Badge Components
const RoleBadge = ({ role }: { role: string }) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
        admin: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
        manager: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
        member: { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" },
    };

    const color = colors[role] || colors.member;

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: 500,
                borderRadius: "6px",
                background: color.bg,
                color: color.text,
                border: `1px solid ${color.border}`,
                textTransform: "capitalize",
            }}
        >
            {role}
        </span>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, { dot: string; text: string }> = {
        active: { dot: "#22c55e", text: "#16a34a" },
        inactive: { dot: "#94a3b8", text: "#64748b" },
        suspended: { dot: "#f97316", text: "#ea580c" },
    };

    const color = colors[status] || colors.inactive;

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                color: color.text,
                textTransform: "capitalize",
            }}
        >
            <span
                style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: color.dot,
                }}
            />
            {status}
        </span>
    );
};

const DepartmentBadge = ({ department }: { department: string }) => (
    <span
        style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 10px",
            fontSize: "12px",
            borderRadius: "6px",
            background: "#f1f5f9",
            color: "#64748b",
            border: "1px solid #e2e8f0",
        }}
    >
        {department}
    </span>
);

export default function TeamPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

    // Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<any | null>(null);

    const loadEmployees = async () => {
        try {
            const result = await getEmployees();
            if (result.success) {
                setData(result.data);
            } else {
                console.error("Failed to load employees:", result.error);
                setData([]);
            }
        } catch (error) {
            console.error("Failed to load employees:", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmployees();
    }, []);

    // Handlers
    const handleCreate = () => {
        setModalMode('create');
        setSelectedEmployee(null);
        setIsModalOpen(true);
    };

    const handleEdit = (emp: any) => {
        setModalMode('edit');
        setSelectedEmployee(emp);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (emp: any) => {
        setItemToDelete(emp);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            const result = await deleteEmployee(itemToDelete.id);
            if (result.success) {
                loadEmployees();
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Failed to delete employee");
        }
    };

    const handleSaveSuccess = () => {
        setIsModalOpen(false);
        setSelectedEmployee(null);
        loadEmployees();
    };

    // Columns
    const columns: ColumnDef<any>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "#6366f1", cursor: "pointer" }}
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={row.getIsSelected()}
                    onChange={(e) => row.toggleSelected(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: "18px", height: "18px", accentColor: "#6366f1", cursor: "pointer" }}
                />
            ),
            size: 40,
            enableSorting: false,
            enableResizing: false,
        },
        {
            accessorKey: "employee_code",
            header: "ID",
            cell: ({ getValue }) => (
                <span className="font-mono text-slate-500 font-medium">{getValue() as string}</span>
            ),
            size: 100,
        },
        {
            header: 'Employee',
            accessorKey: 'full_name',
            accessorFn: (row) => `${row.first_name} ${row.last_name}`,
            cell: ({ row }) => {
                const fullName = `${row.original.first_name} ${row.original.last_name}`;
                return (
                    <div className="flex items-center gap-3">
                        <UserAvatar name={fullName} size="md" />
                        <div>
                            <div className="font-medium text-slate-800">{fullName}</div>
                            <div className="text-xs text-slate-500">{row.original.email}</div>
                        </div>
                    </div>
                );
            },
            size: 250,
        },
        {
            header: 'Department & Position',
            accessorKey: 'department_name',
            cell: ({ row }) => (
                <div>
                    <div className="font-medium text-slate-800 mb-1">{row.original.position_name}</div>
                    <DepartmentBadge department={row.original.department_name} />
                </div>
            ),
            size: 200,
        },
        {
            header: 'Role',
            accessorKey: 'role',
            cell: ({ getValue }) => <RoleBadge role={getValue() as string} />,
            size: 100,
        },
        {
            header: 'Status',
            accessorKey: 'employment_status',
            cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
            size: 120,
        },
        {
            header: 'Joined',
            accessorKey: 'start_date',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-slate-700 text-sm">
                        {new Date(row.original.start_date).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">
                        {row.original.employment_type}
                    </span>
                </div>
            ),
            size: 120,
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={async () => {
                            if (confirm(`รีเซ็ตรหัสผ่านของ ${row.original.first_name} เป็น 1234 ?`)) {
                                const { resetPassword } = await import('@/lib/actions/auth-actions');
                                const result = await resetPassword(row.original.id);
                                if (result.success) {
                                    alert('รีเซ็ตรหัสผ่านสำเร็จ');
                                } else {
                                    alert(result.error);
                                }
                            }
                        }}
                        className="p-1 hover:bg-amber-50 rounded text-amber-600"
                        title="รีเซ็ตรหัสผ่าน"
                    >
                        <KeyRound size={16} />
                    </button>
                    <button onClick={() => handleEdit(row.original)} className="p-1 hover:bg-blue-50 rounded text-blue-600">
                        <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteClick(row.original)} className="p-1 hover:bg-red-50 rounded text-red-600">
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
            size: 140, // Increased size to accommodate new button
        }
    ];

    // Column Filters
    const columnFiltersConfig: ColumnFilter[] = [
        { id: "role", type: "select", options: [{ label: "Admin", value: "admin" }, { label: "Manager", value: "manager" }, { label: "Member", value: "member" }] },
        { id: "employment_status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "Suspended", value: "suspended" }] },
        { id: "department_name", type: "text" },
    ];

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading employees...</div>;
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
                    <p className="text-slate-500">{data.length} total members</p>
                </div>
                <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <Plus size={20} />
                    เพิ่มพนักงาน
                </Button>
            </div>

            {/* Table */}
            <SuperTable
                size="md"
                data={data}
                columns={columns}
                enableSorting={true}
                enableColumnFilters={true}
                columnFilters={columnFiltersConfig}
                searchPlaceholder="Search by name, email, ID..."
                enablePagination={true}
                pageSize={10}
            />

            {/* Modals */}
            <EmployeeModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode={modalMode}
                employee={selectedEmployee}
                onSuccess={handleSaveSuccess}
            />

            <ConfirmDeleteModal
                open={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="ลบพนักงาน"
                message={`ต้องการลบ ${itemToDelete?.first_name} ${itemToDelete?.last_name} หรือไม่?`}
            />
        </div>
    );
}
