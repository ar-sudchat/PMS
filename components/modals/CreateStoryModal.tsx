'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { X, CheckCircle } from 'lucide-react'
import { createStory, updateStory } from '@/lib/actions/work-items-actions'
import { StorySimple } from '@/lib/actions/project-detail-actions'
import { SmartCombobox } from '@/components/shared/SmartCombobox'

export interface CreateStoryModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    milestoneId?: string
    onSuccess?: () => void
    // Prop required for dropdown
    milestones: { id: string, name: string }[]
    // Extended props to support Edit mode (backward compatibility)
    mode?: 'create' | 'edit'
    story?: StorySimple | null
}

export function CreateStoryModal({
    isOpen,
    onClose,
    projectId,
    milestoneId,
    onSuccess,
    milestones,
    mode = 'create',
    story
}: CreateStoryModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        milestoneId: '',
        priority: 'Medium',
        estimatedMd: '',
        description: '',
        status: 'backlog'
    })

    const [isSaving, setIsSaving] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [keepValues, setKeepValues] = useState(false)

    const titleInputRef = useRef<HTMLInputElement>(null)
    const formRef = useRef<HTMLFormElement>(null)

    // Handle Enter key to move to next field
    const handleEnterKey = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const inputs = Array.from(formRef.current?.querySelectorAll(
                'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled])'
            ) || []) as HTMLElement[]
            const currentIdx = inputs.indexOf(e.currentTarget)
            if (currentIdx !== -1 && currentIdx < inputs.length - 1) {
                inputs[currentIdx + 1].focus()
            }
        }
    }

    useEffect(() => {
        if (isOpen) {
            initializeForm()
        } else {
            setSuccessMessage(null)
        }
    }, [isOpen, mode, story, milestoneId])

    const initializeForm = () => {
        if (mode === 'edit' && story) {
            setFormData({
                title: story.title || '',
                milestoneId: '',
                priority: story.priority || 'Medium',
                estimatedMd: '',
                description: '',
                status: story.status || 'backlog'
            })
        } else {
            // Create mode
            if (!keepValues) {
                resetFormFull()
            } else {
                setFormData(prev => ({
                    ...prev,
                    milestoneId: milestoneId || prev.milestoneId || ''
                }))
            }
            if (!keepValues && milestoneId) {
                setFormData(prev => ({ ...prev, milestoneId }))
            }
        }
    }

    const resetFormFull = () => {
        setFormData({
            title: '',
            milestoneId: milestoneId || '',
            priority: 'Medium',
            estimatedMd: '',
            description: '',
            status: 'backlog'
        })
    }

    const resetFormAfterCreate = () => {
        setFormData(prev => ({
            ...prev,
            title: '',
            description: '',
            estimatedMd: '',
            milestoneId: keepValues ? prev.milestoneId : (milestoneId || ''),
            priority: keepValues ? prev.priority : 'Medium',
            status: 'backlog'
        }))
    }

    const handleSubmit = async (closeAfter: boolean) => {
        if (!formData.title.trim()) return alert('Please enter story title')

        setIsSaving(true)
        setSuccessMessage(null)

        try {
            let result;
            if (mode === 'create') {
                if (!projectId) return alert("Project ID missing")
                if (!formData.milestoneId) return alert("Milestone required")

                result = await createStory({
                    project_id: projectId,
                    milestone_id: formData.milestoneId,
                    title: formData.title,
                    description: formData.description,
                    priority: formData.priority,
                    estimated_md: formData.estimatedMd ? Number(formData.estimatedMd) : 0
                })
            } else {
                if (!story?.id) return

                const updateData: any = {
                    title: formData.title,
                    priority: formData.priority,
                    status: formData.status
                }
                if (formData.milestoneId) updateData.milestone_id = formData.milestoneId
                if (formData.estimatedMd) updateData.estimated_md = Number(formData.estimatedMd)

                result = await updateStory(story.id, updateData)
            }

            if (result && result.success) {
                if (onSuccess) onSuccess()

                if (closeAfter) {
                    onClose()
                } else {
                    const code = ((result as any).data)?.code || 'Story'
                    setSuccessMessage(`Success! Created ${code}: ${formData.title}`)
                    resetFormAfterCreate()

                    setTimeout(() => setSuccessMessage(null), 3000)
                    setTimeout(() => titleInputRef.current?.focus(), 100)
                }
            } else {
                alert(result?.error || `Failed to ${mode} story`)
            }
        } catch (error) {
            console.error(error)
            alert('An unexpected error occurred')
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    const milestoneOptions = milestones.map(m => ({
        value: m.id,
        label: m.name
    }))

    const priorityOptions = [
        { value: 'Critical', label: '🔴 Critical' },
        { value: 'High', label: '🟠 High' },
        { value: 'Medium', label: '🔵 Medium' },
        { value: 'Low', label: '⚪ Low' },
    ]

    const statusOptions = [
        { value: 'backlog', label: 'Backlog' },
        { value: 'todo', label: 'To Do' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'done', label: 'Done' },
    ]

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        {mode === 'create' ? 'Create Story' : `Edit Story: ${story?.code}`}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Success Banner */}
                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-green-700 font-medium">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span>{successMessage}</span>
                            </div>
                            <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <form ref={formRef} className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                ref={titleInputRef}
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                onKeyDown={handleEnterKey}
                                placeholder="e.g. User Authentication"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                                required
                                autoFocus={mode === 'create'}
                            />
                        </div>

                        {/* Milestone Field */}
                        {(mode === 'create' || (mode === 'edit' && formData.milestoneId)) && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Milestone {mode === 'create' && <span className="text-red-500">*</span>}
                                </label>
                                <SmartCombobox
                                    options={milestoneOptions}
                                    value={milestoneOptions.find((o: any) => o.value === formData.milestoneId) || null}
                                    onChange={(val) => setFormData(prev => ({ ...prev, milestoneId: val?.value?.toString() || '' }))}
                                    placeholder={mode === 'edit' ? "Change Milestone (Optional)" : "Select milestone"}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
                                <SmartCombobox
                                    options={priorityOptions}
                                    value={priorityOptions.find(o => o.value === formData.priority) || null}
                                    onChange={(val) => setFormData(prev => ({ ...prev, priority: val?.value?.toString() || 'Medium' }))}
                                    placeholder="Select Priority"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Est. MD</label>
                                <input
                                    type="number"
                                    value={formData.estimatedMd}
                                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedMd: e.target.value }))}
                                    onKeyDown={handleEnterKey}
                                    placeholder="0"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                />
                            </div>
                        </div>

                        {mode === 'edit' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                                <SmartCombobox
                                    options={statusOptions}
                                    value={statusOptions.find(o => o.value === formData.status) || null}
                                    onChange={(val) => setFormData(prev => ({ ...prev, status: val?.value?.toString() || 'backlog' }))}
                                    placeholder="Select Status"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm resize-y min-h-[80px]"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-slate-50 shrink-0">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                        {mode === 'create' && (
                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900 transition-colors select-none">
                                <input
                                    type="checkbox"
                                    checked={keepValues}
                                    onChange={(e) => setKeepValues(e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                />
                                Keep values after create
                            </label>
                        )}

                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white hover:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all text-sm"
                            >
                                Cancel
                            </button>

                            {mode === 'create' && (
                                <button
                                    onClick={() => handleSubmit(true)}
                                    disabled={isSaving || !formData.title || !formData.milestoneId}
                                    className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                                >
                                    Create & Close
                                </button>
                            )}

                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={isSaving || !formData.title || (mode === 'create' && !formData.milestoneId)}
                                className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-md shadow-blue-200 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all text-sm"
                            >
                                {isSaving ? 'Saving...' : (mode === 'create' ? 'Create Story' : 'Save Changes')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
