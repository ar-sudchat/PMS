'use client'

import React, { useState, useEffect, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { SuperTable } from "@/components/shared/SuperTable/SuperTable"
import { Plus, Edit, Trash2, Search, RefreshCw, Award, XCircle } from "lucide-react"
import { getBackupTypes, deleteBackupType, BackupType } from "@/lib/actions/backup-type-actions"
import { BackupTypeModal } from "@/components/kpi-record/BackupTypeModal"
import { toast } from "sonner"

interface BackupTypesViewProps {
    currentUserId: string
}

export function BackupTypesView({ currentUserId }: BackupTypesViewProps) {
    const [data, setData] = useState<BackupType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedType, setSelectedType] = useState<BackupType | undefined>(undefined)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [kpiFilter, setKpiFilter] = useState<string>('')

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await getBackupTypes({
                search: searchQuery || undefined,
                isKpiCounted: kpiFilter === '' ? undefined : kpiFilter === 'true'
            })

            if (result.success && result.data) {
                setData(result.data)
            } else {
                toast.error("Failed to load backup types")
            }
        } catch (error) {
            toast.error("An error occurred while fetching data")
        } finally {
            setIsLoading(false)
        }
    }, [searchQuery, kpiFilter])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleCreate = () => {
        setSelectedType(undefined)
        setIsModalOpen(true)
    }

    const handleEdit = (backupType: BackupType) => {
        setSelectedType(backupType)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this backup type?")) return

        try {
            const result = await deleteBackupType(id)
            if (result.success) {
                toast.success("Backup type deleted successfully")
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

    const columns: ColumnDef<BackupType>[] = [
        {
            accessorKey: "code",
            header: "Code",
            size: 150,
            cell: ({ row }) => (
                <span className="font-mono font-medium text-slate-800">{row.original.code}</span>
            ),
        },
        {
            accessorKey: "name",
            header: "Name",
            size: 250,
            cell: ({ row }) => (
                <div>
                    <div className="font-medium text-slate-800">{row.original.name}</div>
                    {row.original.description && (
                        <div className="text-xs text-slate-500 truncate max-w-[230px]">{row.original.description}</div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: "is_kpi_counted",
            header: "KPI",
            size: 100,
            cell: ({ row }) => (
                row.original.is_kpi_counted ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                        <Award size={16} />
                        <span className="text-xs font-medium">Count</span>
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-slate-400">
                        <XCircle size={16} />
                        <span className="text-xs">No</span>
                    </span>
                )
            ),
        },
        {
            accessorKey: "sort_order",
            header: "Order",
            size: 80,
            cell: ({ row }) => (
                <span className="text-sm text-slate-500">{row.original.sort_order}</span>
            ),
        },
        {
            accessorKey: "is_active",
            header: "Active",
            size: 80,
            cell: ({ row }) => (
                row.original.is_active ? (
                    <span className="flex items-center gap-1 text-green-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-xs">Active</span>
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-2 h-2 bg-slate-300 rounded-full"></span>
                        <span className="text-xs">Inactive</span>
                    </span>
                )
            ),
        },
        {
            id: "actions",
            header: "",
            size: 80,
            cell: ({ row }) => {
                const backupType = row.original
                return (
                    <div className="flex items-center gap-1 justify-end">
                        <button
                            onClick={() => handleEdit(backupType)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDelete(backupType.id)}
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
                    <h1 className="text-2xl font-bold text-slate-800">Backup Types</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage backup types and KPI counting settings</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 font-medium"
                >
                    <Plus size={18} />
                    Add Type
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search code, name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>

                    {/* KPI Filter */}
                    <select
                        value={kpiFilter}
                        onChange={(e) => setKpiFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                    >
                        <option value="">All KPI Status</option>
                        <option value="true">KPI Counted</option>
                        <option value="false">Not Counted</option>
                    </select>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchData()}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <SuperTable
                    data={data}
                    columns={columns}
                    isLoading={isLoading}
                    enableGlobalFilter={false}
                />

                {/* Stats */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-sm text-slate-500">
                    Showing {data.length} backup type{data.length !== 1 ? 's' : ''}
                    {' | '}
                    <span className="text-emerald-600">{data.filter(d => d.is_kpi_counted).length} KPI counted</span>
                </div>
            </div>

            {/* Modal */}
            <BackupTypeModal
                open={isModalOpen}
                onClose={handleModalClose}
                backupType={selectedType}
                currentUserId={currentUserId}
            />
        </div>
    )
}
