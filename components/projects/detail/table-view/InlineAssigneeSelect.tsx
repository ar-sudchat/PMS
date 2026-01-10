'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from 'sonner'
import { getEmployees } from '@/lib/actions/project-actions' // Reuse
import { User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface InlineAssigneeSelectProps {
    currentAssigneeId: string | null
    onUpdate: (newAssigneeId: string | null) => Promise<boolean>
}

export function InlineAssigneeSelect({ currentAssigneeId, onUpdate }: InlineAssigneeSelectProps) {
    const [assigneeId, setAssigneeId] = useState<string>(currentAssigneeId || 'unassigned')
    const [employees, setEmployees] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Fetch employees once or rely on passed props? Passed props better for performance but keeping it self-contained for now as per "Reusable Component" pattern
    // Ideally should be passed down. But let's fetch if empty.
    useEffect(() => {
        getEmployees().then(res => {
            if (res) setEmployees(res)
        })
    }, [])

    const handleValueChange = async (newVal: string) => {
        const valToSend = newVal === 'unassigned' ? null : newVal
        setAssigneeId(newVal)
        setIsLoading(true)
        try {
            const success = await onUpdate(valToSend)
            if (!success) {
                setAssigneeId(currentAssigneeId || 'unassigned') // Revert
                toast.error("Failed to update assignee")
            } else {
                toast.success("Assignee updated")
            }
        } catch (e) {
            setAssigneeId(currentAssigneeId || 'unassigned')
            toast.error("Failed to update assignee")
        } finally {
            setIsLoading(false)
        }
    }

    const currentEmp = employees.find(e => e.id === assigneeId)

    return (
        <Select value={assigneeId} onValueChange={handleValueChange} disabled={isLoading}>
            <SelectTrigger className="h-8 px-2 text-xs border-0 bg-transparent hover:bg-slate-50 w-full min-w-[140px] justify-start">
                <div className="flex items-center gap-2 truncate">
                    {assigneeId === 'unassigned' || !currentEmp ? (
                        <>
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                                <User className="w-3 h-3 text-slate-500" />
                            </div>
                            <span className="text-slate-500">Unassigned</span>
                        </>
                    ) : (
                        <>
                            <Avatar className="w-5 h-5">
                                {/* <AvatarImage src={currentEmp.image_url} /> */}
                                <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                                    {currentEmp.first_name_en?.charAt(0) || currentEmp.nickname?.charAt(0) || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{currentEmp.nickname || currentEmp.first_name_en}</span>
                        </>
                    )}
                </div>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
                <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                            <User className="w-3 h-3 text-slate-400" />
                        </div>
                        <span className="text-slate-500">Unassigned</span>
                    </div>
                </SelectItem>
                {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                        <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5">
                                <AvatarFallback className="text-[10px] bg-slate-100">
                                    {e.first_name_en?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <span>{e.full_name} ({e.nickname})</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
