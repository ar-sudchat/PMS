"use client"

import { Card } from "@/components/ui/card"
import {
    FolderKanban,
    ListTodo,
    CheckCircle2,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
} from "lucide-react"

interface SummaryCardProps {
    label: string
    value: number | string
    change?: string
    trend?: "up" | "down" | "warning" | "critical"
    icon: React.ReactNode
    gradientFrom: string
    gradientTo: string
}

export function SummaryCard({ label, value, change, trend, icon, gradientFrom, gradientTo }: SummaryCardProps) {
    const getTrendIcon = () => {
        if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-500" />
        if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />
        if (trend === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />
        if (trend === "critical") return <AlertTriangle className="h-4 w-4 text-red-500" />
        return null
    }

    const getTrendColor = () => {
        if (trend === "up") return "text-emerald-600 dark:text-emerald-400"
        if (trend === "down") return "text-red-600 dark:text-red-400"
        if (trend === "critical") return "text-red-600 dark:text-red-400"
        return "text-amber-600 dark:text-amber-400"
    }

    return (
        <Card className="p-6 hover:shadow-lg transition-all duration-300 card-hover bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative overflow-hidden group rounded-xl shadow-sm">
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50 dark:to-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                        {label}
                    </p>
                    <p className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
                        {value}
                    </p>
                    {change && (
                        <div className="flex items-center gap-1.5 text-sm">
                            {getTrendIcon()}
                            <span className={getTrendColor()}>
                                {change}
                            </span>
                        </div>
                    )}
                </div>
                <div
                    className="p-4 rounded-2xl shadow-xl transition-all duration-300 group-hover:scale-110"
                    style={{
                        backgroundImage: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                        boxShadow: `0 10px 40px -10px ${gradientFrom}60`,
                    }}
                >
                    <div className="text-white">
                        {icon}
                    </div>
                </div>
            </div>
        </Card>
    )
}
