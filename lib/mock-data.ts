// lib/mock-data.ts
// ============================================
// Types
// ============================================

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    position: string;
    department: string;
    role: 'admin' | 'manager' | 'member' | 'viewer';
}

export interface Employee {
    id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar?: string;
    position: string;
    position_code: 'PM' | 'SA' | 'BA' | 'PG';
    department: string;
    role: 'admin' | 'manager' | 'member' | 'viewer';
    status: 'active' | 'inactive' | 'suspended';
    employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
    start_date: string;
    end_date?: string;
    working_hours_per_day: number;
    working_days_per_week: number;
    hourly_rate?: number;
    skills?: string[];
    bio?: string;
    created_at: string;
    updated_at: string;
}

export interface Project {
    id: string;
    project_code: string;
    project_name: string;
    description?: string;
    customer_id: string;
    customer_name: string;
    fiscal_year: number;
    status: string;
    progress_percent: number;
    sold_mandays: number;
    actual_mandays: number;
    selling_price: number;
    contract_start_date: string;
    contract_end_date: string;
    project_manager_id: string;
    project_manager_name: string;
    team_count: number;
    created_at: string;
    updated_at: string;
}

export interface Task {
    id: string;
    project_id: string;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignee_id?: string;
    assignee_name?: string;
    due_date?: string;
    estimated_hours?: number;
    actual_hours?: number;
    labels?: string[];
    created_at: string;
    updated_at: string;
}

export interface Milestone {
    id: string;
    project_id: string;
    code: string;
    name: string;
    planned_start_date: string;
    planned_end_date: string;
    actual_start_date?: string;
    actual_end_date?: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
    progress_percent: number;
}

export interface TimeEntry {
    id: string;
    user_id: string;
    user_name: string;
    project_id: string;
    project_name: string;
    task_id?: string;
    task_name?: string;
    milestone_id?: string;
    milestone_name?: string;
    activity_code: string;
    activity_name: string;
    work_date: string;
    hours: number;
    mandays: number;
    work_type: 'normal' | 'defect_fix' | 'rework' | 'post_golive' | 'support';
    is_billable: boolean;
    is_overtime: boolean;
    description?: string;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
}

export interface Department {
    id: string;
    name: string;
    code: string;
    description?: string;
    head_id?: string;
    head_name?: string;
    parent_id?: string;
    member_count: number;
    color: string;
    created_at: string;
}

export interface Position {
    id: string;
    code: string;
    name: string;
    level: number;
    department_id: string;
    is_active: boolean;
}

export interface DashboardStats {
    // Project Stats
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    onHoldProjects: number;

    // Task Stats
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    reviewTasks: number;
    doneTasks: number;
    overdueTasks: number;

    // Team Stats
    totalMembers: number;
    activeMembers: number;

    // Time Stats
    totalPlannedHours: number;
    totalActualHours: number;

    // Manday Stats
    totalSoldMandays: number;
    totalActualMandays: number;

    // Revenue Stats
    totalRevenue: number;

    // Recent Activity
    recentProjects: Project[];
    recentTasks: Task[];
    upcomingDeadlines: Task[];

    // By Status
    projectsByStatus: Record<string, number>;
    tasksByStatus: Record<string, number>;
    tasksByPriority: Record<string, number>;
}

// ============================================
// Priority & Status Config
// ============================================

export const priorityColors: Record<string, string> = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#f97316',
    urgent: '#ef4444',
};

export const priorityDots: Record<string, string> = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    urgent: '🔴',
};

export const priorityLabels: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
};

