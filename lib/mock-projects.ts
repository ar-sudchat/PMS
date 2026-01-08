import { Project, ProjectMilestone, ProjectKPIConfig } from "@/types/project";
import { TimesheetEntry } from "@/types/timesheet";
import { format, subDays, addDays } from "date-fns";

const today = new Date();

// --- 1. Master Data ---
const milestones: ProjectMilestone[] = [
    {
        id: 'ms-1',
        project_id: 'prj-1',
        code: 'MAPPING',
        name: 'Mapping Data',
        name_th: 'แมปปิ้งข้อมูล',
        sequence: 1,
        time_delivery_ratio: 35,
        manday_control_ratio: 30,
        planned_mandays: 25,
        actual_mandays: 24,
        planned_start_date: '2025-02-01',
        planned_end_date: '2025-02-28',
        actual_start_date: '2025-02-01',
        actual_end_date: '2025-02-27', // Early
        status: 'completed',
        completion_percent: 100,
        required_documents: [],
        is_on_time: true,
        is_within_budget: true
    },
    {
        id: 'ms-2',
        project_id: 'prj-1',
        code: 'ST',
        name: 'System Test',
        name_th: 'ทดสอบระบบ',
        sequence: 2,
        time_delivery_ratio: 20,
        manday_control_ratio: 30,
        planned_mandays: 30,
        actual_mandays: 35, // Over budget
        planned_start_date: '2025-03-01',
        planned_end_date: '2025-03-31',
        actual_start_date: '2025-03-01',
        actual_end_date: '2025-04-02', // Late
        status: 'completed',
        completion_percent: 100,
        required_documents: [],
        is_on_time: false,
        is_within_budget: false
    },
    {
        id: 'ms-3',
        project_id: 'prj-1',
        code: 'UAT',
        name: 'User Acceptance Test',
        sequence: 3,
        time_delivery_ratio: 30,
        manday_control_ratio: 20,
        planned_mandays: 35,
        actual_mandays: 20,
        planned_start_date: '2025-04-01',
        planned_end_date: '2025-04-30',
        status: 'in_progress',
        completion_percent: 50,
        required_documents: [],
        is_on_time: true,
        is_within_budget: true
    }
];

const kpiConfig: ProjectKPIConfig = {
    id: 'kpi-1',
    project_id: 'prj-1',
    enabled_milestones: ['MAPPING', 'ST', 'UAT', 'GOLIVE', 'CLOSE'],
    track_defect_ratio: true,
    track_post_golive_rework: true,
    track_deploy_success: true,
    track_backup_docs: true
};

export const mockCMMIProjects: Project[] = [
    {
        id: 'prj-1',
        project_code: 'PRJ-2025-001',
        project_name: 'Sales Management System',
        project_name_th: 'ระบบบริหารงานขาย',
        description: 'Web-based application for managing sales orders and tracking.',
        fiscal_year: 2025,

        customer_id: 'cust-1',
        customer_code: 'ABC-001',
        customer_name: 'ABC Company Ltd.',

        sold_mandays: 120,
        selling_price: 1800000,
        manday_rate: 15000,

        contract_start_date: '2025-02-01',
        contract_end_date: '2025-07-31',

        status: 'in_progress',

        project_manager_id: 'emp-1',
        team_members: [],

        milestones: milestones,
        kpi_config: kpiConfig,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'admin'
    }
];

// --- 2. Timesheet Entries for KPI (Linked to mockCMMIProjects) ---

export const mockKPITimesheets: TimesheetEntry[] = [
    // Normal work for Mapping Phase
    {
        id: 'kpi-ts-1',
        employee_id: 'emp-1',
        project_id: 'prj-1',
        project_name: 'Sales Management System',
        milestone_id: 'ms-1',
        work_type: 'normal',
        activity_code: 'DEV',
        hours: 8,
        duration_hours: 8,
        actual_hours: 8,
        mandays: 1,
        is_defect_fix: false,
        is_post_golive: false,
        work_description: 'Mapping customer data schema.',
        work_date: '2025-02-15',
        status: 'approved',
        is_billable: true,
        is_overtime: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    // Defect Fix
    {
        id: 'kpi-ts-2',
        employee_id: 'emp-1',
        project_id: 'prj-1',
        project_name: 'Sales Management System',
        milestone_id: 'ms-2', // System Test
        work_type: 'defect_fix',
        activity_code: 'DEV',
        hours: 4,
        duration_hours: 4,
        actual_hours: 4,
        mandays: 0.5,
        is_defect_fix: true,
        is_post_golive: false,
        defect_id: 'BUG-101',
        work_description: 'Fixing login error during ST.',
        work_date: '2025-03-10',
        status: 'approved',
        is_billable: true,
        is_overtime: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];
