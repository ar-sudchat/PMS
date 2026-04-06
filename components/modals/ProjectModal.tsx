'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, FileText, Check, AlertCircle, Paperclip, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Project, ProjectFormData, MilestoneRow } from '@/types/project'
import {
    getCustomers,
    getEmployees,
    getMilestoneConfigs,
    getDeliverableConfigs,
    getProjectStatusConfigs,
    createProject,
    updateProject,
    generateProjectCode,
    getProjectById,
    updateDeliverable,
    deleteProjectDeliverable
} from '@/lib/actions/project-actions'
import { getProjectTypes, ProjectType } from '@/lib/actions/project-type-actions'
import { getProjectGroups, ProjectGroup } from '@/lib/actions/project-group-actions'
import { getChanceConfigs, ChanceConfig } from '@/lib/actions/chance-actions'
import { getProjectAttachments, updateProjectAttachments, Attachment } from '@/lib/actions/attachment-actions'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import { MilestonesTab } from './ProjectModal/MilestonesTab'
import { DeliverablesTab } from './ProjectModal/DeliverablesTab'
import { PaymentConditionTab } from './PaymentConditionTab'
import FileUpload from '@/components/ui/FileUpload'
import { MilestoneNotesPanel } from '@/components/milestones/MilestoneNotesPanel'
import { MilestoneChangeLogTimeline } from '@/components/milestones/MilestoneChangeLogTimeline'

interface ProjectModalProps {
    open: boolean
    onClose: () => void
    mode: 'create' | 'edit'
    project?: Project | null
    onSuccess: () => void
    defaultProjectTypeCode?: string // Pre-select project type by code (e.g., 'MKT', 'DEV')
}

