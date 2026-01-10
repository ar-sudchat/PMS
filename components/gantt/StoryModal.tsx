'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { createStory, getProjectMilestones } from '@/lib/actions/gantt-actions'

interface StoryModalProps {
    open: boolean
    onClose: () => void
    projectId: string
    milestoneId?: string
    onSuccess: () => void
}

export function StoryModal({ open, onClose, projectId, milestoneId, onSuccess }: StoryModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [milestones, setMilestones] = useState<Array<{ id: string; name: string; code: string }>>([])
    const [error, setError] = useState<string>('')

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        milestoneId: milestoneId || '',
        startDate: '',
        dueDate: '',
        priority: 'medium'
    })

    useEffect(() => {
        if (open && projectId) {
            loadMilestones()
            setFormData(prev => ({
                ...prev,
                milestoneId: milestoneId || ''
            }))
            setError('')
        }
    }, [open, projectId, milestoneId])

    const loadMilestones = async () => {
        setIsLoading(true)
        const result = await getProjectMilestones(projectId)
        if (result.success) {
            setMilestones(result.data)
        }
        setIsLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!projectId) {
            setError('Project ID is required')
            return
        }

        if (!formData.title.trim()) {
            setError('Title is required')
            return
        }

        setIsSaving(true)
        setError('')

        const result = await createStory({
            project_id: projectId,
            milestone_id: formData.milestoneId || undefined,
            title: formData.title
        })

        setIsSaving(false)

        if (result.success) {
            onSuccess()
            onClose()
            // Reset form
            setFormData({
                title: '',
                description: '',
                milestoneId: '',
                startDate: '',
                dueDate: '',
                priority: 'medium'
            })
        } else {
            setError(result.error || 'Failed to create story')
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="text-lg font-semibold">📋 Create Story</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter story title"
                            required
                        />
                    </div>

                    {/* Milestone */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Milestone
                        </label>
                        <select
                            value={formData.milestoneId}
                            onChange={(e) => setFormData({ ...formData, milestoneId: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={isLoading}
                        >
                            <option value="">-- No Milestone --</option>
                            {milestones.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.code}: {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="Enter description (optional)"
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Priority
                        </label>
                        <select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="critical">🔴 Critical</option>
                            <option value="high">🟠 High</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="low">🟢 Low</option>
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !formData.title.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Create Story
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
