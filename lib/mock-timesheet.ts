import { ActivityCode, ProjectPhase, ProjectTask, WeeklyTimesheet, TimesheetEntry } from "@/types/timesheet";
import { addDays, format, startOfWeek } from "date-fns";

// --- Master Data ---

export const mockActivityCodes: ActivityCode[] = [
    // Project Activities
    { id: 'act-1', code: 'PM', name: 'Project Management', category: 'project', is_billable_default: true, sort_order: 1, is_active: true, color: '#3b82f6' },
    { id: 'act-2', code: 'REQ', name: 'Requirement Analysis', category: 'project', is_billable_default: true, sort_order: 2, is_active: true, color: '#8b5cf6' },
    { id: 'act-3', code: 'DES', name: 'Design', category: 'project', is_billable_default: true, sort_order: 3, is_active: true, color: '#ec4899' },
    { id: 'act-4', code: 'DEV', name: 'Development', category: 'project', is_billable_default: true, sort_order: 4, is_active: true, color: '#10b981' },
    { id: 'act-5', code: 'TEST', name: 'Testing', category: 'project', is_billable_default: true, sort_order: 5, is_active: true, color: '#f59e0b' },
    { id: 'act-6', code: 'UAT', name: 'UAT Support', category: 'project', is_billable_default: true, sort_order: 6, is_active: true, color: '#f97316' },
    { id: 'act-7', code: 'DOC', name: 'Documentation', category: 'project', is_billable_default: true, sort_order: 7, is_active: true, color: '#64748b' },
    { id: 'act-8', code: 'DEP', name: 'Deployment', category: 'project', is_billable_default: true, sort_order: 8, is_active: true, color: '#06b6d4' },
    { id: 'act-9', code: 'SUP', name: 'Support', category: 'project', is_billable_default: true, sort_order: 9, is_active: true, color: '#ef4444' },
    { id: 'act-10', code: 'REV', name: 'Review', category: 'project', is_billable_default: true, sort_order: 10, is_active: true, color: '#6366f1' },

    // Non-Project Activities
    { id: 'act-11', code: 'MTG', name: 'Meeting (General)', category: 'non-project', is_billable_default: false, sort_order: 11, is_active: true, color: '#94a3b8' },
    { id: 'act-12', code: 'TRN', name: 'Training', category: 'non-project', is_billable_default: false, sort_order: 12, is_active: true, color: '#94a3b8' },
    { id: 'act-13', code: 'ADM', name: 'Administrative', category: 'non-project', is_billable_default: false, sort_order: 13, is_active: true, color: '#94a3b8' },
    { id: 'act-14', code: 'LV', name: 'Leave', category: 'non-project', is_billable_default: false, sort_order: 14, is_active: true, color: '#cbd5e1' },
];

export const mockProjects = [
    { id: 'proj-1', name: 'E-Commerce Website', code: 'PRJ-001' },
    { id: 'proj-2', name: 'Mobile App', code: 'PRJ-002' },
    { id: 'proj-3', name: 'Internal HR System', code: 'PRJ-003' },
    { id: 'proj-non', name: 'Non-Project', code: 'NON-PRJ' },
];

export const mockPhases: ProjectPhase[] = [
    { id: 'ph-1', project_id: 'proj-1', code: 'PH1', name: 'Phase 1: MVP', planned_hours: 400, actual_hours: 350, status: 'in_progress', sort_order: 1 },
    { id: 'ph-2', project_id: 'proj-1', code: 'PH2', name: 'Phase 2: Features', planned_hours: 300, actual_hours: 0, status: 'not_started', sort_order: 2 },
];

export const mockTasks: ProjectTask[] = [
    { id: 'task-1', project_id: 'proj-1', phase_id: 'ph-1', name: 'Design Homepage', status: 'done' },
    { id: 'task-2', project_id: 'proj-1', phase_id: 'ph-1', name: 'Implement Login', status: 'done' },
    { id: 'task-3', project_id: 'proj-1', phase_id: 'ph-1', name: 'Setup Database', status: 'done' },
    { id: 'task-4', project_id: 'proj-1', phase_id: 'ph-1', name: 'API Integration', status: 'in_progress' },
    { id: 'task-5', project_id: 'proj-2', phase_id: '', name: 'iOS Setup', status: 'in_progress' },
];

// --- Helper Functions ---

const getDatesOfWeek = (startDate: Date) => {
    return Array.from({ length: 7 }).map((_, i) => format(addDays(startDate, i), 'yyyy-MM-dd'));
};

// --- Mock Entries Generator ---

const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
const weekDates = getDatesOfWeek(currentWeekStart);

const entries: TimesheetEntry[] = [
    // User 1 - Monday
    {
        id: 'ent-1',
        employee_id: 'emp-1',
        employee_name: 'John Doe',
        project_id: 'proj-1',
        project_name: 'E-Commerce Website',
        phase_id: 'ph-1',
        phase_name: 'Phase 1: MVP',
        task_id: 'task-1',
        task_name: 'Design Homepage',
        activity_code: 'DEV',
        activity_name: 'Development',
        work_description: 'Designed the main hero section and header components.',
        work_date: weekDates[0],
        duration_hours: 4,
        actual_hours: 4,
        is_billable: true,
        is_overtime: false,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'ent-2',
        employee_id: 'emp-1',
        employee_name: 'John Doe',
        project_id: 'proj-1',
        project_name: 'E-Commerce Website',
        task_id: 'task-2',
        task_name: 'Implement Login',
        activity_code: 'DEV',
        activity_name: 'Development',
        work_description: 'Fixed login bug related to auth tokens.',
        work_date: weekDates[0],
        duration_hours: 3,
        actual_hours: 3,
        is_billable: true,
        is_overtime: false,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'ent-3',
        employee_id: 'emp-1',
        employee_name: 'John Doe',
        project_id: 'proj-non',
        project_name: 'Non-Project',
        activity_code: 'MTG',
        activity_name: 'Meeting (General)',
        work_description: 'Weekly team sync.',
        work_date: weekDates[0],
        duration_hours: 1,
        actual_hours: 1,
        is_billable: false,
        is_overtime: false,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    // User 1 - Tuesday
    {
        id: 'ent-4',
        employee_id: 'emp-1',
        employee_name: 'John Doe',
        project_id: 'proj-1',
        project_name: 'E-Commerce Website',
        task_id: 'task-4',
        task_name: 'API Integration',
        activity_code: 'DEV',
        activity_name: 'Development',
        work_description: 'Integrating product list API.',
        work_date: weekDates[1],
        duration_hours: 6,
        actual_hours: 6,
        is_billable: true,
        is_overtime: false,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'ent-5',
        employee_id: 'emp-1',
        employee_name: 'John Doe',
        project_id: 'proj-non',
        project_name: 'Non-Project',
        activity_code: 'TRN',
        activity_name: 'Training',
        work_description: 'Security awareness training.',
        work_date: weekDates[1],
        duration_hours: 2,
        actual_hours: 2,
        is_billable: false,
        is_overtime: false,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

export const mockWeeklyTimesheets: WeeklyTimesheet[] = [
    {
        id: 'wk-1',
        employee_id: 'emp-1',
        week_start_date: weekDates[0],
        week_end_date: weekDates[6],
        week_number: 2,
        year: 2025,
        total_planned_hours: 40,
        total_actual_hours: 16, // Sum of entries above
        total_billable_hours: 13,
        total_non_billable_hours: 3,
        total_overtime_hours: 0,
        status: 'draft',
        entries: entries,
    }
];
