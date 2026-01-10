'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTask } from '@/lib/actions/work-items-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface AddTaskInlineProps {
    storyId: string
    onCancel: () => void
    onSuccess: () => void
    employees: { id: string, name: string }[]
}

export function AddTaskInline({ storyId, onCancel, onSuccess, employees }: AddTaskInlineProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [priority, setPriority] = useState('Medium')
    const [type, setType] = useState('Feature')
    const [estHours, setEstHours] = useState('8')
    const [assignee, setAssignee] = useState<string | undefined>(undefined)

    const handleSave = async () => {
        if (!title.trim()) return

        setIsLoading(true)
        try {
            const result = await createTask({
                story_id: storyId,
                title,
                priority,
                task_type: type,
                estimated_hours: Number(estHours),
                assignee_id: assignee
            })

            if (result.success) {
                toast.success('Task added')
                onSuccess()
            } else {
                toast.error('Failed to add task')
            }
        } catch (error) {
            toast.error('Error adding task')
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave()
        if (e.key === 'Escape') onCancel()
    }

    return (
        <div className="grid grid-cols-[1fr_100px_100px_150px_80px_150px] gap-2 p-2 bg-blue-50/50 border-b items-center animate-in fade-in">
            <div className="pl-12">
                <Input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="New Task Title..."
                    className="h-8 bg-white"
                    onKeyDown={handleKeyDown}
                />
            </div>
            <div>
                <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Feature">Feature</SelectItem>
                        <SelectItem value="Bug">Bug</SelectItem>
                        <SelectItem value="Ticket">Ticket</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Select value={assignee || "unassigned"} onValueChange={(val) => setAssignee(val === "unassigned" ? undefined : val)}>
                    <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Assignee" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {employees.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Input
                    type="number"
                    value={estHours}
                    onChange={(e) => setEstHours(e.target.value)}
                    className="h-8 bg-white text-right"
                    placeholder="Hrs"
                />
            </div>
            <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                </Button>
            </div>
        </div>
    )
}
