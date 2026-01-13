'use client'

import { cn } from "@/lib/utils"
import { type MilestoneForecast } from "@/lib/actions/sales-actions"

interface VisualCommitmentRoadmapProps {
    milestones: MilestoneForecast[]
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

export function VisualCommitmentRoadmap({ milestones }: VisualCommitmentRoadmapProps) {
    // Group by month
    const grouped = MONTHS.reduce((acc, month, index) => {
        acc[month] = milestones.filter(m => new Date(m.dueDate).getMonth() === index)
        return acc
    }, {} as Record<string, MilestoneForecast[]>)

    const currentMonthIndex = new Date().getMonth()

    return (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex w-max space-x-0 border-b border-slate-100 min-w-full">
                {MONTHS.map((month, index) => {
                    const isPast = index < currentMonthIndex
                    const isCurrent = index === currentMonthIndex

                    return (
                        <div key={month} className={cn(
                            "flex-1 min-w-[250px] border-r border-slate-100/50 p-4 transition-colors",
                            isCurrent ? "bg-blue-50/30" : "bg-transparent",
                            isPast ? "opacity-60 grayscale-[0.5]" : ""
                        )}>
                            <div className="font-bold text-slate-400 uppercase text-xs mb-4 tracking-wider">
                                {month}
                            </div>

                            <div className="space-y-3">
                                {grouped[month]?.map(ms => (
                                    <div key={ms.id} className={cn(
                                        "relative group flex flex-col p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer",
                                        ms.riskStatus === 'completed' ? "bg-emerald-50 border-emerald-100 hover:border-emerald-200" :
                                            ms.riskStatus === 'delayed' ? "bg-rose-50 border-rose-100 hover:border-rose-200" :
                                                "bg-white border-slate-200 hover:border-blue-200"
                                    )}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={cn(
                                                "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                                                ms.riskStatus === 'completed' ? "bg-emerald-100 text-emerald-700" :
                                                    ms.riskStatus === 'delayed' ? "bg-rose-100 text-rose-700" :
                                                        "bg-blue-100 text-blue-700"
                                            )}>
                                                {ms.projectCode}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(ms.forecastDate).getDate()} {month.substring(0, 3)}
                                            </span>
                                        </div>
                                        <div className="font-bold text-slate-700 text-sm truncate max-w-[200px]" title={ms.milestoneName}>
                                            {ms.milestoneName}
                                        </div>
                                    </div>
                                ))}
                                {grouped[month]?.length === 0 && (
                                    <div className="h-16 border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center">
                                        <span className="text-slate-200 text-xs">No Milestones</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
