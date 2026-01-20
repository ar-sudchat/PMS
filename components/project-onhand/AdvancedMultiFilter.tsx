'use client'

import { Search, RotateCcw, ListFilter, Check, Download } from "lucide-react"
import html2canvas from 'html2canvas'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SmartCombobox } from "@/components/shared/SmartCombobox"
import { MultiSelectCombobox } from "@/components/shared/MultiSelectCombobox"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export interface OnHandFilters {
    year: number
    search: string
    myPortfolio: boolean
    criticalOnly: boolean
    statusId: string
    pmId: string
    ownerId: string
    projectTypeId: string
    selectedTypes: string[]
}

interface AdvancedMultiFilterProps {
    filters: any
    onFilterChange: (filters: any) => void
    options: any
}

export function AdvancedMultiFilter({ filters, onFilterChange, options }: AdvancedMultiFilterProps) {

    // Refresh / Reset Handler
    const handleRefresh = () => {
        // Find Active status ID to default to
        const activeStatus = options.statuses?.find((s: any) => s.name?.toLowerCase() === 'active' || s.code?.toLowerCase() === 'active');
        const defaultStatusId = activeStatus ? activeStatus.id : 'active';

        onFilterChange({
            ...filters,
            search: '',
            statusId: defaultStatusId,
            pmId: '',
            ownerId: '',
            selectedTypes: ['DEV', 'SUP']
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
                            { value: filters.statusId, label: options.statuses?.find((s: any) => s.id === filters.statusId)?.name || (filters.statusId === 'active' ? 'Active' : '') }
                            : { value: '', label: 'All Status' }}
                        onChange={(opt: any) => onFilterChange({ ...filters, statusId: opt?.value === '' ? '' : opt?.value || '' })}
                    />
                </div>

                {/* Type Filter (Multi-Select Smart Combobox) */}
                <div className="w-[160px] shrink-0">
                    <MultiSelectCombobox
                        placeholder="All Types"
                        options={options.projectTypes?.map((t: any) => ({ value: t.code, label: t.code })) || []}
                        selectedValues={filters.selectedTypes || []}
                        onChange={(values) => onFilterChange({ ...filters, selectedTypes: values })}
                        onClear={() => onFilterChange({ ...filters, selectedTypes: [] })}
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

                {/* Export Button */}
                <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
                    onClick={async () => {
                        const element = document.getElementById('project-roadmap-snapshot')
                        if (!element) return

                        // setIsExporting(true) // Local state if needed, or simple fire-and-forget for now
                        try {
                            const canvas = await html2canvas(element, {
                                scale: 2,
                                backgroundColor: '#F8FAFC',
                                ignoreElements: (element) => element.classList.contains('no-export')
                            })

                            const image = canvas.toDataURL("image/png")
                            const link = document.createElement("a")
                            link.href = image
                            link.download = `Project_Onhand_Roadmap_${new Date().toISOString().split('T')[0]}.png`
                            link.click()
                        } catch (error) {
                            console.error("Export failed:", error)
                        }
                    }}
                    title="Export Strategy Report"
                >
                    <Download className="w-4 h-4" />
                </Button>
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
