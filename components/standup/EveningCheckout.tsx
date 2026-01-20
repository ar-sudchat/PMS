'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { submitEveningStandup, DailyStandup, StandupTask } from '@/lib/actions/standup-actions'
import { useTransition } from 'react'
import { Check, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EveningCheckoutProps {
    standup: DailyStandup
    onComplete: (standup: any) => void
}

export function EveningCheckout({ standup, onComplete }: EveningCheckoutProps) {
    const [eveningNote, setEveningNote] = useState('')
    const [mood, setMood] = useState('Neutral')
    const [isPending, startTransition] = useTransition()

    // Initialize status for all tasks
    const [taskUpdates, setTaskUpdates] = useState<{ id: number, status: string, remark: string }[]>(
        standup.tasks.map(t => ({ id: t.id!, status: 'PENDING', remark: '' }))
    )

    const updateTaskStatus = (id: number, status: string) => {
        setTaskUpdates(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    }

    const updateTaskRemark = (id: number, remark: string) => {
        setTaskUpdates(prev => prev.map(t => t.id === id ? { ...t, remark } : t))
    }

    const handleSubmit = () => {
        // Validate: If not completed, remark is required? check logic later.
        startTransition(async () => {
            await submitEveningStandup(standup.id, taskUpdates, eveningNote, mood)
            window.location.reload()
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 border-green-200 text-green-700'
            case 'BLOCKED': return 'bg-red-100 border-red-200 text-red-700'
            case 'DEFERRED': return 'bg-yellow-100 border-yellow-200 text-yellow-700'
            default: return 'bg-gray-50 border-gray-200'
        }
    }

    return (
        <Card className="mt-4">
            <CardContent className="pt-6 space-y-8">
                <div>
                    <h3 className="text-xl font-semibold mb-4">Review Your Day</h3>
                    <div className="space-y-4">
                        {standup.tasks.map((task) => {
                            const update = taskUpdates.find(t => t.id === task.id)
                            const status = update?.status || 'PENDING'

                            return (
                                <div key={task.id} className={cn("p-4 rounded-lg border transition-all", getStatusColor(status))}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-medium text-lg">{task.taskTitle || task.customTaskName}</p>
                                            {task.projectTitle && <p className="text-xs opacity-70">{task.projectTitle}</p>}
                                        </div>
                                        <div className="flex bg-white rounded-md shadow-sm border overflow-hidden">
                                            <button
                                                onClick={() => updateTaskStatus(task.id!, 'COMPLETED')}
                                                className={cn("p-2 hover:bg-green-50 transition-colors", status === 'COMPLETED' ? "bg-green-500 text-white hover:bg-green-600" : "text-gray-400")}
                                                title="Complete"
                                            >
                                                <Check className="w-5 h-5" />
                                            </button>
                                            <div className="w-[1px] bg-gray-200" />
                                            <button
                                                onClick={() => updateTaskStatus(task.id!, 'BLOCKED')}
                                                className={cn("p-2 hover:bg-red-50 transition-colors", status === 'BLOCKED' ? "bg-red-500 text-white hover:bg-red-600" : "text-gray-400")}
                                                title="Blocked/Failed"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                            <div className="w-[1px] bg-gray-200" />
                                            <button
                                                onClick={() => updateTaskStatus(task.id!, 'DEFERRED')}
                                                className={cn("p-2 hover:bg-yellow-50 transition-colors", status === 'DEFERRED' ? "bg-yellow-500 text-white hover:bg-yellow-600" : "text-gray-400")}
                                                title="Deferred/Pending"
                                            >
                                                <AlertCircle className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {(status === 'BLOCKED' || status === 'DEFERRED') && (
                                        <Textarea
                                            placeholder="What happened? (Reason required)"
                                            className="mt-2 bg-white/50"
                                            value={update?.remark}
                                            onChange={(e) => updateTaskRemark(task.id!, e.target.value)}
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-medium mb-2">Closing Note</h3>
                        <Textarea
                            placeholder="Any final thoughts for the team?"
                            value={eveningNote}
                            onChange={(e) => setEveningNote(e.target.value)}
                            className="h-32"
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium mb-2">How do you feel?</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {['Happy', 'Neutral', 'Stressed'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMood(m)}
                                    className={cn(
                                        "h-32 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all",
                                        mood === m ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                                    )}
                                >
                                    <span className="text-2xl">{m === 'Happy' ? '😄' : m === 'Neutral' ? '😐' : '😫'}</span>
                                    <span className="font-medium">{m}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={handleSubmit} disabled={isPending} size="lg">
                        {isPending ? 'Submitting Report...' : 'Complete Day'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
