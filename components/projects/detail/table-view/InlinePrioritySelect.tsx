'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from 'sonner'
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react'

interface InlinePrioritySelectProps {
    currentPriority: string
    onUpdate: (newPriority: string) => Promise<boolean>
}

const PRIORITIES = [
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-600', icon: AlertCircle },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-600', icon: ArrowUp },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
    { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600', icon: ArrowDown },
]

export function InlinePrioritySelect({ currentPriority, onUpdate }: InlinePrioritySelectProps) {
    const [priority, setPriority] = useState(currentPriority?.toLowerCase() || 'medium')
    const [isLoading, setIsLoading] = useState(false)

    const currentConfig = PRIORITIES.find(p => p.value === priority) || PRIORITIES[2]
    const Icon = currentConfig.icon

    const handleValueChange = async (newVal: string) => {
        setPriority(newVal)
        setIsLoading(true)
        try {
            const success = await onUpdate(newVal)
            if (!success) {
                setPriority(currentPriority)
                toast.error("Failed to update priority")
            } else {
                toast.success("Priority updated")
            }
        } catch (e) {
            setPriority(currentPriority)
            toast.error("Failed to update priority")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Select value={priority} onValueChange={handleValueChange} disabled={isLoading}>
            <SelectTrigger className={cn("h-7 px-2.5 text-xs border-0 font-medium w-auto min-w-[95px] rounded-full", currentConfig.color)}>
                <div className="flex items-center gap-1.5 mx-auto">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{currentConfig.label}</span>
                </div>
            </SelectTrigger>
            <SelectContent>
                {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", p.color.replace('text-', 'bg-').split(' ')[1] || 'bg-slate-400')} />
                            {p.label}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
