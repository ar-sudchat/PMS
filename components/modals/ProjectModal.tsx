'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, FileText, Check, AlertCircle } from 'lucide-react'
import { Project, ProjectFormData } from '@/types/project'
import {
    getCustomers,
    getEmployees,
    getMilestoneConfigs,
    getDeliverableConfigs,
    getProjectStatusConfigs,
    createProject,
    updateProject,
    generateProjectCode
} from '@/lib/actions/project-actions'
import { SmartCombobox } from '@/components/shared/SmartCombobox/SmartCombobox'

interface ProjectModalProps {
    open: boolean
    onClose: () => void
    mode: 'create' | 'edit'
    project?: Project | null
    onSuccess: () => void
}

interface MilestoneRow {
    id?: string
    milestone_config_id: string
    weight_percent: number
    due_date: string
    planned_mandays: number
    deliverable_ids: string[]
}

export function ProjectModal({ open, onClose, mode, project, onSuccess }: ProjectModalProps) {
    // Active Tab
    const [activeTab, setActiveTab] = useState<'info' | 'milestones'>('info')

    // Form State - Project Info
    const [formData, setFormData] = useState({
        project_year: new Date().getFullYear(),
        project_code: '',
        name: '',
        name_th: '',
        customer_id: '',
        project_manager_id: '',
        description: '',
        sold_mandays: 0,
        manday_rate: 15000,
        warranty_end_date: '',
        status_id: '',
        current_milestone_id: '',
    })

    // Form State - Milestones
    const [milestones, setMilestones] = useState<MilestoneRow[]>([])

    // Options from DB
    const [customers, setCustomers] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [milestoneConfigs, setMilestoneConfigs] = useState<any[]>([])
    const [deliverableConfigs, setDeliverableConfigs] = useState<any[]>([])
    const [statusConfigs, setStatusConfigs] = useState<any[]>([])

    // Loading & Error
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Computed Values
    const totalValue = formData.sold_mandays * formData.manday_rate
    const totalWeight = milestones.reduce((sum, m) => sum + (m.weight_percent || 0), 0)
    const totalMandays = milestones.reduce((sum, m) => sum + (m.planned_mandays || 0), 0)
    const isWeightValid = Math.abs(totalWeight - 100) < 0.01 // Close enough for float math
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

    // Load data when edit mode
    useEffect(() => {
        if (mode === 'edit' && project && open) {
            setFormData({
                project_year: project.project_year,
                project_code: project.project_code,
                name: project.name,
                name_th: project.name_th || '',
                customer_id: project.customer_id,
                project_manager_id: project.project_manager_id,
                description: project.description || '',
                sold_mandays: project.sold_mandays,
                manday_rate: project.manday_rate,
                warranty_end_date: project.warranty_end_date ? new Date(project.warranty_end_date).toISOString().split('T')[0] : '', // Format date for input
                status_id: project.status_id || '',
                current_milestone_id: project.current_milestone_id || '',
            })
            if (project.milestones) {
                setMilestones(project.milestones.map(m => ({
                    id: m.id,
                    milestone_config_id: m.milestone_config_id,
                    weight_percent: m.weight_percent,
                    due_date: m.due_date ? new Date(m.due_date).toISOString().split('T')[0] : '',
                    planned_mandays: m.planned_mandays,
                    deliverable_ids: m.deliverable_ids || []
                })))
            }
        } else if (mode === 'create' && open) {
            resetForm()
        }
    }, [mode, project, open])

    const loadOptions = async () => {
        try {
            const [cust, emp, ms, del, stat] = await Promise.all([
                getCustomers(),
                getEmployees(),
                getMilestoneConfigs(),
                getDeliverableConfigs(),
                getProjectStatusConfigs(),
            ])
            setCustomers(cust)
            setEmployees(emp)
            setMilestoneConfigs(ms)
            setDeliverableConfigs(del)
            setStatusConfigs(stat)
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
        setFormData({
            project_year: new Date().getFullYear(),
            project_code: '',
            name: '',
            name_th: '',
            customer_id: '',
            project_manager_id: '',
            description: '',
            sold_mandays: 0,
            manday_rate: 15000,
            warranty_end_date: '',
            status_id: '',
            current_milestone_id: '',
        })
        // Start with 4 empty milestone rows
        setMilestones([
            { milestone_config_id: '', weight_percent: 0, due_date: '', planned_mandays: 0, deliverable_ids: [] },
            { milestone_config_id: '', weight_percent: 0, due_date: '', planned_mandays: 0, deliverable_ids: [] },
            { milestone_config_id: '', weight_percent: 0, due_date: '', planned_mandays: 0, deliverable_ids: [] },
            { milestone_config_id: '', weight_percent: 0, due_date: '', planned_mandays: 0, deliverable_ids: [] },
        ])
        setActiveTab('info')
        setErrors({})
    }

    // Milestone Actions
    const handleAddMilestone = () => {
        setMilestones(prev => [...prev, {
            milestone_config_id: '',
            weight_percent: 0,
            due_date: '',
            planned_mandays: 0,
            deliverable_ids: [],
        }])
    }

    const handleRemoveMilestone = (index: number) => {
        setMilestones(prev => prev.filter((_, i) => i !== index))
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
        if (!formData.sold_mandays) newErrors.sold_mandays = 'Sold mandays is required'
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
            const payload: ProjectFormData = { ...formData, milestones }

            if (mode === 'create') {
                await createProject(payload)
            } else {
                await updateProject(project!.id, payload)
            }

            onSuccess()
            onClose()
        } catch (error) {
            console.error('Failed to save:', error)
            setErrors({ submit: 'Failed to save project' })
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
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 flex flex-col items-stretch h-[85vh] max-h-[95vh]">

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
                </div>

                {/* Body - Fixed height for stability */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ═══ Tab: Project Info ═══ */}
                    <div className={`${activeTab === 'info' ? 'block' : 'hidden'} space-y-4`}>
                        {/* Using display toggle instead of conditional render to keep state if needed, but here simple conditional is fine too. 
              Actually conditional render is better for resetting validations if needed, but user asked for "No resize on switch". 
              Fixed height container above (h-[600px] or flex-1) solves the resize issue. 
          */}
                        {/* Row 1: Year, Code, Status */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Project Year <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.project_year}
                                    onChange={(e) => setFormData({ ...formData, project_year: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Project Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_code}
                                    onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.project_code ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    placeholder="Enter or Auto-gen"
                                />
                                {errors.project_code && <p className="text-red-500 text-sm mt-1">{errors.project_code}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Status <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.status_id}
                                    onChange={(e) => setFormData({ ...formData, status_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select status</option>
                                    {statusConfigs.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Row 2: Name EN */}
                        <div>
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

                        {/* Row 3: Name TH - HIDDEN as per request */}
                        {/* 
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Project Name (Thai)
                </label>
                <input ... />
              </div> 
              */}

                        {/* Row 4: Customer & PM */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Customer <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.customer_id}
                                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.customer_id ? 'border-red-500' : 'border-slate-300'}`}
                                >
                                    <option value="">Select customer</option>
                                    {customers.map((c: any) => (
                                        <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                                    ))}
                                </select>
                                {errors.customer_id && <p className="text-red-500 text-sm mt-1">{errors.customer_id}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Project Manager <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.project_manager_id}
                                    onChange={(e) => setFormData({ ...formData, project_manager_id: e.target.value })}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.project_manager_id ? 'border-red-500' : 'border-slate-300'}`}
                                >
                                    <option value="">Select PM</option>
                                    {employees.map((e: any) => (
                                        <option key={e.id} value={e.id}>{e.full_name} {e.position_name ? `(${e.position_name})` : ''}</option>
                                    ))}
                                </select>
                                {errors.project_manager_id && <p className="text-red-500 text-sm mt-1">{errors.project_manager_id}</p>}
                            </div>
                        </div>

                        {/* Row 4.5: Project Owner */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Project Owner
                            </label>
                            <select
                                value={(formData as any).project_owner_id || ''}
                                onChange={(e) => setFormData({ ...formData, project_owner_id: e.target.value } as any)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Owner</option>
                                {employees.map((e: any) => (
                                    <option key={e.id} value={e.id}>{e.full_name} {e.position_name ? `(${e.position_name})` : ''}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">ผู้รับผิดชอบหลักของโครงการ (SA/BA/Dev)</p>
                        </div>

                        {/* Row 5: Description */}
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

                        {/* Divider */}
                        <hr className="my-2" />

                        {/* Row 6: Mandays & Pricing */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    </div>

                    {/* ═══ Tab: Milestones ═══ */}
                    <div className={`${activeTab === 'milestones' ? 'block' : 'hidden'} space-y-4`}>
                        {/* Header Row */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Current Milestone:</label>
                                <select
                                    value={formData.current_milestone_id}
                                    onChange={(e) => setFormData({ ...formData, current_milestone_id: e.target.value })}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-full md:w-auto"
                                >
                                    <option value="">Not started</option>
                                    {milestones.map((m, i) => {
                                        const config = milestoneConfigs.find((c: any) => c.id === m.milestone_config_id)
                                        return config ? (
                                            <option key={i} value={m.id || `temp-${i}`}>{config.name}</option>
                                        ) : null
                                    })}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Remove Auto Distribute MD button as requested */}
                                <button
                                    type="button"
                                    onClick={handleAddMilestone}
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" /> Add Milestone
                                </button>
                            </div>
                        </div>

                        {/* Milestone Table */}
                        <div className="border border-slate-200 rounded-lg">
                            <table className="w-full min-w-[700px]">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Milestone</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-24">Weight (%)</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-36">Due Date</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-24">Mandays</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-32">Deliverables</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {milestones.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                                <p>No milestones added</p>
                                                <button
                                                    type="button"
                                                    onClick={handleAddMilestone}
                                                    className="mt-2 text-blue-600 hover:underline text-sm"
                                                >
                                                    + Add your first milestone
                                                </button>
                                            </td>
                                        </tr>
                                    ) : (
                                        milestones.map((milestone, index) => (
                                            <tr key={index} className="hover:bg-slate-50">
                                                {/* Milestone Select */}
                                                <td className="px-4 py-2">
                                                    <select
                                                        value={milestone.milestone_config_id}
                                                        onChange={(e) => handleUpdateMilestone(index, 'milestone_config_id', e.target.value)}
                                                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                                    >
                                                        <option value="">Select milestone</option>
                                                        {milestoneConfigs.map((mc: any) => (
                                                            <option key={mc.id} value={mc.id}>
                                                                {mc.name} - {mc.name_th}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                {/* Weight */}
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={milestone.weight_percent}
                                                        onChange={(e) => handleUpdateMilestone(index, 'weight_percent', parseFloat(e.target.value) || 0)}
                                                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-center"
                                                        min="0"
                                                        max="100"
                                                    />
                                                </td>

                                                {/* Due Date */}
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="date"
                                                        value={milestone.due_date}
                                                        onChange={(e) => handleUpdateMilestone(index, 'due_date', e.target.value)}
                                                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                                    />
                                                </td>

                                                {/* Mandays */}
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={milestone.planned_mandays}
                                                        onChange={(e) => handleUpdateMilestone(index, 'planned_mandays', parseFloat(e.target.value) || 0)}
                                                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-center"
                                                        min="0"
                                                    />
                                                </td>

                                                {/* Deliverables */}
                                                <td className="px-4 py-2">
                                                    <div className="relative group">
                                                        <button
                                                            type="button"
                                                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-left flex items-center justify-between hover:bg-slate-50"
                                                        >
                                                            <span>{getDeliverableDisplay(milestone.deliverable_ids)}</span>
                                                            <FileText className="w-4 h-4 text-slate-400" />
                                                        </button>
                                                        {/* Simple Dropdown for Multi-select */}
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg hidden group-hover:block z-50">
                                                            <div className="p-2 max-h-48 overflow-y-auto">
                                                                {deliverableConfigs.map((dc: any) => (
                                                                    <label key={dc.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={milestone.deliverable_ids.includes(dc.id)}
                                                                            onChange={(e) => {
                                                                                const current = milestone.deliverable_ids;
                                                                                const updated = e.target.checked
                                                                                    ? [...current, dc.id]
                                                                                    : current.filter(id => id !== dc.id);
                                                                                handleUpdateMilestone(index, 'deliverable_ids', updated)
                                                                            }}
                                                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                        />
                                                                        <span className="text-xs text-slate-700">{dc.name}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Delete */}
                                                <td className="px-4 py-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMilestone(index)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary */}
                        {milestones.length > 0 && (
                            <div className={`p-3 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${isWeightValid && isMandaysValid
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-amber-50 border border-amber-200'
                                }`}>
                                <div className="flex items-center gap-6 text-sm">
                                    <span className="text-slate-600">
                                        <strong>{milestones.length}</strong> Milestones
                                    </span>
                                    <span className={isWeightValid ? 'text-green-700' : 'text-amber-700'}>
                                        Weight: <strong>{totalWeight}%</strong>
                                        {isWeightValid ? (
                                            <Check className="w-4 h-4 inline ml-1" />
                                        ) : (
                                            <span className="ml-1">(must be 100%)</span>
                                        )}
                                    </span>
                                    <span className={isMandaysValid ? 'text-green-700' : 'text-amber-700'}>
                                        Mandays: <strong>{totalMandays}</strong> / {formData.sold_mandays}
                                        {isMandaysValid && <Check className="w-4 h-4 inline ml-1" />}
                                    </span>
                                </div>
                                {isWeightValid && isMandaysValid ? (
                                    <span className="text-green-700 text-sm flex items-center gap-1">
                                        <Check className="w-4 h-4" /> Valid
                                    </span>
                                ) : (
                                    <span className="text-amber-700 text-sm flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" /> Please check values
                                    </span>
                                )}
                            </div>
                        )}

                        {errors.milestones && (
                            <p className="text-red-500 text-sm">{errors.milestones}</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50 shrink-0">
                    <div>
                        {errors.submit && (
                            <p className="text-red-500 text-sm">{errors.submit}</p>
                        )}
                    </div>
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
        </div>
    )
}
