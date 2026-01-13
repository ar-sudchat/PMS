'use client'

import { cn } from '@/lib/utils'

interface HealthGaugeProps {
    label: string
    icon: string
    value: number | null
    color: 'blue' | 'purple' | 'green' | 'gray'
    detail?: string
}

export function HealthGauge({ label, icon, value, color, detail }: HealthGaugeProps) {
    const colorClasses = {
        blue: { text: 'text-blue-600', bg: 'bg-blue-500', bgLight: 'bg-blue-100' },
        purple: { text: 'text-purple-600', bg: 'bg-purple-500', bgLight: 'bg-purple-100' },
        green: { text: 'text-green-600', bg: 'bg-green-500', bgLight: 'bg-green-100' },
        gray: { text: 'text-gray-600', bg: 'bg-gray-500', bgLight: 'bg-gray-100' }
    }

    const colors = colorClasses[color]
    const displayValue = value !== null ? value : '-'

    return (
        <div className="text-center">
            <div className={cn("text-4xl font-bold", colors.text)}>
                {displayValue}{value !== null && '%'}
            </div>
            <div className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
                <span>{icon}</span>
                <span>{label}</span>
            </div>
            <div className={cn("w-32 h-2 rounded mt-2 mx-auto", colors.bgLight)}>
                <div
                    className={cn("h-full rounded transition-all duration-300", colors.bg)}
                    style={{ width: `${Math.min(value || 0, 100)}%` }}
                />
            </div>
            {detail && <div className="text-xs text-gray-400 mt-1">{detail}</div>}
        </div>
    )
}

interface HealthBreakdownProps {
    time: number | null
    resource: number | null
    docs: number | null
    overall: number
    timeDetail?: string
    resourceDetail?: string
    docsDetail?: string
}

export function HealthBreakdown({
    time, resource, docs, overall,
    timeDetail, resourceDetail, docsDetail
}: HealthBreakdownProps) {
    const overallColor = overall >= 80 ? 'text-green-600' : overall >= 60 ? 'text-yellow-600' : 'text-red-600'

    return (
        <div className="flex items-center justify-center gap-4 lg:gap-8 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg">
            <HealthGauge label="TIME" icon="⏱️" value={time} color="blue" detail={timeDetail} />
            <div className="text-3xl text-gray-300">×</div>
            <HealthGauge label="RESOURCE" icon="👥" value={resource} color="purple" detail={resourceDetail} />
            <div className="text-3xl text-gray-300">×</div>
            <HealthGauge label="DELIVERABLES" icon="📄" value={docs} color="green" detail={docsDetail} />
            <div className="text-3xl text-gray-300">=</div>
            <div className="text-center">
                <div className={cn("text-5xl font-bold", overallColor)}>
                    {overall}%
                </div>
                <div className="text-sm text-gray-500 mt-1">OVERALL HEALTH</div>
            </div>
        </div>
    )
}

interface HealthIndicatorProps {
    health: number
    size?: 'sm' | 'md' | 'lg'
    showLabel?: boolean
}

export function HealthIndicator({ health, size = 'md', showLabel = true }: HealthIndicatorProps) {
    const emoji = health >= 80 ? '🟢' : health >= 60 ? '🟡' : '🔴'
    const bgColor = health >= 80 ? 'bg-green-100 text-green-700' : health >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'

    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5',
        md: 'text-sm px-2 py-1',
        lg: 'text-base px-3 py-1.5'
    }

    return (
        <span className={cn("rounded-full font-medium inline-flex items-center gap-1", bgColor, sizeClasses[size])}>
            {emoji} {showLabel && `${health}%`}
        </span>
    )
}

interface SummaryCardProps {
    icon: string
    value: number | string
    label: string
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray'
    onClick?: () => void
}

export function SummaryCard({ icon, value, label, color = 'gray', onClick }: SummaryCardProps) {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200',
        green: 'bg-green-50 border-green-200',
        yellow: 'bg-yellow-50 border-yellow-200',
        red: 'bg-red-50 border-red-200',
        gray: 'bg-slate-50 border-slate-200'
    }

    return (
        <div
            className={cn(
                "rounded-lg border p-4 text-center transition-all",
                colorClasses[color],
                onClick && "cursor-pointer hover:shadow-md"
            )}
            onClick={onClick}
        >
            <div className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                <span>{icon}</span>
                <span>{value}</span>
            </div>
            <div className="text-sm text-slate-600 mt-1">{label}</div>
        </div>
    )
}

// ============================================
// NEW COMPONENTS FOR MODERN PM DASHBOARD
// ============================================

interface RadialProgressProps {
    value: number
    size?: 'sm' | 'md' | 'lg'
    showLabel?: boolean
    className?: string
}

