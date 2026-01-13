'use client'

import { Search, Filter, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SmartCombobox } from "@/components/shared/SmartCombobox"

export interface OnHandFilters {
    year: number
    search: string
    myPortfolio: boolean
    statusId: string
    pmId: string
    ownerId: string
    projectTypeId: string
}

interface AdvancedMultiFilterProps {
    filters: OnHandFilters
    onFilterChange: (filters: OnHandFilters) => void
    options: any
}

export function AdvancedMultiFilter({ filters, onFilterChange, options }: AdvancedMultiFilterProps) {
    const handleYearChange = (newYear: number) => {
        onFilterChange({ ...filters, year: newYear })
    }

    return (
        <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block w-48 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Search projects..."
                    className="pl-9 bg-white/50 border-slate-200 focus:bg-white transition-all text-xs h-9"
                    value={filters.search}
                    onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                />
            </div>

            {/* Filters Group */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* Status Combobox */}
                <div className="w-[140px]">
                    <SmartCombobox
                        label="Status"
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

                {/* PM Combobox */}
                <div className="w-[140px]">
                    <SmartCombobox
                        label="PM"
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

                {/* Owner Combobox */}
                <div className="w-[140px]">
                    <SmartCombobox
                        label="Owner"
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


                {/* Year Combobox */}
                <div className="w-[90px]">
                    <SmartCombobox
                        label="Year"
                        placeholder="Year"
                        options={[{ value: '2025', label: '2025' }, { value: '2026', label: '2026' }].concat(
                            options.years
                                .filter(y => y !== 2025 && y !== 2026)
                                .map(y => ({ value: y.toString(), label: y.toString() }))
                        )}
                        value={{ value: filters.year.toString(), label: filters.year.toString() }}
                        onChange={(opt) => {
                            if (opt?.value) {
                                onFilterChange({ ...filters, year: parseInt(opt.value) })
                            }
                        }}
                        searchable={false}
                    />
                </div>
            </div>
        </div>
    )
}
