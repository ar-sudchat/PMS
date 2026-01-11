
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
    sort_order: number
    is_active: boolean
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
}
