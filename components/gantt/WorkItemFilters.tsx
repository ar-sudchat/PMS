'use client'

import { Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface WorkItemFiltersProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    statusFilter: string[]
    onStatusFilterChange: (statuses: string[]) => void
    assigneeFilter: string | null
    onAssigneeFilterChange: (assigneeId: string | null) => void
    employees?: { id: string; name: string; nickname?: string }[]
}

export function WorkItemFilters({
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    assigneeFilter,
    onAssigneeFilterChange,
    employees = []
}: WorkItemFiltersProps) {
    const [searchInput, setSearchInput] = useState(searchQuery)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearchChange(searchInput)
        }, 300)

        return () => clearTimeout(timer)
    }, [searchInput, onSearchChange])

    const statusOptions = [
        { value: 'backlog', label: 'Backlog' },
        { value: 'ready', label: 'Ready' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'review', label: 'Review' },
        { value: 'done', label: 'Done' },
        { value: 'blocked', label: 'Blocked' },
        { value: 'cancelled', label: 'Cancelled' }
    ]

    const toggleStatus = (status: string) => {
        if (statusFilter.includes(status)) {
            onStatusFilterChange(statusFilter.filter(s => s !== status))
        } else {
            onStatusFilterChange([...statusFilter, status])
        }
    }

    const clearFilters = () => {
        setSearchInput('')
        onSearchChange('')
        onStatusFilterChange([])
        onAssigneeFilterChange(null)
    }

    const hasActiveFilters = searchQuery || statusFilter.length > 0 || assigneeFilter

    return (
        <div className="px-6 py-3 border-b bg-slate-50">
            <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by code or title..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Status Filter */}
                <div className="relative">
                    <select
                        multiple
                        value={statusFilter}
                        onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value)
                            onStatusFilterChange(selected)
                        }}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white cursor-pointer min-w-[150px] h-[38px] appearance-none"
                        style={{ backgroundImage: 'none' }}
                        size={1}
                        onFocus={(e) => e.target.size = Math.min(statusOptions.length, 7)}
                        onBlur={(e) => e.target.size = 1}
                    >
                        {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label} {statusFilter.includes(opt.value) ? '✓' : ''}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-slate-500">
                        Status {statusFilter.length > 0 && `(${statusFilter.length})`}
                    </div>
                </div>

                {/* Assignee Filter */}
                <div className="relative">
                    <select
                        value={assigneeFilter || ''}
                        onChange={(e) => onAssigneeFilterChange(e.target.value || null)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white cursor-pointer min-w-[150px]"
                    >
                        <option value="">All Assignees</option>
                        <option value="unassigned">Unassigned</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                                {emp.name} {emp.nickname ? `(${emp.nickname})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                        Clear
                    </button>
                )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-slate-500">Active filters:</span>
                    {searchQuery && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            Search: "{searchQuery}"
                        </span>
                    )}
                    {statusFilter.map(status => (
                        <span key={status} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                            {statusOptions.find(o => o.value === status)?.label}
                        </span>
                    ))}
                    {assigneeFilter && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            {assigneeFilter === 'unassigned'
                                ? 'Unassigned'
                                : employees.find(e => e.id === assigneeFilter)?.name || 'Unknown'}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
