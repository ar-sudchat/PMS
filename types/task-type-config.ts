
export interface TaskTypeConfig {
    id: string
    code: string
    name: string
    is_countable_for_kpi: boolean
    kpi_category: string | null
    is_defect: boolean
    sort_order: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface TaskTypeConfigFormData {
    code: string
    name: string
    is_countable_for_kpi: boolean
    kpi_category?: string
    is_defect: boolean
    sort_order?: number
    is_active: boolean
}
