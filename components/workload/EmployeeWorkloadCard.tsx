import { useMemo } from 'react'
import { EmployeeWorkload } from '@/lib/actions/workload-actions'
import { WorkloadConfig } from '@/lib/actions/config-actions'
import { cn } from '@/lib/utils'
import { DropZone } from './DropZone'
import { TaskCard } from './TaskCard'

interface EmployeeWorkloadCardProps {
    employee: EmployeeWorkload
    isSelected: boolean
    onSelect: () => void
    config: WorkloadConfig | null
    dates: Date[]
    onUnassignTask?: (taskId: string) => void  // Callback when unassign button is clicked
    onTaskClick?: (task: any) => void
}

export function EmployeeWorkloadCard({ employee, isSelected, onSelect, config, dates, onUnassignTask, onTaskClick }: EmployeeWorkloadCardProps) {
    // Helper to determine role colors
    const getRoleColor = (roleParams: string) => {
        const role = roleParams || ''
        if (role.includes('SA') || role.includes('System Analyst')) return 'bg-green-500'
        if (role.includes('BA') || role.includes('Business Analyst')) return 'bg-purple-500'
        if (role.includes('PG') || role.includes('Programmer') || role.includes('Developer')) return 'bg-blue-500'
        return 'bg-slate-400'
    }

    const {
        roleColor,
        roleBadgeColor
    } = useMemo(() => {
        const color = getRoleColor(employee.position_code)
        // Derive lighter/darker shades if needed, for now use same base
        return {
            roleColor: color,
            roleBadgeColor: color.replace('500', '600')
        }
    }, [employee.position_code])

    const getStatusColor = (percent: number) => {
        if (!config) return 'bg-slate-200'
        if (percent > (config.workloadFullPercent || 100)) return 'bg-red-500'
        if (percent >= (config.workloadFullPercent || 100)) return 'bg-amber-500'
        if (percent >= (config.workloadWarningPercent || 80)) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    return (
        <div className="grid grid-cols-[280px_repeat(5,1fr)_100px] gap-3 bg-white border rounded-xl shadow-sm p-3 items-stretch min-h-[120px]">
            {/* 1. Employee Info Column */}
            <div className="flex items-start gap-4">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0", roleColor)}>
                    {String(employee.nickname || employee.employee_name || '?').charAt(0)}
                </div>
                <div className="flex flex-col gap-1">
                    <div className="font-bold text-slate-800 text-lg leading-tight">
                        {employee.nickname || employee.employee_name}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] text-white font-bold", roleBadgeColor)}>
                            {employee.position_code}
                        </span>
                        <span className="text-slate-400 text-xs">{employee.position_name}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                        {config?.workingHoursPerDay || 8}h / day
                    </div>
                </div>
            </div>

            {/* 2. Daily Columns */}
            {dates.map((date) => {
                const dateStr = date.toISOString().split('T')[0]
                const dayData = employee.daily_workload.find(d => d.work_date === dateStr)
                const tasks = dayData?.tasks || []
                const assigned = dayData?.assigned_hours || 0
                const available = dayData?.available_hours || 0
                const percent = dayData?.workload_percent || 0

                // Simple Weekend Check
                const isWeekend = date.getDay() === 0 || date.getDay() === 6

                if (isWeekend) {
                    return (
                        <div key={dateStr} className="bg-slate-50/50 rounded-lg flex items-center justify-center border border-dashed text-slate-300 font-medium">
                            Off
                        </div>
                    )
                }

                return (
                    <div key={dateStr} className="flex flex-col relative h-full">
                        <div className="border rounded-lg p-2 h-full bg-white relative hover:border-blue-400 transition-colors flex flex-col">
                            {/* Hours Header */}
                            <div className="flex justify-between items-center text-xs mb-2">
                                <span className={cn("font-bold", assigned > 0 ? "text-slate-700" : "text-slate-300")}>
                                    {assigned}h
                                </span>
                                {available > 0 && (
                                    <span className="text-green-600 font-medium">+{available}h</span>
                                )}
                            </div>

                            {/* Tasks List */}
                            <div className="space-y-1.5 flex-1 min-h-[40px]">
                                <DropZone
                                    id={`${employee.employee_id}:${dateStr}`}
                                    date={dateStr}
                                    employeeId={employee.employee_id}
                                    className="h-full"
                                >
                                    {tasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            id={task.id}
                                            title={task.title}
                                            hours={task.estimated_hours}
                                            priority={task.priority}
                                            status={task.status}
                                            projectCode={task.project_code}
                                            isLocked={task.milestone_locked}
                                            showUnassign={!!onUnassignTask}
                                            onUnassign={onUnassignTask}
                                            onTaskClick={() => onTaskClick?.(task)}
                                        />
                                    ))}
                                    {/* Placeholder for empty drop zone if needed, or handled by css */}
                                    {tasks.length === 0 && available > 0 && (
                                        <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-300 italic border-2 border-transparent hover:border-blue-200 border-dashed rounded">
                                            Drop
                                        </div>
                                    )}
                                </DropZone>
                            </div>

                            {/* Progress Bar (Absolute Bottom) */}
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100 rounded-b-lg overflow-hidden">
                                <div
                                    className={cn("h-full transition-all", getStatusColor(percent))}
                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )
            })}

            {/* 3. Utilization Column */}
            <div className="flex flex-col items-end justify-center text-right pr-2">
                <div className={cn("text-3xl font-bold tracking-tight",
                    employee.average_workload_percent > 100 ? "text-red-500" :
                        employee.average_workload_percent > 80 ? "text-amber-500" : "text-green-500"
                )}>
                    {employee.average_workload_percent}%
                </div>
                <div className="flex items-center gap-1.5 my-1">
                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(employee.average_workload_percent))} />
                    <span className="text-xs font-medium text-slate-600">
                        {employee.average_workload_percent > 100 ? "Overload" :
                            employee.average_workload_percent > 80 ? "Busy" : "Optimal"}
                    </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                    {employee.total_assigned_hours}h / {employee.daily_workload.length * (config?.workingHoursPerDay || 8)}h
                </div>
                {employee.total_available_hours > 0 && (
                    <div className="text-xs text-green-600 font-medium mt-0.5">
                        {employee.total_available_hours}h Free
                    </div>
                )}
            </div>
        </div>
    )
}
