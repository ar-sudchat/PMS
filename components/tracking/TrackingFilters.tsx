'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterOption {
    value: string
    label: string
    color?: string
}

interface MultiSelectFilterProps {
    label: string
    options: FilterOption[]
    selected: string[]
    onChange: (values: string[]) => void
    placeholder?: string
}

export function MultiSelectFilter({
    label,
    options,
    selected,
    onChange
}: MultiSelectFilterProps) {
    const [open, setOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleOption = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value))
        } else {
            onChange([...selected, value])
        }
    }

    const selectedLabels = options
        .filter(opt => selected.includes(opt.value))
        .map(opt => opt.label)

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex items-center justify-between gap-2 min-w-[150px] px-3 py-2 text-sm",
                    "bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors",
                    open && "ring-2 ring-indigo-200 border-indigo-300"
                )}
            >
                <span className="truncate text-slate-700">
                    {selected.length === 0
                        ? label
                        : selected.length === 1
                            ? selectedLabels[0]
                            : `${selected.length} selected`
                    }
                </span>
                <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", open && "rotate-180")} />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
                    {options.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-400">No options</div>
                    ) : (
                        options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => toggleOption(option.value)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors",
                                    selected.includes(option.value) && "bg-indigo-50"
                                )}
                            >
                                <div className={cn(
                                    "flex items-center justify-center w-4 h-4 rounded border",
                                    selected.includes(option.value)
                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                        : "border-slate-300"
                                )}>
                                    {selected.includes(option.value) && <Check className="w-3 h-3" />}
                                </div>
                                {option.color && (
                                    <span
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{ backgroundColor: option.color }}
                                    />
                                )}
                                <span className="text-slate-700 truncate">{option.label}</span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

interface SelectedFiltersProps {
    filters: {
        label: string
        values: string[]
        options: FilterOption[]
        onRemove: (value: string) => void
    }[]
    onClearAll: () => void
}

export function SelectedFilters({ filters, onClearAll }: SelectedFiltersProps) {
    const hasFilters = filters.some(f => f.values.length > 0)

    if (!hasFilters) return null

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {filters.map(filter =>
                filter.values.map(value => {
                    const option = filter.options.find(o => o.value === value)
                    return (
                        <span
                            key={`${filter.label}-${value}`}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs"
                        >
                            <span className="font-medium">{filter.label}:</span>
                            {option?.label || value}
                            <button
                                onClick={() => filter.onRemove(value)}
                                className="hover:text-indigo-900"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )
                })
            )}
            <button
                onClick={onClearAll}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
                Clear all
            </button>
        </div>
    )
}
