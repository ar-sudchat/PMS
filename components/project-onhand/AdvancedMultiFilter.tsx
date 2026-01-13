'use client'

import { Search, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SmartCombobox } from "@/components/shared/SmartCombobox"
import { cn } from "@/lib/utils"

export interface OnHandFilters {
    year: number
    search: string
    myPortfolio: boolean
    criticalOnly: boolean
    statusId: string
    pmId: string
    ownerId: string
    projectTypeId: string
}

interface AdvancedMultiFilterProps {
    filters: any
    onFilterChange: (filters: any) => void
    options: any
}

export function AdvancedMultiFilter({ filters, onFilterChange, options }: AdvancedMultiFilterProps) {

    // Refresh / Reset Handler
    const handleRefresh = () => {
        // Reset specific filters but keep year? Or reset mostly everything? 
        // User said "Refresh Button: ปุ่มล้างค่าและดึงข้อมูลใหม่". 
        // Let's reset to defaults (keep current year usually, but reset text/dropdowns)
        onFilterChange({
            ...filters,
            search: '',
            statusId: '',
            pmId: '',
            ownerId: ''
        })
    }

    return (
        <div className="flex flex-wrap items-center gap-3 w-full bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            {/* 1. Search (Expanded) */}
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Search projects by name, code, or customer..."
                    className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all text-sm h-10 w-full"
                    value={filters.search}
                    onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                />
            </div>

            {/* 2. Year Filter */}
            <div className="w-[100px] shrink-0">
                <SmartCombobox
                    placeholder="Year"
                    options={[{ value: '2025', label: '2025' }, { value: '2026', label: '2026' }].concat(
                        options.years
                            .filter((y: number) => y !== 2025 && y !== 2026)
                            .map((y: number) => ({ value: y.toString(), label: y.toString() }))
                    )}
                    value={{ value: filters.year.toString(), label: filters.year.toString() }}
                    onChange={(opt) => {
                        if (opt?.value) {
                            onFilterChange({ ...filters, year: parseInt(String(opt.value)) })
                        }
                    }}
                    searchable={false}
                />
            </div>

            {/* 3. Inline Filters (Status -> PM -> Owner) */}
            <div className="flex items-center gap-2">
                {/* Status */}
                <div className="w-[140px] shrink-0">
                    <SmartCombobox
                        placeholder="All Status"
                        options={[
                            { value: '', label: 'All Status' },
                            ...options.statuses.map((s: any) => ({ value: s.id, label: s.name }))
                        ]}
                        value={filters.statusId ?
                            { value: filters.statusId, label: options.statuses.find((s: any) => s.id === filters.statusId)?.name || '' }
                            : { value: '', label: 'All Status' }}
                        onChange={(opt: any) => onFilterChange({ ...filters, statusId: opt?.value === '' ? '' : opt?.value || '' })}
                    />
                </div>

                {/* PM */}
                <div className="w-[140px] shrink-0">
                    <SmartCombobox
                        placeholder="All PMs"
                        options={[
                            { value: '', label: 'All PMs' },
                            ...options.managers.map((m: any) => ({ value: m.id, label: m.name_th || m.name }))
                        ]}
                        value={filters.pmId ?
                            { value: filters.pmId, label: options.managers.find((m: any) => m.id === filters.pmId)?.name_th || '' }
                            : { value: '', label: 'All PMs' }}
                        onChange={(opt: any) => onFilterChange({ ...filters, pmId: opt?.value === '' ? '' : opt?.value || '' })}
                    />
                </div>

                {/* Owner */}
                <div className="w-[140px] shrink-0">
                    <SmartCombobox
                        placeholder="All Owners"
                        options={[
                            { value: '', label: 'All Owners' },
                            ...options.owners.map((o: any) => ({ value: o.id, label: o.name_th || o.name }))
                        ]}
                        value={filters.ownerId ?
                            { value: filters.ownerId, label: options.owners.find((o: any) => o.id === filters.ownerId)?.name_th || '' }
                            : { value: '', label: 'All Owners' }}
                        onChange={(opt: any) => onFilterChange({ ...filters, ownerId: opt?.value === '' ? '' : opt?.value || '' })}
                    />
                </div>
            </div>

            {/* 4. Refresh Button */}
            <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
                onClick={handleRefresh}
                title="Refresh / Reset Filters"
            >
                <RotateCcw className="w-4 h-4" />
            </Button>
        </div>
    )
}
