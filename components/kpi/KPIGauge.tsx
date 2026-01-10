'use client'

import { cn } from '@/lib/utils'

interface KPIGaugeProps {
    title: string
    score: number
    target: number
    status: 'PASS' | 'FAIL'
    subtitle?: string
    size?: 'sm' | 'md' | 'lg'
    showTarget?: boolean
    className?: string
}

export function KPIGauge({
    title,
    score,
    target,
    status,
    subtitle,
    size = 'md',
    showTarget = true,
    className
}: KPIGaugeProps) {
    // Calculate the percentage for the circular progress
    const percentage = Math.min(Math.max(score, 0), 100)
    const circumference = 2 * Math.PI * 45 // radius = 45
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    // Determine color based on score vs target
    const getColor = () => {
        if (score >= target) return { stroke: '#22c55e', text: 'text-green-500', bg: 'bg-green-50' }
        if (score >= target - 10) return { stroke: '#eab308', text: 'text-yellow-500', bg: 'bg-yellow-50' }
        return { stroke: '#ef4444', text: 'text-red-500', bg: 'bg-red-50' }
    }

    const colors = getColor()

    // Size configurations
    const sizeConfig = {
        sm: { svgSize: 100, fontSize: 'text-xl', subtitleSize: 'text-xs', titleSize: 'text-sm' },
        md: { svgSize: 140, fontSize: 'text-3xl', subtitleSize: 'text-sm', titleSize: 'text-base' },
        lg: { svgSize: 180, fontSize: 'text-4xl', subtitleSize: 'text-base', titleSize: 'text-lg' }
    }

    const config = sizeConfig[size]
    const scale = config.svgSize / 120

    return (
        <div className={cn('flex flex-col items-center', className)}>
            {/* Title */}
            <h3 className={cn('font-medium text-slate-700 dark:text-slate-300 mb-2', config.titleSize)}>
                {title}
            </h3>

            {/* Circular Gauge */}
            <div className="relative" style={{ width: config.svgSize, height: config.svgSize }}>
                <svg
                    className="transform -rotate-90"
                    width={config.svgSize}
                    height={config.svgSize}
                    viewBox="0 0 120 120"
                >
                    {/* Background circle */}
                    <circle
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="10"
                        className="dark:stroke-slate-700"
                    />

                    {/* Target marker */}
                    {showTarget && (
                        <circle
                            cx="60"
                            cy="60"
                            r="45"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="10"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference - (target / 100) * circumference}
                            strokeLinecap="round"
                            opacity="0.3"
                        />
                    )}

                    {/* Progress circle */}
                    <circle
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                    />
                </svg>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn('font-bold', config.fontSize, colors.text)}>
                        {score.toFixed(1)}%
                    </span>
                    {showTarget && (
                        <span className={cn('text-slate-500 dark:text-slate-400', config.subtitleSize)}>
                            Target: {target}%
                        </span>
                    )}
                </div>
            </div>

            {/* Status Badge */}
            <div className={cn(
                'mt-3 px-3 py-1 rounded-full text-sm font-medium',
                status === 'PASS'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}>
                {status === 'PASS' ? 'PASS' : 'FAIL'}
            </div>

            {/* Subtitle */}
            {subtitle && (
                <p className={cn('mt-2 text-slate-500 dark:text-slate-400', config.subtitleSize)}>
                    {subtitle}
                </p>
            )}
        </div>
    )
}
