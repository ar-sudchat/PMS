"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuperTable } from "@/components/shared/SuperTable/SuperTable";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { TaskTypeConfigModal } from "@/components/modals/TaskTypeConfigModal";
import {
    getAllTaskTypeConfigs,
    deleteTaskTypeConfig
} from "@/lib/actions/task-type-config-actions";

import { TaskTypeConfig } from "@/types/task-type-config";

export default function TaskTypeConfigPage() {
    const [data, setData] = useState<TaskTypeConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedItem, setSelectedItem] = useState<TaskTypeConfig | null>(null);

    // Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<TaskTypeConfig | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const result = await getAllTaskTypeConfigs();
            setData(result);
        } catch (error) {
            console.error("Failed to fetch task types:", error);
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

    const handleEdit = (item: TaskTypeConfig) => {
        setModalMode('edit');
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = (item: TaskTypeConfig) => {
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
            await deleteTaskTypeConfig(itemToDelete.id);
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            fetchData();
        } catch (error) {
            console.error("Failed to delete:", error);
            alert("Failed to delete task type");
        }
    };

    const columns = [
        {
            header: 'ลำดับ',
            accessorKey: 'sort_order',
            cell: ({ row }: { row: { original: TaskTypeConfig } }) => (
                <span className="text-slate-500">{row.original.sort_order}</span>
            ),
            size: 60,
        },
        {
            header: 'รหัส',
            accessorKey: 'code',
            cell: ({ row }: { row: { original: TaskTypeConfig } }) => (
                <span className="font-mono text-slate-700">{row.original.code}</span>
            ),
            size: 100,
        },
        {
            header: 'ชื่อประเภทงาน',
            accessorKey: 'name',
            cell: ({ row }: { row: { original: TaskTypeConfig } }) => (
                <span className="font-medium text-slate-900">{row.original.name}</span>
            ),
            size: 200,
        },
        {
            header: 'KPI Config',
            accessorKey: 'is_countable_for_kpi',
            cell: ({ row }: { row: { original: TaskTypeConfig } }) => (
                <div className="flex flex-col gap-1">
                    {row.original.is_defect && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 w-fit">
                            Defect
                        </span>
                    )}
                    {row.original.is_countable_for_kpi ? (
                        <span className="text-xs text-green-600">Include in KPI</span>
                    ) : (
                        <span className="text-xs text-slate-400">Exclude form KPI</span>
                    )}
                </div>
            ),
            size: 150,
        },
        {
            header: 'สถานะ',
            accessorKey: 'is_active',
            cell: ({ row }: { row: { original: TaskTypeConfig } }) => (
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
            cell: ({ row }: { row: { original: TaskTypeConfig } }) => (
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
                    <h1 className="text-2xl font-bold text-slate-900">Task Type Configuration</h1>
                    <p className="text-slate-500 mt-1">ตั้งค่าประเภทของงาน (Task) สำหรับโครงการ</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มประเภทงาน
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
            <TaskTypeConfigModal
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
                title="ลบประเภทงาน"
                message={`คุณต้องการลบประเภทงาน "${itemToDelete?.name}" ใช่หรือไม่?`}
            />
        </div>
    );
}
