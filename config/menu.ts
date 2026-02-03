import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Building2,
  Settings,
  FileText,
  Calendar,
  BarChart3,
  Clock,
  Target,
  Briefcase,
  UserCog,
  Shield,
  Database,
  Layers,
  CheckSquare,
  ListTodo,
  PieChart,
  TrendingUp,
  FileBarChart,
  CalendarDays,
  UserCheck,
  FolderGit2,
  Milestone,
  Package,
  Zap,
  Activity,
  FolderOpen,
  Rocket,
  HardDrive,
  FileCheck,
  ClipboardList,
  Wrench,
  Bell,
  ClipboardCheck,
  GitBranch,
  Timer,
  Calculator,
  Bug,
  FilePlus,
  type LucideIcon
} from 'lucide-react'

export interface MenuItem {
  id: string
  label: string
  labelTh?: string
  icon?: LucideIcon
  path?: string
  children?: MenuItem[]
  roles?: ('admin' | 'manager' | 'member')[]
}

export interface MenuModule {
  id: string
  title: string
  titleTh?: string
  icon: LucideIcon
  children: MenuGroup[]
}

export interface MenuGroup {
  id: string
  title: string
  titleTh?: string
  children: MenuItem[]
}

export const MENU_CONFIG: MenuModule[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    titleTh: 'แดชบอร์ด',
    icon: LayoutDashboard,
    children: [
      {
        id: 'dashboard-main',
        title: 'Overview',
        titleTh: 'ภาพรวม',
        children: [
          { id: 'project-onhand', label: 'Project Onhand', labelTh: 'โครงการในมือ (Project Onhand)', path: '/project-onhand', icon: TrendingUp },
          { id: 'home', label: 'Home', labelTh: 'หน้าหลัก', path: '/', icon: LayoutDashboard },
          { id: 'pm-dashboard', label: 'PM Dashboard', labelTh: 'แดชบอร์ด PM', path: '/pm-dashboard', icon: PieChart },
          { id: 'project-owner-dashboard', label: 'My Projects Dashboard', labelTh: 'แดชบอร์ดโครงการของฉัน', path: '/project-owner-dashboard', icon: FolderOpen },
        ]
      }
    ]
  },
  {
    id: 'projects',
    title: 'Projects',
    titleTh: 'โครงการ',
    icon: FolderKanban,
    children: [
      {
        id: 'project-management',
        title: 'Project Management',
        titleTh: 'จัดการโครงการ',
        children: [
          { id: 'project-list', label: 'All Projects', labelTh: 'โครงการทั้งหมด', path: '/projects', icon: FolderKanban },
          { id: 'my-projects', label: 'My Projects', labelTh: 'โครงการของฉัน', path: '/my-projects', icon: FolderGit2 },
          { id: 'resource-planning', label: 'Resource Planning', labelTh: 'วางแผนทรัพยากร', path: '/projects/resource-planning', icon: Users },
        ]
      },
      {
        id: 'mkt-tracking',
        title: 'MKT Tracking',
        titleTh: 'ติดตาม MKT',
        children: [
          { id: 'mkt-tracking', label: 'MKT Tracking', labelTh: 'ติดตามโครงการ MKT', path: '/mkt-tracking', icon: TrendingUp },
        ]
      },
      {
        id: 'project-settings',
        title: 'Settings',
        titleTh: 'ตั้งค่า',
        children: [
          { id: 'project-types-config', label: 'Project Types', labelTh: 'ประเภทโครงการ', path: '/projects/settings/project-types', icon: Layers },
          { id: 'milestones-config', label: 'Milestones', labelTh: 'Milestones', path: '/projects/settings/milestones', icon: Milestone },
          { id: 'deliverables-config', label: 'Deliverables', labelTh: 'Deliverables', path: '/projects/settings/deliverables', icon: Package },
          { id: 'statuses-config', label: 'Statuses', labelTh: 'สถานะ', path: '/projects/settings/statuses', icon: ListTodo },
          { id: 'customers-config', label: 'Customers', labelTh: 'ลูกค้า', path: '/projects/settings/customers', icon: Building2 },
          { id: 'task-types-config', label: 'Task Types', labelTh: 'ประเภทงาน', path: '/projects/settings/task-types', icon: CheckSquare },
        ]
      }
    ]
  },
  {
    id: 'timesheet',
    title: 'Timesheet',
    titleTh: 'บันทึกเวลา',
    icon: Clock,
    children: [
      {
        id: 'time-tracking',
        title: 'Time Tracking',
        titleTh: 'บันทึกเวลา',
        children: [
          { id: 'tasks', label: 'My Tasks', labelTh: 'งานของฉัน', path: '/my-tasks', icon: CheckSquare },
          { id: 'my-calendar', label: 'My Calendar', labelTh: 'ปฏิทินของฉัน', path: '/my-calendar', icon: Calendar },
          { id: 'daily-standup', label: 'Daily Stand-up', labelTh: 'Daily Stand-up', path: '/standup', icon: Users },
        ]
      },
      {
        id: 'analytics',
        title: 'Analytics',
        titleTh: 'วิเคราะห์',
        children: [
          { id: 'timesheet-dashboard', label: 'Timesheet Dashboard', labelTh: 'แดชบอร์ด Timesheet', path: '/timesheet-dashboard', icon: PieChart, roles: ['admin', 'manager'] },
          { id: 'employee-work-report', label: 'Employee Work Report', labelTh: 'รายงานการทำงาน', path: '/analytics/employee-work', icon: BarChart3 },
        ]
      },
    ]
  },
  {
    id: 'team',
    title: 'Team',
    titleTh: 'ทีมงาน',
    icon: Users,
    children: [
      {
        id: 'team-management',
        title: 'Team Management',
        titleTh: 'จัดการทีม',
        children: [
          { id: 'employees', label: 'Employees', labelTh: 'พนักงาน', path: '/team', icon: Users },
          { id: 'departments', label: 'Departments', labelTh: 'แผนก', path: '/team/departments', icon: Building2 },
          { id: 'positions', label: 'Positions', labelTh: 'ตำแหน่ง', path: '/team/positions', icon: Briefcase },
        ]
      }
    ]
  },
  {
    id: 'kpi-record',
    title: 'KPI Record',
    titleTh: 'บันทึก KPI',
    icon: ClipboardList,
    children: [
      {
        id: 'kpi-dashboard',
        title: 'Dashboard',
        titleTh: 'แดชบอร์ด',
        children: [
          { id: 'kpi-dashboard', label: 'KPI Dashboard', labelTh: 'KPI Dashboard (ทีม)', path: '/kpi-dashboard', icon: PieChart, roles: ['admin', 'manager'] },
          { id: 'my-kpi', label: 'My KPI', labelTh: 'KPI ของฉัน', path: '/my-kpi', icon: Target },
        ]
      },
      {
        id: 'personal-kpi',
        title: 'Personal KPI',
        titleTh: 'KPI ส่วนบุคคล',
        children: [
          { id: 'deploy-success', label: 'Deploy Success', labelTh: 'ผลการ Deploy', path: '/kpi-record/deploy-success', icon: Rocket },
          { id: 'deploy-backup', label: 'Deploy Backup', labelTh: 'Backup ก่อน Deploy', path: '/kpi-record/deploy-backup', icon: HardDrive },
          { id: 'meeting-minutes', label: 'Meeting Minutes', labelTh: 'MoM Tracking', path: '/kpi-record/meeting-minutes', icon: FileCheck },
          { id: 'contact-customer', label: 'Contact Customer', labelTh: 'ติดต่อลูกค้า (Presale)', path: '/kpi-record/contact-customer', icon: Users },
          { id: 'manday-assessment', label: 'Manday Assessment', labelTh: 'ประเมิน Manday', path: '/kpi-record/manday-assessment', icon: Calculator },
        ]
      },
      {
        id: 'department-kpi',
        title: 'Department KPI',
        titleTh: 'KPI ส่วนงาน',
        children: [
          { id: 'docs-ontime', label: 'Docs On-time', labelTh: 'เอกสารตรงเวลา', path: '/kpi-record/docs-ontime', icon: FileText },
          { id: 'issue-clearing', label: 'Issue Clearing', labelTh: 'งานคงค้าง', path: '/kpi-record/issue-clearing', icon: CheckSquare },
          { id: 'post-golive-rework', label: 'Post Go-Live Rework', labelTh: 'Rework หลัง Go-Live', path: '/kpi-record/post-golive-rework', icon: Wrench },
          { id: 'time-to-delivery', label: 'Time to Delivery', labelTh: 'ส่งมอบตรงเวลา', path: '/kpi-record/time-to-delivery', icon: Timer },
          { id: 'manday-control', label: 'Man-day Control', labelTh: 'ควบคุม Man-day', path: '/kpi-record/manday-control', icon: Calculator },
          { id: 'defect-ratio', label: 'Defect Ratio', labelTh: 'อัตรา Defect', path: '/kpi-record/defect-ratio', icon: Bug },
        ]
      },
      {
        id: 'kpi-settings',
        title: 'Settings',
        titleTh: 'ตั้งค่า',
        children: [
          { id: 'backup-sources', label: 'Backup Sources', labelTh: 'แหล่ง Backup', path: '/kpi-record/backup-sources', icon: Database, roles: ['admin', 'manager'] },
          { id: 'backup-types', label: 'Backup Types', labelTh: 'ประเภท Backup', path: '/kpi-record/backup-types', icon: Layers, roles: ['admin', 'manager'] },
        ]
      }
    ]
  },

  {
    id: 'approvals',
    title: 'Approvals',
    titleTh: 'อนุมัติ',
    icon: ClipboardCheck,
    children: [
      {
        id: 'approval-management',
        title: 'Management',
        titleTh: 'จัดการ',
        children: [
          { id: 'pending-approvals', label: 'Pending Approvals', labelTh: 'รออนุมัติ', path: '/approvals', icon: ClipboardCheck },
          { id: 'approval-flows', label: 'Flow Templates', labelTh: 'จัดการ Flow', path: '/settings/approvals', icon: GitBranch },
        ]
      }
    ]
  },
  {
    id: 'config',
    title: 'Configuration',
    titleTh: 'ตั้งค่า',
    icon: Settings,
    children: [
      {
        id: 'system-config',
        title: 'System',
        titleTh: 'ระบบ',
        children: [
          { id: 'settings-page', label: 'Settings', labelTh: 'ตั้งค่า', path: '/settings', icon: Settings },
          { id: 'profile', label: 'Profile', labelTh: 'โปรไฟล์', path: '/profile', icon: UserCog },
        ]
      }
    ]
  }
]

export const QUICK_MENU: MenuItem[] = [
  { id: 'home', label: 'Home', labelTh: 'หน้าหลัก', path: '/', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', labelTh: 'โครงการ', path: '/projects', icon: FolderKanban },
  { id: 'tasks', label: 'Tasks', labelTh: 'งาน', path: '/tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', labelTh: 'ปฏิทิน', path: '/my-calendar', icon: Calendar },
]

export function filterMenuByRole(
  menu: MenuModule[],
  userRole: 'admin' | 'manager' | 'member'
): MenuModule[] {
  return menu.map(module => ({
    ...module,
    children: module.children.map(group => ({
      ...group,
      children: group.children.filter(item =>
        !item.roles || item.roles.includes(userRole)
      )
    })).filter(group => group.children.length > 0)
  })).filter(module => module.children.length > 0)
}
