import { useState, useMemo, useEffect, ReactNode } from 'react'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Check, ChevronsUpDown, Loader2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from "@/components/ui/badge"

export interface Option {
    value: string | number
    label: string
    render?: ReactNode
}

export interface MultiSelectComboboxProps {
    options?: Option[]
    selectedValues?: (string | number)[]
    onChange: (values: (string | number)[]) => void
    placeholder?: string
    label?: string
    error?: string
    disabled?: boolean
    isLoading?: boolean
    maxDisplayItems?: number
    searchable?: boolean
    onClear?: () => void
}

export function MultiSelectCombobox({
    options = [],
    selectedValues = [],
    onChange,
    placeholder = "Select options...",
    label,
    error,
    disabled,
    isLoading,
    maxDisplayItems = 10,
    searchable = true,
    onClear
}: MultiSelectComboboxProps) {
    const [query, setQuery] = useState('')
    const [showAll, setShowAll] = useState(false)

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
        if (query === '') return options

        return options.filter((option) =>
            option.label
                .toLowerCase()
                .replace(/\s+/g, '')
                .includes(query.toLowerCase().replace(/\s+/g, ''))
        )
    }, [options, query])

    // Display logic
    const displayOptions = useMemo(() => {
        if (showAll || filteredOptions.length <= maxDisplayItems) {
            return filteredOptions
        }
        return filteredOptions.slice(0, maxDisplayItems)
    }, [filteredOptions, showAll, maxDisplayItems])

    const hasMore = filteredOptions.length > maxDisplayItems

    // Reset showAll when query changes
    useEffect(() => {
        setShowAll(false)
    }, [query])

    const handleToggle = (value: string | number) => {
        const current = selectedValues || []
        if (current.includes(value)) {
            onChange(current.filter(v => v !== value))
        } else {
            onChange([...current, value])
        }
    }

    // Display text for button
    const displayText = useMemo(() => {
        if (!selectedValues || selectedValues.length === 0) return placeholder
        if (selectedValues.length === options.length && options.length > 0) return "All Selected"
        if (selectedValues.length === 1) {
            const opt = options.find(o => o.value === selectedValues[0])
            return opt ? opt.label : selectedValues[0]
        }
        return `${selectedValues.length} selected`
    }, [selectedValues, options, placeholder])

    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && (
                <label className={cn("text-sm font-medium leading-none", error && "text-destructive")}>
                    {label}
                </label>
            )}

            <Popover className="relative w-full">
                {({ open }) => (
                    <>
                        <PopoverButton
                            disabled={disabled}
                            className={cn(
                                "w-full px-3 py-2 text-left border rounded-md bg-background flex items-center justify-between",
                                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                "data-[state=open]:ring-2 data-[state=open]:ring-ring data-[state=open]:ring-offset-2",
                                error && "border-destructive",
                                disabled && "opacity-50 cursor-not-allowed",
                                !disabled && "cursor-pointer hover:border-input",
                                selectedValues.length > 0 && "bg-slate-50 border-slate-300"
                            )}
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={cn("block truncate text-sm", !selectedValues.length && "text-muted-foreground")}>
                                    {displayText}
                                </span>
                                {selectedValues.length > 0 && selectedValues.length < options.length && (
                                    <Badge variant="secondary" className="px-1 h-5 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700">
                                        {selectedValues.length}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {selectedValues.length > 0 && onClear && (
                                    <div
                                        role="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onClear()
                                        }}
                                        className="p-1 hover:bg-slate-200 rounded-full transition-colors mr-1"
                                    >
                                        <X className="h-3 w-3 text-slate-500" />
                                    </div>
                                )}
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                            </div>
                        </PopoverButton>

                        <PopoverPanel
                            anchor="bottom start"
                            className="z-[100] mt-1 w-[var(--button-width)] rounded-md bg-white shadow-lg ring-1 ring-black/5 border border-slate-200 focus:outline-none"
                        >
                            {searchable && (
                                <div className="p-2 border-b">
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                        placeholder="Search..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                    />
                                </div>
                            )}

                            {/* Header actions */}
                            <div className="flex items-center justify-between px-3 py-2 border-b text-xs bg-muted/30">
                                <span className="text-muted-foreground">{selectedValues.length} selected</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="text-blue-600 hover:text-blue-700 font-medium"
                                        onClick={() => onChange(options.map(o => o.value))}
                                    >
                                        All
                                    </button>
                                    <button
                                        type="button"
                                        className="text-slate-500 hover:text-slate-700"
                                        onClick={() => onChange([])}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-60 overflow-auto py-1">
                                {displayOptions.length === 0 ? (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        <p>No options found</p>
                                    </div>
                                ) : (
                                    <>
                                        {displayOptions.map((option) => {
                                            const isSelected = selectedValues.includes(option.value)
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 text-sm cursor-pointer",
                                                        "hover:bg-accent hover:text-accent-foreground",
                                                        "flex items-center gap-2",
                                                        isSelected && "bg-blue-50 text-blue-900"
                                                    )}
                                                    onClick={() => handleToggle(option.value)}
                                                >
                                                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                        isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"
                                                    )}>
                                                        {isSelected && <Check className="h-3 w-3 text-white" />}
                                                    </div>
                                                    <div className="flex-1 truncate">
                                                        {option.render || option.label}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                        {hasMore && !showAll && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setShowAll(true)
                                                }}
                                                className="w-full py-2.5 px-4 text-sm font-medium text-primary hover:text-primary/80 hover:bg-accent border-t transition-colors"
                                            >
                                                Show All ({filteredOptions.length - maxDisplayItems} more)
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </PopoverPanel>
                    </>
                )}
            </Popover>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    )
}
