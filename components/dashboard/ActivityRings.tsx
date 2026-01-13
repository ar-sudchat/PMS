'use client'

import { cn } from '@/lib/utils'

interface ActivityRingsProps {
    time: number | null
    resource: number | null
    docs: number | null
    size?: 'sm' | 'md' | 'lg'
    showLabels?: boolean
    className?: string
}

export function ActivityRings({
    time,
    resource,
    docs,
    size = 'md',
    showLabels = true,
    className
}: ActivityRingsProps) {
    const sizes = {
        sm: { width: 120, strokeWidth: 8, gap: 12 },
        md: { width: 180, strokeWidth: 12, gap: 16 },
        lg: { width: 240, strokeWidth: 16, gap: 20 }
    }

    const config = sizes[size]
    const center = config.width / 2

    const rings = [
        {
            value: time,
            color: '#6366f1', // Indigo-500
            bgColor: '#e0e7ff', // Indigo-100
            label: 'Time',
            radius: center - config.strokeWidth / 2
        },
        {
            value: resource,
            color: '#10b981', // Emerald-500
            bgColor: '#d1fae5', // Emerald-100
            label: 'Resource',
            radius: center - config.strokeWidth / 2 - config.gap
        },
        {
            value: docs,
            color: '#f59e0b', // Amber-500
            bgColor: '#fef3c7', // Amber-100
            label: 'Docs',
            radius: center - config.strokeWidth / 2 - config.gap * 2
        }
    ]

    const calculateDashArray = (radius: number, percentage: number | null) => {
        const circumference = 2 * Math.PI * radius
        const offset = circumference - (Math.min(percentage || 0, 100) / 100) * circumference
        return { circumference, offset }
    }

    // Calculate average
    const validValues = [time, resource, docs].filter(v => v !== null) as number[]
    const average = validValues.length > 0
        ? Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length)
        : 0

    return (
        <div className={cn("relative inline-flex flex-col items-center", className)}>
            <svg
                width={config.width}
                height={config.width}
                className="transform -rotate-90"
            >
                {rings.map((ring, index) => {
                    const { circumference, offset } = calculateDashArray(ring.radius, ring.value)
                    return (
                        <g key={index}>
                            {/* Background ring */}
                            <circle
                                cx={center}
                                cy={center}
                                r={ring.radius}
                                fill="none"
                                stroke={ring.bgColor}
                                strokeWidth={config.strokeWidth}
                                strokeLinecap="round"
                            />
                            {/* Progress ring */}
                            <circle
                                cx={center}
                                cy={center}
                                r={ring.radius}
                                fill="none"
                                stroke={ring.color}
                                strokeWidth={config.strokeWidth}
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                className="transition-all duration-1000 ease-out"
                            />
                        </g>
                    )
                })}
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn(
                    "font-bold text-slate-800",
                    size === 'sm' ? 'text-xl' : size === 'md' ? 'text-3xl' : 'text-4xl'
                )}>
                    {average}%
                </span>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Health</span>
            </div>

            {/* Labels */}
            {showLabels && (
                <div className="flex items-center justify-center gap-4 mt-4">
                    {rings.map((ring, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                            <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: ring.color }}
                            />
                            <span className="text-xs text-slate-600">
                                {ring.label}: {ring.value !== null ? `${Math.round(ring.value)}%` : '-'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

interface CompactRingsProps {
    time: number | null
    resource: number | null
    docs: number | null
    size?: number
}

export function CompactActivityRings({ time, resource, docs, size = 48 }: CompactRingsProps) {
    const strokeWidth = size / 8
    const center = size / 2
    const gap = size / 10

    const rings = [
        { value: time, color: '#6366f1', radius: center - strokeWidth / 2 },
        { value: resource, color: '#10b981', radius: center - strokeWidth / 2 - gap },
        { value: docs, color: '#f59e0b', radius: center - strokeWidth / 2 - gap * 2 }
    ]

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            {rings.map((ring, index) => {
                const circumference = 2 * Math.PI * ring.radius
                const offset = circumference - (Math.min(ring.value || 0, 100) / 100) * circumference
                return (
                    <g key={index}>
                        <circle
                            cx={center}
                            cy={center}
                            r={ring.radius}
                            fill="none"
                            stroke="#f1f5f9"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                        />
                        <circle
                            cx={center}
                            cy={center}
                            r={ring.radius}
                            fill="none"
                            stroke={ring.color}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            className="transition-all duration-700"
                        />
                    </g>
                )
            })}
        </svg>
    )
}
