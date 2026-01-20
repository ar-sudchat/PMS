'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, ChevronRight, Settings, Users, Clock, RefreshCw, Save, X, UserCheck } from 'lucide-react'
import { fetchFlowTemplates, fetchFlowTemplateWithSteps, createFlowTemplate, updateFlowTemplate, addFlowStep, updateFlowStep, addStepApprover, deleteFlowStep, deleteStepApprover } from '@/lib/actions/approval-actions'
import { getActiveEmployees } from '@/lib/actions/employee-actions'
import { getActivePositions } from '@/lib/actions/position-actions'
import { toast } from 'sonner'
import { SmartCombobox } from '@/components/shared/SmartCombobox'



interface FlowTemplate {
    id: string
    flow_code: string
    flow_name: string
    module_code: string
    document_type: string | null
    description: string | null
    is_active: boolean
}

interface FlowStep {
    id: string
    step_order: number
    step_name: string
    step_type: string
    approval_type: string
    can_reject: boolean
    can_delegate: boolean
    timeout_hours: number | null
}

interface StepApprover {
    id: string
    step_id: string
    approver_type: string
    approver_value: string
    approver_order: number
    is_required: boolean
}

const moduleLabels: Record<string, string> = {
    'KPI': 'KPI Records',
    'PROJECT': 'Projects',
    'PURCHASE': 'Purchases',
    'EXPENSE': 'Expenses',
    'HR': 'HR'
}

const documentTypeLabels: Record<string, string> = {
    'DEPLOY_SUCCESS': 'Deploy Success',
    'DEPLOY_BACKUP': 'Backup Record',
    'MEETING_MINUTES': 'Meeting Minutes',
    'PROJECT_CHARTER': 'Project Charter',
    'PO': 'Purchase Order',
    'EXPENSE_CLAIM': 'Expense Claim'
}

const approverTypeLabels: Record<string, string> = {
    'USER': 'Specific User',
    'ROLE': 'By Role',
    'POSITION': 'By Position',
    'DYNAMIC': 'Dynamic',
    'DOA_RULE': 'DOA Rule'
}

const dynamicApproverLabels: Record<string, string> = {
    'REQUESTER_MANAGER': 'Department Head',
    'DEPT_HEAD': 'Department Head',
    'PROJECT_MANAGER': 'Project Manager'
}

