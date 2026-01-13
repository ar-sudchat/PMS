'use client'

import { Card, CardContent } from "@/components/ui/card"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { type SalesMetric } from '@/lib/actions/sales-actions'

interface HeroMetricsCardProps {
    metric: SalesMetric
}

export function HeroMetricsCard({ metric }: HeroMetricsCardProps) {
    const isUp = metric.trend === 'up'
    const isDown = metric.trend === 'down'

    // Map colors to Tailwind classes
    const colorStyles = {
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        rose: "text-rose-600 bg-rose-50 border-rose-100",
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        amber: "text-amber-600 bg-amber-50 border-amber-100",
        slate: "text-slate-600 bg-slate-50 border-slate-100"
    }

    const style = colorStyles[metric.color] || colorStyles.slate

    return (
        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                        {metric.title}
                    </h3>
                    <div className={cn("p-2 rounded-xl", style)}>
                        {isUp ? <ArrowUp className="w-4 h-4" /> :
                            isDown ? <ArrowDown className="w-4 h-4" /> :
                                <Minus className="w-4 h-4" />}
                    </div>
                </div>

                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900 tracking-tight">
                        {metric.value}
                    </span>
                </div>

                <p className="text-sm text-slate-400 mt-2 font-medium">
                    {metric.subValue}
                </p>

                {/* Decorative Indicator Line */}
                <div className={cn("mt-4 h-1 w-full rounded-full bg-slate-100 overflow-hidden")}>
                    <div className={cn("h-full rounded-full transition-all duration-1000 w-[70%]",
                        metric.color === 'emerald' ? 'bg-emerald-500' :
                            metric.color === 'rose' ? 'bg-rose-500' :
                                metric.color === 'amber' ? 'bg-amber-500' :
                                    'bg-blue-500' // Default
                    )} />
                </div>
            </CardContent>
        </Card>
    )
}
