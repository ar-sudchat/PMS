'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { createDeliverableConfig, updateDeliverableConfig } from '@/lib/actions/deliverable-config-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface DeliverableConfigModalProps {
    isOpen: boolean
    onClose: () => void
    mode: 'create' | 'edit'
    milestoneConfigId?: string
    milestoneName?: string
    initialData?: {
        id: string
        name: string
        name_th?: string | null
        is_required: boolean
    } | null
    onSuccess: () => void
}

export function DeliverableConfigModal({
    isOpen,
    onClose,
    mode,
    milestoneConfigId,
    milestoneName,
    initialData,
    onSuccess
}: DeliverableConfigModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        name_th: '',
        is_required: true
    })

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setFormData({
                    name: initialData.name,
                    name_th: initialData.name_th || '',
                    is_required: initialData.is_required
                })
            } else {
                setFormData({
                    name: '',
                    name_th: '',
                    is_required: true
                })
            }
        }
    }, [isOpen, mode, initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) return

        setIsLoading(true)
        try {
            let result
            if (mode === 'create') {
                if (!milestoneConfigId) throw new Error('Milestone Config ID is required')
                result = await createDeliverableConfig({
                    milestone_config_id: milestoneConfigId,
                    name: formData.name,
                    name_th: formData.name_th,
                    is_required: formData.is_required
                })
            } else {
                if (!initialData?.id) throw new Error('Config ID is required')
                result = await updateDeliverableConfig(initialData.id, {
                    name: formData.name,
                    name_th: formData.name_th,
                    is_required: formData.is_required
                })
            }

            if (result.success) {
                toast.success(mode === 'create' ? 'Document added' : 'Document updated')
                onSuccess()
                onClose()
            } else {
                toast.error(result.error || 'Failed to save')
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Add Default Document' : 'Edit Document'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {mode === 'create' && (
                        <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 mb-4">
                            Adding to Milestone: <span className="font-semibold text-slate-900">{milestoneName}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">Document Name (EN) <span className="text-red-500">*</span></Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Test Cases Document"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name_th">Document Name (TH)</Label>
                        <Input
                            id="name_th"
                            value={formData.name_th}
                            onChange={(e) => setFormData(prev => ({ ...prev, name_th: e.target.value }))}
                            placeholder="e.g., เอกสารกรณีทดสอบ"
                        />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                            id="is_required"
                            checked={formData.is_required}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked as boolean }))}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="is_required" className="cursor-pointer">
                                Required (จำเป็นต้องส่ง)
                            </Label>
                            <p className="text-sm text-slate-500">
                                This document will be counted in KPI calculations.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !formData.name.trim()}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Config
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