export function ApprovalFlowManagement() {
    const [templates, setTemplates] = useState<FlowTemplate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null)
    const [steps, setSteps] = useState<FlowStep[]>([])
    const [approvers, setApprovers] = useState<Record<string, StepApprover[]>>({})
    const [isLoadingSteps, setIsLoadingSteps] = useState(false)

    // Modal states
    const [showTemplateModal, setShowTemplateModal] = useState(false)
    const [showStepModal, setShowStepModal] = useState(false)
    const [showApproverModal, setShowApproverModal] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<FlowTemplate | null>(null)
    const [editingStepId, setEditingStepId] = useState<string | null>(null)
    const [editingStep, setEditingStep] = useState<FlowStep | null>(null)

    // Form states
    const [templateForm, setTemplateForm] = useState({
        flow_code: '',
        flow_name: '',
        module_code: 'KPI',
        document_type: '',
        description: ''
    })

    const [stepForm, setStepForm] = useState({
        step_order: 1,
        step_name: '',
        step_type: 'SEQUENTIAL',
        approval_type: 'SINGLE',
        can_reject: true,
        can_delegate: true,
        timeout_hours: 48
    })

    const [approverForm, setApproverForm] = useState({
        approver_type: 'DYNAMIC',
        approver_value: 'REQUESTER_MANAGER',
        is_required: true
    })

    // Data for dropdowns
    const [employees, setEmployees] = useState<{ value: string, label: string }[]>([])
    const [positions, setPositions] = useState<{ value: string, label: string }[]>([])
    const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await fetchFlowTemplates()
            setTemplates(data as FlowTemplate[])
        } catch (error) {
            toast.error('Failed to load flow templates')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSelectTemplate = async (template: FlowTemplate) => {
        setSelectedTemplate(template)
        setIsLoadingSteps(true)
        try {
            const result = await fetchFlowTemplateWithSteps(template.flow_code)
            setSteps(result.steps as FlowStep[])
            setApprovers(result.approvers as Record<string, StepApprover[]>)
        } catch (error) {
            toast.error('Failed to load flow steps')
        } finally {
            setIsLoadingSteps(false)
        }
    }

    const handleCreateTemplate = async () => {
        if (!templateForm.flow_code || !templateForm.flow_name) {
            toast.error('Please fill in required fields')
            return
        }

        const result = await createFlowTemplate({
            flow_code: templateForm.flow_code,
            flow_name: templateForm.flow_name,
            module_code: templateForm.module_code,
            document_type: templateForm.document_type || undefined,
            description: templateForm.description || undefined
        })

        if (result.success) {
            toast.success('Flow template created')
            setShowTemplateModal(false)
            setTemplateForm({ flow_code: '', flow_name: '', module_code: 'KPI', document_type: '', description: '' })
            fetchData()
        } else {
            toast.error(result.error || 'Failed to create template')
        }
    }

    const handleUpdateTemplate = async () => {
        if (!editingTemplate) return

        const result = await updateFlowTemplate(editingTemplate.id, {
            flow_name: templateForm.flow_name,
            description: templateForm.description,
            is_active: editingTemplate.is_active
        })

        if (result.success) {
            toast.success('Flow template updated')
            setShowTemplateModal(false)
            setEditingTemplate(null)
            fetchData()
            if (selectedTemplate?.id === editingTemplate.id) {
                handleSelectTemplate({ ...editingTemplate, flow_name: templateForm.flow_name, description: templateForm.description })
            }
        } else {
            toast.error(result.error || 'Failed to update template')
        }
    }

    const handleSaveStep = async () => {
        if (!selectedTemplate || !stepForm.step_name) {
            toast.error('Please fill in step name')
            return
        }

        if (editingStep) {
            const result = await updateFlowStep(editingStep.id, {
                step_name: stepForm.step_name,
                step_type: stepForm.step_type as any,
                approval_type: stepForm.approval_type as any,
                can_reject: stepForm.can_reject,
                can_delegate: stepForm.can_delegate,
                timeout_hours: stepForm.timeout_hours,
                step_order: stepForm.step_order
            })

            if (result.success) {
                toast.success('Step updated')
                setShowStepModal(false)
                setEditingStep(null)
                handleSelectTemplate(selectedTemplate)
            } else {
                toast.error(result.error || 'Failed to update step')
            }
        } else {
            const result = await addFlowStep({
                flow_template_id: selectedTemplate.id,
                step_order: stepForm.step_order,
                step_name: stepForm.step_name,
                step_type: stepForm.step_type as any,
                approval_type: stepForm.approval_type as any,
                can_reject: stepForm.can_reject,
                can_delegate: stepForm.can_delegate,
                timeout_hours: stepForm.timeout_hours
            })

            if (result.success) {
                toast.success('Step added')
                setShowStepModal(false)
                setStepForm({ step_order: steps.length + 2, step_name: '', step_type: 'SEQUENTIAL', approval_type: 'SINGLE', can_reject: true, can_delegate: true, timeout_hours: 48 })
                handleSelectTemplate(selectedTemplate)
            } else {
                toast.error(result.error || 'Failed to add step')
            }
        }
    }

    const handleAddApprover = async () => {
        console.log('handleAddApprover called:', { editingStepId, approverForm })

        if (!editingStepId) {
            toast.error('No step selected')
            return
        }

        if (!approverForm.approver_value) {
            toast.error('Please select an approver')
            return
        }

        try {
            const result = await addStepApprover({
                step_id: editingStepId,
                approver_type: approverForm.approver_type as any,
                approver_value: approverForm.approver_value,
                is_required: approverForm.is_required
            })

            console.log('addStepApprover result:', result)

            if (result.success) {
                toast.success('Approver added successfully')
                setShowApproverModal(false)
                setEditingStepId(null)
                if (selectedTemplate) {
                    handleSelectTemplate(selectedTemplate)
                }
            } else {
                toast.error(result.error || 'Failed to add approver')
            }
        } catch (error: any) {
            console.error('handleAddApprover error:', error)
            toast.error(error.message || 'An error occurred')
        }
    }

    const handleDeleteStep = async (stepId: string) => {
        if (!confirm('Are you sure you want to delete this approval step?')) return

        const result = await deleteFlowStep(stepId)
        if (result.success) {
            toast.success('Step deleted')
            if (selectedTemplate) handleSelectTemplate(selectedTemplate)
        } else {
            toast.error(result.error || 'Failed to delete step')
        }
    }

    const handleDeleteApprover = async (approverId: string) => {
        if (!confirm('Are you sure you want to remove this approver?')) return

        const result = await deleteStepApprover(approverId)
        if (result.success) {
            toast.success('Approver removed')
            if (selectedTemplate) handleSelectTemplate(selectedTemplate)
        } else {
            toast.error(result.error || 'Failed to remove approver')
        }
    }

    const openEditTemplate = (template: FlowTemplate) => {
        setEditingTemplate(template)
        setTemplateForm({
            flow_code: template.flow_code,
            flow_name: template.flow_name,
            module_code: template.module_code,
            document_type: template.document_type || '',
            description: template.description || ''
        })
        setShowTemplateModal(true)
    }

    const openAddStep = () => {
        setEditingStep(null)
        setStepForm({
            step_order: steps.length + 1,
            step_name: '',
            step_type: 'SEQUENTIAL',
            approval_type: 'SINGLE',
            can_reject: true,
            can_delegate: true,
            timeout_hours: 48
        })
        setShowStepModal(true)
    }

    const openEditStep = (step: FlowStep) => {
        setEditingStep(step)
        setStepForm({
            step_order: step.step_order,
            step_name: step.step_name,
            step_type: step.step_type,
            approval_type: step.approval_type,
            can_reject: step.can_reject,
            can_delegate: step.can_delegate,
            timeout_hours: step.timeout_hours || 0
        })
        setShowStepModal(true)
    }

    const openAddApprover = async (stepId: string) => {
        setEditingStepId(stepId)
        setApproverForm({
            approver_type: 'DYNAMIC',
            approver_value: 'REQUESTER_MANAGER',
            is_required: true
        })
        setShowApproverModal(true)

        // Load employees and positions for dropdowns
        setIsLoadingDropdowns(true)
        try {
            const [employeesRes, positionsRes] = await Promise.all([
                getActiveEmployees(),
                getActivePositions()
            ])

            if (employeesRes.success && employeesRes.data) {
                setEmployees(employeesRes.data.map((e: any) => ({
                    value: e.id,
                    label: `${e.first_name} ${e.last_name}${e.nickname ? ` (${e.nickname})` : ''}`
                })))
            }

            if (positionsRes.success && positionsRes.data) {
                setPositions(positionsRes.data.map((p: any) => ({
                    value: p.code,
                    label: `${p.name} (${p.code})`
                })))
            }
        } catch (error) {
            console.error('Failed to load dropdown data:', error)
        } finally {
            setIsLoadingDropdowns(false)
        }
    }

    const getApproverDisplay = (approver: StepApprover) => {
        if (approver.approver_type === 'DYNAMIC') {
            return dynamicApproverLabels[approver.approver_value] || approver.approver_value
        }
        return `${approverTypeLabels[approver.approver_type] || approver.approver_type}: ${approver.approver_value}`
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Flow Templates List */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-700">Flow Templates</h2>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => {
                                    setEditingTemplate(null)
                                    setTemplateForm({ flow_code: '', flow_name: '', module_code: 'KPI', document_type: '', description: '' })
                                    setShowTemplateModal(true)
                                }}
                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                title="Add Template"
                            >
                                <Plus size={16} />
                            </button>
                            <button
                                onClick={() => fetchData()}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {templates.map(template => (
                                <div
                                    key={template.id}
                                    className={`px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between ${selectedTemplate?.id === template.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                                        }`}
                                >
                                    <button
                                        onClick={() => handleSelectTemplate(template)}
                                        className="flex-1 text-left"
                                    >
                                        <div className="font-medium text-slate-700 text-sm">
                                            {template.flow_name}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            {moduleLabels[template.module_code] || template.module_code} / {documentTypeLabels[template.document_type || ''] || template.document_type || 'General'}
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                openEditTemplate(template)
                                            }}
                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <span className={`px-2 py-0.5 text-xs rounded ${template.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {template.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {templates.length === 0 && (
                                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                                    No flow templates found
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Flow Details */}
            <div className="lg:col-span-2">
                {selectedTemplate ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-800">{selectedTemplate.flow_name}</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {selectedTemplate.description || 'No description'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 text-sm rounded-full ${selectedTemplate.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {selectedTemplate.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Flow Info */}
                        <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-3 gap-4">
                            <div>
                                <div className="text-xs text-slate-400 uppercase tracking-wider">Flow Code</div>
                                <div className="text-sm font-medium text-slate-700 mt-1">{selectedTemplate.flow_code}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 uppercase tracking-wider">Module</div>
                                <div className="text-sm font-medium text-slate-700 mt-1">{moduleLabels[selectedTemplate.module_code] || selectedTemplate.module_code}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 uppercase tracking-wider">Document Type</div>
                                <div className="text-sm font-medium text-slate-700 mt-1">{documentTypeLabels[selectedTemplate.document_type || ''] || selectedTemplate.document_type || '-'}</div>
                            </div>
                        </div>

                        {/* Steps */}
                        <div className="px-6 py-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-700">Approval Steps</h3>
                                <button
                                    onClick={openAddStep}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                    <Plus size={16} />
                                    Add Step
                                </button>
                            </div>

                            {isLoadingSteps ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                </div>
                            ) : steps.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Settings size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No steps configured</p>
                                    <p className="text-sm mt-1">Click "Add Step" to create the first approval step</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {steps.map((step) => (
                                        <div
                                            key={step.id}
                                            className="p-4 bg-slate-50 rounded-lg border border-slate-100"
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Step Number */}
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                                                    {step.step_order}
                                                </div>

                                                {/* Step Info */}
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-medium text-slate-700">{step.step_name}</div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => openEditStep(step)}
                                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                title="Edit Step"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteStep(step.id)}
                                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Delete Step"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <Users size={12} />
                                                            {step.approval_type}
                                                        </span>
                                                        {step.timeout_hours && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={12} />
                                                                {step.timeout_hours}h timeout
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        {step.can_reject && (
                                                            <span className="px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded">Can Reject</span>
                                                        )}
                                                        {step.can_delegate && (
                                                            <span className="px-2 py-0.5 text-xs bg-purple-50 text-purple-600 rounded">Can Delegate</span>
                                                        )}
                                                    </div>

                                                    {/* Approvers */}
                                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-medium text-slate-500 uppercase">Approvers</span>
                                                            <button
                                                                onClick={() => openAddApprover(step.id)}
                                                                className="text-xs text-blue-600 hover:text-blue-700"
                                                            >
                                                                + Add Approver
                                                            </button>
                                                        </div>
                                                        {approvers[step.id]?.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {approvers[step.id].map((approver) => (
                                                                    <div key={approver.id} className="flex items-center justify-between group py-1">
                                                                        <div className="flex items-center gap-2 text-sm">
                                                                            <UserCheck size={14} className="text-green-600" />
                                                                            <span className="text-slate-600">{getApproverDisplay(approver)}</span>
                                                                            {approver.is_required && (
                                                                                <span className="text-xs text-amber-600">(Required)</span>
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleDeleteApprover(approver.id)}
                                                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all cursor-pointer"
                                                                            title="Remove Approver"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-slate-400">No approvers configured</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center h-96">
                        <div className="text-center text-slate-400">
                            <Settings size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="text-lg font-medium">Select a Flow Template</p>
                            <p className="text-sm mt-1">Click on a template to view its details and steps</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Template Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-lg font-semibold text-slate-800">
                                {editingTemplate ? 'Edit Flow Template' : 'New Flow Template'}
                            </h2>
                            <button
                                onClick={() => { setShowTemplateModal(false); setEditingTemplate(null) }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {!editingTemplate && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Flow Code *</label>
                                    <input
                                        type="text"
                                        value={templateForm.flow_code}
                                        onChange={(e) => setTemplateForm({ ...templateForm, flow_code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        placeholder="e.g., LEAVE_REQUEST"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Flow Name *</label>
                                <input
                                    type="text"
                                    value={templateForm.flow_name}
                                    onChange={(e) => setTemplateForm({ ...templateForm, flow_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    placeholder="e.g., Leave Request Approval"
                                />
                            </div>

                            {!editingTemplate && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Module</label>
                                        <select
                                            value={templateForm.module_code}
                                            onChange={(e) => setTemplateForm({ ...templateForm, module_code: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                                        >
                                            {Object.entries(moduleLabels).map(([code, label]) => (
                                                <option key={code} value={code}>{label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
                                        <input
                                            type="text"
                                            value={templateForm.document_type}
                                            onChange={(e) => setTemplateForm({ ...templateForm, document_type: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                            placeholder="e.g., LEAVE_REQUEST"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    value={templateForm.description}
                                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                                    rows={3}
                                    placeholder="Optional description..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                            <button
                                onClick={() => { setShowTemplateModal(false); setEditingTemplate(null) }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Save size={16} />
                                {editingTemplate ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step Modal */}
            {showStepModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-lg font-semibold text-slate-800">{editingStep ? 'Edit Approval Step' : 'Add Approval Step'}</h2>
                            <button
                                onClick={() => setShowStepModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Step Order</label>
                                    <input
                                        type="number"
                                        value={stepForm.step_order}
                                        onChange={(e) => setStepForm({ ...stepForm, step_order: parseInt(e.target.value) || 1 })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                                        min={1}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Timeout (hours)</label>
                                    <input
                                        type="number"
                                        value={stepForm.timeout_hours}
                                        onChange={(e) => setStepForm({ ...stepForm, timeout_hours: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                                        min={0}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Step Name *</label>
                                <input
                                    type="text"
                                    value={stepForm.step_name}
                                    onChange={(e) => setStepForm({ ...stepForm, step_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                                    placeholder="e.g., Manager Approval"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Step Type</label>
                                    <select
                                        value={stepForm.step_type}
                                        onChange={(e) => setStepForm({ ...stepForm, step_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                                    >
                                        <option value="SEQUENTIAL">Sequential</option>
                                        <option value="PARALLEL">Parallel</option>
                                        <option value="CONDITIONAL">Conditional</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Approval Type</label>
                                    <select
                                        value={stepForm.approval_type}
                                        onChange={(e) => setStepForm({ ...stepForm, approval_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                                    >
                                        <option value="SINGLE">Single (Any one)</option>
                                        <option value="ALL">All approvers</option>
                                        <option value="ANY">Any one</option>
                                        <option value="MAJORITY">Majority</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={stepForm.can_reject}
                                        onChange={(e) => setStepForm({ ...stepForm, can_reject: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">Can Reject</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={stepForm.can_delegate}
                                        onChange={(e) => setStepForm({ ...stepForm, can_delegate: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">Can Delegate</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                            <button
                                onClick={() => setShowStepModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveStep}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {editingStep ? <Save size={16} /> : <Plus size={16} />}
                                {editingStep ? 'Update' : 'Add Step'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approver Modal */}
            {showApproverModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-lg font-semibold text-slate-800">Add Approver</h2>
                            <button
                                onClick={() => { setShowApproverModal(false); setEditingStepId(null) }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Approver Type</label>
                                <select
                                    value={approverForm.approver_type}
                                    onChange={(e) => {
                                        const newType = e.target.value
                                        // Reset approver_value when type changes
                                        let newValue = ''
                                        if (newType === 'DYNAMIC') {
                                            newValue = 'REQUESTER_MANAGER'
                                        }
                                        setApproverForm({ ...approverForm, approver_type: newType, approver_value: newValue })
                                    }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                                >
                                    <option value="DYNAMIC">Dynamic (Auto-resolve)</option>
                                    <option value="ROLE">By Role/Position</option>
                                    <option value="USER">Specific User</option>
                                </select>
                            </div>

                            {approverForm.approver_type === 'DYNAMIC' ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Dynamic Approver</label>
                                    <select
                                        value={approverForm.approver_value}
                                        onChange={(e) => setApproverForm({ ...approverForm, approver_value: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                                    >
                                        <option value="REQUESTER_MANAGER">Requester's Manager (Dept Head)</option>
                                        <option value="DEPT_HEAD">Department Head</option>
                                        <option value="PROJECT_MANAGER">Project Manager</option>
                                    </select>
                                </div>
                            ) : approverForm.approver_type === 'USER' ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Employee</label>
                                    {isLoadingDropdowns ? (
                                        <div className="flex items-center justify-center py-2">
                                            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                        </div>
                                    ) : (
                                        <SmartCombobox
                                            options={employees}
                                            value={employees.find(e => e.value === approverForm.approver_value) || null}
                                            onChange={(opt) => setApproverForm({ ...approverForm, approver_value: opt?.value?.toString() || '' })}
                                            placeholder="Search and select employee..."
                                        />
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Position</label>
                                    {isLoadingDropdowns ? (
                                        <div className="flex items-center justify-center py-2">
                                            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                        </div>
                                    ) : (
                                        <SmartCombobox
                                            options={positions}
                                            value={positions.find(p => p.value === approverForm.approver_value) || null}
                                            onChange={(opt) => setApproverForm({ ...approverForm, approver_value: opt?.value?.toString() || '' })}
                                            placeholder="Search and select position..."
                                        />
                                    )}
                                </div>
                            )}

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={approverForm.is_required}
                                    onChange={(e) => setApproverForm({ ...approverForm, is_required: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-700">Required Approver</span>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                            <button
                                onClick={() => { setShowApproverModal(false); setEditingStepId(null) }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddApprover}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={16} />
                                Add Approver
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