export function ProjectModal({ open, onClose, mode, project, onSuccess, defaultProjectTypeCode }: ProjectModalProps) {
    // Active Tab
    const [activeTab, setActiveTab] = useState<'info' | 'milestones' | 'deliverables' | 'payment' | 'attachments' | 'notes'>('info')

    // Attachments State
    const [attachments, setAttachments] = useState<Attachment[]>([])

    // Form State - Project Info
    const [formData, setFormData] = useState({
        project_year: new Date().getFullYear(),
        project_code: '',
        name: '',
        name_th: '',
        customer_id: '',
        prime_id: '',
        partner_id: '',
        project_manager_id: '',
        description: '',
        sold_mandays: 0,
        manday_rate: 15000,
        warranty_end_date: '',
        status_id: '',
        current_milestone_id: '',
        project_owner_id: '',
        project_type_id: '',
        project_group_id: '',
        chance_id: '',
        contract_value: 0,
        kpi_exclude_ttd: false,
        kpi_exclude_mdc: false,
        kpi_exclude_docs: false,
    })

    // Form State - Milestones
    const [milestones, setMilestones] = useState<MilestoneRow[]>([])
    const [dueDateChangeReasons, setDueDateChangeReasons] = useState<Record<string, string>>({})

    // Options from DB
    const [customers, setCustomers] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [milestoneConfigs, setMilestoneConfigs] = useState<any[]>([])
    const [deliverableConfigs, setDeliverableConfigs] = useState<any[]>([])
    const [statusConfigs, setStatusConfigs] = useState<any[]>([])
    const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
    const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([])
    const [chanceConfigs, setChanceConfigs] = useState<ChanceConfig[]>([])

    // Computed: Get selected project type settings
    const selectedProjectType = projectTypes.find(t => t.id === formData.project_type_id)
    const showMilestonesTab = selectedProjectType?.has_milestones !== false
    const showDeliverablesTab = selectedProjectType?.has_deliverables !== false
    const showPaymentTab = showMilestonesTab

    // Loading & Error
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Batch Deliverable Changes
    const [deliverableChanges, setDeliverableChanges] = useState<Record<string, any>>({})

    // Pending Deliverable Deletes (will be deleted on submit)
    const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set())

    // Computed Values
    const totalValue = formData.sold_mandays * formData.manday_rate
    const totalTTD = milestones.reduce((sum, m) => sum + (m.weight_ttd || 0), 0)
    const totalMDC = milestones.reduce((sum, m) => sum + (m.weight_mdc || 0), 0)
    const totalMandays = milestones.reduce((sum, m) => sum + (m.planned_mandays || 0), 0)
    // Validation: Allow small float diffs
    const isWeightValid = Math.abs(totalTTD - 100) < 0.1 && Math.abs(totalMDC - 100) < 0.1
    const isMandaysValid = totalMandays <= formData.sold_mandays

    // Load options on mount
    useEffect(() => {
        if (open) {
            loadOptions()
        }
    }, [open])

    // Generate project code when year changes (only if code is empty or auto-generated)
    useEffect(() => {
        if (mode === 'create' && open) {
            // Only auto-generate if user hasn't typed a custom code (rough check)
            // Actually, requirement says "Can fill manually, if not, can run to 260001"
            // So we pre-fill it. If user changes it, fine.
            handleGenerateCode(formData.project_year)
        }


    }, [formData.project_year, mode, open])

    // Fetch Project Details
    const fetchProjectDetails = async (id: string) => {
        setIsLoading(true)
        try {
            const res = await getProjectById(id)
            if (res.success && res.data) {
                const projectData = res.data
                setFormData({
                    project_year: projectData.project_year,
                    project_code: projectData.project_code,
                    name: projectData.name,
                    name_th: projectData.name_th || '',
                    customer_id: projectData.customer_id,
                    prime_id: projectData.prime_id || '',
                    partner_id: projectData.partner_id || '',
                    project_manager_id: projectData.project_manager_id,
                    description: projectData.description || '',
                    sold_mandays: projectData.sold_mandays ?? 0,
                    manday_rate: projectData.manday_rate ?? 15000,
                    warranty_end_date: projectData.warranty_end_date ? new Date(projectData.warranty_end_date).toISOString().split('T')[0] : '',
                    status_id: projectData.status_id || '',
                    current_milestone_id: projectData.current_milestone_id || '',
                    project_owner_id: projectData.project_owner_id || '',
                    project_type_id: projectData.project_type_id || '',
                    project_group_id: projectData.project_group_id || '',
                    chance_id: projectData.chance_id || '',
                    contract_value: projectData.contract_value || 0,
                    kpi_exclude_ttd: projectData.kpi_exclude_ttd === true || projectData.kpi_exclude_ttd === 1,
                    kpi_exclude_mdc: projectData.kpi_exclude_mdc === true || projectData.kpi_exclude_mdc === 1,
                    kpi_exclude_docs: projectData.kpi_exclude_docs === true || projectData.kpi_exclude_docs === 1,
                })

                if (projectData.milestones) {
                    setMilestones(projectData.milestones.map((m: any) => ({
                        id: m.id,
                        milestone_config_id: m.milestone_config_id,
                        milestone_name: m.milestone_name,
                        milestone_color: m.milestone_color,
                        weight_percent: m.weight_percent, // Legacy
                        weight_ttd: m.weight_ttd,
                        weight_mdc: m.weight_mdc,
                        payment_percent: m.payment_percent || 0,
                        due_date: m.due_date ? new Date(m.due_date).toISOString().split('T')[0] : '',
                        completed_date: m.completed_date ? new Date(m.completed_date).toISOString().split('T')[0] : '',
                        planned_mandays: m.planned_mandays,
                        actual_mandays: m.actual_mandays,
                        deliverable_ids: m.deliverable_ids || [],
                        deliverables: m.deliverables || [], // New
                        progress_percent: m.progress_percent || 0,
                        is_locked: m.is_locked,
                        is_approved: m.is_approved,
                        is_verified: m.is_verified,
                        verified_at: m.verified_at,
                        verified_by: m.verified_by,
                        support_end_date: m.support_end_date,
                        kpi_ttd_pass: m.kpi_ttd_pass,
                        kpi_mdc_pass: m.kpi_mdc_pass,
                        kpi_ttd_manual_fail: m.kpi_ttd_manual_fail === true || m.kpi_ttd_manual_fail === 1,
                        kpi_docs_manual_fail: m.kpi_docs_manual_fail === true || m.kpi_docs_manual_fail === 1,
                        sort_order: m.sort_order,
                        status: m.status,
                        // Derived UI props
                        deliverable_count: m.deliverables?.length || 0,
                        submitted_count: m.deliverables?.filter((d: any) => d.submitted_date).length || 0,
                        required_docs: m.deliverables?.filter((d: any) => d.is_required).length || 0,
                        submitted_required_docs: m.deliverables?.filter((d: any) => d.is_required && d.submitted_date).length || 0
                    })))
                }

                // Load attachments
                const attachmentsResult = await getProjectAttachments(id)
                if (attachmentsResult.success) {
                    setAttachments(attachmentsResult.data)
                }
            }
        } catch (error) {
            console.error('Failed to load project details:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Load data when edit mode
    useEffect(() => {
        if (mode === 'edit' && project && open) {
            // Initial simple populate from props to avoid flickering empty
            // Use fallback values to prevent controlled->uncontrolled switch
            setFormData(prev => ({
                ...prev,
                project_year: project.project_year ?? prev.project_year,
                project_code: project.project_code ?? prev.project_code,
                name: project.name ?? prev.name,
                customer_id: project.customer_id ?? prev.customer_id,
                project_manager_id: project.project_manager_id ?? prev.project_manager_id,
                sold_mandays: project.sold_mandays ?? prev.sold_mandays,
                manday_rate: project.manday_rate ?? prev.manday_rate,
            }))

            // Allow fetch to run
            if (project.id) fetchProjectDetails(project.id)
        } else if (mode === 'create' && open) {
            resetForm()
        }
    }, [mode, project, open])

    // Initialize milestones when milestoneConfigs are loaded (for create mode)
    useEffect(() => {
        if (mode === 'create' && open && milestoneConfigs.length > 0 && milestones.length === 0) {
            initializeMilestonesFromConfigs()
        }
    }, [milestoneConfigs, mode, open])

    const loadOptions = async () => {
        try {
            const [cust, empResult, ms, del, stat, typesResult, groupsResult, chanceResult] = await Promise.all([
                getCustomers(),
                getEmployees(),
                getMilestoneConfigs(),
                getDeliverableConfigs(),
                getProjectStatusConfigs(),
                getProjectTypes(),
                getProjectGroups(),
                getChanceConfigs(),
            ])
            setCustomers(cust)
            // Handle getEmployees returning { success, data } or array (backward compat if needed)
            if ('success' in (empResult as any)) {
                setEmployees((empResult as any).data || [])
            } else {
                setEmployees(empResult as any)
            }

            setMilestoneConfigs(ms)
            setDeliverableConfigs(del)
            setStatusConfigs(stat)

            // Load project groups
            if (groupsResult.success && groupsResult.data) {
                setProjectGroups(groupsResult.data)
            }

            // Load chance configs
            if (chanceResult.success && chanceResult.data) {
                setChanceConfigs(chanceResult.data)
            }

            // Load project types
            if (typesResult.success && typesResult.data) {
                setProjectTypes(typesResult.data)
                // Set default project type for create mode
                if (mode === 'create' && !formData.project_type_id && typesResult.data.length > 0) {
                    // Use defaultProjectTypeCode if provided, otherwise fallback to DEV
                    const typeCode = defaultProjectTypeCode || 'DEV'
                    const defaultType = typesResult.data.find(t => t.code === typeCode) || typesResult.data[0]
                    setFormData(prev => ({ ...prev, project_type_id: defaultType.id }))
                }
            }
        } catch (error) {
            console.error('Failed to load options:', error)
        }
    }

    const handleGenerateCode = async (year: number) => {
        try {
            const code = await generateProjectCode(year)
            setFormData(prev => ({ ...prev, project_code: code }))
        } catch (error) {
            console.error('Failed to generate code:', error)
        }
    }

    const resetForm = () => {
        // Get default project type - use defaultProjectTypeCode if provided
        const typeCode = defaultProjectTypeCode || 'DEV'
        const defaultType = projectTypes.find(t => t.code === typeCode) || projectTypes[0]
        setFormData({
            project_year: new Date().getFullYear(),
            project_code: '',
            name: '',
            name_th: '',
            customer_id: '',
            prime_id: '',
            partner_id: '',
            project_manager_id: '',
            description: '',
            sold_mandays: 0,
            manday_rate: 15000,
            warranty_end_date: '',
            status_id: '',
            current_milestone_id: '',
            project_owner_id: '',
            project_type_id: defaultType?.id || '',
            project_group_id: '',
            chance_id: '',
            contract_value: 0,
            kpi_exclude_ttd: false,
            kpi_exclude_mdc: false,
            kpi_exclude_docs: false,
        })
        // Initialize milestones from configs (sorted by sort_order)
        initializeMilestonesFromConfigs()
        setActiveTab('info')
        setErrors({})
        setAttachments([])
        setDueDateChangeReasons({})
    }

    // Initialize milestones from milestone_configs template
    const initializeMilestonesFromConfigs = () => {
        if (milestoneConfigs.length > 0) {
            const initialMilestones = milestoneConfigs
                .filter(config => config.is_active !== false)
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                .map(config => ({
                    milestone_config_id: config.id,
                    milestone_name: config.name,
                    milestone_color: config.color || '#6B7280',
                    weight_percent: 0,
                    weight_ttd: config.ttd_weight || 0,
                    weight_mdc: config.mdc_weight || 0,
                    due_date: '',
                    completed_date: '',
                    planned_mandays: 0,
                    actual_mandays: 0,
                    deliverable_ids: [],
                    deliverables: [],
                    progress_percent: 0,
                    is_locked: false,
                    is_approved: false,
                    kpi_ttd_pass: undefined,
                    kpi_mdc_pass: undefined,
                    sort_order: config.sort_order || 0,
                    status: undefined,
                    is_new: true
                }))
            setMilestones(initialMilestones)
        } else {
            setMilestones([])
        }
    }

    // Milestone Actions
    const handleAddMilestone = () => {
        setMilestones(prev => [...prev, {
            milestone_config_id: '',
            weight_percent: 0,
            due_date: '',
            planned_mandays: 0,
            deliverable_ids: [],
            progress_percent: 0,
        }])
    }

    const handleRemoveMilestone = (index: number) => {
        setMilestones(prev => prev.filter((_, i) => i !== index))
    }

    const handleUpdatePaymentPercent = (index: number, percent: number) => {
        setMilestones(prev => prev.map((m, i) =>
            i === index ? { ...m, payment_percent: percent } : m
        ))
    }

    const handleUpdateMilestone = (index: number, field: keyof MilestoneRow, value: any) => {
        setMilestones(prev => prev.map((m, i) =>
            i === index ? { ...m, [field]: value } : m
        ))
    }

    // Validation
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.project_code) newErrors.project_code = 'Code is required'
        if (!formData.name) newErrors.name = 'Project name is required'
        if (!formData.customer_id) newErrors.customer_id = 'Customer is required'
        if (!formData.project_manager_id) newErrors.project_manager_id = 'PM is required'
        // MKT projects don't require sold_mandays
        const isMktProject = selectedProjectType?.code === 'MKT'
        if (!isMktProject && !formData.sold_mandays) newErrors.sold_mandays = 'Sold mandays is required'
        if (!formData.manday_rate) newErrors.manday_rate = 'Rate is required'
        // if (!formData.status_id) newErrors.status_id = 'Status is required' // Removing strict check if not critical for creation

        if (milestones.length > 0 && !isWeightValid) {
            newErrors.milestones = 'Total weight must be 100%'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Submit
    const handleSubmit = async () => {
        if (!validate()) {
            // Switch to tab with errors
            if (errors.name || errors.customer_id || errors.project_manager_id || errors.sold_mandays || errors.manday_rate || errors.project_code) {
                setActiveTab('info')
            } else if (errors.milestones) {
                setActiveTab('milestones')
            }
            return
        }

        setIsLoading(true)
        try {
            const payload: ProjectFormData = {
                ...formData,
                milestones: milestones.map(m => ({
                    ...m,
                    due_date_change_reason: dueDateChangeReasons[m.milestone_config_id] || undefined
                }))
            }

            if (mode === 'create') {
                const result = await createProject(payload)
                // Save attachments after project created
                if (result.success && result.id && attachments.length > 0) {
                    await updateProjectAttachments(result.id, attachments)
                }
            } else {
                await updateProject(project!.id, payload)

                // Process batch deliverable deletes
                if (pendingDeletes.size > 0) {
                    await Promise.all(
                        Array.from(pendingDeletes).map(id =>
                            deleteProjectDeliverable(id)
                        )
                    )
                }

                // Process batch deliverable updates (skip deleted ones)
                if (Object.keys(deliverableChanges).length > 0) {
                    await Promise.all(
                        Object.entries(deliverableChanges)
                            .filter(([id]) => !pendingDeletes.has(id))
                            .map(([id, changes]) =>
                                updateDeliverable(id, changes)
                            )
                    )
                }
            }

            toast.success(mode === 'create' ? 'สร้างโครงการสำเร็จ' : 'บันทึกโครงการสำเร็จ')
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Failed to save:', error)
            const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถบันทึกโครงการได้'
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    // Get deliverable names for display
    const getDeliverableDisplay = (ids: string[]) => {
        if (ids.length === 0) return 'Select...'
        return `${ids.length} items`
    }

    if (!open) return null

    // Combobox Options
    const customerOptions = customers.map(c => ({ value: c.id, label: `[${c.code}] ${c.name}` }))
    const pmOptions = employees.map(e => ({ value: e.id, label: `${e.full_name} (${e.position_name})` }))
    const statusOptions = statusConfigs.map(s => ({ value: s.id, label: s.name }))

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-7xl mx-4 flex flex-col items-stretch h-[85vh] max-h-[95vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                    <h2 className="text-xl font-semibold">
                        {mode === 'create' ? 'Create New Project' : 'Edit Project'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b px-6 shrink-0">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        📋 Project Info
                    </button>
                    {showMilestonesTab && (
                        <button
                            onClick={() => setActiveTab('milestones')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'milestones'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            🎯 Milestones
                            {milestones.length > 0 && (
                                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${isWeightValid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {milestones.length}
                                </span>
                            )}
                        </button>
                    )}
                    {showDeliverablesTab && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('deliverables')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'deliverables'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            📄 Deliverables
                        </button>
                    )}
                    {showPaymentTab && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('payment')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'payment'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Payment Condition
                        </button>
                    )}
                    {mode === 'edit' && project?.id && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('notes')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'notes'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <MessageSquare className="w-4 h-4" />
                            Notes
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setActiveTab('attachments')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'attachments'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Paperclip className="w-4 h-4" />
                        Attachments
                        {attachments.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                {attachments.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Body - Fixed height for stability */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ═══ Tab: Project Info ═══ */}
                    <div className={`${activeTab === 'info' ? 'block' : 'hidden'} space-y-4`}>
                        {/* Using display toggle instead of conditional render to keep state if needed, but here simple conditional is fine too. 
              Actually conditional render is better for resetting validations if needed, but user asked for "No resize on switch". 
              Fixed height container above (h-[600px] or flex-1) solves the resize issue. 
          */}
                        {/* Row 1: Year, Code, Type, Status */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <SmartCombobox
                                label="Project Year"
                                required
                                placeholder="Select year"
                                options={[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => ({
                                    value: year,
                                    label: year.toString()
                                }))}
                                value={formData.project_year ? { value: formData.project_year, label: formData.project_year.toString() } : null}
                                onChange={(option) => setFormData({ ...formData, project_year: option ? Number(option.value) : new Date().getFullYear() })}
                                maxDisplayItems={7}
                            />
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Project Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_code}
                                    onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                                    readOnly={mode === 'edit'}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.project_code ? 'border-red-500' : 'border-slate-300'
                                        } ${mode === 'edit' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                                    placeholder="Enter or Auto-gen"
                                />
                                {errors.project_code && <p className="text-red-500 text-sm mt-1">{errors.project_code}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Project Type <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={formData.project_type_id}
                                        onChange={(e) => setFormData({ ...formData, project_type_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                    >
                                        <option value="">Select type</option>
                                        {projectTypes.map(type => (
                                            <option key={type.id} value={type.id}>
                                                [{type.code}] {type.name}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedProjectType && (
                                        <span
                                            className="absolute right-8 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                                            style={{ backgroundColor: selectedProjectType.color }}
                                        />
                                    )}
                                </div>
                                {selectedProjectType && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        {selectedProjectType.has_milestones ? '✓ Milestones' : '✗ Milestones'}
                                        {' • '}
                                        {selectedProjectType.has_deliverables ? '✓ Deliverables' : '✗ Deliverables'}
                                    </p>
                                )}
                            </div>
                            <SmartCombobox
                                label="Status"
                                required
                                placeholder="Select status"
                                options={[
                                    { value: '', label: 'Select status' },
                                    ...statusConfigs.map(s => ({ value: s.id, label: s.name }))
                                ]}
                                value={formData.status_id ? statusConfigs.find(s => s.id === formData.status_id) ? { value: formData.status_id, label: statusConfigs.find(s => s.id === formData.status_id)!.name } : null : { value: '', label: 'Select status' }}
                                onChange={(option) => setFormData({ ...formData, status_id: option?.value === '' ? '' : option?.value as string || '' })}
                                maxDisplayItems={10}
                            />
                        </div>

                        {/* Row 2: Project Name, Project Group, Chance */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Project Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter project name"
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                />
                                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Project Group
                                </label>
                                <select
                                    value={formData.project_group_id}
                                    onChange={(e) => setFormData({ ...formData, project_group_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                >
                                    <option value="">-- ไม่ระบุ --</option>
                                    {(() => {
                                        const topGroups = projectGroups.filter(g => g.parent_id === null)
                                        return topGroups.map(group => {
                                            const subGroups = projectGroups.filter(g => g.parent_id === group.id)
                                            if (subGroups.length === 0) {
                                                return (
                                                    <option key={group.id} value={group.id}>
                                                        {group.name}
                                                    </option>
                                                )
                                            }
                                            return (
                                                <optgroup key={group.id} label={group.name}>
                                                    {subGroups.map(sub => (
                                                        <option key={sub.id} value={sub.id}>
                                                            {sub.name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )
                                        })
                                    })()}
                                </select>
                                {(() => {
                                    const selected = projectGroups.find(g => g.id === formData.project_group_id)
                                    const parent = selected ? projectGroups.find(g => g.id === selected.parent_id) : null
                                    if (selected) {
                                        return (
                                            <p className="text-xs text-purple-500 mt-1">
                                                {parent ? `${parent.name} / ${selected.name}` : selected.name}
                                            </p>
                                        )
                                    }
                                    return null
                                })()}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Chance
                                </label>
                                <div className="relative">
                                    <select
                                        value={formData.chance_id}
                                        onChange={(e) => setFormData({ ...formData, chance_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                    >
                                        <option value="">-- ไม่ระบุ --</option>
                                        {chanceConfigs.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} ({c.percentage}%)
                                            </option>
                                        ))}
                                    </select>
                                    {(() => {
                                        const selected = chanceConfigs.find(c => c.id === formData.chance_id)
                                        if (selected) {
                                            return (
                                                <span
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: selected.color }}
                                                />
                                            )
                                        }
                                        return null
                                    })()}
                                </div>
                                {(() => {
                                    const selected = chanceConfigs.find(c => c.id === formData.chance_id)
                                    if (selected && selected.description) {
                                        return (
                                            <p className="text-xs text-slate-500 mt-1">{selected.description}</p>
                                        )
                                    }
                                    return null
                                })()}
                            </div>
                        </div>

                        {/* Row 3: Name TH - HIDDEN as per request */}
                        {/* 
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Project Name (Thai)
                </label>
                <input ... />
              </div> 
              */}

                        {/* Row 4: Customer, Prime, Partner, PM */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <SmartCombobox
                                label="Customer"
                                required
                                placeholder="Select customer"
                                options={[
                                    { value: '', label: 'Select customer' },
                                    ...customers.map(c => ({ value: c.id, label: `[${c.code}] ${c.name}` }))
                                ]}
                                value={formData.customer_id ? customers.find(c => c.id === formData.customer_id) ? { value: formData.customer_id, label: `[${customers.find(c => c.id === formData.customer_id)!.code}] ${customers.find(c => c.id === formData.customer_id)!.name}` } : null : { value: '', label: 'Select customer' }}
                                onChange={(option) => setFormData({ ...formData, customer_id: option?.value === '' ? '' : option?.value as string || '' })}
                                error={errors.customer_id}
                                maxDisplayItems={10}
                            />
                            <SmartCombobox
                                label="Prime"
                                placeholder="Select Prime"
                                options={[
                                    { value: '', label: '-- ไม่ระบุ --' },
                                    ...customers.filter(c => c.is_prime).map(c => ({ value: c.id, label: `[${c.code}] ${c.name}` }))
                                ]}
                                value={formData.prime_id ? customers.find(c => c.id === formData.prime_id) ? { value: formData.prime_id, label: `[${customers.find(c => c.id === formData.prime_id)!.code}] ${customers.find(c => c.id === formData.prime_id)!.name}` } : null : { value: '', label: '-- ไม่ระบุ --' }}
                                onChange={(option) => setFormData({ ...formData, prime_id: option?.value === '' ? '' : option?.value as string || '' })}
                                maxDisplayItems={10}
                            />
                            <SmartCombobox
                                label="Partner"
                                placeholder="Select Partner"
                                options={[
                                    { value: '', label: '-- ไม่ระบุ --' },
                                    ...customers.filter(c => c.is_partner).map(c => ({ value: c.id, label: `[${c.code}] ${c.name}` }))
                                ]}
                                value={formData.partner_id ? customers.find(c => c.id === formData.partner_id) ? { value: formData.partner_id, label: `[${customers.find(c => c.id === formData.partner_id)!.code}] ${customers.find(c => c.id === formData.partner_id)!.name}` } : null : { value: '', label: '-- ไม่ระบุ --' }}
                                onChange={(option) => setFormData({ ...formData, partner_id: option?.value === '' ? '' : option?.value as string || '' })}
                                maxDisplayItems={10}
                            />
                            <SmartCombobox
                                label="Project Manager"
                                required
                                placeholder="Select PM"
                                options={[
                                    { value: '', label: 'Select PM' },
                                    ...employees.map(e => ({ value: e.id, label: `${e.full_name}${e.position_name ? ` (${e.position_name})` : ''}` }))
                                ]}
                                value={formData.project_manager_id ? employees.find(e => e.id === formData.project_manager_id) ? { value: formData.project_manager_id, label: `${employees.find(e => e.id === formData.project_manager_id)!.full_name}${employees.find(e => e.id === formData.project_manager_id)!.position_name ? ` (${employees.find(e => e.id === formData.project_manager_id)!.position_name})` : ''}` } : null : { value: '', label: 'Select PM' }}
                                onChange={(option) => setFormData({ ...formData, project_manager_id: option?.value === '' ? '' : option?.value as string || '' })}
                                error={errors.project_manager_id}
                                maxDisplayItems={10}
                            />
                        </div>

                        {/* Row: Project Owner, Sold Mandays, Warranty End */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <SmartCombobox
                                    label="Project Owner"
                                    placeholder="Select Owner"
                                    options={[
                                        { value: '', label: 'Select Owner' },
                                        ...employees.map(e => ({ value: e.id, label: `${e.full_name}${e.position_name ? ` (${e.position_name})` : ''}` }))
                                    ]}
                                    value={formData.project_owner_id ? employees.find(e => e.id === formData.project_owner_id) ? { value: formData.project_owner_id, label: `${employees.find(e => e.id === formData.project_owner_id)!.full_name}${employees.find(e => e.id === formData.project_owner_id)!.position_name ? ` (${employees.find(e => e.id === formData.project_owner_id)!.position_name})` : ''}` } : null : { value: '', label: 'Select Owner' }}
                                    onChange={(option) => setFormData({ ...formData, project_owner_id: option?.value === '' ? '' : option?.value as string || '' })}
                                    maxDisplayItems={10}
                                />
                                <p className="text-xs text-slate-500 mt-1">ผู้รับผิดชอบหลักของโครงการ</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Sold Mandays <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.sold_mandays}
                                    onChange={(e) => setFormData({ ...formData, sold_mandays: parseFloat(e.target.value) || 0 })}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.sold_mandays ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                />
                                <p className="text-xs text-slate-500 mt-1">จำนวนวันทำงาน</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Warranty End
                                </label>
                                <input
                                    type="date"
                                    value={formData.warranty_end_date}
                                    onChange={(e) => setFormData({ ...formData, warranty_end_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">หลัง Go-Live</p>
                            </div>
                        </div>

                        {/* Row: Contract Value */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    มูลค่าโครงการ (บาท)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.contract_value}
                                    onChange={(e) => setFormData({ ...formData, contract_value: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                                <p className="text-xs text-slate-500 mt-1">Contract Value (Sync จาก MKT สุทธิ)</p>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the project..."
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        {/* Hidden/Commented Fields */}
                        {/* 
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Manday Rate (THB) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.manday_rate}
                                    onChange={(e) => setFormData({ ...formData, manday_rate: parseFloat(e.target.value) || 0 })}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.manday_rate ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                />
                                <p className="text-xs text-slate-500 mt-1">อัตราต่อวัน</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Total Value (THB)
                                </label>
                                <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 font-semibold truncate">
                                    {totalValue.toLocaleString()}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">คำนวณอัตโนมัติ</p>
                            </div> 
                        </div>
                        */}
                    </div>

                    {/* ═══ Tab: Milestones ═══ */}
                    <div className={`${activeTab === 'milestones' ? 'block' : 'hidden'} space-y-4`}>
                        {mode === 'edit' && project && (
                            <div className="flex justify-between items-center bg-blue-50 px-4 py-2 rounded-md border border-blue-100 mb-2">
                                <div className="text-sm text-blue-700">
                                    <strong>Project Progress:</strong> {project.progress_percent || 0}%
                                </div>
                            </div>
                        )}

                        <MilestonesTab
                            milestones={milestones}
                            setMilestones={setMilestones}
                            milestoneConfigs={milestoneConfigs}
                            currentMilestoneId={formData.current_milestone_id}
                            onCurrentMilestoneChange={(id) => setFormData({ ...formData, current_milestone_id: id })}
                            projectId={project?.id}
                            dueDateChangeReasons={dueDateChangeReasons}
                            onDueDateChangeReasons={setDueDateChangeReasons}
                        />
                    </div>

                    {/* ═══ Tab: Deliverables ═══ */}
                    <div className={`${activeTab === 'deliverables' ? 'block' : 'hidden'} space-y-4`}>
                        <DeliverablesTab
                            milestones={milestones}
                            deliverableConfigs={deliverableConfigs}
                            onRefresh={() => {
                                if (project?.id) fetchProjectDetails(project.id)
                            }}
                            deliverableChanges={deliverableChanges}
                            onDeliverableChange={(id, field, value) => {
                                setDeliverableChanges(prev => ({
                                    ...prev,
                                    [id]: {
                                        ...prev[id],
                                        [field]: value
                                    }
                                }))
                            }}
                            pendingDeletes={pendingDeletes}
                            onMarkDelete={(id, name) => {
                                setPendingDeletes(prev => new Set([...prev, id]))
                            }}
                        />
                    </div>

                    {/* ═══ Tab: Payment Condition ═══ */}
                    <div className={`${activeTab === 'payment' ? 'block' : 'hidden'} space-y-4`}>
                        <PaymentConditionTab
                            milestones={milestones}
                            contractValue={formData.contract_value}
                            onUpdatePaymentPercent={handleUpdatePaymentPercent}
                        />
                    </div>

                    {/* ═══ Tab: Notes ═══ */}
                    <div className={`${activeTab === 'notes' ? 'block' : 'hidden'}`}>
                        {/* KPI Exclude Checkboxes */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                            <label className="block text-sm font-medium text-amber-800 mb-2">
                                ไม่คิด KPI (ยกเว้นโครงการนี้จากการคำนวณ KPI)
                            </label>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.kpi_exclude_ttd}
                                        onChange={(e) => setFormData({ ...formData, kpi_exclude_ttd: e.target.checked })}
                                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="text-sm text-slate-700">Time to Delivery (TTD)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.kpi_exclude_mdc}
                                        onChange={(e) => setFormData({ ...formData, kpi_exclude_mdc: e.target.checked })}
                                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="text-sm text-slate-700">Man-day Control (MDC)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.kpi_exclude_docs}
                                        onChange={(e) => setFormData({ ...formData, kpi_exclude_docs: e.target.checked })}
                                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="text-sm text-slate-700">Docs On-time</span>
                                </label>
                            </div>
                        </div>

                        {project?.id && (
                            <div className="space-y-4">
                                <MilestoneNotesPanel projectId={project.id} />
                                <div className="border-t pt-4">
                                    <MilestoneChangeLogTimeline projectId={project.id} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ Tab: Attachments ═══ */}
                    <div className={`${activeTab === 'attachments' ? 'block' : 'hidden'} space-y-4`}>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-blue-700">
                                อัปโหลดไฟล์แนบสำหรับโครงการนี้ รองรับไฟล์ภาพ, PDF, Word, Excel (สูงสุด 10 ไฟล์, ไม่เกิน 10MB ต่อไฟล์)
                                {mode === 'create' && (
                                    <span className="block mt-1 text-blue-600 font-medium">
                                        * ไฟล์จะถูกบันทึกเมื่อกด Create Project
                                    </span>
                                )}
                            </p>
                        </div>
                        <FileUpload
                            value={attachments}
                            onChange={async (files) => {
                                setAttachments(files)
                                // Auto-save attachments immediately in edit mode
                                if (mode === 'edit' && project?.id) {
                                    await updateProjectAttachments(project.id, files)
                                }
                            }}
                            maxFiles={10}
                            maxSizeMB={10}
                            subFolder={mode === 'edit' ? `projects/${project?.project_code || 'unknown'}` : `projects/temp-${Date.now()}`}
                            label=""
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-6 py-4 border-t bg-slate-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Project' : 'Update Project'}
                        </button>
                    </div>
                </div>
            </div>
        </div >
    )
}
