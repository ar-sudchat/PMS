// types/resource-planning.ts

// ============================================
// Employee Capacity Config
// ============================================

export interface EmployeeCapacity {
    employee_id: string;
    employee_name: string;
    position: string;
    position_code: 'PM' | 'SA' | 'BA' | 'PG';

    // Working Hours Config
    working_hours_per_day: number;    // e.g., 8
    working_days_per_week: number;    // e.g., 5

    // Skills
    skills: string[];

    // Leave/Holiday (ลาหยุด)
    leave_dates: string[];            // ["2025-02-10", "2025-02-11"]
}

// ============================================
// Task Assignment
// ============================================

export interface TaskAssignment {
    id: string;
    task_id: string;
    task_title: string;
    project_id: string;
    project_name: string;
    activity_id: string;

    // Assignee
    assignee_id: string;
    assignee_name: string;

    // Time Allocation
    planned_start_date: string;
    planned_end_date: string;
    allocated_hours: number;
    allocated_mandays: number;

    // Daily Breakdown
    daily_hours: Record<string, number>;  // { "2025-02-03": 8, "2025-02-04": 4, ... }

    // Status
    status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
    priority: 'low' | 'medium' | 'high' | 'urgent';

    // Flags
    is_overtime: boolean;
    is_urgent: boolean;
}

// ============================================
// Daily Capacity Calculation
// ============================================

export interface DailyCapacity {
    date: string;
    day_of_week: string;              // "Mon", "Tue", etc.
    is_working_day: boolean;
    is_holiday: boolean;
    is_leave: boolean;

    // Hours
    total_capacity: number;           // e.g., 8
    allocated_hours: number;          // e.g., 6
    available_hours: number;          // e.g., 2
    overtime_hours: number;           // e.g., 0

    // Tasks on this day
    tasks: {
        task_id: string;
        task_title: string;
        project_name: string;
        hours: number;
        color: string;
    }[];

    // Status
    utilization_percent: number;      // e.g., 75
    status: 'available' | 'busy' | 'full' | 'overloaded' | 'leave';
}

// ============================================
// Employee Weekly/Monthly Capacity
// ============================================

export interface EmployeeCapacityView {
    employee: EmployeeCapacity;
    period_start: string;
    period_end: string;

    // Summary
    total_capacity_hours: number;
    total_allocated_hours: number;
    total_available_hours: number;
    utilization_percent: number;

    // Daily breakdown
    daily_capacities: DailyCapacity[];

    // Assigned tasks in this period
    assignments: TaskAssignment[];

    // Status
    status: 'available' | 'optimal' | 'busy' | 'overloaded';
    warnings: string[];
}

// ============================================
// Resource Suggestion
// ============================================

export interface ResourceSuggestion {
    employee_id: string;
    employee_name: string;
    position_code: string;

    // Availability
    available_hours: number;
    available_days: number;

    // Skill Match
    skill_match_percent: number;
    matching_skills: string[];
    missing_skills: string[];

    // Fit Score
    fit_score: number;                // 0-100

    // Recommendation
    recommendation: 'highly_recommended' | 'recommended' | 'possible' | 'not_recommended';
    reason: string;

    // Allocation Options
    allocation_options: {
        option: string;                 // "Full allocation", "Partial + extend timeline"
        hours: number;
        days: number;
        requires_overtime: boolean;
        requires_timeline_change: boolean;
    }[];
}

// ============================================
// Conflict Detection
// ============================================

export interface ResourceConflict {
    type: 'overload' | 'double_booking' | 'skill_mismatch' | 'timeline_overlap';
    severity: 'warning' | 'error';
    employee_id: string;
    employee_name: string;
    date?: string;

    // Details
    message: string;
    affected_tasks: {
        task_id: string;
        task_title: string;
        project_name: string;
    }[];

    // Suggestion
    suggested_action: string;
}

// ============================================
// Task Movement / Reassignment
// ============================================

export interface TaskReassignment {
    id: string;
    task_id: string;
    task_title: string;

    // Project & Activity context
    project_id: string;
    project_name: string;
    activity_id: string;
    activity_name: string;
    activity_owner_id: string;
    activity_owner_name: string;

    // Assignment change
    from_employee_id: string;
    from_employee_name: string;
    to_employee_id: string;
    to_employee_name: string;

    // Date change
    original_start_date: string;
    original_end_date: string;
    new_start_date: string;
    new_end_date: string;