export const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    todo: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
    in_progress: { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' },
    review: { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
    done: { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
};

export const statusLabels: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
};

// ============================================
// Mock Data: Users
// ============================================

export const users: User[] = [
    {
        id: 'user-1',
        name: 'สมชาย มานะ',
        email: 'somchai@company.com',
        avatar: 'https://i.pravatar.cc/100?u=1',
        position: 'Project Manager',
        department: 'Development',
        role: 'manager',
    },
    {
        id: 'user-2',
        name: 'สุภาพร ใจดี',
        email: 'supaporn@company.com',
        avatar: 'https://i.pravatar.cc/100?u=2',
        position: 'System Analyst',
        department: 'Development',
        role: 'member',
    },
    {
        id: 'user-3',
        name: 'วิชัย เก่งกาจ',
        email: 'wichai@company.com',
        avatar: 'https://i.pravatar.cc/100?u=3',
        position: 'Business Analyst',
        department: 'Development',
        role: 'member',
    },
    {
        id: 'user-4',
        name: 'ประสิทธิ์ โค้ดดี',
        email: 'prasit@company.com',
        avatar: 'https://i.pravatar.cc/100?u=4',
        position: 'Senior Programmer',
        department: 'Development',
        role: 'member',
    },
    {
        id: 'user-5',
        name: 'มานี รักงาน',
        email: 'manee@company.com',
        avatar: 'https://i.pravatar.cc/100?u=5',
        position: 'Programmer',
        department: 'Development',
        role: 'member',
    },
];

// ============================================
// Mock Data: Employees (Extended User Data)
// ============================================

export const mockEmployees: Employee[] = [
    {
        id: 'user-1',
        employee_id: 'EMP-0001',
        first_name: 'สมชาย',
        last_name: 'มานะ',
        email: 'somchai@company.com',
        phone: '081-234-5678',
        avatar: 'https://i.pravatar.cc/100?u=1',
        position: 'Project Manager',
        position_code: 'PM',
        department: 'Development',
        role: 'manager',
        status: 'active',
        employment_type: 'full-time',
        start_date: '2020-01-15',
        working_hours_per_day: 8,
        working_days_per_week: 5,
        hourly_rate: 1500,
        skills: ['Project Management', 'Agile', 'Scrum', 'Leadership'],
        bio: 'Project Manager ประสบการณ์กว่า 10 ปี ในการบริหารโครงการซอฟต์แวร์',
        created_at: '2020-01-15',
        updated_at: '2024-12-01',
    },
    {
        id: 'user-2',
        employee_id: 'EMP-0002',
        first_name: 'สุภาพร',
        last_name: 'ใจดี',
        email: 'supaporn@company.com',
        phone: '082-345-6789',
        avatar: 'https://i.pravatar.cc/100?u=2',
        position: 'System Analyst',
        position_code: 'SA',
        department: 'Development',
        role: 'member',
        status: 'active',
        employment_type: 'full-time',
        start_date: '2021-03-01',
        working_hours_per_day: 8,
        working_days_per_week: 5,
        hourly_rate: 1200,
        skills: ['System Analysis', 'UML', 'Database Design', 'API Design'],
        bio: 'System Analyst ที่เชี่ยวชาญด้านการออกแบบระบบและฐานข้อมูล',
        created_at: '2021-03-01',
        updated_at: '2024-11-15',
    },
    {
        id: 'user-3',
        employee_id: 'EMP-0003',
        first_name: 'วิชัย',
        last_name: 'เก่งกาจ',
        email: 'wichai@company.com',
        phone: '083-456-7890',
        avatar: 'https://i.pravatar.cc/100?u=3',
        position: 'Business Analyst',
        position_code: 'BA',
        department: 'Development',
        role: 'member',
        status: 'active',
        employment_type: 'full-time',
        start_date: '2022-06-15',
        working_hours_per_day: 8,
        working_days_per_week: 5,
        hourly_rate: 1100,
        skills: ['Business Analysis', 'Requirement Gathering', 'Process Modeling', 'Stakeholder Management'],
        bio: 'Business Analyst ที่เชี่ยวชาญด้านการวิเคราะห์ความต้องการและกระบวนการทางธุรกิจ',
        created_at: '2022-06-15',
        updated_at: '2024-10-20',
    },
    {
        id: 'user-4',
        employee_id: 'EMP-0004',
        first_name: 'ประสิทธิ์',
        last_name: 'โค้ดดี',
        email: 'prasit@company.com',
        phone: '084-567-8901',
        avatar: 'https://i.pravatar.cc/100?u=4',
        position: 'Senior Programmer',
        position_code: 'PG',
        department: 'Development',
        role: 'member',
        status: 'active',
        employment_type: 'full-time',
        start_date: '2019-08-01',
        working_hours_per_day: 8,
        working_days_per_week: 5,
        hourly_rate: 1300,
        skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
        bio: 'Senior Developer ประสบการณ์ 8 ปี ในการพัฒนา Web Application',
        created_at: '2019-08-01',
        updated_at: '2024-12-10',
    },
    {
        id: 'user-5',
        employee_id: 'EMP-0005',
        first_name: 'มานี',
        last_name: 'รักงาน',
        email: 'manee@company.com',
        phone: '085-678-9012',
        avatar: 'https://i.pravatar.cc/100?u=5',
        position: 'Programmer',
        position_code: 'PG',
        department: 'Development',
        role: 'member',
        status: 'active',
        employment_type: 'full-time',
        start_date: '2023-01-10',
        working_hours_per_day: 8,
        working_days_per_week: 5,
        hourly_rate: 800,
        skills: ['React', 'JavaScript', 'CSS', 'HTML'],
        bio: 'Junior Developer ที่กำลังพัฒนาทักษะด้าน Frontend',
        created_at: '2023-01-10',
        updated_at: '2024-11-01',
    },
    {
        id: 'user-6',
        employee_id: 'EMP-0006',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@projecthub.com',
        phone: '086-789-0123',
        avatar: 'https://i.pravatar.cc/100?u=6',
        position: 'Senior Developer',
        position_code: 'PG',
        department: 'Development',
        role: 'admin',
        status: 'active',
        employment_type: 'full-time',
        start_date: '2023-01-15',
        working_hours_per_day: 8,
        working_days_per_week: 5,
        hourly_rate: 1400,
        skills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'MongoDB'],
        bio: 'Full-stack developer with passion for clean code',
        created_at: '2023-01-15',
        updated_at: '2024-12-01',
    },
    {
        id: 'user-7',
        employee_id: 'EMP-0007',
        first_name: 'Sarah',
        last_name: 'Smith',
        email: 'sarah@projecthub.com',
        phone: '087-890-1234',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
        position: 'UI Designer',
        position_code: 'SA',
        department: 'Design',
        role: 'manager',
        status: 'active',
        employment_type: 'full-time',
        start_date: '2023-03-01',
        working_hours_per_day: 8,
        working_days_per_week: 5,
        hourly_rate: 1200,
        skills: ['Figma', 'Adobe XD', 'UI/UX', 'Prototyping'],
        bio: 'Creative designer focused on user experience',
        created_at: '2023-03-01',
        updated_at: '2024-11-20',
    },
    {
        id: 'user-8',
        employee_id: 'EMP-0008',
        first_name: 'Mike',
        last_name: 'Chen',
        email: 'mike@projecthub.com',
        phone: '088-901-2345',
        avatar: 'https://i.pravatar.cc/100?u=8',
        position: 'Backend Developer',
        position_code: 'PG',
        department: 'Development',
        role: 'member',
        status: 'inactive',
        employment_type: 'contract',
        start_date: '2023-06-15',
        end_date: '2024-06-14',
        working_hours_per_day: 8,
        working_days_per_week: 5,
        hourly_rate: 1000,
        skills: ['Java', 'Spring Boot', 'MySQL', 'Docker'],
        bio: 'Backend specialist with enterprise experience',
        created_at: '2023-06-15',
        updated_at: '2024-06-14',
    },
    {
        id: 'user-9',
        employee_id: 'EMP-0009',
        first_name: 'Anna',
        last_name: 'Wilson',
        email: 'anna@projecthub.com',
        phone: '089-012-3456',
        avatar: 'https://i.pravatar.cc/100?u=9',
        position: 'Marketing Manager',
        position_code: 'PM',
        department: 'Marketing',
        role: 'manager',
        status: 'active',
        employment_type: 'full-time',
        start_date: '2022-11-01',
        working_hours_per_day: 7,
        working_days_per_week: 5,
        hourly_rate: 1100,
        skills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics'],
        bio: 'Marketing professional with digital focus',
        created_at: '2022-11-01',
        updated_at: '2024-10-15',
    },
    {
        id: 'user-10',
        employee_id: 'EMP-0010',
        first_name: 'David',
        last_name: 'Brown',
        email: 'david@projecthub.com',
        phone: '090-123-4567',
        avatar: 'https://i.pravatar.cc/100?u=10',
        position: 'Frontend Developer',
        position_code: 'PG',
        department: 'Development',
        role: 'member',
        status: 'suspended',
        employment_type: 'full-time',
        start_date: '2023-08-01',
        working_hours_per_day: 8,
        working_days_per_week: 5,
        hourly_rate: 900,
        skills: ['Vue.js', 'JavaScript', 'Tailwind CSS', 'Git'],
        bio: 'Frontend developer specializing in Vue.js',
        created_at: '2023-08-01',
        updated_at: '2024-12-05',
    },
];

