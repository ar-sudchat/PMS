'use client'

import { useState, useRef, useEffect } from 'react'
import { FileText, Check, ChevronDown } from 'lucide-react'

interface DeliverableOption {
    id: string
    code: string
    name: string
    name_th?: string
}

interface DeliverableSelectProps {
    options: DeliverableOption[]
    value: string[]
    onChange: (ids: string[]) => void
    placeholder?: string
    disabled?: boolean
}

export function DeliverableSelect({
    options,
    value,
    onChange,
    placeholder = 'Select deliverables...',
    disabled = false
}: DeliverableSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedCount = value.length
    const selectedNames = options
        .filter(o => value.includes(o.id))
        .map(o => o.code)
        .join(', ')

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleToggle = (id: string) => {
        if (value.includes(id)) {
            onChange(value.filter(v => v !== id))
        } else {
            onChange([...value, id])
        }
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    w-full px-3 py-2 border rounded-lg text-sm text-left 
                    flex items-center justify-between 
                    ${disabled ? 'bg-slate-100 cursor-not-allowed' : 'bg-white hover:bg-slate-50 cursor-pointer'}
                    ${isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-300'}
                `}
            >
                <span className={selectedCount > 0 ? 'text-slate-900' : 'text-slate-400'}>
                    {selectedCount > 0 ? `${selectedCount} selected` : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    className="absolute z-50 top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {options.length === 0 ? (
                        <div className="px-3 py-4 text-center text-slate-500 text-sm">
                            No deliverables available
                        </div>
                    ) : (
                        options.map((opt) => {
                            const isSelected = value.includes(opt.id)
                            return (
                                <div
                                    key={opt.id}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggle(opt.id)
                                    }}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                                        ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}
                                    `}
                                >
                                    <div className={`
                                        w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0
                                        ${isSelected
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-slate-300 bg-white'
                                        }
                                    `}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span className="text-sm font-medium text-slate-800">{opt.code}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                            {opt.name_th || opt.name}
                                        </p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {selectedCount > 0 && (
                <p className="text-xs text-slate-500 mt-1 truncate" title={selectedNames}>
                    {selectedNames}
                </p>
            )}
        </div>
    )
}
