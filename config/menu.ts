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
          { id: 'home', label: 'Home', labelTh: 'หน้าหลัก', path: '/', icon: LayoutDashboard },
          { id: 'pm-dashboard', label: 'PM Dashboard', labelTh: 'แดชบอร์ด PM', path: '/pm-dashboard', icon: PieChart },
          { id: 'activities', label: 'Activities', labelTh: 'กิจกรรม', path: '/activities', icon: Activity },
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
        id: 'project-settings',
        title: 'Settings',
        titleTh: 'ตั้งค่า',
        children: [
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
          { id: 'my-timesheet', label: 'My Timesheet', labelTh: 'บันทึกเวลาของฉัน', path: '/timesheet', icon: Clock },
        ]
      },
      {
        id: 'analytics',
        title: 'Analytics',
        titleTh: 'วิเคราะห์',
        children: [
          { id: 'employee-work-report', label: 'Employee Work Report', labelTh: 'รายงานการทำงาน', path: '/analytics/employee-work', icon: BarChart3 },
          { id: 'all-resources', label: 'Resource Planning', labelTh: 'วางแผนทรัพยากร', path: '/projects/resource-planning', icon: Users },
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
  { id: 'timesheet', label: 'Timesheet', labelTh: 'บันทึกเวลา', path: '/timesheet', icon: Clock },
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
