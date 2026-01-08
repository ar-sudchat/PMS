export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked';
export type ActivityCategory = 'project' | 'non-project';

export interface ActivityCode {
    id: string;
    code: string; // DEV, TEST, MTG
    name: string; // Development, Testing, Meeting
    category: ActivityCategory;
    description?: string;
    is_billable_default: boolean;
    color?: string;
    sort_order: number;
    is_active: boolean;
}

export interface ProjectPhase {
    id: string;
    project_id: string;
    code: string; // PH1, PH2
    name: string; // Analysis, Design, Development
    planned_start_date?: string;
    planned_end_date?: string;
    actual_start_date?: string;
    actual_end_date?: string;
    planned_hours: number;
    actual_hours: number;
    status: 'not_started' | 'in_progress' | 'completed';
    sort_order: number;
}

export interface ProjectTask {
    id: string;
    project_id: string;
    phase_id?: string;
    name: string;
    status: 'todo' | 'in_progress' | 'done';
}

export interface TimesheetEntry {
    id: string;

    // WHO
    employee_id: string;
    employee_name?: string;
    project_role?: string;

    // WHAT
    project_id: string;
    project_name?: string;
    phase_id?: string;
    phase_name?: string;
    task_id?: string;
    task_name?: string;
    activity_code: string; // FK to ActivityCode code
    activity_name?: string;
    work_description: string;
    work_product?: string;

    // WHEN
    work_date: string; // YYYY-MM-DD
    start_time?: string; // HH:mm
    end_time?: string; // HH:mm
    duration_hours: number; // calculated or manual
    mandays: number; // hours / 8

    // KPI CATEGORY
    work_type: 'normal' | 'defect_fix' | 'rework' | 'post_golive' | 'support';
    is_defect_fix: boolean;
    is_post_golive: boolean;
    milestone_id?: string;
    defect_id?: string;

    // HOW MUCH
    planned_hours?: number;
    actual_hours: number; // Same as duration typically, but explicit
    remaining_hours?: number;
    progress_percent?: number;

    // CATEGORY
    is_billable: boolean;
    is_overtime: boolean;
    overtime_type?: 'OT1' | 'OT1.5' | 'OT2' | 'OT3';
    cost_center?: string;

    // APPROVAL
    status: TimesheetStatus;
    submitted_at?: string;
    submitted_by?: string;
    approved_at?: string;
    approved_by?: string;
    rejected_reason?: string;

    // META
    remarks?: string;
    created_at: string;
    updated_at: string;
}

export interface WeeklyTimesheet {
    id: string;
    employee_id: string;
    week_start_date: string; // Monday
    week_end_date: string; // Sunday
    week_number: number;
    year: number;

    // Summary
    total_planned_hours: number;
    total_actual_hours: number;
    total_billable_hours: number;
    total_non_billable_hours: number;
    total_overtime_hours: number;

    // Status
    status: TimesheetStatus;
    submitted_at?: string;
    approved_at?: string;
    approved_by?: string;

    // Entries
    entries: TimesheetEntry[];
}
