'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, X } from 'lucide-react'
import { submitMorningStandup } from '@/lib/actions/standup-actions'
import { useTransition } from 'react'

interface MorningCheckInProps {
    groupId: number
    pendingTasks: any[]
    onComplete: (standup: any) => void
}

export function MorningCheckIn({ groupId, pendingTasks, onComplete }: MorningCheckInProps) {
    const [selectedTasks, setSelectedTasks] = useState<string[]>([])
    const [customTasks, setCustomTasks] = useState<string[]>([])
    const [newCustomTask, setNewCustomTask] = useState('')
    const [note, setNote] = useState('')
    const [isPending, startTransition] = useTransition()

    const toggleTask = (taskId: string) => {
        setSelectedTasks(prev =>
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        )
    }

    const addCustomTask = () => {
        if (newCustomTask.trim()) {
            setCustomTasks([...customTasks, newCustomTask.trim()])
            setNewCustomTask('')
        }
    }

    const removeCustomTask = (index: number) => {
        setCustomTasks(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = () => {
        startTransition(async () => {
            const taskPayload = [
                ...selectedTasks.map(id => ({ taskId: id })),
                ...customTasks.map(name => ({ customName: name }))
            ]

            await submitMorningStandup(groupId, taskPayload, note)
            // Ideally we fetch the fresh standup object here, but for now we just reload
            window.location.reload()
        })
    }

    return (
        <Card className="mt-4">
            <CardContent className="pt-6 space-y-6">
                <div>
                    <h3 className="text-lg font-medium mb-3">1. Select Tasks for Today</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto border p-4 rounded-md">
                        {pendingTasks.length === 0 && <p className="text-muted-foreground text-sm">No pending tasks found.</p>}
                        {pendingTasks.map(task => (
                            <div key={task.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`task-${task.id}`}
                                    checked={selectedTasks.includes(task.id)}
                                    onChange={() => toggleTask(task.id)}
                                />
                                <label
                                    htmlFor={`task-${task.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    [{task.projectTitle}] {task.title}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium mb-3">Or Add Ad-hoc Tasks</h3>
                    <div className="flex gap-2 mb-2">
                        <Input
                            placeholder="Type a task..."
                            value={newCustomTask}
                            onChange={(e) => setNewCustomTask(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCustomTask()}
                        />
                        <Button variant="outline" onClick={addCustomTask} type="button"><Plus className="w-4 h-4" /></Button>
                    </div>
                    {customTasks.length > 0 && (
                        <div className="space-y-2 mt-2">
                            {customTasks.map((task, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-secondary/30 p-2 rounded text-sm">
                                    <span>{task}</span>
                                    <button onClick={() => removeCustomTask(idx)} className="text-muted-foreground hover:text-red-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-lg font-medium mb-3">2. Note / Focus for Today</h3>
                    <Textarea
                        placeholder="Any specific goals or focus areas?"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={handleSubmit} disabled={isPending || (selectedTasks.length === 0 && customTasks.length === 0)}>
                        {isPending ? 'Submitting...' : 'Submit Plan'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