// ============================================
// Mock Data: Departments
// ============================================

export const mockDepartments: Department[] = [
    {
        id: "dept-1",
        name: "Development",
        code: "DEV",
        description: "Software development and engineering team",
        head_id: "user-1",
        head_name: "สมชาย มานะ",
        member_count: 15,
        color: "#6366f1",
        created_at: "2020-01-01",
    },
    {
        id: "dept-2",
        name: "Design",
        code: "DES",
        description: "UI/UX and graphic design team",
        head_id: "user-7",
        head_name: "Sarah Smith",
        member_count: 5,
        color: "#ec4899",
        created_at: "2020-01-01",
    },
    {
        id: "dept-3",
        name: "Quality Assurance",
        code: "QA",
        description: "Testing and quality assurance team",
        head_name: "วิชัย เก่งกาจ",
        member_count: 4,
        color: "#22c55e",
        created_at: "2020-06-01",
    },
    {
        id: "dept-4",
        name: "Marketing",
        code: "MKT",
        description: "Marketing and communications team",
        head_id: "user-9",
        head_name: "Anna Wilson",
        member_count: 6,
        color: "#f59e0b",
        created_at: "2021-01-01",
    },
    {
        id: "dept-5",
        name: "Human Resources",
        code: "HR",
        description: "Human resources and recruitment team",
        member_count: 3,
        color: "#06b6d4",
        created_at: "2020-01-01",
    },
    {
        id: "dept-6",
        name: "Finance",
        code: "FIN",
        description: "Finance and accounting team",
        member_count: 4,
        color: "#8b5cf6",
        created_at: "2020-01-01",
    },
];

// ============================================
// Mock Data: Positions
// ============================================

export const mockPositions: Position[] = [
    {
        id: "pos-1",
        code: "PM-1",
        name: "Senior Project Manager",
        level: 9,
        department_id: "dept-1",
        is_active: true,
    },
    {
        id: "pos-2",
        code: "SA-1",
        name: "System Analyst",
        level: 7,
        department_id: "dept-1",
        is_active: true,
    },
    {
        id: "pos-3",
        code: "DEV-1",
        name: "Senior Programmer",
        level: 8,
        department_id: "dept-1",
        is_active: true,
    },
    {
        id: "pos-4",
        code: "DSGN-1",
        name: "UI Designer",
        level: 6,
        department_id: "dept-2",
        is_active: true,
    },
];

// ============================================
// Mock Data: Projects
// ============================================


export const projects: Project[] = [
    {
        id: 'prj-001',
        project_code: 'PRJ-2025-001',
        project_name: 'E-Commerce Website',
        description: 'ระบบ E-Commerce สำหรับขายสินค้าออนไลน์',
        customer_id: 'cust-1',
        customer_name: 'ABC Company',
        fiscal_year: 2025,
        status: 'in_progress',
        progress_percent: 65,
        sold_mandays: 120,
        actual_mandays: 78,
        selling_price: 1800000,
        contract_start_date: '2025-01-15',
        contract_end_date: '2025-06-30',
        project_manager_id: 'user-1',
        project_manager_name: 'สมชาย มานะ',
        team_count: 5,
        created_at: '2025-01-10',
        updated_at: '2025-01-10',
    },
    {
        id: 'prj-002',
        project_code: 'PRJ-2025-002',
        project_name: 'Mobile Banking App',
        description: 'แอปพลิเคชัน Mobile Banking',
        customer_id: 'cust-2',
        customer_name: 'XYZ Bank',
        fiscal_year: 2025,
        status: 'uat',
        progress_percent: 85,
        sold_mandays: 200,
        actual_mandays: 170,
        selling_price: 3500000,
        contract_start_date: '2024-10-01',
        contract_end_date: '2025-03-31',
        project_manager_id: 'user-1',
        project_manager_name: 'สมชาย มานะ',
        team_count: 8,
        created_at: '2024-09-15',
        updated_at: '2025-01-05',
    },
    {
        id: 'prj-003',
        project_code: 'PRJ-2025-003',
        project_name: 'ERP Integration',
        description: 'เชื่อมต่อระบบ ERP กับระบบภายใน',
        customer_id: 'cust-3',
        customer_name: 'Tech Solutions',
        fiscal_year: 2025,
        status: 'planning',
        progress_percent: 15,
        sold_mandays: 80,
        actual_mandays: 12,
        selling_price: 1200000,
        contract_start_date: '2025-02-01',
        contract_end_date: '2025-05-31',
        project_manager_id: 'user-1',
        project_manager_name: 'สมชาย มานะ',
        team_count: 4,
        created_at: '2025-01-15',
        updated_at: '2025-01-15',
    },
    {
        id: 'prj-004',
        project_code: 'PRJ-2024-050',
        project_name: 'CRM System',
        description: 'ระบบ CRM สำหรับจัดการลูกค้า',
        customer_id: 'cust-4',
        customer_name: 'Digital Agency',
        fiscal_year: 2024,
        status: 'closed',
        progress_percent: 100,
        sold_mandays: 100,
        actual_mandays: 95,
        selling_price: 1500000,
        contract_start_date: '2024-03-01',
        contract_end_date: '2024-08-31',
        project_manager_id: 'user-1',
        project_manager_name: 'สมชาย มานะ',
        team_count: 5,
        created_at: '2024-02-15',
        updated_at: '2024-09-01',
    },
];

