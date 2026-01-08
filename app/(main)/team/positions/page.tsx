"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SuperTable from "@/components/shared/SuperTable/SuperTable";
import { ColumnDef } from "@tanstack/react-table";
import { getPositions, deletePosition } from "@/lib/actions/position-actions";
import { PositionModal } from "@/components/modals/PositionModal";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";

interface Position {
    id: string;
    code: string;
    name: string;
    level: number;
    department_name?: string;
    department_id: string;
    member_count?: number;
    is_active: boolean;
}

export default function PositionsPage() {
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

    // Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Position | null>(null);

    const loadPositions = async () => {
        try {
            const data = await getPositions();
            setPositions(data as any);
        } catch (error) {
            console.error("Failed to load positions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPositions();
    }, []);

    // Handlers
    const handleCreate = () => {
        setModalMode('create');
        setSelectedPosition(null);
        setIsModalOpen(true);
    };

    const handleEdit = (pos: Position) => {
        setModalMode('edit');
        setSelectedPosition(pos);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (pos: Position) => {
        setItemToDelete(pos);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            const result = await deletePosition(itemToDelete.id);
            if (result.success) {
                loadPositions();
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
            } else {
                alert(result.message);
            }
        } catch (error: any) {
            console.error("Failed to delete position:", error);
            alert("Failed to delete position: " + error.message);
        }
    };

    const handleSaveSuccess = () => {
        setIsModalOpen(false);
        setSelectedPosition(null);
        loadPositions();
    };


    const columns: ColumnDef<Position>[] = [
        {
            accessorKey: "code",
            header: "Code",
            cell: ({ getValue }) => (
                <span className="font-mono text-xs text-muted-foreground font-medium">
                    {(getValue() as string).toUpperCase()}
                </span>
            ),
            size: 100,
        },
        {
            accessorKey: "name",
            header: "Position Title",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-muted-foreground" />
                    <span className="font-medium text-slate-700">{row.original.name}</span>
                </div>
            ),
            size: 250,
        },
        {
            accessorKey: "department_name",
            header: "Department",
            cell: ({ getValue }) => (
                <span className="text-slate-600">
                    {getValue() as string || 'Unassigned'}
                </span>
            ),
            size: 200,
        },
        {
            accessorKey: "level",
            header: "Level",
            cell: ({ getValue }) => {
                const level = getValue() as number;
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[80px]">
                            <div
                                className="bg-indigo-500 h-full rounded-full"
                                style={{ width: `${(level / 10) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs font-medium text-slate-600">Lv.{level}</span>
                    </div>
                );
            },
            size: 150,
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ getValue }) => {
                const isActive = getValue() as boolean;
                return isActive ? (
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-50">Active</Badge>
                ) : (
                    <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200">Inactive</Badge>
                );
            },
            size: 120,
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const pos = row.original;
                return (
                    <div className="text-right flex justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEdit(pos)}
                            title="Edit"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteClick(pos)}
                            title="Delete"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
            size: 80,
            enableSorting: false,
        }
    ];

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading positions...</div>;
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Positions</h1>
                    <p className="text-muted-foreground text-sm">Manage job titles and levels</p>
                </div>
                <Button
                    onClick={handleCreate}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                    <Plus size={18} />
                    เพิ่มตำแหน่ง
                </Button>
            </div>

            <SuperTable
                size="sm"
                data={positions}
                columns={columns}
                enableSorting={true}
                enableColumnFilters={true}
                searchPlaceholder="Search positions..."
            />

            {/* Modals */}
            <PositionModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode={modalMode}
                position={selectedPosition}
                onSuccess={handleSaveSuccess}
            />

            <ConfirmDeleteModal
                open={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="ลบตำแหน่ง"
                message={`ต้องการลบตำแหน่ง "${itemToDelete?.name}" หรือไม่?`}
            />
        </div>
    );
}
