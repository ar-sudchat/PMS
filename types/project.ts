export interface Project {
    id: string
    project_code: string
    project_year: number
    name: string
    name_th?: string
    description?: string
    customer_id: string
    customer_code?: string
    customer_name?: string
    project_manager_id: string
    project_manager_name?: string
    project_owner_id?: string
    project_owner_name?: string
    project_owner_position?: string
    sold_mandays: number
    manday_rate: number
    total_value: number
    warranty_end_date?: string
    status_id?: string
    status_code?: string
    status_name?: string
    status_color?: string
    current_milestone_id?: string
    current_milestone_name?: string
    milestone_count?: number
    completed_milestone_count?: number
    progress_percent?: number
    is_active: boolean
    created_at: string
    updated_at: string
    milestones?: ProjectMilestone[]
}

export interface ProjectMilestone {
    id?: string
    project_id?: string
    milestone_config_id: string
    milestone_code?: string
    milestone_name?: string
    milestone_color?: string
    planned_mandays: number
    weight_percent: number // Legacy
    progress_percent?: number
    due_date?: string
    actual_mandays?: number
    completed_date?: string
    status?: 'pending' | 'in_progress' | 'completed'
    sort_order?: number
    deliverable_ids: string[]

    // New fields
    weight_ttd?: number
    weight_mdc?: number
    is_approved?: boolean
    is_locked?: boolean
    approved_at?: string
    kpi_ttd_pass?: boolean
    kpi_mdc_pass?: boolean
    kpi_docs_pass?: boolean

    // UI state
    will_approve?: boolean

    // Detailed Deliverables
    deliverables?: ProjectDeliverable[]
}

export interface ProjectDeliverable {
    id: string
    project_milestone_id: string
    deliverable_config_id?: string
    name: string
    description?: string
    is_required: boolean
    submitted_date?: string
    submitted_by?: string
    file_name?: string
    file_path?: string
    file_size?: number
    is_on_time?: boolean
    is_locked: boolean
    sort_order: number
    is_active: boolean
    status?: 'pending' | 'submitted' | 'approved' | 'rejected' // Virtual status
}

export interface MilestoneRow extends ProjectMilestone {
    // Extended properties for UI usage if any
    deliverable_count?: number
    submitted_count?: number
    required_docs_pass?: boolean
}

export interface ProjectFormData {
    project_code: string
    project_year: number
    name: string
    name_th?: string
    description?: string
    customer_id: string
    project_manager_id: string
    project_owner_id?: string
    sold_mandays: number
    manday_rate: number
    warranty_end_date?: string
    status_id?: string
    current_milestone_id?: string
    milestones: {
        milestone_config_id: string
        weight_percent: number
        progress_percent?: number
        due_date?: string
        planned_mandays: number
        deliverable_ids: string[]

        // New fields
        weight_ttd?: number
        weight_mdc?: number
        completed_date?: string
        is_locked?: boolean
        is_approved?: boolean
        will_approve?: boolean
    }[]
}

export interface MilestoneConfig {
    id: string
    code: string
    name: string
    name_th?: string
    color: string
    sort_order: number
}

export interface DeliverableConfig {
    id: string
    code: string
    name: string
    name_th?: string
    sort_order: number
}

export interface ProjectStatusConfig {
    id: string
    code: string
    name: string
    name_th?: string
    color: string
    is_final: boolean
    sort_order: number
}