// ============================================
// Mock Data: Tasks
// ============================================

export const tasks: Task[] = [
    // Project 1 Tasks
    {
        id: 'task-001',
        project_id: 'prj-001',
        title: 'Design Database Schema',
        description: 'ออกแบบโครงสร้างฐานข้อมูล',
        status: 'done',
        priority: 'high',
        assignee_id: 'user-2',
        assignee_name: 'สุภาพร ใจดี',
        due_date: '2025-01-20',
        estimated_hours: 16,
        actual_hours: 14,
        labels: ['database', 'design'],
        created_at: '2025-01-15',
        updated_at: '2025-01-20',
    },
    {
        id: 'task-002',
        project_id: 'prj-001',
        title: 'Develop User Authentication',
        description: 'พัฒนาระบบ Login/Register',
        status: 'done',
        priority: 'high',
        assignee_id: 'user-4',
        assignee_name: 'ประสิทธิ์ โค้ดดี',
        due_date: '2025-01-25',
        estimated_hours: 24,
        actual_hours: 22,
        labels: ['backend', 'auth'],
        created_at: '2025-01-15',
        updated_at: '2025-01-25',
    },
    {
        id: 'task-003',
        project_id: 'prj-001',
        title: 'Develop Product Catalog',
        description: 'พัฒนาหน้าแสดงสินค้า',
        status: 'in_progress',
        priority: 'high',
        assignee_id: 'user-4',
        assignee_name: 'ประสิทธิ์ โค้ดดี',
        due_date: '2025-02-05',
        estimated_hours: 32,
        actual_hours: 20,
        labels: ['frontend', 'catalog'],
        created_at: '2025-01-20',
        updated_at: '2025-01-30',
    },
    {
        id: 'task-004',
        project_id: 'prj-001',
        title: 'Develop Shopping Cart',
        description: 'พัฒนาระบบตะกร้าสินค้า',
        status: 'in_progress',
        priority: 'medium',
        assignee_id: 'user-5',
        assignee_name: 'มานี รักงาน',
        due_date: '2025-02-10',
        estimated_hours: 24,
        actual_hours: 8,
        labels: ['frontend', 'cart'],
        created_at: '2025-01-25',
        updated_at: '2025-01-30',
    },
    {
        id: 'task-005',
        project_id: 'prj-001',
        title: 'Integrate Payment Gateway',
        description: 'เชื่อมต่อระบบชำระเงิน',
        status: 'todo',
        priority: 'high',
        assignee_id: 'user-4',
        assignee_name: 'ประสิทธิ์ โค้ดดี',
        due_date: '2025-02-20',
        estimated_hours: 40,
        labels: ['backend', 'payment'],
        created_at: '2025-01-15',
        updated_at: '2025-01-15',
    },
    {
        id: 'task-006',
        project_id: 'prj-001',
        title: 'Write API Documentation',
        description: 'เขียนเอกสาร API',
        status: 'todo',
        priority: 'low',
        assignee_id: 'user-2',
        assignee_name: 'สุภาพร ใจดี',
        due_date: '2025-02-28',
        estimated_hours: 16,
        labels: ['documentation'],
        created_at: '2025-01-15',
        updated_at: '2025-01-15',
    },
    {
        id: 'task-007',
        project_id: 'prj-001',
        title: 'UI/UX Review',
        description: 'ตรวจสอบ UI/UX',
        status: 'review',
        priority: 'medium',
        assignee_id: 'user-3',
        assignee_name: 'วิชัย เก่งกาจ',
        due_date: '2025-02-01',
        estimated_hours: 8,
        actual_hours: 6,
        labels: ['design', 'review'],
        created_at: '2025-01-28',
        updated_at: '2025-01-30',
    },
    // Project 2 Tasks
    {
        id: 'task-008',
        project_id: 'prj-002',
        title: 'Setup CI/CD Pipeline',
        status: 'done',
        priority: 'high',
        assignee_id: 'user-4',
        assignee_name: 'ประสิทธิ์ โค้ดดี',
        due_date: '2024-10-15',
        estimated_hours: 16,
        actual_hours: 18,
        labels: ['devops'],
        created_at: '2024-10-01',
        updated_at: '2024-10-15',
    },
    {
        id: 'task-009',
        project_id: 'prj-002',
        title: 'Develop Transfer Module',
        status: 'done',
        priority: 'urgent',
        assignee_id: 'user-4',
        assignee_name: 'ประสิทธิ์ โค้ดดี',
        due_date: '2024-12-15',
        estimated_hours: 80,
        actual_hours: 85,
        labels: ['backend', 'transfer'],
        created_at: '2024-10-20',
        updated_at: '2024-12-15',
    },
    {
        id: 'task-010',
        project_id: 'prj-002',
        title: 'UAT Testing',
        status: 'in_progress',
        priority: 'urgent',
        assignee_id: 'user-3',
        assignee_name: 'วิชัย เก่งกาจ',
        due_date: '2025-02-15',
        estimated_hours: 40,
        actual_hours: 25,
        labels: ['testing', 'uat'],
        created_at: '2025-01-10',
        updated_at: '2025-01-30',
    },
    // Project 3 Tasks
    {
        id: 'task-011',
        project_id: 'prj-003',
        title: 'Gather Requirements',
        status: 'in_progress',
        priority: 'high',
        assignee_id: 'user-3',
        assignee_name: 'วิชัย เก่งกาจ',
        due_date: '2025-02-10',
        estimated_hours: 24,
        actual_hours: 12,
        labels: ['requirement'],
        created_at: '2025-02-01',
        updated_at: '2025-02-05',
    },
    {
        id: 'task-012',
        project_id: 'prj-003',
        title: 'Design System Architecture',
        status: 'todo',
        priority: 'high',
        assignee_id: 'user-2',
        assignee_name: 'สุภาพร ใจดี',
        due_date: '2025-02-20',
        estimated_hours: 16,
        labels: ['design', 'architecture'],
        created_at: '2025-02-01',
        updated_at: '2025-02-01',
    },
];

