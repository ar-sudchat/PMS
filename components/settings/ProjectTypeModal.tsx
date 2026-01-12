'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ProjectType, createProjectType, updateProjectType } from '@/lib/actions/project-type-actions'

interface ProjectTypeModalProps {
    isOpen: boolean
    onClose: () => void
    mode: 'create' | 'edit'
    initialData: ProjectType | null
    onSuccess: () => void
}

const DEFAULT_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#6B7280', // Gray
]

export function ProjectTypeModal({ isOpen, onClose, mode, initialData, onSuccess }: ProjectTypeModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        name_th: '',
        description: '',
        color: '#3B82F6',
        has_milestones: true,
        has_deliverables: true,
        is_active: true,
    })

    // Reset form when modal opens/closes or mode changes
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setFormData({
                    code: initialData.code || '',
                    name: initialData.name || '',
                    name_th: initialData.name_th || '',
                    description: initialData.description || '',
                    color: initialData.color || '#3B82F6',
                    has_milestones: initialData.has_milestones,
                    has_deliverables: initialData.has_deliverables,
                    is_active: initialData.is_active,
                })
            } else {
                setFormData({
                    code: '',
                    name: '',
                    name_th: '',
                    description: '',
                    color: '#3B82F6',
                    has_milestones: true,
                    has_deliverables: true,
                    is_active: true,
                })
            }
        }
    }, [isOpen, mode, initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (!formData.code.trim()) {
            toast.error('Please enter a code')
            return
        }
        if (!formData.name.trim()) {
            toast.error('Please enter a name')
            return
        }

        setIsSubmitting(true)

        try {
            let result
            if (mode === 'create') {
                result = await createProjectType({
                    code: formData.code.trim(),
                    name: formData.name.trim(),
                    name_th: formData.name_th.trim() || undefined,
                    description: formData.description.trim() || undefined,
                    color: formData.color,
                    has_milestones: formData.has_milestones,
                    has_deliverables: formData.has_deliverables,
                    is_active: formData.is_active,
                })
            } else {
                result = await updateProjectType(initialData!.id, {
                    code: formData.code.trim(),
                    name: formData.name.trim(),
                    name_th: formData.name_th.trim() || undefined,
                    description: formData.description.trim() || undefined,
                    color: formData.color,
                    has_milestones: formData.has_milestones,
                    has_deliverables: formData.has_deliverables,
                    is_active: formData.is_active,
                })
            }

            if (result.success) {
                toast.success(mode === 'create' ? 'Project type created' : 'Project type updated')
                onSuccess()
            } else {
                toast.error(result.error || 'Operation failed')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'create' ? 'Add Project Type' : 'Edit Project Type'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                    {/* Code & Name Row */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Code *</Label>
                            <Input
                                id="code"
                                placeholder="DEV"
                                value={formData.code}
                                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                className="font-mono uppercase"
                                maxLength={20}
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="name">Name (EN) *</Label>
                            <Input
                                id="name"
                                placeholder="Development"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Thai Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name_th">Name (TH)</Label>
                        <Input
                            id="name_th"
                            placeholder="พัฒนาระบบ"
                            value={formData.name_th}
                            onChange={(e) => setFormData(prev => ({ ...prev, name_th: e.target.value }))}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            placeholder="Brief description of this project type"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex items-center gap-3">
                            <div className="flex gap-2 flex-wrap">
                                {DEFAULT_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                                        className={`w-7 h-7 rounded-full transition-all ${
                                            formData.color === color
                                                ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                                                : 'hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <Input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                    className="w-10 h-8 p-0.5 cursor-pointer"
                                />
                                <span className="text-xs font-mono text-slate-500">{formData.color}</span>
                            </div>
                        </div>
                    </div>

                    {/* Feature Toggles */}
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                        <Label className="text-slate-700">Features</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <Checkbox
                                    checked={formData.has_milestones}
                                    onChange={(e) => setFormData(prev => ({ ...prev, has_milestones: e.target.checked }))}
                                />
                                <span className="text-sm">Has Milestones</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <Checkbox
                                    checked={formData.has_deliverables}
                                    onChange={(e) => setFormData(prev => ({ ...prev, has_deliverables: e.target.checked }))}
                                />
                                <span className="text-sm">Has Deliverables</span>
                            </label>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            These settings control which tabs appear in the Project Modal
                        </p>
                    </div>

                    {/* Active Status */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                            checked={formData.is_active}
                            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        />
                        <span className="text-sm">Active (available for selection in projects)</span>
                    </label>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {mode === 'create' ? 'Creating...' : 'Saving...'}
                                </>
                            ) : (
                                mode === 'create' ? 'Create Type' : 'Save Changes'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
