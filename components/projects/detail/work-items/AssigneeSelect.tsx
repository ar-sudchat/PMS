'use client'

import { cn } from "@/lib/utils"

interface Employee {
    id: string
    name: string
    nickname?: string
}

interface AssigneeSelectProps {
    assigneeId?: string
    employees: Employee[]
    onChange: (id: string) => void
}

export function AssigneeSelect({ assigneeId, employees, onChange }: AssigneeSelectProps) {
    return (
        <div onClick={(e) => e.stopPropagation()}>
            <select
                value={assigneeId || ''}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "w-full bg-transparent text-xs cursor-pointer hover:bg-slate-100 rounded px-1 py-1 truncate",
                    !assigneeId && "text-slate-400 italic"
                )}
            >
                <option value="">Unassigned</option>
                {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.nickname ? `(${emp.nickname})` : ''}
                    </option>
                ))}
            </select>
        </div>
    )
}