// ============================================
// Mock Data: Milestones
// ============================================

export const milestones: Milestone[] = [
    {
        id: 'ms-001',
        project_id: 'prj-001',
        code: 'MS1',
        name: 'Mapping Data',
        planned_start_date: '2025-01-15',
        planned_end_date: '2025-01-31',
        actual_start_date: '2025-01-15',
        actual_end_date: '2025-01-28',
        status: 'completed',
        progress_percent: 100,
    },
    {
        id: 'ms-002',
        project_id: 'prj-001',
        code: 'MS2',
        name: 'Development',
        planned_start_date: '2025-02-01',
        planned_end_date: '2025-04-30',
        actual_start_date: '2025-02-01',
        status: 'in_progress',
        progress_percent: 45,
    },
    {
        id: 'ms-003',
        project_id: 'prj-001',
        code: 'MS3',
        name: 'System Test',
        planned_start_date: '2025-05-01',
        planned_end_date: '2025-05-31',
        status: 'not_started',
        progress_percent: 0,
    },
    {
        id: 'ms-004',
        project_id: 'prj-001',
        code: 'MS4',
        name: 'UAT',
        planned_start_date: '2025-06-01',
        planned_end_date: '2025-06-20',
        status: 'not_started',
        progress_percent: 0,
    },
    {
        id: 'ms-005',
        project_id: 'prj-001',
        code: 'MS5',
        name: 'Go-Live',
        planned_start_date: '2025-06-21',
        planned_end_date: '2025-06-30',
        status: 'not_started',
        progress_percent: 0,
    },
];

// ============================================
// Mock Data: Time Entries
// ============================================

