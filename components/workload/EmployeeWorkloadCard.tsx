'use client'

import { EmployeeWorkload } from '@/lib/actions/workload-actions'
import { WorkloadConfig } from '@/lib/actions/config-actions'
import { cn } from '@/lib/utils'

interface EmployeeWorkloadCardProps {
    employee: EmployeeWorkload
    isSelected: boolean
    onSelect: () => void
    config: WorkloadConfig | null
}

export function EmployeeWorkloadCard({ employee, isSelected, onSelect, config }: EmployeeWorkloadCardProps) {
    const getStatusColor = (percent: number) => {
        if (!config) return 'bg-slate-200'
        if (percent > config.workloadFullPercent) return 'bg-red-500'
        if (percent >= config.workloadFullPercent) return 'bg-amber-500'
        if (percent >= config.workloadWarningPercent) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    const getStatusIcon = (percent: number) => {
        if (!config) return '⬜'
        if (percent > config.workloadFullPercent) return '🔴'
        if (percent >= config.workloadFullPercent) return '🟠'
        if (percent >= config.workloadWarningPercent) return '🟡'
        return '🟢'
    }

    return (
        <div
            onClick={onSelect}
            className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all",
                isSelected
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
            )}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-medium">
                        {(employee.nickname || employee.employee_name).charAt(0)}
                    </div>
                    <div>
                        <p className="font-medium">{employee.nickname || employee.employee_name}</p>
                        <p className="text-sm text-slate-500">{employee.position_name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold">
                        {getStatusIcon(employee.average_workload_percent)} {employee.average_workload_percent}%
                    </p>
                    <p className="text-xs text-slate-500">Avg. Workload</p>
                </div>
            </div>

            {/* Daily Workload Bars */}
            <div className="flex gap-1">
                {employee.daily_workload.slice(0, 7).map((day) => (
                    <div key={day.work_date} className="flex-1">
                        <div className="text-center mb-1">
                            <p className="text-xs text-slate-400">
                                {new Date(day.work_date).toLocaleDateString('th-TH', { weekday: 'short' })}
                            </p>
                        </div>
                        <div className="h-8 bg-slate-100 rounded overflow-hidden relative">
                            <div
                                className={cn(
                                    "absolute bottom-0 left-0 right-0 transition-all",
                                    getStatusColor(day.workload_percent)
                                )}
                                style={{ height: `${Math.min(day.workload_percent, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-center mt-1 text-slate-500">
                            {day.assigned_hours.toFixed(0)}h
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}
