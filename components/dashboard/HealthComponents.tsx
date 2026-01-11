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