export const timeEntries: TimeEntry[] = [
    {
        id: 'te-001',
        user_id: 'user-4',
        user_name: 'ประสิทธิ์ โค้ดดี',
        project_id: 'prj-001',
        project_name: 'E-Commerce Website',
        task_id: 'task-002',
        task_name: 'Develop User Authentication',
        milestone_id: 'ms-002',
        milestone_name: 'Development',
        activity_code: 'DEV',
        activity_name: 'Development',
        work_date: '2025-01-20',
        hours: 8,
        mandays: 1,
        work_type: 'normal',
        is_billable: true,
        is_overtime: false,
        description: 'พัฒนาระบบ Login ด้วย JWT',
        status: 'approved',
        created_at: '2025-01-20',
        updated_at: '2025-01-21',
    },
    {
        id: 'te-002',
        user_id: 'user-4',
        user_name: 'ประสิทธิ์ โค้ดดี',
        project_id: 'prj-001',
        project_name: 'E-Commerce Website',
        task_id: 'task-002',
        task_name: 'Develop User Authentication',
        milestone_id: 'ms-002',
        milestone_name: 'Development',
        activity_code: 'DEV',
        activity_name: 'Development',
        work_date: '2025-01-21',
        hours: 8,
        mandays: 1,
        work_type: 'normal',
        is_billable: true,
        is_overtime: false,
        description: 'พัฒนาระบบ Register และ Validation',
        status: 'approved',
        created_at: '2025-01-21',
        updated_at: '2025-01-22',
    },
    {
        id: 'te-003',
        user_id: 'user-4',
        user_name: 'ประสิทธิ์ โค้ดดี',
        project_id: 'prj-001',
        project_name: 'E-Commerce Website',
        task_id: 'task-003',
        task_name: 'Develop Product Catalog',
        milestone_id: 'ms-002',
        milestone_name: 'Development',
        activity_code: 'DEV',
        activity_name: 'Development',
        work_date: '2025-01-22',
        hours: 6,
        mandays: 0.75,
        work_type: 'normal',
        is_billable: true,
        is_overtime: false,
        description: 'พัฒนา API สำหรับดึงข้อมูลสินค้า',
        status: 'approved',
        created_at: '2025-01-22',
        updated_at: '2025-01-23',
    },
    {
        id: 'te-004',
        user_id: 'user-4',
        user_name: 'ประสิทธิ์ โค้ดดี',
        project_id: 'prj-001',
        project_name: 'E-Commerce Website',
        task_id: 'task-003',
        task_name: 'Develop Product Catalog',
        activity_code: 'BUG',
        activity_name: 'Bug Fixing',
        work_date: '2025-01-22',
        hours: 2,
        mandays: 0.25,
        work_type: 'defect_fix',
        is_billable: false,
        is_overtime: false,
        description: 'แก้ไข bug การแสดงผลรูปภาพ',
        status: 'approved',
        created_at: '2025-01-22',
        updated_at: '2025-01-23',
    },
    {
        id: 'te-005',
        user_id: 'user-2',
        user_name: 'สุภาพร ใจดี',
        project_id: 'prj-001',
        project_name: 'E-Commerce Website',
        task_id: 'task-001',
        task_name: 'Design Database Schema',
        milestone_id: 'ms-001',
        milestone_name: 'Mapping Data',
        activity_code: 'DES',
        activity_name: 'System Design',
        work_date: '2025-01-15',
        hours: 8,
        mandays: 1,
        work_type: 'normal',
        is_billable: true,
        is_overtime: false,
        description: 'ออกแบบ ERD และ Database Schema',
        status: 'approved',
        created_at: '2025-01-15',
        updated_at: '2025-01-16',
    },
    {
        id: 'te-006',
        user_id: 'user-2',
        user_name: 'สุภาพร ใจดี',
        project_id: 'prj-001',
        project_name: 'E-Commerce Website',
        task_id: 'task-001',
        task_name: 'Design Database Schema',
        milestone_id: 'ms-001',
        milestone_name: 'Mapping Data',
        activity_code: 'DES',
        activity_name: 'System Design',
        work_date: '2025-01-16',
        hours: 6,
        mandays: 0.75,
        work_type: 'normal',
        is_billable: true,
        is_overtime: false,
        description: 'Review และปรับปรุง Database Schema',
        status: 'approved',
        created_at: '2025-01-16',
        updated_at: '2025-01-17',
    },
    {
        id: 'te-007',
        user_id: 'user-5',
        user_name: 'มานี รักงาน',
        project_id: 'prj-001',
        project_name: 'E-Commerce Website',
        task_id: 'task-004',
        task_name: 'Develop Shopping Cart',
        milestone_id: 'ms-002',
        milestone_name: 'Development',
        activity_code: 'DEV',
        activity_name: 'Development',
        work_date: '2025-01-27',
        hours: 8,
        mandays: 1,
        work_type: 'normal',
        is_billable: true,
        is_overtime: false,
        description: 'พัฒนาหน้าตะกร้าสินค้า',
        status: 'submitted',
        created_at: '2025-01-27',
        updated_at: '2025-01-27',
    },
    {
        id: 'te-008',
        user_id: 'user-5',
        user_name: 'มานี รักงาน',
        project_id: 'prj-001',
        project_name: 'E-Commerce Website',
        task_id: 'task-004',
        task_name: 'Develop Shopping Cart',
        milestone_id: 'ms-002',
        milestone_name: 'Development',
        activity_code: 'DEV',
        activity_name: 'Development',
        work_date: '2025-01-28',
        hours: 8,
        mandays: 1,
        work_type: 'normal',
        is_billable: true,
        is_overtime: false,
        description: 'พัฒนา Add to Cart และ Update Quantity',
        status: 'submitted',
        created_at: '2025-01-28',
        updated_at: '2025-01-28',
    },
    {
        id: 'te-009',
        user_id: 'user-3',
        user_name: 'วิชัย เก่งกาจ',
        project_id: 'prj-001',
        project_name: 'E-Commerce Website',
        task_id: 'task-007',
        task_name: 'UI/UX Review',
        activity_code: 'REV',
        activity_name: 'Review',
        work_date: '2025-01-29',
        hours: 4,
        mandays: 0.5,
        work_type: 'normal',
        is_billable: true,
        is_overtime: false,
        description: 'Review UI/UX ของหน้า Product และ Cart',
        status: 'draft',
        created_at: '2025-01-29',
        updated_at: '2025-01-29',
    },
    {
        id: 'te-010',
        user_id: 'user-3',
        user_name: 'วิชัย เก่งกาจ',
        project_id: 'prj-002',
        project_name: 'Mobile Banking App',
        task_id: 'task-010',
        task_name: 'UAT Testing',
        activity_code: 'UAT',
        activity_name: 'User Acceptance Test',
        work_date: '2025-01-28',
        hours: 8,
        mandays: 1,
        work_type: 'normal',
        is_billable: true,
        is_overtime: false,
        description: 'ทดสอบ UAT กับลูกค้า รอบที่ 1',
        status: 'approved',
        created_at: '2025-01-28',
        updated_at: '2025-01-29',
    },
    {
        id: 'te-011',
        user_id: 'user-3',
        user_name: 'วิชัย เก่งกาจ',
        project_id: 'prj-002',
        project_name: 'Mobile Banking App',
        task_id: 'task-010',
        task_name: 'UAT Testing',
        activity_code: 'UAT',
        activity_name: 'User Acceptance Test',
        work_date: '2025-01-29',
        hours: 8,
        mandays: 1,
        work_type: 'normal',
        is_billable: true,
        is_overtime: false,
        description: 'ทดสอบ UAT กับลูกค้า รอบที่ 2',
        status: 'submitted',
        created_at: '2025-01-29',
        updated_at: '2025-01-29',
    },
    {
        id: 'te-012',
        user_id: 'user-3',
        user_name: 'วิชัย เก่งกาจ',
        project_id: 'prj-003',
        project_name: 'ERP Integration',
        task_id: 'task-011',
        task_name: 'Gather Requirements',
        activity_code: 'REQ',
        activity_name: 'Requirement Analysis',
        work_date: '2025-02-03',
        hours: 8,
        mandays: 1,
        work_type: 'normal',
        is_billable: true,
        is_overtime: false,
        description: 'ประชุมเก็บ Requirement กับลูกค้า',
        status: 'draft',
        created_at: '2025-02-03',
        updated_at: '2025-02-03',
    },
    {
        id: 'te-013',
        user_id: 'user-1',
        user_name: 'สมชาย มานะ',
        project_id: 'prj-001',
        project_name: 'E-Commerce Website',
        activity_code: 'MTG',
        activity_name: 'Meeting',
        work_date: '2025-01-27',
        hours: 2,
        mandays: 0.25,
        work_type: 'normal',
        is_billable: false,
        is_overtime: false,
        description: 'ประชุมติดตามความคืบหน้าโครงการ',
        status: 'approved',
        created_at: '2025-01-27',
        updated_at: '2025-01-28',
    },
    {
        id: 'te-014',
        user_id: 'user-1',
        user_name: 'สมชาย มานะ',
        project_id: 'prj-002',
        project_name: 'Mobile Banking App',
        activity_code: 'PM',
        activity_name: 'Project Management',
        work_date: '2025-01-28',
        hours: 4,
        mandays: 0.5,
        work_type: 'normal',
        is_billable: true,
        is_overtime: false,
        description: 'บริหารจัดการโครงการและติดตาม UAT',
        status: 'approved',
        created_at: '2025-01-28',
        updated_at: '2025-01-29',
    },
    {
        id: 'te-015',
        user_id: 'user-4',
        user_name: 'ประสิทธิ์ โค้ดดี',
        project_id: 'prj-002',
        project_name: 'Mobile Banking App',
        activity_code: 'BUG',
        activity_name: 'Bug Fixing',
        work_date: '2025-01-29',
        hours: 4,
        mandays: 0.5,
        work_type: 'post_golive',
        is_billable: false,
        is_overtime: false,
        description: 'แก้ไข bug จาก UAT Testing',
        status: 'submitted',
        created_at: '2025-01-29',
        updated_at: '2025-01-29',
    },
];

// ============================================
// Helper Functions
// ============================================

// Get user by ID
export function getUserById(userId: string): User | undefined {
    return users.find((user) => user.id === userId);
}

// Get employee by ID
export function getEmployeeById(employeeId: string): Employee | undefined {
    return mockEmployees.find((emp) => emp.id === employeeId || emp.employee_id === employeeId);
}

