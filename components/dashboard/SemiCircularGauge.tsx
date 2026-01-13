'use client'

import { cn } from '@/lib/utils'

interface SemiCircularGaugeProps {
    value: number
    size?: 'sm' | 'md' | 'lg'
    showLabel?: boolean
    className?: string
}

export function SemiCircularGauge({
    value,
    size = 'md',
    showLabel = true,
    className
}: SemiCircularGaugeProps) {
    const sizes = {
        sm: { width: 48, strokeWidth: 6, fontSize: 'text-sm' },
        md: { width: 64, strokeWidth: 8, fontSize: 'text-lg' },
        lg: { width: 80, strokeWidth: 10, fontSize: 'text-xl' }
    }

    const config = sizes[size]
    const radius = (config.width - config.strokeWidth) / 2
    const circumference = Math.PI * radius // Half circle
    const offset = circumference - (Math.min(value, 100) / 100) * circumference

    const getColor = (v: number) => {
        if (v >= 80) return { stroke: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-50' }
        if (v >= 50) return { stroke: '#f59e0b', text: 'text-amber-600', bg: 'bg-amber-50' }
        return { stroke: '#ef4444', text: 'text-red-600', bg: 'bg-red-50' }
    }

    const colors = getColor(value)

    return (
        <div className={cn("relative inline-flex flex-col items-center", className)}>
            <svg
                width={config.width}
                height={config.width / 2 + config.strokeWidth}
                className="overflow-visible"
            >
                {/* Background arc */}
                <path
                    d={`M ${config.strokeWidth / 2} ${config.width / 2} 
                        A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={config.strokeWidth}
                    strokeLinecap="round"
                />
                {/* Progress arc */}
                <path
                    d={`M ${config.strokeWidth / 2} ${config.width / 2} 
                        A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth={config.strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-700 ease-out"
                />
            </svg>
            {showLabel && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className={cn("font-bold", config.fontSize, colors.text)}>
                        {Math.round(value)}%
                    </span>
                </div>
            )}
        </div>
    )
}

interface HealthBarProps {
    label: string
    value: number | null
    color?: string
    showLabel?: boolean
}

export function HealthBar({ label, value, color, showLabel = true }: HealthBarProps) {
    const getDefaultColor = (v: number | null) => {
        if (v === null) return 'bg-slate-200'
        if (v >= 80) return 'bg-emerald-500'
        if (v >= 50) return 'bg-amber-500'
        return 'bg-rose-500'
    }

    const barColor = color || getDefaultColor(value)
    const displayValue = value !== null ? Math.round(value) : 0

    return (
        <div className="flex items-center gap-2">
            {showLabel && (
                <span className="text-[10px] text-slate-400 w-4 uppercase font-medium">{label}</span>
            )}
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-500", barColor)}
                    style={{ width: `${displayValue}%` }}
                />
            </div>
            <span className={cn(
                "text-xs font-medium w-8 text-right",
                value === null ? 'text-slate-300' :
                    value >= 80 ? 'text-emerald-600' :
                        value >= 50 ? 'text-amber-600' : 'text-rose-600'
            )}>
                {value !== null ? `${displayValue}%` : '-'}
            </span>
        </div>
    )
}

interface TripleHealthBarProps {
    time: number | null
    resource: number | null
    docs: number | null
}

export function TripleHealthBar({ time, resource, docs }: TripleHealthBarProps) {
    return (
        <div className="space-y-1.5 w-full">
            <HealthBar label="T" value={time} color={time !== null && time >= 80 ? 'bg-indigo-500' : undefined} />
            <HealthBar label="R" value={resource} color={resource !== null && resource >= 80 ? 'bg-emerald-500' : undefined} />
            <HealthBar label="D" value={docs} color={docs !== null && docs >= 80 ? 'bg-amber-500' : undefined} />
        </div>
    )
}