    // Reason & Meta
    reason: 'load_balancing' | 'skill_match' | 'availability' | 'urgent' | 'request' | 'other';
    reason_note?: string;
    requested_by_id: string;
    requested_by_name: string;
    requested_at: string;

    // Status
    status: 'pending' | 'approved' | 'rejected' | 'acknowledged';

    // Impact Analysis
    impact: TaskReassignmentImpact;
}

export interface TaskReassignmentImpact {
    // Skill Analysis
    skill_match: {
        required_skills: string[];
        new_assignee_skills: string[];
        matching_skills: string[];
        missing_skills: string[];
        match_percent: number;
    };

    // Timeline Impact
    timeline_impact: {
        activity_due_date: string;
        task_due_date: string;
        estimated_completion: string;
        days_difference: number;
        is_at_risk: boolean;
    };

    // Workload Impact
    workload_impact: {
        from_employee_utilization_before: number;
        from_employee_utilization_after: number;
        to_employee_utilization_before: number;
        to_employee_utilization_after: number;
        is_to_employee_overloaded: boolean;
    };

    // Warnings
    warnings: {
        type: 'skill_gap' | 'timeline_risk' | 'overload' | 'dependency';
        severity: 'info' | 'warning' | 'critical';
        message: string;
    }[];

    // Suggestions
    suggestions: string[];
}

// ============================================
// Activity Owner View
// ============================================

export interface ActivityOwnerDashboard {
    owner: {
        id: string;
        name: string;
        position_code: string;
    };

    // Notifications
    notifications: ActivityNotification[];

    // Activities owned
    activities: ActivityWithTasks[];

    // Summary
    summary: {
        total_activities: number;
        in_progress: number;
        at_risk: number;
        total_tasks: number;
        completed_tasks: number;
        reassigned_tasks: number;
    };
}

export interface ActivityNotification {
    id: string;
    type: 'task_reassigned' | 'timeline_changed' | 'resource_changed' | 'risk_alert' | 'deadline_approaching';
    title: string;
    message: string;

    // Related entities
    task_id?: string;
    task_title?: string;
    activity_id?: string;
    activity_name?: string;

    // Actor
    triggered_by_id: string;
    triggered_by_name: string;
    triggered_at: string;

    // Status
    is_read: boolean;
    is_acknowledged: boolean;

    // Action
    action_required: boolean;
    action_type?: 'acknowledge' | 'approve' | 'review' | 'respond';
}

export interface ActivityWithTasks {
    id: string;
    name: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'at_risk';
    progress_percent: number;

    // Timeline
    planned_start_date: string;
    planned_end_date: string;
    actual_start_date?: string;
    estimated_completion_date?: string;

    // Mandays
    estimated_mandays: number;
    actual_mandays: number;
    remaining_mandays: number;

    // Tasks
    tasks: TaskForOwner[];

    // Risks & Issues
    risks: {
        type: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
    }[];

    // Recent changes
    recent_changes: {
        type: string;
        description: string;
        changed_at: string;
        changed_by: string;
    }[];
}

export interface TaskForOwner {
    id: string;
    title: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'urgent';

    // Assignment
    assignee_id: string;
    assignee_name: string;
    original_assignee_id?: string;
    original_assignee_name?: string;
    was_reassigned: boolean;

    // Timeline
    planned_start_date: string;
    planned_end_date: string;
    actual_start_date?: string;
    completed_date?: string;

    // Mandays
    estimated_mandays: number;
    actual_mandays: number;

    // Flags
    is_at_risk: boolean;
    is_blocked: boolean;
    needs_attention: boolean;
}

// ============================================
// Change Request (from Activity Owner)
// ============================================

export interface ActivityChangeRequest {
    id: string;
    activity_id: string;
    activity_name: string;

    // Requester (Activity Owner)
    requested_by_id: string;
    requested_by_name: string;
    requested_at: string;

    // Change Type
    change_type: 'extend_timeline' | 'add_resource' | 'reduce_scope' | 'increase_mandays' | 'reassign_task' | 'other';

    // Details
    title: string;
    description: string;
    justification: string;

    // Specific changes
    timeline_change?: {
        current_end_date: string;
        requested_end_date: string;
        days_extension: number;
    };

    resource_request?: {
        additional_mandays: number;
        suggested_assignee_id?: string;
        suggested_assignee_name?: string;
        required_skills: string[];
    };

    // Impact on Project
    project_impact: string;

    // Status
    status: 'pending' | 'approved' | 'rejected' | 'under_review';

    // Response
    reviewed_by_id?: string;
    reviewed_by_name?: string;
    reviewed_at?: string;
    response_note?: string;
}