// Get employees by department
export function getEmployeesByDepartment(department: string): Employee[] {
    return mockEmployees.filter((emp) => emp.department === department);
}

// Get employees by position
export function getEmployeesByPosition(positionCode: Employee['position_code']): Employee[] {
    return mockEmployees.filter((emp) => emp.position_code === positionCode);
}

// Get employees by status
export function getEmployeesByStatus(status: Employee['status']): Employee[] {
    return mockEmployees.filter((emp) => emp.status === status);
}

// Get active employees
export function getActiveEmployees(): Employee[] {
    return mockEmployees.filter((emp) => emp.status === 'active');
}

// Search employees
export function searchEmployees(query: string): Employee[] {
    const lowerQuery = query.toLowerCase();
    return mockEmployees.filter((emp) =>
        emp.first_name.toLowerCase().includes(lowerQuery) ||
        emp.last_name.toLowerCase().includes(lowerQuery) ||
        emp.email.toLowerCase().includes(lowerQuery) ||
        emp.employee_id.toLowerCase().includes(lowerQuery) ||
        emp.position.toLowerCase().includes(lowerQuery)
    );
}

// Get project by ID
export function getProjectById(projectId: string): Project | undefined {
    return projects.find((project) => project.id === projectId);
}

// Get tasks by project ID
export function getTasksByProject(projectId: string): Task[] {
    return tasks.filter((task) => task.project_id === projectId);
}

// Get tasks by assignee ID
export function getTasksByAssignee(userId: string): Task[] {
    return tasks.filter((task) => task.assignee_id === userId);
}

// Get tasks by status
export function getTasksByStatus(status: Task['status']): Task[] {
    return tasks.filter((task) => task.status === status);
}

// Get milestones by project ID
export function getMilestonesByProject(projectId: string): Milestone[] {
    return milestones.filter((ms) => ms.project_id === projectId);
}

// Get projects by year
export function getProjectsByYear(year: number): Project[] {
    return projects.filter((project) => project.fiscal_year === year);
}

// Get projects by status
export function getProjectsByStatus(status: string): Project[] {
    return projects.filter((project) => project.status === status);
}

// Get projects by PM
export function getProjectsByPM(pmId: string): Project[] {
    return projects.filter((project) => project.project_manager_id === pmId);
}

// Get team members for a project (simplified)
export function getProjectTeam(projectId: string): User[] {
    const projectTasks = getTasksByProject(projectId);
    const assigneeIds = [...new Set(projectTasks.map((t) => t.assignee_id).filter(Boolean))];
    return users.filter((user) => assigneeIds.includes(user.id));
}

// Calculate task stats for a project
export function getProjectTaskStats(projectId: string) {
    const projectTasks = getTasksByProject(projectId);

    return {
        total: projectTasks.length,
        todo: projectTasks.filter((t) => t.status === 'todo').length,
        in_progress: projectTasks.filter((t) => t.status === 'in_progress').length,
        review: projectTasks.filter((t) => t.status === 'review').length,
        done: projectTasks.filter((t) => t.status === 'done').length,
    };
}

// Get time entries by user
export function getTimeEntriesByUser(userId: string): TimeEntry[] {
    return timeEntries.filter((te) => te.user_id === userId);
}

// Get time entries by project
export function getTimeEntriesByProject(projectId: string): TimeEntry[] {
    return timeEntries.filter((te) => te.project_id === projectId);
}

// Get time entries by date range
export function getTimeEntriesByDateRange(startDate: string, endDate: string): TimeEntry[] {
    return timeEntries.filter((te) => {
        const date = new Date(te.work_date);
        return date >= new Date(startDate) && date <= new Date(endDate);
    });
}

// Get time entries by status
export function getTimeEntriesByStatus(status: TimeEntry['status']): TimeEntry[] {
    return timeEntries.filter((te) => te.status === status);
}

// Calculate total hours for a user in date range
export function getUserTotalHours(userId: string, startDate?: string, endDate?: string) {
    let entries = getTimeEntriesByUser(userId);

    if (startDate && endDate) {
        entries = entries.filter((te) => {
            const date = new Date(te.work_date);
            return date >= new Date(startDate) && date <= new Date(endDate);
        });
    }

    return {
        totalHours: entries.reduce((sum, te) => sum + te.hours, 0),
        billableHours: entries.filter((te) => te.is_billable).reduce((sum, te) => sum + te.hours, 0),
        nonBillableHours: entries.filter((te) => !te.is_billable).reduce((sum, te) => sum + te.hours, 0),
        overtimeHours: entries.filter((te) => te.is_overtime).reduce((sum, te) => sum + te.hours, 0),
        totalMandays: entries.reduce((sum, te) => sum + te.mandays, 0),
    };
}

// Calculate project time stats
export function getProjectTimeStats(projectId: string) {
    const entries = getTimeEntriesByProject(projectId);

    return {
        totalHours: entries.reduce((sum, te) => sum + te.hours, 0),
        totalMandays: entries.reduce((sum, te) => sum + te.mandays, 0),
        billableHours: entries.filter((te) => te.is_billable).reduce((sum, te) => sum + te.hours, 0),
        defectFixHours: entries.filter((te) => te.work_type === 'defect_fix').reduce((sum, te) => sum + te.hours, 0),
        postGoLiveHours: entries.filter((te) => te.work_type === 'post_golive').reduce((sum, te) => sum + te.hours, 0),
        byActivity: entries.reduce((acc, te) => {
            acc[te.activity_code] = (acc[te.activity_code] || 0) + te.hours;
            return acc;
        }, {} as Record<string, number>),
        byUser: entries.reduce((acc, te) => {
            acc[te.user_name] = (acc[te.user_name] || 0) + te.hours;
            return acc;
        }, {} as Record<string, number>),
    };
}

// ============================================
// Dashboard Stats Function
// ============================================

