'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/Switch'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
    Plus, Pencil, Trash2, CheckCircle, XCircle, Loader2,
    GripVertical, ChevronDown, ChevronRight, Settings2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
    createWorkflowTemplate,
    updateWorkflowTemplate,
    deleteWorkflowTemplate,
    toggleWorkflowTemplateActive,
    getWorkflowStepDefs,
    createWorkflowStep,
    updateWorkflowStep,
    deleteWorkflowStep
} from '@/lib/actions/project-request-actions'

interface WorkflowTemplate {
    id: string
    code: string
    name: string
    description?: string
    is_default: boolean
    is_active: boolean
    step_count: number
}

interface WorkflowStep {
    id: string
    template_id: string
    step_order: number
    step_code: string
    step_name: string
    description?: string
    icon?: string
    color?: string
    is_required: boolean
    can_skip: boolean
    can_complete_early: boolean
    required_fields?: string
}

interface WorkflowTemplateSettingsProps {
    templates: WorkflowTemplate[]
}

export function WorkflowTemplateSettings({ templates }: WorkflowTemplateSettingsProps) {
    const router = useRouter()
    const [loadingAction, setLoadingAction] = useState<string | null>(null)

    // Template Modal State
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
    const [templateModalMode, setTemplateModalMode] = useState<'create' | 'edit'>('create')
    const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)

    // Step Modal State
    const [isStepModalOpen, setIsStepModalOpen] = useState(false)
    const [stepModalMode, setStepModalMode] = useState<'create' | 'edit'>('create')
    const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null)
    const [selectedTemplateForStep, setSelectedTemplateForStep] = useState<string | null>(null)

    // Expanded Templates State
    const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
    const [templateSteps, setTemplateSteps] = useState<Record<string, WorkflowStep[]>>({})
    const [loadingSteps, setLoadingSteps] = useState<string | null>(null)

    // Template Form State
    const [templateForm, setTemplateForm] = useState({
        code: '',
        name: '',
        description: '',
        is_default: false
    })

    // Step Form State
    const [stepForm, setStepForm] = useState({
        step_order: 1,
        step_code: '',
        step_name: '',
        description: '',
        icon: '',
        color: 'slate',
        is_required: true,
        can_skip: false,
        can_complete_early: false
    })

    // Toggle template expansion and load steps
    const toggleTemplateExpanded = async (templateId: string) => {
        const newExpanded = new Set(expandedTemplates)
        if (newExpanded.has(templateId)) {
            newExpanded.delete(templateId)
        } else {
            newExpanded.add(templateId)
            // Load steps if not already loaded
            if (!templateSteps[templateId]) {
                setLoadingSteps(templateId)
                try {
                    const steps = await getWorkflowStepDefs(templateId)
                    setTemplateSteps(prev => ({ ...prev, [templateId]: steps }))
                } catch (error) {
                    toast.error('Failed to load steps')
                } finally {
                    setLoadingSteps(null)
                }
            }
        }
        setExpandedTemplates(newExpanded)
    }

    // Template CRUD Handlers
    const handleAddTemplate = () => {
        setTemplateModalMode('create')
        setSelectedTemplate(null)
        setTemplateForm({ code: '', name: '', description: '', is_default: false })
        setIsTemplateModalOpen(true)
    }

    const handleEditTemplate = (template: WorkflowTemplate) => {
        setTemplateModalMode('edit')
        setSelectedTemplate(template)
        setTemplateForm({
            code: template.code,
            name: template.name,
            description: template.description || '',
            is_default: template.is_default
        })
        setIsTemplateModalOpen(true)
    }

    const handleSaveTemplate = async () => {
        if (!templateForm.code.trim() || !templateForm.name.trim()) {
            toast.error('กรุณากรอกรหัสและชื่อ Template')
            return
        }

        setLoadingAction('template-save')
        try {
            if (templateModalMode === 'create') {
                const result = await createWorkflowTemplate(templateForm)
                if (result.success) {
                    toast.success('สร้าง Template สำเร็จ')
                    setIsTemplateModalOpen(false)
                    router.refresh()
                } else {
                    toast.error(result.error || 'Failed to create')
                }
            } else if (selectedTemplate) {
                const result = await updateWorkflowTemplate(selectedTemplate.id, templateForm)
                if (result.success) {
                    toast.success('อัพเดท Template สำเร็จ')
                    setIsTemplateModalOpen(false)
                    router.refresh()
                } else {
                    toast.error(result.error || 'Failed to update')
                }
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleDeleteTemplate = async (id: string, name: string) => {
        if (!confirm(`ยืนยันการลบ Template "${name}"?`)) return

        setLoadingAction(id)
        try {
            const result = await deleteWorkflowTemplate(id)
            if (result.success) {
                toast.success('ลบ Template สำเร็จ')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to delete')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleToggleActive = async (id: string, name: string) => {
        setLoadingAction(id)
        try {
            const result = await toggleWorkflowTemplateActive(id)
            if (result.success) {
                toast.success(`"${name}" status updated`)
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to update')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoadingAction(null)
        }
    }

    // Step CRUD Handlers
    const handleAddStep = (templateId: string) => {
        const existingSteps = templateSteps[templateId] || []
        const nextOrder = existingSteps.length > 0
            ? Math.max(...existingSteps.map(s => s.step_order)) + 1
            : 1

        setStepModalMode('create')
        setSelectedStep(null)
        setSelectedTemplateForStep(templateId)
        setStepForm({
            step_order: nextOrder,
            step_code: '',
            step_name: '',
            description: '',
            icon: '',
            color: 'slate',
            is_required: true,
            can_skip: false,
            can_complete_early: false
        })
        setIsStepModalOpen(true)
    }

    const handleEditStep = (step: WorkflowStep) => {
        setStepModalMode('edit')
        setSelectedStep(step)
        setSelectedTemplateForStep(step.template_id)
        setStepForm({
            step_order: step.step_order,
            step_code: step.step_code,
            step_name: step.step_name,
            description: step.description || '',
            icon: step.icon || '',
            color: step.color || 'slate',
            is_required: step.is_required,
            can_skip: step.can_skip,
            can_complete_early: step.can_complete_early
        })
        setIsStepModalOpen(true)
    }

    const handleSaveStep = async () => {
        if (!stepForm.step_code.trim() || !stepForm.step_name.trim()) {
            toast.error('กรุณากรอกรหัสและชื่อขั้นตอน')
            return
        }

        setLoadingAction('step-save')
        try {
            if (stepModalMode === 'create' && selectedTemplateForStep) {
                const result = await createWorkflowStep({
                    template_id: selectedTemplateForStep,
                    ...stepForm
                })
                if (result.success) {
                    toast.success('เพิ่มขั้นตอนสำเร็จ')
                    setIsStepModalOpen(false)
                    // Reload steps
                    const steps = await getWorkflowStepDefs(selectedTemplateForStep)
                    setTemplateSteps(prev => ({ ...prev, [selectedTemplateForStep]: steps }))
                    router.refresh()
                } else {
                    toast.error(result.error || 'Failed to create')
                }
            } else if (selectedStep) {
                const result = await updateWorkflowStep(selectedStep.id, stepForm)
                if (result.success) {
                    toast.success('อัพเดทขั้นตอนสำเร็จ')
                    setIsStepModalOpen(false)
                    // Reload steps
                    if (selectedTemplateForStep) {
                        const steps = await getWorkflowStepDefs(selectedTemplateForStep)
                        setTemplateSteps(prev => ({ ...prev, [selectedTemplateForStep]: steps }))
                    }
                    router.refresh()
                } else {
                    toast.error(result.error || 'Failed to update')
                }
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleDeleteStep = async (step: WorkflowStep) => {
        if (!confirm(`ยืนยันการลบขั้นตอน "${step.step_name}"?`)) return

        setLoadingAction(step.id)
        try {
            const result = await deleteWorkflowStep(step.id)
            if (result.success) {
                toast.success('ลบขั้นตอนสำเร็จ')
                // Reload steps
                const steps = await getWorkflowStepDefs(step.template_id)
                setTemplateSteps(prev => ({ ...prev, [step.template_id]: steps }))
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to delete')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoadingAction(null)
        }
    }

    const colorOptions = [
        { value: 'slate', label: 'Slate', class: 'bg-slate-500' },
        { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
        { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
        { value: 'green', label: 'Green', class: 'bg-green-500' },
        { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
        { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
        { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
        { value: 'red', label: 'Red', class: 'bg-red-500' },
    ]

    return (
        <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                    {templates.length} workflow template{templates.length !== 1 ? 's' : ''}
                </div>
                <Button onClick={handleAddTemplate} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่ม Template
                </Button>
            </div>

            {/* Templates List */}
            <div className="space-y-3">
                {templates.length === 0 ? (
                    <div className="border rounded-xl p-12 text-center text-slate-400 bg-white">
                        ยังไม่มี Workflow Template กรุณาเพิ่ม Template ใหม่
                    </div>
                ) : (
                    templates.map((template) => {
                        const isExpanded = expandedTemplates.has(template.id)
                        const steps = templateSteps[template.id] || []
                        const isLoading = loadingAction === template.id
                        const isLoadingSteps = loadingSteps === template.id

                        return (
                            <div
                                key={template.id}
                                className={cn(
                                    "border rounded-xl bg-white shadow-sm overflow-hidden",
                                    !template.is_active && "opacity-60"
                                )}
                            >
                                {/* Template Header */}
                                <div
                                    className="flex items-center justify-between px-4 py-3 bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => toggleTemplateExpanded(template.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs bg-slate-200 px-2 py-0.5 rounded">
                                                    {template.code}
                                                </span>
                                                <span className="font-medium text-slate-700">
                                                    {template.name}
                                                </span>
                                                {template.is_default && (
                                                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">
                                                        Default
                                                    </span>
                                                )}
                                                {!template.is_active && (
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 text-xs">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                            {template.description && (
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {template.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <span className="text-xs text-slate-400 mr-2">
                                            {template.step_count} steps
                                        </span>
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                        ) : (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditTemplate(template)}
                                                    className="h-8 w-8"
                                                >
                                                    <Pencil className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                                                </Button>
                                                {template.is_active ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleToggleActive(template.id, template.name)}
                                                        className="h-8 w-8"
                                                    >
                                                        <XCircle className="h-4 w-4 text-slate-400 hover:text-orange-600" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleToggleActive(template.id, template.name)}
                                                        className="h-8 w-8"
                                                    >
                                                        <CheckCircle className="h-4 w-4 text-slate-400 hover:text-green-600" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteTemplate(template.id, template.name)}
                                                    className="h-8 w-8"
                                                >
                                                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Steps List */}
                                {isExpanded && (
                                    <div className="border-t">
                                        {isLoadingSteps ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="divide-y">
                                                    {steps.map((step, index) => (
                                                        <div
                                                            key={step.id}
                                                            className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <GripVertical className="w-4 h-4 text-slate-300" />
                                                                <div
                                                                    className={cn(
                                                                        "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium",
                                                                        `bg-${step.color || 'slate'}-500`
                                                                    )}
                                                                    style={{
                                                                        backgroundColor: colorOptions.find(c => c.value === step.color)?.class.replace('bg-', '') || '#64748b'
                                                                    }}
                                                                >
                                                                    {step.step_order}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-xs text-slate-400">
                                                                            {step.step_code}
                                                                        </span>
                                                                        <span className="font-medium text-slate-700 text-sm">
                                                                            {step.step_name}
                                                                        </span>
                                                                        {step.is_required && (
                                                                            <span className="text-red-500 text-xs">*</span>
                                                                        )}
                                                                        {step.can_skip && (
                                                                            <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px]">
                                                                                ข้ามได้
                                                                            </span>
                                                                        )}
                                                                        {step.can_complete_early && (
                                                                            <span className="px-1 py-0.5 rounded bg-green-100 text-green-700 text-[10px]">
                                                                                จบก่อนได้
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {step.description && (
                                                                        <div className="text-xs text-slate-400">
                                                                            {step.description}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-1">
                                                                {loadingAction === step.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                                                ) : (
                                                                    <>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleEditStep(step)}
                                                                            className="h-7 w-7"
                                                                        >
                                                                            <Settings2 className="h-3.5 w-3.5 text-slate-400 hover:text-blue-600" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleDeleteStep(step)}
                                                                            className="h-7 w-7"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-600" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="px-4 py-3 bg-slate-50/50">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAddStep(template.id)}
                                                        className="w-full gap-1.5"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        เพิ่มขั้นตอน
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Template Modal */}
            <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {templateModalMode === 'create' ? 'สร้าง Workflow Template' : 'แก้ไข Workflow Template'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>รหัส Template *</Label>
                                <Input
                                    value={templateForm.code}
                                    onChange={(e) => setTemplateForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    placeholder="FULL_WORKFLOW"
                                    disabled={templateModalMode === 'edit'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>ชื่อ Template *</Label>
                                <Input
                                    value={templateForm.name}
                                    onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Full Workflow"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>คำอธิบาย</Label>
                            <Textarea
                                value={templateForm.description}
                                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="อธิบาย workflow..."
                                rows={2}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label>ตั้งเป็น Default</Label>
                            <Switch
                                checked={templateForm.is_default}
                                onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, is_default: checked }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleSaveTemplate} disabled={loadingAction === 'template-save'}>
                            {loadingAction === 'template-save' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Step Modal */}
            <Dialog open={isStepModalOpen} onOpenChange={setIsStepModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {stepModalMode === 'create' ? 'เพิ่มขั้นตอน' : 'แก้ไขขั้นตอน'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>ลำดับ *</Label>
                                <Input
                                    type="number"
                                    value={stepForm.step_order}
                                    onChange={(e) => setStepForm(prev => ({ ...prev, step_order: parseInt(e.target.value) || 1 }))}
                                    min={1}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>รหัส *</Label>
                                <Input
                                    value={stepForm.step_code}
                                    onChange={(e) => setStepForm(prev => ({ ...prev, step_code: e.target.value.toUpperCase() }))}
                                    placeholder="CREATED"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>สี</Label>
                                <div className="flex gap-1 flex-wrap">
                                    {colorOptions.map(color => (
                                        <button
                                            key={color.value}
                                            type="button"
                                            onClick={() => setStepForm(prev => ({ ...prev, color: color.value }))}
                                            className={cn(
                                                "w-6 h-6 rounded-full border-2 transition-all",
                                                color.class,
                                                stepForm.color === color.value ? "border-slate-900 scale-110" : "border-transparent"
                                            )}
                                            title={color.label}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>ชื่อขั้นตอน *</Label>
                            <Input
                                value={stepForm.step_name}
                                onChange={(e) => setStepForm(prev => ({ ...prev, step_name: e.target.value }))}
                                placeholder="สร้างคำขอ"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>คำอธิบาย</Label>
                            <Textarea
                                value={stepForm.description}
                                onChange={(e) => setStepForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="อธิบายขั้นตอน..."
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="flex items-center justify-between border rounded-lg p-3">
                                <Label className="text-xs">จำเป็น</Label>
                                <Switch
                                    checked={stepForm.is_required}
                                    onCheckedChange={(checked) => setStepForm(prev => ({ ...prev, is_required: checked }))}
                                />
                            </div>
                            <div className="flex items-center justify-between border rounded-lg p-3">
                                <Label className="text-xs">ข้ามได้</Label>
                                <Switch
                                    checked={stepForm.can_skip}
                                    onCheckedChange={(checked) => setStepForm(prev => ({ ...prev, can_skip: checked }))}
                                />
                            </div>
                            <div className="flex items-center justify-between border rounded-lg p-3">
                                <Label className="text-xs">จบก่อนได้</Label>
                                <Switch
                                    checked={stepForm.can_complete_early}
                                    onCheckedChange={(checked) => setStepForm(prev => ({ ...prev, can_complete_early: checked }))}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsStepModalOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleSaveStep} disabled={loadingAction === 'step-save'}>
                            {loadingAction === 'step-save' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
