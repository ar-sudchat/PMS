'use client'

import { useState, useEffect } from 'react'
import { X, User, Calendar, Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import {
    getTeamWorkloadForDateRange,
    checkWorkloadBeforeAssign,
    suggestBestAssignee,
    EmployeeWorkload,
    DailyWorkload
} from '@/lib/actions/workload-actions'
import { getWorkloadConfig, WorkloadConfig } from '@/lib/actions/config-actions'
import { EmployeeWorkloadCard } from './EmployeeWorkloadCard'
import { cn } from '@/lib/utils'

interface AssignTaskModalProps {
    open: boolean
    onClose: () => void
    taskId: string
    taskTitle: string
    startDate: string
    endDate: string
    estimatedHours: number
    currentAssigneeId?: string
    onAssign: (employeeId: string) => Promise<void>
}

export function AssignTaskModal({
    open,
    onClose,
    taskId,
    taskTitle,
    startDate,
    endDate,
    estimatedHours,
    currentAssigneeId,
    onAssign
}: AssignTaskModalProps) {
    const [employees, setEmployees] = useState<EmployeeWorkload[]>([])
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(currentAssigneeId || null)
    const [selectedImpact, setSelectedImpact] = useState<DailyWorkload[]>([])
    const [warning, setWarning] = useState<string | null>(null)
    const [config, setConfig] = useState<WorkloadConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [suggestions, setSuggestions] = useState<{ employee: EmployeeWorkload; reason: string }[]>([])

    useEffect(() => {
        if (open) {
            loadData()
        }
    }, [open, startDate, endDate])

    const loadData = async () => {
        setIsLoading(true)

        const [configResult, teamResult, suggestResult] = await Promise.all([
            getWorkloadConfig(),
            getTeamWorkloadForDateRange(startDate, endDate),
            suggestBestAssignee(startDate, endDate, estimatedHours)
        ])

        if (configResult.success) {
            setConfig(configResult.data)
        }

        if (teamResult.success) {
            setEmployees(teamResult.data)
        }

        if (suggestResult.success) {
            setSuggestions(suggestResult.data)
        }

        // Check impact for current assignee
        if (currentAssigneeId) {
            await checkImpact(currentAssigneeId)
        }

        setIsLoading(false)
    }

    const checkImpact = async (employeeId: string) => {
        const result = await checkWorkloadBeforeAssign(
            employeeId,
            startDate,
            endDate,
            estimatedHours
        )

        if (result.success) {
            setSelectedImpact(result.dailyImpact)
            setWarning(result.warning)
        }
    }

    const handleSelectEmployee = async (employeeId: string) => {
        setSelectedEmployee(employeeId)
        await checkImpact(employeeId)
    }

    const handleAssign = async () => {
        if (!selectedEmployee) return

        setIsSaving(true)
        await onAssign(selectedEmployee)
        setIsSaving(false)
        onClose()
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
                    <div>
                        <h2 className="text-lg font-semibold">👤 Assign Task</h2>
                        <p className="text-sm text-slate-500">{taskTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {/* Task Info */}
                    <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <div>
                                <p className="text-xs text-slate-500">Start Date</p>
                                <p className="font-medium">{new Date(startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <div>
                                <p className="text-xs text-slate-500">Due Date</p>
                                <p className="font-medium">{new Date(endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <div>
                                <p className="text-xs text-slate-500">Estimated</p>
                                <p className="font-medium">{estimatedHours} hours</p>
                            </div>
                        </div>
                    </div>

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-500" />
                                💡 Suggested Assignees
                            </h3>
                            <div className="flex gap-2">
                                {suggestions.map((s, idx) => (
                                    <button
                                        key={s.employee.employee_id}
                                        onClick={() => handleSelectEmployee(s.employee.employee_id)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                                            selectedEmployee === s.employee.employee_id
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-slate-200 hover:border-blue-300"
                                        )}
                                    >
                                        <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                        <div className="text-left">
                                            <p className="font-medium text-sm">{s.employee.nickname || s.employee.employee_name}</p>
                                            <p className="text-xs text-slate-500">{s.reason}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {/* Employee List with Workload */}
                            <h3 className="text-sm font-medium text-slate-700 mb-3">👥 All Team Members</h3>
                            <div className="space-y-3">
                                {employees.map((emp) => (
                                    <EmployeeWorkloadCard
                                        key={emp.employee_id}
                                        employee={emp}
                                        isSelected={selectedEmployee === emp.employee_id}
                                        onSelect={() => handleSelectEmployee(emp.employee_id)}
                                        config={config}
                                        dates={[]} // TODO: Pass actual dates array
                                    />
                                ))}
                            </div>

                            {/* Selected Impact Preview */}
                            {selectedEmployee && selectedImpact.length > 0 && (
                                <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                                    <h3 className="text-sm font-medium text-slate-700 mb-3">
                                        📊 Workload Impact Preview
                                    </h3>

                                    {warning && (
                                        <div className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg mb-3",
                                            warning.includes('Overload') ? "bg-red-100 text-red-700" :
                                                warning.includes('เต็ม') ? "bg-amber-100 text-amber-700" :
                                                    "bg-yellow-100 text-yellow-700"
                                        )}>
                                            <AlertTriangle className="w-4 h-4" />
                                            <span className="text-sm">{warning}</span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-5 gap-2">
                                        {selectedImpact.slice(0, 5).map((day) => (
                                            <div
                                                key={day.work_date}
                                                className={cn(
                                                    "p-2 rounded text-center text-sm",
                                                    day.status === 'overload' ? "bg-red-100" :
                                                        day.status === 'full' ? "bg-amber-100" :
                                                            day.status === 'warning' ? "bg-yellow-100" :
                                                                "bg-green-100"
                                                )}
                                            >
                                                <p className="text-xs text-slate-500">
                                                    {new Date(day.work_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                                </p>
                                                <p className="font-bold">
                                                    {day.assigned_hours.toFixed(1)}/{day.capacity_hours}h
                                                </p>
                                                <p className={cn(
                                                    "text-xs font-medium",
                                                    day.status === 'overload' ? "text-red-600" :
                                                        day.status === 'full' ? "text-amber-600" :
                                                            day.status === 'warning' ? "text-yellow-600" :
                                                                "text-green-600"
                                                )}>
                                                    {day.workload_percent}%
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex items-center justify-between bg-slate-50">
                    <div className="text-sm text-slate-500">
                        {config && (
                            <span>⚙️ Working hours: {config.workingHoursPerDay}h/day</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={!selectedEmployee || isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <CheckCircle className="w-4 h-4" />
                            {isSaving ? 'Assigning...' : 'Assign Task'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