export function getDashboardStats(): DashboardStats {
    const today = new Date();
    const currentYear = today.getFullYear();

    // Project counts by status
    const projectsByStatus: Record<string, number> = {};
    projects.forEach((p) => {
        projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
    });

    // Task counts by status
    const tasksByStatus: Record<string, number> = {
        todo: 0,
        in_progress: 0,
        review: 0,
        done: 0,
    };
    tasks.forEach((t) => {
        tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    });

    // Task counts by priority
    const tasksByPriority: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
    };
    tasks.forEach((t) => {
        tasksByPriority[t.priority] = (tasksByPriority[t.priority] || 0) + 1;
    });

    // Overdue tasks
    const overdueTasks = tasks.filter((t) => {
        if (t.status === 'done' || !t.due_date) return false;
        return new Date(t.due_date) < today;
    });

    // Calculate hours
    const totalPlannedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);

    // Calculate mandays
    const totalSoldMandays = projects.reduce((sum, p) => sum + p.sold_mandays, 0);
    const totalActualMandays = projects.reduce((sum, p) => sum + p.actual_mandays, 0);

    // Calculate revenue
    const totalRevenue = projects.reduce((sum, p) => sum + p.selling_price, 0);

    // Recent projects (last 5)
    const recentProjects = [...projects]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);

    // Recent tasks (last 5)
    const recentTasks = [...tasks]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);

    // Upcoming deadlines (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingDeadlines = tasks
        .filter((t) => {
            if (t.status === 'done' || !t.due_date) return false;
            const dueDate = new Date(t.due_date);
            return dueDate >= today && dueDate <= nextWeek;
        })
        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
        .slice(0, 5);

    return {
        // Project Stats
        totalProjects: projects.length,
        activeProjects: projects.filter((p) =>
            ['planning', 'in_progress', 'uat', 'go_live'].includes(p.status)
        ).length,
        completedProjects: projects.filter((p) => p.status === 'closed').length,
        onHoldProjects: projects.filter((p) => p.status === 'on_hold').length,

        // Task Stats
        totalTasks: tasks.length,
        todoTasks: tasksByStatus.todo,
        inProgressTasks: tasksByStatus.in_progress,
        reviewTasks: tasksByStatus.review,
        doneTasks: tasksByStatus.done,
        overdueTasks: overdueTasks.length,

        // Team Stats
        totalMembers: users.length,
        activeMembers: users.filter((u) => u.role !== 'viewer').length,

        // Time Stats
        totalPlannedHours,
        totalActualHours,

        // Manday Stats
        totalSoldMandays,
        totalActualMandays,

        // Revenue Stats
        totalRevenue,

        // Recent Activity
        recentProjects,
        recentTasks,
        upcomingDeadlines,

        // By Status/Priority
        projectsByStatus,
        tasksByStatus,
        tasksByPriority,
    };
}

// Get user's dashboard stats
export function getUserDashboardStats(userId: string) {
    const userTasks = getTasksByAssignee(userId);
    const today = new Date();

    const overdueTasks = userTasks.filter((t) => {
        if (t.status === 'done' || !t.due_date) return false;
        return new Date(t.due_date) < today;
    });

    return {
        totalTasks: userTasks.length,
        todoTasks: userTasks.filter((t) => t.status === 'todo').length,
        inProgressTasks: userTasks.filter((t) => t.status === 'in_progress').length,
        reviewTasks: userTasks.filter((t) => t.status === 'review').length,
        doneTasks: userTasks.filter((t) => t.status === 'done').length,
        overdueTasks: overdueTasks.length,
        totalPlannedHours: userTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
        totalActualHours: userTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0),
    };
}

// Get project dashboard stats
export function getProjectDashboardStats(projectId: string) {
    const project = getProjectById(projectId);
    const projectTasks = getTasksByProject(projectId);
    const projectMilestones = getMilestonesByProject(projectId);
    const today = new Date();

    if (!project) return null;

    const overdueTasks = projectTasks.filter((t) => {
        if (t.status === 'done' || !t.due_date) return false;
        return new Date(t.due_date) < today;
    });

    return {
        project,
        taskStats: {
            total: projectTasks.length,
            todo: projectTasks.filter((t) => t.status === 'todo').length,
            in_progress: projectTasks.filter((t) => t.status === 'in_progress').length,
            review: projectTasks.filter((t) => t.status === 'review').length,
            done: projectTasks.filter((t) => t.status === 'done').length,
            overdue: overdueTasks.length,
        },
        milestoneStats: {
            total: projectMilestones.length,
            completed: projectMilestones.filter((m) => m.status === 'completed').length,
            inProgress: projectMilestones.filter((m) => m.status === 'in_progress').length,
            notStarted: projectMilestones.filter((m) => m.status === 'not_started').length,
            delayed: projectMilestones.filter((m) => m.status === 'delayed').length,
        },
        timeStats: {
            plannedHours: projectTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
            actualHours: projectTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0),
        },
        mandayStats: {
            sold: project.sold_mandays,
            actual: project.actual_mandays,
            remaining: project.sold_mandays - project.actual_mandays,
            utilizationPercent: Math.round((project.actual_mandays / project.sold_mandays) * 100),
        },
        team: getProjectTeam(projectId),
    };
}

// ============================================
// Default Export
// ============================================

export default {
    // Data
    users,
    mockEmployees,
    projects,
    tasks,
    milestones,
    timeEntries,

    // Config
    priorityColors,
    priorityDots,
    priorityLabels,
    statusColors,
    statusLabels,

    // User Functions
    getUserById,

    // Employee Functions
    getEmployeeById,
    getEmployeesByDepartment,
    getEmployeesByPosition,
    getEmployeesByStatus,
    getActiveEmployees,
    searchEmployees,

    // Project Functions
    getProjectById,
    getProjectsByYear,
    getProjectsByStatus,
    getProjectsByPM,
    getProjectTeam,
    getProjectTaskStats,
    getProjectDashboardStats,
    getProjectTimeStats,

    // Task Functions
    getTasksByProject,
    getTasksByAssignee,
    getTasksByStatus,

    // Milestone Functions
    getMilestonesByProject,

    // Time Entry Functions
    getTimeEntriesByUser,
    getTimeEntriesByProject,
    getTimeEntriesByDateRange,
    getTimeEntriesByStatus,
    getUserTotalHours,

    // Dashboard Functions
    getDashboardStats,
    getUserDashboardStats,
};