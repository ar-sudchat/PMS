"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface SmartComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  allLabel?: string
  disabled?: boolean
  isLoading?: boolean
  className?: string
}

export function SmartCombobox({
  options,
  value,
  onChange,
  placeholder = "เลือก...",
  searchPlaceholder = "ค้นหา...",
  emptyText = "ไม่พบข้อมูล",
  allLabel,
  disabled = false,
  isLoading = false,
  className
}: SmartComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options
    const searchLower = search.toLowerCase()
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(searchLower) ||
        opt.description?.toLowerCase().includes(searchLower)
    )
  }, [options, search])

  // Get selected option label
  const selectedOption = options.find(opt => opt.value === value)
  const displayLabel = value === 'all' && allLabel
    ? allLabel
    : selectedOption?.label || placeholder

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Focus input when opened
  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setOpen(false)
    setSearch("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      setSearch("")
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm",
          "hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-2 ring-purple-500 border-purple-500"
        )}
      >
        <span className={cn("truncate", !selectedOption && !allLabel && "text-slate-400")}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังโหลด...
            </span>
          ) : (
            displayLabel
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg animate-in fade-in-0 zoom-in-95">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded"
                >
                  <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-auto p-1">
            {/* "All" option */}
            {allLabel && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-purple-50",
                  value === 'all' || !value ? "bg-purple-50 text-purple-700" : "text-slate-700"
                )}
              >
                <Check className={cn("h-4 w-4", (value === 'all' || !value) ? "opacity-100" : "opacity-0")} />
                <span className="font-medium">{allLabel}</span>
              </button>
            )}

            {allLabel && filteredOptions.length > 0 && (
              <div className="my-1 h-px bg-slate-100" />
            )}

            {/* Filtered options */}
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-purple-50",
                    value === option.value ? "bg-purple-50 text-purple-700" : "text-slate-700"
                  )}
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === option.value ? "opacity-100" : "opacity-0")} />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-slate-500">{option.description}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-slate-100 text-xs text-slate-400">
            {filteredOptions.length} รายการ
          </div>
        </div>
      )}
    </div>
  )
}
