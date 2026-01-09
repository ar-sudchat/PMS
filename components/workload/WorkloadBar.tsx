'use client'

import { cn } from '@/lib/utils'

interface WorkloadBarProps {
    percent: number
    warningThreshold?: number
    fullThreshold?: number
    showLabel?: boolean
    size?: 'sm' | 'md' | 'lg'
}

export function WorkloadBar({
    percent,
    warningThreshold = 70,
    fullThreshold = 100,
    showLabel = true,
    size = 'md'
}: WorkloadBarProps) {
    const getColor = () => {
        if (percent > fullThreshold) return 'bg-red-500'
        if (percent >= fullThreshold) return 'bg-amber-500'
        if (percent >= warningThreshold) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    const getStatus = () => {
        if (percent > fullThreshold) return { icon: '🔴', text: 'Overload' }
        if (percent >= fullThreshold) return { icon: '🟠', text: 'Full' }
        if (percent >= warningThreshold) return { icon: '🟡', text: 'Busy' }
        return { icon: '🟢', text: 'Available' }
    }

    const sizeClasses = {
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4'
    }

    const status = getStatus()

    return (
        <div className="w-full">
            <div className={cn("w-full bg-slate-100 rounded-full overflow-hidden", sizeClasses[size])}>
                <div
                    className={cn("h-full transition-all rounded-full", getColor())}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
            {showLabel && (
                <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">{status.icon} {status.text}</span>
                    <span className="text-xs font-medium">{percent}%</span>
                </div>
            )}
        </div>
    )
}
