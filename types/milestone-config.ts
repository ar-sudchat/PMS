
export interface MilestoneConfig {
    id: string
    code: string
    name: string
    name_th: string | null
    description: string | null
    color: string
    icon: string | null
    kpi_weight_ttd: number
    kpi_weight_mdc: number
    // Database column names (for milestone weight defaults)
    default_weight_ttd?: number
    default_weight_mdc?: number
    // Alias names (from query) - for frontend compatibility
    ttd_weight?: number
    mdc_weight?: number
    sort_order: number
    is_active: boolean
    is_go_live: boolean
    is_post_go_live: boolean
    created_at: string
    updated_at: string
}

export interface MilestoneConfigFormData {
    code: string
    name: string
    name_th?: string
    description?: string
    color?: string
    icon?: string
    sort_order?: number
    is_active: boolean
    kpi_weight_ttd?: number
    kpi_weight_mdc?: number
    is_go_live?: boolean
    is_post_go_live?: boolean
}
