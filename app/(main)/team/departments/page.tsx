"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Building2,
    Users,
    Edit,
    Trash2,
} from "lucide-react";
import SuperTable from "@/components/shared/SuperTable/SuperTable";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { getDepartments, deleteDepartment } from "@/lib/actions/department-actions";
import { DepartmentModal } from "@/components/modals/DepartmentModal";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";

interface Department {
    id: string;
    name: string;
    code: string;
    description?: string;
    head_name?: string;
    member_count?: number;
    color?: string;
    is_active: boolean;
}

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

    // Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Department | null>(null);

    const loadDepartments = async () => {
        try {
            const data = await getDepartments();
            setDepartments(data as any);
        } catch (error) {
            console.error("Failed to load departments:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDepartments();
    }, []);

    // Handlers
    const handleCreate = () => {
        setModalMode('create');
        setSelectedDepartment(null);
        setIsModalOpen(true);
    };

    const handleEdit = (dept: Department) => {
        setModalMode('edit');
        setSelectedDepartment(dept);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (dept: Department) => {
        setItemToDelete(dept);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            const result = await deleteDepartment(itemToDelete.id);
            if (result.success) {
                loadDepartments();
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
            } else {
                alert(result.message);
            }
        } catch (error: any) {
            console.error("Failed to delete department:", error);
            alert("Failed to delete department: " + error.message);
        }
    };

    const handleSaveSuccess = () => {
        setIsModalOpen(false);
        setSelectedDepartment(null);
        loadDepartments();
    };

    // Columns
    const columns: ColumnDef<Department>[] = [
        {
            accessorKey: "name",
            header: "Department",
            cell: ({ row }) => (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                        style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: `${row.original.color || '#6366f1'}15`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: row.original.color || '#6366f1',
                        }}
                    >
                        <Building2 size={18} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: '14px' }}>{row.original.name}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{row.original.code}</div>
                    </div>
                </div>
            ),
            size: 200,
        },
        {
            accessorKey: "head_name",
            header: "Head",
            cell: ({ row }) => (
                row.original.head_name ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                            style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: "#dae1e7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#475569",
                                fontSize: "10px",
                                fontWeight: 600,
                            }}
                        >
                            {row.original.head_name.charAt(0)}
                        </div>
                        <span style={{ color: "#1e293b", fontSize: '13px' }}>{row.original.head_name}</span>
                    </div>
                ) : (
                    <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: '13px' }}>Unassigned</span>
                )
            ),
            size: 150,
        },
        {
            accessorKey: "member_count",
            header: "Members",
            cell: ({ getValue }) => (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: '13px' }}>
                    <Users size={14} />
                    <span>{getValue() as number || 0}</span>
                </div>
            ),
            size: 100,
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ getValue }) => {
                const active = getValue() as boolean;
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {active ? 'Active' : 'Inactive'}
                    </span>
                );
            },
            size: 100,
        },
        {
            id: "actions",
            header: () => <div style={{ textAlign: "right" }}>Actions</div>,
            cell: ({ row }) => {
                const dept = row.original;
                return (
                    <div style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "4px" }}>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(dept)}
                            title="Edit Details"
                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                            <Edit size={16} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(dept)}
                            title="Delete Department"
                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                        >
                            <Trash2 size={16} />
                        </Button>
                    </div>
                );
            },
            size: 120,
            enableSorting: false,
        },
    ];

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading departments...</div>;
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
                    <p className="text-slate-500">Manage organizational departments</p>
                </div>

                <Button
                    onClick={handleCreate}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                    <Plus size={20} />
                    เพิ่มแผนก
                </Button>
            </div>

            {/* SuperTable */}
            <SuperTable
                size="sm"
                data={departments}
                columns={columns}
                enableSorting={true}
                enableColumnFilters={true}
                searchPlaceholder="Search departments..."
            />

            {/* Modals */}
            <DepartmentModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode={modalMode}
                department={selectedDepartment}
                onSuccess={handleSaveSuccess}
            />

            <ConfirmDeleteModal
                open={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="ลบแผนก"
                message={`ต้องการลบแผนก "${itemToDelete?.name}" หรือไม่?`}
            />
        </div>
    );
}
