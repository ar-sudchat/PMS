import { Fragment, useState, useEffect, useMemo } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Option {
    value: string | number
    label: string
}

export interface SmartComboboxProps {
    options?: Option[]
    value?: Option | null
    onChange: (value: Option | null) => void
    placeholder?: string
    label?: string
    error?: string
    required?: boolean
    disabled?: boolean
    isLoading?: boolean
    maxDisplayItems?: number
}

export function SmartCombobox({
    options = [],
    value,
    onChange,
    placeholder = "Select option...",
    label,
    error,
    required,
    disabled,
    isLoading,
    maxDisplayItems = 10
}: SmartComboboxProps) {
    const [query, setQuery] = useState('')
    const [showAll, setShowAll] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

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

    // Display options (limited or all)
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

    const handleChange = (newValue: Option | null) => {
        onChange(newValue)
        setIsOpen(false)
    }

    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && (
                <label
                    className={cn(
                        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                        error && "text-destructive",
                        required && "after:content-['*'] after:ml-0.5 after:text-destructive"
                    )}
                >
                    {label}
                </label>
            )}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        "w-full px-3 py-2 text-left border rounded-md bg-background",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        error && "border-destructive",
                        disabled && "opacity-50 cursor-not-allowed",
                        !disabled && "cursor-pointer hover:border-input"
                    )}
                >
                    <span className={cn(
                        "block truncate text-sm",
                        !value && "text-muted-foreground"
                    )}>
                        {value?.label || placeholder}
                    </span>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </span>
                </button>

                {isOpen && !disabled && (
                    <div className="absolute z-[100] mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black/5 border border-slate-200">
                        {/* Search Input */}
                        <div className="p-2 border-b">
                            <input
                                type="text"
                                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="ค้นหา..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        {/* Header with count */}
                        {!query && (
                            <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-b">
                                <span className="font-medium">
                                    {hasMore && !showAll
                                        ? `แสดง ${displayOptions.length}/${options.length} รายการ`
                                        : `ทั้งหมด ${options.length} รายการ`
                                    }
                                </span>
                            </div>
                        )}

                        {query && (
                            <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 border-b">
                                <div className="flex items-center gap-2">
                                    <Search className="w-3 h-3" />
                                    <span>
                                        แสดง {displayOptions.length}/{filteredOptions.length} รายการ
                                        {filteredOptions.length < options.length && ` (จากทั้งหมด ${options.length})`}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Options List */}
                        <div className="max-h-60 overflow-auto py-1">
                            {filteredOptions.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    <p>ไม่พบรายการที่ค้นหา</p>
                                    {query && <p className="text-xs mt-1">ลองค้นหาด้วยคำอื่น</p>}
                                </div>
                            ) : (
                                <>
                                    {displayOptions.map((option) => {
                                        // Compare both value and convert to string for comparison
                                        const currentValue = value?.value
                                        const optionValue = option.value
                                        const isSelected = currentValue !== undefined && currentValue !== null
                                            ? String(currentValue) === String(optionValue)
                                            : false

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-sm cursor-pointer",
                                                    "hover:bg-accent hover:text-accent-foreground",
                                                    "flex items-center gap-2",
                                                    isSelected && "bg-accent/50"
                                                )}
                                                onClick={() => {
                                                    handleChange(option)
                                                    setQuery('')
                                                    setShowAll(false)
                                                }}
                                            >
                                                <div className="w-4 flex-shrink-0">
                                                    {isSelected && (
                                                        <Check className="h-4 w-4 text-primary" />
                                                    )}
                                                </div>
                                                <span className={cn(
                                                    "flex-1 truncate",
                                                    isSelected && "font-medium"
                                                )}>
                                                    {option.label}
                                                </span>
                                            </button>
                                        )
                                    })}

                                    {/* Show More Button */}
                                    {hasMore && !showAll && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setShowAll(true)
                                            }}
                                            className="w-full py-2.5 px-4 text-sm font-medium text-primary hover:text-primary/80 hover:bg-accent border-t transition-colors"
                                        >
                                            แสดงทั้งหมด ({filteredOptions.length - maxDisplayItems} รายการเพิ่มเติม)
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}

            {/* Backdrop to close dropdown */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[90]"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    )
}
