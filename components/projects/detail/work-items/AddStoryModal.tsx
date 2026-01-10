'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createStory } from '@/lib/actions/work-items-actions'
import { toast } from 'sonner'

interface AddStoryModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    milestones: { id: string, name: string }[]
    onSuccess: () => void
}

export function AddStoryModal({ open, onOpenChange, projectId, milestones, onSuccess }: AddStoryModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        milestoneId: '',
        priority: 'Medium',
        estimatedMd: '',
        description: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.milestoneId) return

        setIsLoading(true)
        try {
            const result = await createStory({
                project_id: projectId,
                milestone_id: formData.milestoneId,
                title: formData.title,
                description: formData.description,
                priority: formData.priority,
                estimated_md: formData.estimatedMd ? Number(formData.estimatedMd) : 0
            })

            if (result.success) {
                toast.success('Story created successfully')
                onOpenChange(false)
                setFormData({ title: '', milestoneId: '', priority: 'Medium', estimatedMd: '', description: '' })
                onSuccess()
            } else {
                toast.error('Failed to create story')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Story</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Milestone <span className="text-red-500">*</span></Label>
                        <Select
                            value={formData.milestoneId}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, milestoneId: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select milestone" />
                            </SelectTrigger>
                            <SelectContent>
                                {milestones.map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Title <span className="text-red-500">*</span></Label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g. User Authentication"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Critical">Critical</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Est. MD</Label>
                            <Input
                                type="number"
                                value={formData.estimatedMd}
                                onChange={(e) => setFormData(prev => ({ ...prev, estimatedMd: e.target.value }))}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Create Story'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
