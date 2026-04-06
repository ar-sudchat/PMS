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
    prime_id?: string
    prime_code?: string
    prime_name?: string
    partner_id?: string
    partner_code?: string
    partner_name?: string
    project_manager_id: string
    project_manager_name?: string
    project_owner_id?: string
    project_owner_name?: string
    project_owner_position?: string
    project_type_id?: string
    project_type_code?: string
    project_type_name?: string
    project_type_color?: string
    project_group_id?: string
    project_group_code?: string
    project_group_name?: string
    project_group_color?: string
    project_group_parent_name?: string
    chance_id?: string
    chance_code?: string
    chance_name?: string
    chance_color?: string
    chance_percentage?: number
    sold_mandays: number
    manday_rate: number
    total_value: number
    contract_value?: number
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

    // Payment condition
    payment_percent?: number

    // New fields
    weight_ttd?: number
    weight_mdc?: number
    is_approved?: boolean
    is_locked?: boolean
    approved_at?: string
    kpi_ttd_pass?: boolean
    kpi_mdc_pass?: boolean
    kpi_docs_pass?: boolean
    kpi_ttd_manual_fail?: boolean

    // Verification (new)
    is_verified?: boolean
    verified_at?: string
    verified_by?: string
    support_end_date?: string

    // UI state
    will_approve?: boolean
    will_verify?: boolean

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

    // Verified Status
    is_verified?: boolean
    verified_at?: string
    verified_by?: string
}

export interface MilestoneRow extends ProjectMilestone {
    // Extended properties for UI usage if any
    deliverable_count?: number
    submitted_count?: number
    required_docs?: number
    submitted_required_docs?: number
    required_docs_pass?: boolean
    is_new?: boolean // Flag for newly created milestones (not yet saved to DB)
    note_count?: number
    open_issue_count?: number
}

export interface MilestoneNote {
    id: string
    project_id: string
    milestone_id?: string | null
    milestone_name?: string
    note_type: 'NOTE' | 'ISSUE' | 'RESOLUTION'
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
    content: string
    resolved_at?: string | null
    resolved_by?: string | null
    resolved_by_name?: string | null
    is_active: boolean
    created_by: string
    created_by_name?: string
    created_at: string
    updated_at: string
}

export interface MilestoneChangeLog {
    id: string
    project_id: string
    milestone_id: string
    milestone_name?: string
    change_type: string
    old_value?: string | null
    new_value?: string | null
    reason: string
    changed_by: string
    changed_by_name?: string
    changed_at: string
}

export interface ProjectFormData {
    project_code: string
    project_year: number
    name: string
    name_th?: string
    description?: string
    customer_id: string
    prime_id?: string
    partner_id?: string
    project_manager_id: string
    project_owner_id?: string
    project_type_id?: string
    project_group_id?: string
    chance_id?: string
    sold_mandays: number
    manday_rate: number
    contract_value?: number
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

        // Payment condition
        payment_percent?: number

        // New fields
        weight_ttd?: number
        weight_mdc?: number
        completed_date?: string
        is_locked?: boolean
        is_approved?: boolean
        will_approve?: boolean

        // Verification
        is_verified?: boolean
        will_verify?: boolean

        // KPI manual flags
        kpi_ttd_manual_fail?: boolean

        // Due date change tracking
        due_date_change_reason?: string
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
    description?: string
    milestone_config_id?: string
    milestone_name?: string
    sort_order: number
    is_required: boolean
    is_active?: boolean
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