export function RadialProgress({ value, size = 'md', showLabel = true, className }: RadialProgressProps) {
    const sizes = {
        sm: { width: 40, stroke: 4, fontSize: 'text-xs' },
        md: { width: 56, stroke: 5, fontSize: 'text-sm' },
        lg: { width: 72, stroke: 6, fontSize: 'text-base' }
    }

    const config = sizes[size]
    const radius = (config.width - config.stroke) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (Math.min(value, 100) / 100) * circumference

    const getColor = (v: number) => {
        if (v >= 80) return { stroke: '#22c55e', bg: '#dcfce7', text: 'text-green-700' }
        if (v >= 60) return { stroke: '#eab308', bg: '#fef9c3', text: 'text-yellow-700' }
        return { stroke: '#ef4444', bg: '#fee2e2', text: 'text-red-700' }
    }

    const colors = getColor(value)

    return (
        <div className={cn("relative inline-flex items-center justify-center", className)}>
            <svg width={config.width} height={config.width} className="-rotate-90">
                <circle
                    cx={config.width / 2}
                    cy={config.width / 2}
                    r={radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={config.stroke}
                />
                <circle
                    cx={config.width / 2}
                    cy={config.width / 2}
                    r={radius}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth={config.stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                />
            </svg>
            {showLabel && (
                <span className={cn("absolute font-bold", config.fontSize, colors.text)}>
                    {Math.round(value)}
                </span>
            )}
        </div>
    )
}

interface ScoreProgressBarProps {
    time: number | null
    resource: number | null
    docs: number | null
    compact?: boolean
}

export function ScoreProgressBar({ time, resource, docs, compact = false }: ScoreProgressBarProps) {
    const getBarColor = (v: number | null) => {
        if (v === null) return 'bg-slate-200'
        if (v >= 80) return 'bg-green-500'
        if (v >= 60) return 'bg-yellow-500'
        return 'bg-red-500'
    }

    const getTextColor = (v: number | null) => {
        if (v === null) return 'text-slate-400'
        if (v >= 80) return 'text-green-700'
        if (v >= 60) return 'text-yellow-700'
        return 'text-red-700'
    }

    const formatValue = (v: number | null) => v !== null ? `${Math.round(v)}%` : '-'

    const bars = [
        { label: 'T', value: time, icon: '⏱️' },
        { label: 'R', value: resource, icon: '👥' },
        { label: 'D', value: docs, icon: '📄' }
    ]

    if (compact) {
        return (
            <div className="flex gap-1">
                {bars.map((bar, i) => (
                    <div key={i} className="flex-1">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all", getBarColor(bar.value))}
                                style={{ width: `${Math.min(bar.value || 0, 100)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-1.5">
            {bars.map((bar, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="text-xs w-4">{bar.icon}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-all duration-300", getBarColor(bar.value))}
                            style={{ width: `${Math.min(bar.value || 0, 100)}%` }}
                        />
                    </div>
                    <span className={cn("text-xs font-medium w-8 text-right", getTextColor(bar.value))}>
                        {formatValue(bar.value)}
                    </span>
                </div>
            ))}
        </div>
    )
}

interface MilestoneBadgeProps {
    name: string
    health?: number
    color?: string
}

export function MilestoneBadge({ name, health, color }: MilestoneBadgeProps) {
    const getHealthEmoji = (h: number | undefined) => {
        if (h === undefined) return ''
        if (h >= 80) return '🟢'
        if (h >= 60) return '🟡'
        return '🔴'
    }

    const bgColor = color ? `bg-[${color}]` : 'bg-slate-100'

    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
            "bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200"
        )}>
            {health !== undefined && <span>{getHealthEmoji(health)}</span>}
            <span className="truncate max-w-[100px]">{name || '-'}</span>
        </span>
    )
}

interface ModernSummaryCardProps {
    icon: React.ReactNode
    value: number | string
    label: string
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
    variant: 'total' | 'success' | 'warning' | 'danger' | 'neutral'
    onClick?: () => void
}

export function ModernSummaryCard({ icon, value, label, trend, trendValue, variant, onClick }: ModernSummaryCardProps) {
    const variants = {
        total: 'from-blue-500/10 to-blue-600/5 border-blue-200 text-blue-700',
        success: 'from-green-500/10 to-green-600/5 border-green-200 text-green-700',
        warning: 'from-yellow-500/10 to-yellow-600/5 border-yellow-200 text-yellow-700',
        danger: 'from-red-500/10 to-red-600/5 border-red-200 text-red-700',
        neutral: 'from-slate-500/10 to-slate-600/5 border-slate-200 text-slate-700'
    }

    const iconBg = {
        total: 'bg-blue-100 text-blue-600',
        success: 'bg-green-100 text-green-600',
        warning: 'bg-yellow-100 text-yellow-600',
        danger: 'bg-red-100 text-red-600',
        neutral: 'bg-slate-100 text-slate-600'
    }

    return (
        <div
            onClick={onClick}
            className={cn(
                "rounded-xl border p-4 bg-gradient-to-br transition-all hover:shadow-md",
                variants[variant],
                onClick && "cursor-pointer"
            )}
        >
            <div className="flex items-start justify-between">
                <div className={cn("p-2 rounded-lg", iconBg[variant])}>
                    {icon}
                </div>
                {trend && trendValue && (
                    <div className={cn(
                        "text-xs font-medium flex items-center gap-0.5",
                        trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'
                    )}>
                        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                        {trendValue}
                    </div>
                )}
            </div>
            <div className="mt-3">
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-sm opacity-80 mt-0.5">{label}</div>
            </div>
        </div>
    )
}

