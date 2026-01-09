"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuperTable } from "@/components/shared/SuperTable/SuperTable";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { MilestoneConfigModal } from "@/components/modals/MilestoneConfigModal";
import {
    getAllMilestoneConfigs,
    deleteMilestoneConfig
} from "@/lib/actions/milestone-config-actions";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MilestoneConfig } from "@/types/milestone-config";

export default function MilestoneConfigPage() {
    const [data, setData] = useState<MilestoneConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedItem, setSelectedItem] = useState<MilestoneConfig | null>(null);

    // Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<MilestoneConfig | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const result = await getAllMilestoneConfigs();
            setData(result);
        } catch (error) {
            console.error("Failed to fetch milestones:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = () => {
        setModalMode('create');
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (item: MilestoneConfig) => {
        setModalMode('edit');
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = (item: MilestoneConfig) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const handleSaveSuccess = () => {
        setIsModalOpen(false);
        fetchData();
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteMilestoneConfig(itemToDelete.id);
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            fetchData();
        } catch (error) {
            console.error("Failed to delete:", error);
            alert("Failed to delete milestone");
        }
    };

    const columns = [
        {
            header: 'ลำดับ',
            accessorKey: 'sort_order',
            cell: ({ row }: { row: { original: MilestoneConfig } }) => (
                <span className="text-slate-500">{row.original.sort_order}</span>
            ),
            size: 60,
        },
        {
            header: 'Milestone',
            accessorKey: 'name',
            cell: ({ row }: { row: { original: MilestoneConfig } }) => (
                <div className="flex items-center gap-3">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: row.original.color }}
                    />
                    <div>
                        <p className="font-medium text-slate-900">{row.original.name}</p>
                        <p className="text-xs text-slate-500">{row.original.code}</p>
                    </div>
                </div>
            ),
            size: 200,
        },
        /*
        {
            header: 'Icon',
            accessorKey: 'icon',
            cell: ({ row }: { row: { original: MilestoneConfig } }) => (
                <div className="flex items-center justify-center">
                    {row.original.icon ? (
                        <span className="text-lg">{row.original.icon}</span>
                    ) : (
                        <span className="text-slate-400 text-sm">-</span>
                    )}
                </div>
            ),
            size: 60,
        },
        */
        {
            header: 'ชื่อ (TH)',
            accessorKey: 'name_th',
            cell: ({ row }: { row: { original: MilestoneConfig } }) => (
                <span className="text-slate-700">{row.original.name_th || "-"}</span>
            ),
            size: 150,
        },
        /*
        {
            header: 'คำอธิบาย',
            accessorKey: 'description',
            cell: ({ row }: { row: { original: MilestoneConfig } }) => (
                <span className="text-slate-600 text-sm truncate max-w-[200px] block">
                    {row.original.description || "-"}
                </span>
            ),
            size: 200,
        },
        */
        {
            header: 'สถานะ',
            accessorKey: 'is_active',
            cell: ({ row }: { row: { original: MilestoneConfig } }) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-500'
                    }`}>
                    {row.original.is_active ? 'Active' : 'Inactive'}
                </span>
            ),
            size: 90,
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: MilestoneConfig } }) => (
                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(row.original)}
                        className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    >
                        <Pencil size={16} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(row.original)}
                        className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 size={16} />
                    </Button>
                </div>
            ),
            size: 100,
        }
    ];

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Milestone Configuration</h1>
                    <p className="text-slate-500 mt-1">ตั้งค่า Milestone Templates สำหรับโครงการ</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่ม Milestone
                </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <SuperTable
                    data={data}
                    columns={columns}
                    isLoading={isLoading}
                    size="lg"
                />
            </div>

            {/* Config Modal */}
            <MilestoneConfigModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode={modalMode}
                data={selectedItem}
                onSuccess={handleSaveSuccess}
            />

            {/* Delete Confirm */}
            <ConfirmDeleteModal
                open={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="ลบ Milestone"
                message={`คุณต้องการลบ Milestone "${itemToDelete?.name}" ใช่หรือไม่?`}
            />
        </div>
    );
}
