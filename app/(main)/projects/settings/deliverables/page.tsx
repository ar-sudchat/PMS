'use client'

import React, { useState, useEffect } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { SuperTable } from "@/components/shared/SuperTable/SuperTable"
import { Plus, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { DeliverableConfig } from "@/types/project"
import { getDeliverableConfigs, deleteDeliverableConfig } from "@/lib/actions/deliverable-config-actions"
import DeliverableConfigModal from "@/components/modals/DeliverableConfigModal"
import { toast } from "sonner"

export default function DeliverableConfigPage() {
    const [data, setData] = useState<DeliverableConfig[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedConfig, setSelectedConfig] = useState<DeliverableConfig | undefined>(undefined)

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const result = await getDeliverableConfigs()
            if (result.success && result.data) {
                setData(result.data)
            } else {
                toast.error("Failed to load deliverable configurations")
            }
        } catch (error) {
            toast.error("An error occurred while fetching data")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCreate = () => {
        setSelectedConfig(undefined)
        setIsModalOpen(true)
    }

    const handleEdit = (config: DeliverableConfig) => {
        setSelectedConfig(config)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this deliverable config?")) return

        try {
            const result = await deleteDeliverableConfig(id)
            if (result.success) {
                toast.success("Deliverable config deleted successfully")
                fetchData()
            } else {
                toast.error(result.error || "Failed to delete")
            }
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    const handleModalClose = () => {
        setIsModalOpen(false)
        fetchData()
    }

    const columns: ColumnDef<DeliverableConfig>[] = [
        {
            accessorKey: "sort_order",
            header: "Order",
            size: 80,
            cell: (info) => <div className="text-center text-slate-500 font-mono">{info.getValue() as number}</div>,
        },
        {
            accessorKey: "code",
            header: "Code",
            size: 120,
            cell: (info) => <div className="font-medium text-slate-700">{info.getValue() as string}</div>,
        },
        {
            accessorKey: "name",
            header: "Name",
            size: 250,
            cell: (info) => <div className="text-slate-700">{info.getValue() as string}</div>,
        },
        {
            accessorKey: "name_th",
            header: "Name (Thai)",
            size: 250,
            cell: (info) => <div className="text-slate-600">{info.getValue() as string || '-'}</div>,
        },
        {
            id: "actions",
            header: "Actions",
            size: 100,
            cell: ({ row }) => {
                const config = row.original
                return (
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            onClick={() => handleEdit(config)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDelete(config.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )
            },
        },
    ]

    return (
        <div className="p-6 max-w-[1200px] mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Deliverable Configurations</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage standard project deliverables</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 font-medium"
                >
                    <Plus size={18} />
                    New Deliverable
                </button>
            </div>

            {/* Content using SuperTable */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <SuperTable
                    data={data}
                    columns={columns}
                    isLoading={isLoading}
                    enableGlobalFilter={true}
                />
            </div>

            {/* Modal */}
            <DeliverableConfigModal
                open={isModalOpen}
                onClose={handleModalClose}
                config={selectedConfig}
            />
        </div>
    )
}
