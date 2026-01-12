'use client'

import React, { useState, useEffect, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { SuperTable } from "@/components/shared/SuperTable/SuperTable"
import { Plus, Edit, Trash2, Search, RefreshCw, Database, Server, Code, Settings, FileText, FolderOpen } from "lucide-react"
import { getBackupSources, deleteBackupSource, BackupSource } from "@/lib/actions/backup-source-actions"
import { SOURCE_TYPES } from "@/lib/constants/kpi-record"
import { BackupSourceModal } from "@/components/kpi-record/BackupSourceModal"
import { toast } from "sonner"

interface BackupSourcesViewProps {
    currentUserId: string
}

export function BackupSourcesView({ currentUserId }: BackupSourcesViewProps) {
    const [data, setData] = useState<BackupSource[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedSource, setSelectedSource] = useState<BackupSource | undefined>(undefined)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('')

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await getBackupSources({
                search: searchQuery || undefined,
                type: typeFilter || undefined
            })

            if (result.success && result.data) {
                setData(result.data)
            } else {
                toast.error("Failed to load backup sources")
            }
        } catch (error) {
            toast.error("An error occurred while fetching data")
        } finally {
            setIsLoading(false)
        }
    }, [searchQuery, typeFilter])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleCreate = () => {
        setSelectedSource(undefined)
        setIsModalOpen(true)
    }

    const handleEdit = (source: BackupSource) => {
        setSelectedSource(source)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this backup source?")) return

        try {
            const result = await deleteBackupSource(id)
            if (result.success) {
                toast.success("Backup source deleted successfully")
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

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Database': return <Database size={16} className="text-blue-600" />
            case 'Source Code': return <Code size={16} className="text-green-600" />
            case 'Server': return <Server size={16} className="text-purple-600" />
            case 'Application': return <Settings size={16} className="text-orange-600" />
            case 'Config': return <FileText size={16} className="text-amber-600" />
            case 'Files': return <FolderOpen size={16} className="text-slate-600" />
            default: return <Database size={16} className="text-slate-400" />
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Database': return 'bg-blue-100 text-blue-700'
            case 'Source Code': return 'bg-green-100 text-green-700'
            case 'Server': return 'bg-purple-100 text-purple-700'
            case 'Application': return 'bg-orange-100 text-orange-700'
            case 'Config': return 'bg-amber-100 text-amber-700'
            case 'Files': return 'bg-slate-100 text-slate-700'
            default: return 'bg-slate-100 text-slate-700'
        }
    }

    const columns: ColumnDef<BackupSource>[] = [
        {
            accessorKey: "code",
            header: "Code",
            size: 120,
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
            accessorKey: "source_type",
            header: "Type",
            size: 130,
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    {getTypeIcon(row.original.source_type)}
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeColor(row.original.source_type)}`}>
                        {row.original.source_type}
                    </span>
                </div>
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
                const source = row.original
                return (
                    <div className="flex items-center gap-1 justify-end">
                        <button
                            onClick={() => handleEdit(source)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDelete(source.id)}
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
                    <h1 className="text-2xl font-bold text-slate-800">Backup Sources</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage backup source locations and types</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 font-medium"
                >
                    <Plus size={18} />
                    Add Source
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

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                    >
                        <option value="">All Types</option>
                        {SOURCE_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
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
                    Showing {data.length} backup source{data.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Modal */}
            <BackupSourceModal
                open={isModalOpen}
                onClose={handleModalClose}
                source={selectedSource}
                currentUserId={currentUserId}
            />
        </div>
    )
}
