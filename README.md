# ProjectHub - Project Management System (PMS)

ระบบบริหารจัดการโปรเจคแบบครบวงจร สำหรับการจัดการโปรเจค, ทีม, งาน, และทรัพยากร

**Last Updated:** 2026-01-09

---

## 📋 สารบัญ

1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [เทคโนโลยีที่ใช้](#เทคโนโลยีที่ใช้)
3. [โครงสร้างโปรเจค](#โครงสร้างโปรเจค)
4. [ฟีเจอร์หลัก](#ฟีเจอร์หลัก)
5. [Database Schema](#database-schema)
6. [การเชื่อมต่อฐานข้อมูล](#การเชื่อมต่อฐานข้อมูล)
7. [Server Actions API](#server-actions-api)
8. [Components Structure](#components-structure)
9. [State Management](#state-management)
10. [Authentication & Authorization](#authentication--authorization)
11. [Configuration](#configuration)
12. [Getting Started](#getting-started)
13. [Development Guide](#development-guide)

---

## 🎯 ภาพรวมระบบ

**ProjectHub** เป็นระบบ Project Management System (PMS) ระดับ Enterprise ที่พัฒนาด้วย Next.js 16 และ TypeScript สำหรับการจัดการโปรเจคแบบ Agile/Waterfall รวมถึงการติดตาม timeline, ทรัพยากร, timesheet และ team workload

### สถิติโปรเจค
- **167** ไฟล์ TypeScript/TSX
- **1,222+** บรรทัด SQL (migrations, views, stored procedures)
- **18** Server Action modules
- **43** React Components ที่ใช้ local state
- **10+** Database Views
- **14** Modal Components
- **2** Stored Procedures สำหรับ Gantt และ Workload

---

## 🛠️ เทคโนโลยีที่ใช้

### Core Stack
- **Frontend Framework:** Next.js 16.1.1 (React 19.2.3)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3.4.17
- **Database:** Microsoft SQL Server (mssql 12.2.0)
- **Authentication:** JWT (jose) + bcryptjs

### Key Libraries

#### UI & Components
- **UI Components:** Radix UI, Headless UI
- **Icons:** lucide-react
- **Tables:** @tanstack/react-table
- **Gantt Charts:** dhtmlx-gantt 9.1.1
- **Drag & Drop:** @dnd-kit (core, sortable, utilities)
- **Charts:** Recharts 3.6.0
- **Theme:** next-themes (dark mode)
- **Notifications:** sonner
- **Animation:** framer-motion

#### Data & Forms
- **Date Handling:** date-fns 4.1.0, react-day-picker
- **File Export:** xlsx, file-saver
- **State Management:** React Hooks (local state only)
- **Data Fetching:** Next.js Server Actions

#### Development
- **Linting:** ESLint 9
- **CSS Processing:** PostCSS, Autoprefixer

---

## 📁 โครงสร้างโปรเจค

```
/Users/artitsudchat/PMS/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Authentication pages
│   │   ├── login/               # Login page
│   │   ├── register/            # Register page
│   │   └── forgot-password/     # Password recovery
│   ├── (main)/                  # Main authenticated app
│   │   ├── dashboard/           # Dashboard
│   │   ├── projects/            # Project management
│   │   ├── team/                # Team & employee management
│   │   ├── timesheet/           # Timesheet tracking
│   │   ├── reports/             # Reports & analytics
│   │   └── settings/            # System settings
│   ├── api/                     # API routes
│   │   ├── debug-schema/        # DB schema inspection
│   │   └── run-gantt-v3-update/ # Gantt update utility
│   ├── change-password/         # Password change page
│   ├── globals.css              # Global styles
│   └── layout.tsx               # Root layout
│
├── components/                   # React Components (17 subdirectories)
│   ├── ui/                      # Base UI components (16 files)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   └── ...
│   ├── layout/                  # Layout components
│   │   ├── MainLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopNav.tsx
│   │   └── TopNavigation.tsx
│   ├── dashboard/               # Dashboard components
│   │   └── DashboardContent.tsx
│   ├── gantt/                   # Gantt chart components
│   │   ├── GanttChart.tsx
│   │   ├── GanttToolbar.tsx
│   │   ├── GanttContextMenu.tsx
│   │   ├── TaskModal.tsx
│   │   ├── StoryModal.tsx
│   │   ├── QuickAddModal.tsx
│   │   └── AssignTaskModal.tsx
│   ├── projects/                # Project components
│   │   ├── ProjectForm.tsx
│   │   ├── ProjectGanttPage.tsx
│   │   ├── TaskCard.tsx
│   │   └── StoryCard.tsx
│   ├── modals/                  # Modal dialogs (14 files)
│   │   ├── ProjectModal.tsx
│   │   ├── EmployeeModal.tsx
│   │   ├── DepartmentModal.tsx
│   │   ├── CustomerModal.tsx
│   │   └── ...
│   ├── shared/                  # Shared/reusable components
│   │   ├── SuperTable.tsx       # Advanced data table
│   │   ├── DataTable.tsx        # Basic table
│   │   ├── SmartCombobox.tsx    # Searchable dropdown
│   │   ├── DatePicker.tsx
│   │   └── LoadingSpinner.tsx
│   ├── timesheet/               # Timesheet components
│   │   ├── WeeklyTimesheetGrid.tsx
│   │   ├── TimesheetEntryForm.tsx
│   │   └── TimesheetApprovalList.tsx
│   └── workload/                # Workload components
│       └── TeamWorkloadView.tsx
│
├── lib/                          # Business logic & utilities
│   ├── actions/                 # Server Actions (18 files)
│   │   ├── auth-actions.ts
│   │   ├── project-actions.ts
│   │   ├── task-actions.ts
│   │   ├── story-actions.ts
│   │   ├── gantt-actions.ts
│   │   ├── timesheet-actions.ts
│   │   ├── workload-actions.ts
│   │   ├── dashboard-actions.ts
│   │   ├── employee-actions.ts
│   │   ├── department-actions.ts
│   │   ├── position-actions.ts
│   │   ├── customer-actions.ts
│   │   ├── sprint-actions.ts
│   │   └── ...
│   ├── db.ts                    # Database connection pool
│   ├── auth.ts                  # Auth utilities (JWT, session)
│   └── utils.ts                 # Helper utilities
│
├── types/                        # TypeScript definitions (6 files)
│   ├── project.ts
│   ├── task.ts
│   ├── employee.ts
│   ├── timesheet.ts
│   └── ...
│
├── config/                       # Configuration files
│   └── menu.ts                  # Navigation menu structure
│
├── scripts/                      # Database scripts (1,222+ lines)
│   ├── migration.sql            # Auth columns migration
│   ├── gantt-schema-v3.sql      # Gantt procedures (341 lines)
│   ├── dashboard-schema.sql     # Dashboard views (376 lines)
│   ├── workload-schema-update.sql # Workload calculations (183 lines)
│   ├── sprint-schema.sql        # Sprint tables (96 lines)
│   └── gantt-schema-update.sql  # Gantt updates (212 lines)
│
├── hooks/                        # Custom React hooks
│   └── use-debounce.ts
│
├── services/                     # Business services
│
├── public/                       # Static assets
│
├── middleware.ts                 # Next.js middleware (auth routing)
├── next.config.ts               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS config
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies
└── .env.local                   # Environment variables
```

---

## ✨ ฟีเจอร์หลัก

### 1. Dashboard
- **Personal Task Summary:** แสดงงานทั้งหมด, กำลังทำ, เกินกำหนด, ครบกำหนดวันนี้
- **Project Overview:** ภาพรวมโปรเจคที่เกี่ยวข้อง
- **Today's Timesheet Summary:** สรุปเวลาทำงานวันนี้
- **Overdue Tasks List:** รายการงานที่เกินกำหนด
- **Upcoming Milestones:** milestone ที่กำลังจะถึง
- **Team Workload:** workload ของทีม (สำหรับ manager/admin)
- **KPI Metrics:** ตัวชี้วัดประสิทธิภาพ

### 2. Project Management
- **Project CRUD:** สร้าง, แก้ไข, ลบโปรเจค
- **Project List with Filters:** กรองตามปี, ลูกค้า, manager, owner, status, milestones
- **Project Detail View:** ดูรายละเอียดโปรเจคพร้อม Gantt chart
- **Milestone Management:** จัดการ milestones และ deliverables
- **Status Tracking:** ติดตามสถานะโปรเจค
- **Customer Management:** จัดการข้อมูลลูกค้า
- **Progress Tracking:** ติดตาม mandays, stories, tasks
- **Warranty Tracking:** ติดตามระยะเวลา warranty
- **Auto Project Code:** สร้าง project code อัตโนมัติตามปี

### 3. Task & Story Management
- **User Stories:** จัดการ user stories พร้อม acceptance criteria
- **Task Breakdown:** แบ่งงานย่อยภายใต้ stories
- **Assignment:** มอบหมายงานให้ทีม
- **Priority Levels:** critical, high, medium, low
- **Status Workflow:** todo → in_progress → review → done / blocked / cancelled
- **Task Types:** กำหนดประเภทของงาน (configurable)
- **Dependencies:** กำหนดความสัมพันธ์ระหว่างงาน
- **Estimated vs Actual:** เปรียบเทียบชั่วโมงประมาณการกับจริง

### 4. Gantt Chart & Timeline
- **Interactive Gantt Chart:** แสดง timeline แบบ interactive
- **4-Level Hierarchy:** Project → Milestone → Story → Task
- **Bottom-up Calculation:** คำนวณวันที่จาก task ขึ้นไปถึง project
- **Context Menu:** คลิกขวาเพื่อทำ quick actions
- **Drag-and-Drop:** ลากเปลี่ยนวันที่และระยะเวลา
- **Multiple Zoom Levels:** day, week, month, year
- **Warranty Deadline Warning:** เตือนเมื่อใกล้หมด warranty
- **Resource Overlay:** แสดง workload ของทีม

### 5. Timesheet Management
- **Daily Time Entry:** บันทึกเวลาทำงานรายวัน
- **Weekly Timesheet Grid:** แสดงตารางเวลารายสัปดาห์
- **Task-based Tracking:** บันทึกเวลาตาม task
- **Overtime Tracking:** บันทึก overtime แยกต่างหาก
- **Approval Workflow:** draft → submitted → approved/rejected
- **Timesheet Reports:** รายงานสรุปเวลาทำงาน
- **Billable Hours:** แยก billable vs non-billable

### 6. Team Management
- **Employee Directory:** รายชื่อพนักงานทั้งหมด
- **Department Structure:** โครงสร้างแผนก
- **Position Hierarchy:** ระดับตำแหน่ง
- **Role Management:** admin, manager, member
- **Work Schedule:** กำหนดตารางเวลาทำงาน
- **Team Analysis:** วิเคราะห์ทีมและ capacity

### 7. Resource Planning
- **Team Workload Calculator:** คำนวณ workload ของทีม
- **Assignment Impact Analysis:** วิเคราะห์ผลกระทบจากการมอบหมายงาน
- **Capacity Planning:** วางแผนความจุ (working days × hours/day)
- **Threshold Alerts:** เตือนเมื่อ workload 80%+, overload 100%+
- **Resource Suggestions:** แนะนำคนที่เหมาะสมสำหรับงาน

### 8. Sprint Management
- **Sprint Planning:** วางแผน sprint
- **Sprint Tracking:** ติดตาม progress ของ sprint
- **Backlog Management:** จัดการ backlog

### 9. Configuration
- **Milestone Templates:** template สำหรับ milestones
- **Deliverable Types:** ประเภทของ deliverables
- **Project Status Codes:** กำหนดสถานะโปรเจค
- **Task Type Configuration:** กำหนดประเภทงาน
- **System Settings:** ตั้งค่าระบบ

### 10. Authentication & Security
- **JWT Authentication:** JWT token-based auth
- **Role-based Access:** admin, manager, member
- **Password Policy:** บังคับเปลี่ยนรหัสผ่านครั้งแรก
- **Login Protection:** ล็อคบัญชีหลัง 5 ครั้งที่ผิด (15 นาที)
- **Session Management:** 8 ชั่วโมง token expiry
- **Secure Cookies:** HTTP-only cookies

---

## 🗄️ Database Schema

### การเชื่อมต่อฐานข้อมูล

**Database Server Information:**
```
Server IP: 10.8.8.88
Database: MoveonDB
Username: sa
Password: Solutions@Moveon
Schema: pms
```

**Connection Configuration (.env.local):**
```env
DB_SERVER=10.8.8.88
DB_NAME=MoveonDB
DB_USER=sa
DB_PASSWORD=Solutions@Moveon
JWT_SECRET=your-secret-key-here
```

### Main Tables

#### 1. **pms.employees** - พนักงาน
```sql
- id (PK)
- employee_code (UNIQUE)
- prefix, first_name, last_name, nickname
- name_en, name_th
- gender, birth_date
- email (UNIQUE), phone, line_id
- address
- department_id (FK)
- position_id (FK)
- employment_type (full_time, contract, part_time, internship)
- start_date, end_date
- working_hours_per_day (default: 8)
- working_days_per_week (default: 5)
- work_schedule_id (FK)
- password_hash
- must_change_password (BIT, default: 1)
- login_attempts (default: 0)
- locked_until (DATETIME2)
- role (admin, manager, member)
- is_active
- created_at, updated_at
```

#### 2. **pms.projects** - โปรเจค
```sql
- id (PK)
- project_code (UNIQUE)
- project_year
- name, name_th
- description
- customer_id (FK)
- project_manager_id (FK)
- project_owner_id (FK)
- sold_mandays
- manday_rate
- total_value
- warranty_end_date
- status_id (FK)
- current_milestone_id (FK)
- is_active
- created_at, updated_at
```

#### 3. **pms.project_milestones** - Milestones
```sql
- id (PK)
- project_id (FK)
- milestone_config_id (FK)
- planned_mandays
- actual_mandays
- weight_percent
- due_date
- completed_date
- status (pending, in_progress, completed)
- sort_order
- created_at, updated_at
```

#### 4. **pms.project_milestone_deliverables** - Deliverables
```sql
- id (PK)
- project_milestone_id (FK)
- deliverable_config_id (FK)
- is_submitted
- submitted_date
- created_at
```

#### 5. **pms.stories** - User Stories
```sql
- id (PK)
- project_id (FK)
- milestone_id (FK)
- story_code
- title, title_th
- description
- acceptance_criteria
- priority (critical, high, medium, low)
- status (backlog, ready, in_progress, review, done, cancelled)
- estimated_md (mandays)
- actual_md
- progress_percent
- start_date, due_date, completed_date
- depends_on_story_id (FK - self reference)
- sort_order
- created_at, updated_at
```

#### 6. **pms.tasks** - Tasks
```sql
- id (PK)
- story_id (FK)
- task_code
- title
- description
- task_type
- assignee_id (FK → employees)
- reviewer_id (FK → employees)
- priority (critical, high, medium, low)
- status (todo, in_progress, review, done, blocked, cancelled)
- estimated_hours
- actual_hours
- start_date, due_date
- is_active
- created_at, updated_at
```

#### 7. **pms.timesheet_entries** - Timesheet
```sql
- id (PK)
- employee_id (FK)
- task_id (FK)
- entry_date
- hours
- is_overtime
- description
- status (draft, submitted, approved, rejected)
- submitted_at
- approved_at
- approved_by (FK → employees)
- rejection_reason
- created_at, updated_at
```

#### 8. **pms.customers** - ลูกค้า
```sql
- id (PK)
- code (UNIQUE)
- name
- contact_person
- email, phone
- address
- is_active
- created_at, updated_at
```

#### 9. **pms.departments** - แผนก
```sql
- id (PK)
- code (UNIQUE)
- name
- description
- manager_id (FK → employees)
- parent_id (FK - self reference)
- color
- is_active
- created_at, updated_at
```

#### 10. **pms.positions** - ตำแหน่ง
```sql
- id (PK)
- code (UNIQUE)
- name
- level
- department_id (FK)
- min_salary, max_salary
- is_active
- created_at, updated_at
```

### Configuration Tables

#### 11. **pms.milestone_configs** - Milestone Templates
```sql
- id (PK)
- code, name, description
- default_mandays, default_weight_percent
- sort_order
- is_active
```

#### 12. **pms.deliverable_configs** - Deliverable Types
```sql
- id (PK)
- code, name, description
- is_active
```

#### 13. **pms.project_status_configs** - Project Status
```sql
- id (PK)
- code, name, description, color
- is_active
```

#### 14. **pms.task_type_configs** - Task Types
```sql
- id (PK)
- code, name, description
- is_active
```

#### 15. **pms.system_configs** - System Settings
```sql
- id (PK)
- config_key, config_value
- description
- updated_at
```

### Database Views (10+ views)

#### Dashboard Views
1. **vw_dashboard_my_tasks_summary** - สรุปงานของฉัน
2. **vw_dashboard_overdue_tasks** - งานเกินกำหนด
3. **vw_dashboard_today_tasks** - งานวันนี้
4. **vw_dashboard_my_timesheet_today** - timesheet วันนี้
5. **vw_dashboard_my_projects** - โปรเจคของฉัน
6. **vw_dashboard_upcoming_milestones** - milestones ที่กำลังจะถึง
7. **vw_dashboard_team_workload** - workload ของทีม (manager/admin)

### Stored Procedures

#### 1. **sp_get_gantt_data** (341 lines)
```sql
-- ดึงข้อมูล Gantt chart ด้วย bottom-up calculation
-- รวมข้อมูล project, milestones, stories, tasks
-- คำนวณวันที่จาก task → story → milestone → project
-- รองรับ dependencies และ progress tracking
```

#### 2. **sp_get_team_workload** (183 lines)
```sql
-- คำนวณ workload ของทีมในช่วงวันที่กำหนด
-- รวม: existing tasks + new task impact
-- แยกตาม employee และ date range
-- คำนวณ capacity จาก working_hours_per_day
```

### Key Relationships

```
customers
  └── projects
        ├── project_milestones
        │     └── project_milestone_deliverables
        └── stories
              └── tasks
                    └── timesheet_entries

departments
  ├── positions
  │     └── employees (ทั้ง assignee และ reviewer)
  └── employees (manager)

employees (role-based)
  ├── projects (manager, owner)
  ├── tasks (assignee, reviewer)
  └── timesheet_entries
```

---

## 🔌 Server Actions API

Next.js 16 ใช้ **Server Actions** แทน REST API ทั้งหมด (ไม่มี `/api/v1/...`)

### 1. **auth-actions.ts** - Authentication
```typescript
login(employeeCode: string, password: string)
  → { success, user?, error? }

logout()
  → void (clear cookie, redirect)

changePassword(currentPassword: string, newPassword: string)
  → { success, error? }

resetPassword(employeeId: string)
  → { success, error? } // Admin only, reset to '1234'

updateProfile(data: ProfileData)
  → { success, error? }

getSession()
  → UserSession | null
```

### 2. **project-actions.ts** - Projects
```typescript
generateProjectCode(year: number)
  → string // "PJ25-001"

getProjects(filters?: ProjectFilters)
  → Project[]

getProjectById(id: string)
  → Project (with milestones, stories)

getProjectFormOptions()
  → { customers, managers, statuses, milestones }

createProject(data: ProjectCreateData)
  → { success, projectId?, error? }

updateProject(id: string, data: ProjectUpdateData)
  → { success, error? }

deleteProject(id: string)
  → { success, error? }
```

### 3. **story-actions.ts** - User Stories
```typescript
getStories(filters?: StoryFilters)
  → Story[]

getStoryById(id: string)
  → Story (with tasks)

createStory(data: StoryCreateData)
  → { success, storyId?, error? }

updateStory(id: string, data: StoryUpdateData)
  → { success, error? }

deleteStory(id: string)
  → { success, error? }

reorderStories(updates: { id: string, sort_order: number }[])
  → { success, error? }
```

### 4. **task-actions.ts** - Tasks
```typescript
getTaskById(taskId: string)
  → Task (with story, assignee info)

getTasksByStory(storyId: string)
  → Task[]

createTask(data: TaskCreateData)
  → { success, taskId?, error? }

updateTask(id: string, data: TaskUpdateData)
  → { success, error? }

deleteTask(id: string)
  → { success, error? }

assignTask(taskId: string, assigneeId: string)
  → { success, error? }
```

### 5. **gantt-actions.ts** - Gantt Chart
```typescript
getProjectGanttData(projectId: string)
  → GanttData // Using sp_get_gantt_data

getMyGanttData(filters?: GanttFilters)
  → GanttData // Personal gantt view
```

### 6. **workload-actions.ts** - Resource Planning
```typescript
getTeamWorkload(startDate: string, endDate: string, newTaskHours?: number)
  → EmployeeWorkload[] // Using sp_get_team_workload

getAssignmentImpact(taskId: string, assigneeId: string)
  → { current_workload, new_workload, capacity, warning? }
```

### 7. **timesheet-actions.ts** - Timesheet
```typescript
getMyTimesheetEntries(startDate: string, endDate: string)
  → TimesheetEntry[]

createTimesheetEntry(data: TimesheetEntryData)
  → { success, entryId?, error? }

updateTimesheetEntry(id: string, data: TimesheetEntryData)
  → { success, error? }

deleteTimesheetEntry(id: string)
  → { success, error? }

submitTimesheet(employeeId: string, startDate: string, endDate: string)
  → { success, error? }

approveTimesheet(entryIds: string[])
  → { success, error? } // Manager only

rejectTimesheet(entryIds: string[], reason: string)
  → { success, error? } // Manager only
```

### 8. **dashboard-actions.ts** - Dashboard
```typescript
getDashboardData()
  → {
    myTasksSummary,
    todayTasks,
    overdueTasks,
    myProjects,
    todayTimesheet,
    upcomingMilestones,
    teamWorkload? // For managers
  }
```

### 9-18. Other Actions
- **employee-actions.ts** - Employee CRUD
- **department-actions.ts** - Department management
- **position-actions.ts** - Position management
- **customer-actions.ts** - Customer management
- **sprint-actions.ts** - Sprint management
- **milestone-config-actions.ts** - Milestone templates
- **deliverable-config-actions.ts** - Deliverable types
- **project-status-config-actions.ts** - Status configs
- **task-type-config-actions.ts** - Task type configs
- **project-detail-actions.ts** - Detailed project data

---

## 🧩 Components Structure

### UI Components (16 base components)
```
components/ui/
├── button.tsx          - Button variants (default, outline, ghost, destructive)
├── card.tsx            - Card, CardHeader, CardTitle, CardContent
├── input.tsx           - Text input
├── textarea.tsx        - Multi-line input
├── label.tsx           - Form label
├── select.tsx          - Dropdown select
├── checkbox.tsx        - Checkbox
├── badge.tsx           - Status badge
├── avatar.tsx          - User avatar
├── dialog.tsx          - Modal dialog
├── dropdown-menu.tsx   - Dropdown menu
├── table.tsx           - Table components
├── tooltip.tsx         - Tooltip
├── switch.tsx          - Toggle switch
├── skeleton.tsx        - Loading skeleton
└── theme-toggle.tsx    - Dark/Light mode toggle
```

### Layout Components
```
components/layout/
├── MainLayout.tsx      - Main app layout wrapper
├── Sidebar.tsx         - Collapsible navigation sidebar
├── TopNav.tsx          - Top navigation bar
└── TopNavigation.tsx   - Alternative top nav
```

### Feature Components

#### Dashboard
```
components/dashboard/
└── DashboardContent.tsx  - Main dashboard view
```

#### Gantt Chart
```
components/gantt/
├── GanttChart.tsx          - dhtmlx-gantt wrapper
├── GanttToolbar.tsx        - Zoom, view controls
├── GanttContextMenu.tsx    - Right-click menu
├── TaskModal.tsx           - Task CRUD modal
├── StoryModal.tsx          - Story modal
├── QuickAddModal.tsx       - Quick task creation
└── AssignTaskModal.tsx     - Task assignment with workload
```

#### Projects
```
components/projects/
├── ProjectForm.tsx         - Project create/edit form
├── ProjectGanttPage.tsx    - Project detail with Gantt
├── TaskCard.tsx            - Task card component
└── StoryCard.tsx           - Story card component
```

#### Modals (14 modals)
```
components/modals/
├── ProjectModal.tsx
├── ProjectDetailModal.tsx
├── CreateProjectModal.tsx
├── EmployeeModal.tsx
├── DepartmentModal.tsx
├── PositionModal.tsx
├── CustomerModal.tsx
├── MilestoneConfigModal.tsx
├── DeliverableConfigModal.tsx
├── ProjectStatusConfigModal.tsx
├── TaskCreateModal.tsx
├── TaskTypeModal.tsx
├── ConfirmDeleteModal.tsx
└── ...
```

#### Shared Components
```
components/shared/
├── SuperTable.tsx          - Advanced table (sorting, filtering, pagination)
├── DataTable.tsx           - Basic data table
├── SmartCombobox.tsx       - Searchable combobox
├── DeliverableSelect.tsx   - Multi-select deliverables
├── DatePicker.tsx          - Date picker
├── FormattedDate.tsx       - Date formatter
├── LoadingSpinner.tsx      - Loading indicator
├── ConfirmDialog.tsx       - Confirmation dialog
└── Dropdown.tsx            - Custom dropdown
```

#### Timesheet
```
components/timesheet/
├── WeeklyTimesheetGrid.tsx     - Weekly grid view
├── TimesheetEntryForm.tsx      - Entry form
├── TimesheetEntryModal.tsx     - Entry modal
└── TimesheetApprovalList.tsx   - Approval interface
```

#### Workload
```
components/workload/
└── TeamWorkloadView.tsx    - Team capacity view
```

### Component Usage Statistics
- **43 components** use `useState` (local state)
- **251 total** React hook usages
- **14 modal** components
- **16 base UI** components
- **Extensive client interactivity** with server actions

---

## 🔄 State Management

### Architecture: **Local State + Server Actions**

**ไม่มี Global State Library** (ไม่ใช้ Redux, Zustand, Jotai, MobX)

### State Management Strategy

#### 1. Local Component State
```typescript
// UI state (modals, filters, forms)
const [isOpen, setIsOpen] = useState(false)
const [selectedDate, setSelectedDate] = useState<Date>()
const [filters, setFilters] = useState<FilterState>({})
```

#### 2. Server State
```typescript
// Server Actions handle data operations
'use server'
export async function getProjects(filters) {
  const pool = await sql.connect(dbConfig)
  const result = await pool.request().query(...)
  return result.recordset
}
```

#### 3. Session State
```typescript
// JWT token in HTTP-only cookies
const user = await getCurrentUser()
// Available in server components and actions
```

#### 4. Form State
```typescript
// Controlled components with useState
const [formData, setFormData] = useState<FormData>({
  name: '',
  email: ''
})
```

#### 5. URL State
```typescript
// Routing and filters
const pathname = usePathname()
const searchParams = useSearchParams()
```

### Data Flow Pattern

```
┌─────────────────┐
│  User Action    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Client Component│ ← useState (UI state)
└────────┬────────┘
         │ Call server action
         ▼
┌─────────────────┐
│ Server Action   │ ← 'use server'
└────────┬────────┘
         │ SQL query
         ▼
┌─────────────────┐
│   Database      │
└────────┬────────┘
         │ Return data
         ▼
┌─────────────────┐
│ Server Component│
└────────┬────────┘
         │ Pass as props
         ▼
┌─────────────────┐
│ Client Component│ ← Render
└─────────────────┘
         │
         │ revalidatePath()
         └──────► Refresh data
```

### Cache Invalidation
```typescript
import { revalidatePath } from 'next/cache'

export async function updateProject(id: string, data: any) {
  // ... update database
  revalidatePath('/projects')
  revalidatePath(`/projects/${id}`)
}
```

### Benefits of This Approach
- ✅ **Simplicity:** No complex state management setup
- ✅ **Type Safety:** Full TypeScript support
- ✅ **Server-side:** Data fetching on server (better performance)
- ✅ **Automatic Caching:** Next.js handles caching
- ✅ **No Over-fetching:** Fetch only what you need

---

## 🔐 Authentication & Authorization

### Technology Stack
- **JWT Library:** jose (JOSE standard)
- **Password Hashing:** bcryptjs (10 salt rounds)
- **Storage:** HTTP-only cookies (`auth-token`)
- **Token Expiry:** 8 hours
- **Middleware:** Next.js middleware for route protection

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **admin** | ผู้ดูแลระบบ | เข้าถึงทุกอย่าง รวมถึงการตั้งค่าระบบ |
| **manager** | ผู้จัดการโปรเจค | จัดการโปรเจค, ทีม, อนุมัติ timesheet |
| **member** | สมาชิกทั่วไป | ดูโปรเจคที่เกี่ยวข้อง, บันทึกเวลา |

### Security Features

#### 1. Login Protection
```typescript
// ล็อคบัญชีหลังพยายาม login ผิด 5 ครั้ง
- login_attempts: INT (default: 0)
- locked_until: DATETIME2

// ตรวจสอบก่อน login
if (employee.locked_until && employee.locked_until > new Date()) {
  return { error: 'Account locked. Try again after 15 minutes.' }
}

// เพิ่ม attempt เมื่อ login ผิด
if (employee.login_attempts >= 5) {
  locked_until = new Date(Date.now() + 15 * 60 * 1000) // 15 นาที
}
```

#### 2. Password Policy
```typescript
// รหัสผ่านเริ่มต้น
DEFAULT_PASSWORD = '1234'

// บังคับเปลี่ยนรหัสผ่าน
must_change_password: BIT (default: 1)

// การ hash รหัสผ่าน
const hashedPassword = await bcrypt.hash(password, 10)

// การตรวจสอบรหัสผ่าน
const isValid = await bcrypt.compare(password, hashedPassword)
```

#### 3. JWT Token
```typescript
// สร้าง token
const token = await new jose.SignJWT({
  id: employee.id,
  employeeCode: employee.employee_code,
  email: employee.email,
  name: employee.name_en,
  nameTh: employee.name_th,
  nickname: employee.nickname,
  role: employee.role,
  positionCode: employee.position_code,
  departmentId: employee.department_id,
  mustChangePassword: employee.must_change_password
})
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('8h')
  .sign(new TextEncoder().encode(process.env.JWT_SECRET))

// เก็บใน cookie
cookies().set('auth-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 8 // 8 hours
})
```

#### 4. Route Protection (middleware.ts)
```typescript
// Public routes (ไม่ต้อง login)
const publicRoutes = ['/login', '/register', '/forgot-password', '/api/auth']

// Admin-only routes
const adminRoutes = [
  '/admin',
  '/team/employees',
  '/settings/system',
  '/configuration'
]

// Manager routes
const managerRoutes = [
  '/projects/create',
  '/projects/edit',
  '/timesheet/approval'
]

// Middleware logic
if (!token && !isPublicRoute) {
  return NextResponse.redirect(new URL('/login', request.url))
}

if (user.mustChangePassword && pathname !== '/change-password') {
  return NextResponse.redirect(new URL('/change-password', request.url))
}

if (isAdminRoute && user.role !== 'admin') {
  return NextResponse.redirect(new URL('/unauthorized', request.url))
}
```

#### 5. Session Management
```typescript
// ดึงข้อมูล user จาก cookie
export async function getCurrentUser(): Promise<UserSession | null> {
  const token = cookies().get('auth-token')?.value
  if (!token) return null

  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    )
    return payload as UserSession
  } catch {
    return null
  }
}
```

#### 6. Server Action Authorization
```typescript
'use server'
export async function deleteProject(id: string) {
  const user = await getCurrentUser()

  // ตรวจสอบ authentication
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // ตรวจสอบ role
  if (user.role !== 'admin' && user.role !== 'manager') {
    return { success: false, error: 'Insufficient permissions' }
  }

  // ดำเนินการ...
}
```

### User Session Type
```typescript
interface UserSession {
  id: string
  employeeCode: string
  email: string
  name: string                    // name_en
  nameTh: string                  // name_th
  nickname?: string
  role: 'admin' | 'manager' | 'member'
  positionCode?: string
  departmentId?: string
  mustChangePassword: boolean
}
```

### Auth Actions Summary

| Action | Description | Authorization |
|--------|-------------|--------------|
| `login()` | Login ด้วย employee code + password | Public |
| `logout()` | Logout และ clear cookie | Authenticated |
| `changePassword()` | เปลี่ยนรหัสผ่าน | Authenticated (own) |
| `resetPassword()` | Reset รหัสผ่านเป็น '1234' | Admin only |
| `updateProfile()` | แก้ไขข้อมูลส่วนตัว | Authenticated (own) |
| `getSession()` | ดึงข้อมูล session | Authenticated |

---

## ⚙️ Configuration

### 1. Environment Variables (.env.local)
```env
# Database Connection
DB_SERVER=10.8.8.88
DB_NAME=MoveonDB
DB_USER=sa
DB_PASSWORD=Solutions@Moveon

# Authentication
JWT_SECRET=your-secret-key-here-change-in-production

# Optional
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. TypeScript Configuration (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### 3. Tailwind Configuration (tailwind.config.ts)
```typescript
// Custom colors
theme: {
  extend: {
    colors: {
      primary: { /* shades */ },
      secondary: { /* shades */ },
      success: { /* shades */ },
      warning: { /* shades */ },
      danger: { /* shades */ },
      destructive: { /* shades */ }
    },
    borderRadius: {
      lg: 'var(--radius)',
      md: 'calc(var(--radius) - 2px)',
      sm: 'calc(var(--radius) - 4px)'
    }
  }
}

// Dark mode
darkMode: 'class'
```

### 4. Navigation Menu (config/menu.ts)
```typescript
interface MenuItem {
  title: string
  href: string
  icon: LucideIcon
  roles?: ('admin' | 'manager' | 'member')[]
  submenu?: MenuItem[]
}

// Menu structure
const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'manager', 'member']
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: FolderKanban,
    roles: ['admin', 'manager', 'member'],
    submenu: [...]
  },
  // ... more menu items
]
```

### 5. Database Configuration (lib/db.ts)
```typescript
import sql from 'mssql'

const dbConfig: sql.config = {
  server: process.env.DB_SERVER!,
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
}
```

### 6. Next.js Configuration (next.config.ts)
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Default Next.js 16 config
  // Can be extended for:
  // - images: { domains: [...] }
  // - redirects: async () => [...]
  // - headers: async () => [...]
}

export default nextConfig
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** 18.x or higher
- **npm/yarn/pnpm:** Latest version
- **SQL Server:** Access to SQL Server (10.8.8.88)
- **Database:** MoveonDB with `pms` schema

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd PMS

# 2. Install dependencies
npm install
# or
yarn install
# or
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials

# 4. Run database migrations
# Execute SQL scripts in /scripts/ directory:
# - migration.sql
# - gantt-schema-v3.sql
# - dashboard-schema.sql
# - workload-schema-update.sql
# - sprint-schema.sql

# 5. Run development server
npm run dev
# or
yarn dev
# or
pnpm dev

# 6. Open browser
# Navigate to http://localhost:3000
```

### Default Login
```
Employee Code: (ตาม database)
Password: 1234 (ต้องเปลี่ยนรหัสผ่านครั้งแรก)
```

### Build for Production
```bash
# Build
npm run build

# Start production server
npm run start
```

---

## 📖 Development Guide

### Project Conventions

#### 1. File Naming
- **Components:** PascalCase (`ProjectForm.tsx`, `TaskCard.tsx`)
- **Actions:** kebab-case (`project-actions.ts`, `auth-actions.ts`)
- **Types:** kebab-case (`project.ts`, `employee.ts`)
- **Utilities:** kebab-case (`utils.ts`, `db.ts`)

#### 2. Component Structure
```typescript
'use client' // If using client-side features

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createProject } from '@/lib/actions/project-actions'

interface ProjectFormProps {
  initialData?: Project
  onSuccess?: () => void
}

export function ProjectForm({ initialData, onSuccess }: ProjectFormProps) {
  const [formData, setFormData] = useState(initialData || {})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await createProject(formData)
    if (result.success) {
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form content */}
    </form>
  )
}
```

#### 3. Server Actions Structure
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import sql from 'mssql'
import { dbConfig } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function createProject(data: ProjectCreateData) {
  // 1. Authorization check
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return { success: false, error: 'Unauthorized' }
  }

  // 2. Validation
  if (!data.name || !data.customer_id) {
    return { success: false, error: 'Missing required fields' }
  }

  // 3. Database operation
  try {
    const pool = await sql.connect(dbConfig)
    const result = await pool.request()
      .input('name', sql.NVarChar, data.name)
      .input('customer_id', sql.UniqueIdentifier, data.customer_id)
      .query(`
        INSERT INTO pms.projects (name, customer_id, ...)
        OUTPUT INSERTED.id
        VALUES (@name, @customer_id, ...)
      `)

    const projectId = result.recordset[0].id

    // 4. Cache invalidation
    revalidatePath('/projects')

    return { success: true, projectId }
  } catch (error) {
    console.error('Create project error:', error)
    return { success: false, error: 'Database error' }
  }
}
```

#### 4. Type Definitions
```typescript
// types/project.ts
export interface Project {
  id: string
  project_code: string
  project_year: number
  name: string
  name_th?: string
  description?: string
  customer_id: string
  customer_name?: string
  project_manager_id: string
  project_owner_id: string
  sold_mandays: number
  manday_rate: number
  total_value: number
  warranty_end_date?: Date
  status_id: string
  current_milestone_id?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface ProjectCreateData {
  name: string
  name_th?: string
  description?: string
  customer_id: string
  project_manager_id: string
  project_owner_id: string
  sold_mandays: number
  manday_rate: number
  warranty_end_date?: string
  status_id: string
  milestones: MilestoneData[]
}
```

#### 5. Database Queries
```typescript
// Use parameterized queries to prevent SQL injection
const result = await pool.request()
  .input('id', sql.UniqueIdentifier, projectId)
  .input('status', sql.NVarChar, 'in_progress')
  .query(`
    UPDATE pms.projects
    SET status_id = @status, updated_at = GETDATE()
    WHERE id = @id
  `)
```

### Common Patterns

#### Pattern 1: Modal with Form
```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createProject } from '@/lib/actions/project-actions'

export function CreateProjectModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({})

  async function handleSubmit() {
    const result = await createProject(formData)
    if (result.success) {
      setIsOpen(false)
      // Optionally refresh data
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        {/* Form fields */}
        <Button onClick={handleSubmit}>Create</Button>
      </DialogContent>
    </Dialog>
  )
}
```

#### Pattern 2: Data Table with Server Actions
```typescript
'use client'

import { SuperTable } from '@/components/shared/SuperTable'
import { getProjects } from '@/lib/actions/project-actions'

export function ProjectListPage() {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    async function loadProjects() {
      const data = await getProjects()
      setProjects(data)
    }
    loadProjects()
  }, [])

  const columns = [
    { accessorKey: 'project_code', header: 'Code' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'customer_name', header: 'Customer' }
  ]

  return <SuperTable data={projects} columns={columns} />
}
```

#### Pattern 3: Protected Page
```typescript
// app/(main)/admin/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function AdminPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin') {
    redirect('/unauthorized')
  }

  return (
    <div>
      {/* Admin content */}
    </div>
  )
}
```

### Development Tools

#### VS Code Extensions (Recommended)
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- SQL Server (mssql)

#### Useful Commands
```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
# Connect to SQL Server and run scripts in /scripts/

# Git
git status
git add .
git commit -m "feat: add new feature"
git push
```

### Debugging Tips

#### 1. Server Actions
```typescript
// Add console.log in server actions
'use server'
export async function createProject(data: any) {
  console.log('Creating project with data:', data)
  // ... rest of code
}
```

#### 2. Database Queries
```typescript
// Log query results
const result = await pool.request().query(...)
console.log('Query result:', result.recordset)
```

#### 3. Authentication
```typescript
// Check user session
const user = await getCurrentUser()
console.log('Current user:', user)
```

#### 4. Middleware
```typescript
// Add logging in middleware.ts
console.log('Request:', request.nextUrl.pathname)
console.log('User:', user)
```

---

## 📝 Notes

### Important Design Decisions

1. **No Global State Library**
   - ใช้ local state + server actions แทน Redux/Zustand
   - ทำให้ code ง่ายขึ้นและ maintain ง่าย

2. **Server Actions over REST API**
   - ใช้ Next.js Server Actions แทน REST API
   - Type-safe, ไม่ต้องจัดการ API routes
   - Built-in caching และ revalidation

3. **Bottom-up Date Calculation**
   - Gantt chart คำนวณวันจาก task → story → milestone → project
   - ทำให้ timeline accurate กว่า

4. **Role-based Authorization**
   - 3 roles: admin, manager, member
   - Middleware + server action checks
   - Flexible และ maintainable

5. **JWT in HTTP-only Cookies**
   - ปลอดภัยกว่า localStorage
   - Auto send กับทุก request
   - 8 ชั่วโมง expiry

### Known Issues / Future Improvements
- [ ] เพิ่ม form validation library (React Hook Form, Zod)
- [ ] เพิ่ม testing (Jest, React Testing Library)
- [ ] เพิ่ม error boundary
- [ ] เพิ่ม loading states
- [ ] Optimize database queries (indexes, query optimization)
- [ ] Add API rate limiting
- [ ] Implement real-time updates (WebSocket/SSE)
- [ ] Add file upload for attachments
- [ ] Export reports to PDF
- [ ] Email notifications for deadlines

---

## 📄 License

[Add your license here]

---

## 👥 Contributors

[Add contributors here]

---

## 📞 Contact

[Add contact information here]

---

**Last Updated:** 2026-01-09
**Version:** 1.0.0
**Maintained by:** Development Team
