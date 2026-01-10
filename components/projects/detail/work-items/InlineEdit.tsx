'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface InlineEditProps {
    value: string | number
    onSave: (value: string | number) => void
    type?: 'text' | 'number' | 'date'
    className?: string
    placeholder?: string
}

export function InlineEdit({ value, onSave, type = 'text', className, placeholder }: InlineEditProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [draftValue, setDraftValue] = useState(value)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setDraftValue(value)
    }, [value])

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isEditing])

    const handleSave = () => {
        if (draftValue !== value) {
            onSave(draftValue)
        }
        setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            setDraftValue(value)
            setIsEditing(false)
        }
    }

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type={type}
                value={draftValue}
                onChange={(e) => setDraftValue(type === 'number' ? Number(e.target.value) : e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className={cn(
                    "w-full h-full px-2 py-1 bg-white border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-200",
                    className
                )}
                placeholder={placeholder}
            />
        )
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className={cn(
                "w-full px-2 py-1 cursor-text hover:bg-slate-100 rounded truncate min-h-[1.5rem]",
                !value && "text-slate-400 italic",
                className
            )}
        >
            {value || placeholder || '-'}
        </div>
    )
}
