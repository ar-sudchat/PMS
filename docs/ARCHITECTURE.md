# 🏗️ PMSoftware - Architecture & Concept Guide

> เอกสารสำหรับ AI เพื่อเรียนรู้โครงสร้างและแนวคิดของระบบ

---

## 📋 Overview

**PMSoftware** เป็นระบบ **Project Management System** สำหรับบริหารจัดการโครงการซอฟต์แวร์
พัฒนาด้วย **Next.js 16** + **TypeScript** + **SQL Server**

### 🎯 Core Features
1. **Project Management** - จัดการโครงการ, Milestones, Deliverables
2. **Resource Planning** - วางแผนทรัพยากรและคน
3. **Timesheet** - บันทึกเวลาทำงาน
4. **My Tasks** - ติดตามงานของตัวเอง
5. **KPI Tracking** - วัดผลประสิทธิภาพการทำงาน
6. **Gantt Chart** - แสดงแผนงานแบบ Timeline

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | TailwindCSS 3.4 |
| **UI Components** | Radix UI, Lucide Icons, Sonner Toast |
| **Charts** | Recharts, DHTMLX Gantt |
| **Tables** | TanStack Table |
| **Drag & Drop** | DnD Kit |
| **Backend** | Next.js Server Actions |
| **Database** | SQL Server (mssql package) |
| **Auth** | Custom JWT with jose + bcryptjs |

---

## 📁 Project Structure

```
PMSoftware/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login)
│   ├── (main)/                   # Main app routes
│   │   ├── projects/             # Project management
│   │   ├── my-projects/          # My projects (Gantt)
│   │   ├── my-tasks/             # Task tracking
│   │   ├── timesheet/            # Timesheet
│   │   ├── pm-dashboard/         # PM Dashboard
│   │   ├── kpi-record/           # KPI tracking
│   │   ├── team/                 # Team management
│   │   └── ...
│   ├── api/                      # API routes
│   └── layout.tsx                # Root layout
│
├── components/                   # React Components
│   ├── ui/                       # Base UI (Button, Input, Dialog...)
│   ├── layout/                   # MainLayout, Sidebar, Header
│   ├── modals/                   # Common modals
│   ├── projects/                 # Project-related components
│   ├── gantt/                    # Gantt chart components
│   ├── timesheet/                # Timesheet components
│   ├── my-tasks/                 # My Tasks components
│   ├── kpi-record/               # KPI tracking components
│   └── shared/                   # Shared components
│
├── lib/                          # Core libraries
│   ├── actions/                  # Server Actions (35+ files)
│   ├── constants/                # Constants
│   ├── utils/                    # Utilities
│   ├── db.ts                     # Database connection
│   └── auth.ts                   # Authentication
│
├── types/                        # TypeScript definitions
│   ├── project.ts                # Project types
│   ├── employee.ts               # Employee types
│   └── ...
│
├── config/                       # Configuration
│   └── menu.ts                   # Menu configuration
│
├── database/                     # Database files
│   ├── migrations/               # SQL migrations
│   ├── views/                    # SQL views
│   └── MIGRATION_TRACKER.md      # Track migrations
│
└── scripts/                      # SQL scripts
```

---

## 🗄️ Database Schema

### Schema: `pms`
ใช้ schema แยกจาก dbo เพื่อความเป็นระเบียบ

### Core Tables

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ORGANIZATION                                │
├─────────────────────────────────────────────────────────────────────┤
│ departments          │ แผนก                                         │
│ positions            │ ตำแหน่งงาน                                    │
│ employees            │ พนักงาน (มี login)                            │
│ customers            │ ลูกค้า                                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        CONFIG TABLES                                 │
├─────────────────────────────────────────────────────────────────────┤
│ project_status_configs   │ สถานะโครงการ (Planning, In Progress...)  │
│ milestone_configs        │ Template milestones                       │
│ deliverable_configs      │ Template deliverables                     │
│ task_type_configs        │ ประเภทงาน (Dev, Bug, Test...)            │
│ project_types            │ ประเภทโครงการ (Dev, Support, Consult)    │
│ system_configs           │ ค่าตั้งระบบทั่วไป                          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        PROJECT TABLES                                │
├─────────────────────────────────────────────────────────────────────┤
│ projects                 │ โครงการหลัก                               │
│ project_milestones       │ Milestones ของโครงการ                     │
│ project_deliverables     │ Deliverables ของแต่ละ Milestone           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         WORK ITEMS                                   │
├─────────────────────────────────────────────────────────────────────┤
│ stories                  │ User Stories                              │
│ tasks                    │ งานย่อยใน Story                           │
│ sprints                  │ Sprints (Agile)                           │
│ timesheet_entries        │ บันทึกเวลาทำงาน                            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         KPI TABLES                                   │
├─────────────────────────────────────────────────────────────────────┤
│ deploy_records           │ บันทึกการ Deploy                          │
│ backup_sources           │ แหล่งข้อมูลที่ต้อง Backup                  │
│ deploy_backup_records    │ บันทึกการ Backup ก่อน Deploy              │
│ meeting_minutes_records  │ บันทึกรายงานการประชุม                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Entity Relationships

```
projects
    ├── project_milestones (1:N)
    │       └── project_deliverables (1:N)
    │
    ├── stories (1:N)
    │       └── tasks (1:N)
    │               └── timesheet_entries (1:N)
    │
    └── sprints (1:N)
            └── tasks (N:1 - optional)
```

### Key Fields Patterns

| Pattern | ตัวอย่าง | ใช้สำหรับ |
|---------|----------|-----------|
| `id` | UNIQUEIDENTIFIER | Primary Key (GUID) |
| `code` | NVARCHAR(20) | Business Key (unique) |
| `name` / `name_th` | NVARCHAR | ชื่อ EN/TH |
| `is_active` | BIT | Soft delete flag |
| `sort_order` | INT | เรียงลำดับ |
| `created_at` / `updated_at` | DATETIME2 | Audit fields |

---

## 🔌 Server Actions Pattern

### Location: `/lib/actions/`

ใช้ **Server Actions** ของ Next.js แทน API Routes

### Pattern ทั่วไป:

```typescript
'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'

export async function getItems() {
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .query(`SELECT * FROM pms.items WHERE is_active = 1`)
    return result.recordset
  } catch (error) {
    console.error('Error:', error)
    return []
  }
}

export async function createItem(data: ItemData) {
  try {
    const pool = await getConnection()
    await pool.request()
      .input('name', sql.NVarChar, data.name)
      .query(`INSERT INTO pms.items (name) VALUES (@name)`)
    
    revalidatePath('/items')
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
```

### Action Files (35+ files):

| File | Purpose |
|------|---------|
| `project-actions.ts` | CRUD โครงการ, Filter options |
| `milestone-actions.ts` | จัดการ Milestones |
| `task-actions.ts` | จัดการ Tasks |
| `story-actions.ts` | จัดการ Stories |
| `timesheet-actions.ts` | บันทึกเวลา |
| `employee-actions.ts` | จัดการพนักงาน |
| `gantt-actions.ts` | ข้อมูลสำหรับ Gantt Chart |
| `dashboard-actions.ts` | Dashboard data |
| `kpi-actions.ts` | KPI calculations |
| `auth-actions.ts` | Login, Session |

---

## 🧩 Component Patterns

### 1. Page Component Pattern

```tsx
// app/(main)/items/page.tsx
import ItemListClient from '@/components/items/ItemListClient'
import { getItems } from '@/lib/actions/item-actions'

export default async function ItemsPage() {
  const items = await getItems()
  return <ItemListClient initialData={items} />
}
```

### 2. Client Component Pattern

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createItem } from '@/lib/actions/item-actions'

export default function ItemListClient({ initialData }) {
  const [items, setItems] = useState(initialData)
  const [loading, setLoading] = useState(false)
  
  const handleCreate = async () => {
    setLoading(true)
    const result = await createItem({ name: 'New Item' })
    if (result.success) {
      // Refresh data
    }
    setLoading(false)
  }
  
  return (
    <div>
      <Button onClick={handleCreate} disabled={loading}>
        Add Item
      </Button>
      {/* List items */}
    </div>
  )
}
```

### 3. Modal Pattern

```tsx
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'

interface ItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: Item
  onSuccess?: () => void
}

export function ItemModal({ open, onOpenChange, item, onSuccess }: ItemModalProps) {
  const isEdit = !!item
  
  const handleSubmit = async () => {
    // Save logic
    onSuccess?.()
    onOpenChange(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Create'} Item</DialogTitle>
        </DialogHeader>
        {/* Form content */}
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🎛️ Menu Configuration

### Location: `/config/menu.ts`

```typescript
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
```

### Menu Structure:

```
📊 Dashboard
   └── Overview: Home, PM Dashboard, Activities

📁 Projects
   ├── Project Management: All Projects, My Projects, Resource Planning
   └── Settings: Project Types, Milestones, Deliverables, Statuses...

⏱️ Timesheet
   ├── Time Tracking: My Tasks, My Timesheet
   └── Analytics: Employee Work Report, Resource Planning

👥 Team
   └── Team Management: Employees, Departments, Positions

📋 KPI Record
   ├── KPI Tracking: Deploy Success, Deploy Backup, Meeting Minutes...
   └── Settings: Backup Sources

⚙️ Configuration
   └── System: Settings, Profile
```

---

## 📊 Key Business Concepts

### 1. Project Hierarchy

```
Project
├── Milestones (จากTemplate หรือ Custom)
│   ├── Deliverables (เอกสารส่งมอบ)
│   ├── weight_ttd (น้ำหนัก TTD %)
│   └── weight_mdc (น้ำหนัก MDC %)
│
├── Stories (User Stories)
│   └── Tasks (งานย่อย)
│       ├── assignee_id (ผู้รับผิดชอบ)
│       ├── status (todo, in_progress, review, done, done_not_planned)
│       └── timesheet_entries (บันทึกเวลา)
│
└── Sprints (optional - Agile)
```

### 2. Task Status Flow

```
todo → in_progress → review → done
                         ↘
                      done_not_planned (สำหรับ Issue Clearing KPI)
```

### 3. KPI Metrics

| KPI | Formula | Target |
|-----|---------|--------|
| **TTD** (Time to Delivery) | Actual Mandays / Planned Mandays | ≤ 100% |
| **MDC** (Milestone Completion) | Completed / Total Milestones | ≥ Target |
| **Issue Clearing Rate** | Done / Total Completed × 100 | ≥ 85% |
| **Deploy Success** | Success / Total Deploys × 100 | ≥ 95% |
| **Docs On-time** | On-time / Total × 100 | ≥ 90% |

### 4. Milestone Approval Flow

```
Milestone Created
     ↓
Work in Progress
     ↓
Deliverables Submitted
     ↓
PM Reviews & Verifies Deliverables
     ↓
Milestone Locked (is_locked = true)
     ↓
Milestone Approved (is_approved = true)
```

---

## 🗃️ TypeScript Types

### Project Types (`/types/project.ts`)

```typescript
export interface Project {
  id: string
  project_code: string
  project_year: number
  name: string
  name_th?: string
  customer_id: string
  project_manager_id: string
  project_owner_id?: string
  project_type_id?: string
  status_id?: string
  current_milestone_id?: string
  sold_mandays: number
  manday_rate: number
  is_active: boolean
  milestones?: ProjectMilestone[]
}

export interface ProjectMilestone {
  id?: string
  milestone_config_id: string
  weight_ttd?: number
  weight_mdc?: number
  due_date?: string
  completed_date?: string
  is_locked?: boolean
  is_approved?: boolean
  deliverables?: ProjectDeliverable[]
}

export interface ProjectDeliverable {
  id: string
  name: string
  is_required: boolean
  submitted_date?: string
  is_verified?: boolean
}
```

### Employee Types (`/types/employee.ts`)

```typescript
export type Role = 'super_admin' | 'admin' | 'manager' | 'member' | 'viewer'
export type Status = 'active' | 'inactive' | 'suspended' | 'resigned'

export interface Employee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  email: string
  department_id: string
  position_id: string
  role: Role
  status: Status
  working_hours_per_day: number
}
```

---

## 🔐 Authentication

### Pattern:
- Login form → Server Action → JWT Token → Cookie
- Middleware checks token on protected routes
- Guest redirect to `/login`

### Files:
- `/lib/auth.ts` - JWT utilities
- `/lib/actions/auth-actions.ts` - Login actions
- `/middleware.ts` - Route protection

---

## 🎨 UI Components

### Base Components (`/components/ui/`)

| Component | Source |
|-----------|--------|
| `Button` | Custom (variants) |
| `Input`, `Label` | Radix UI |
| `Dialog` | Radix UI |
| `Select` | Radix UI |
| `Avatar` | Radix UI |
| `DataTable` | TanStack Table |

### Layout Components (`/components/layout/`)

| Component | Purpose |
|-----------|---------|
| `MainLayout` | Overall layout with sidebar |
| `Sidebar` | Navigation sidebar (collapsible) |
| `Header` | Top header with user menu |
| `Breadcrumb` | Navigation breadcrumb |

---

## 📝 Development Guidelines

### 1. Adding New Feature

1. **Database**: สร้าง migration script ใน `database/migrations/`
2. **Types**: เพิ่ม types ใน `/types/`
3. **Actions**: สร้าง server actions ใน `/lib/actions/`
4. **Components**: สร้าง components ใน `/components/`
5. **Pages**: สร้าง pages ใน `/app/(main)/`
6. **Menu**: เพิ่มเมนูใน `/config/menu.ts`
7. **Track**: อัพเดท `database/MIGRATION_TRACKER.md`

### 2. Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase | `ProjectModal.tsx` |
| Action File | kebab-case | `project-actions.ts` |
| Action Function | camelCase | `getProjects()` |
| SQL Table | snake_case | `project_milestones` |
| TypeScript Interface | PascalCase | `ProjectMilestone` |

### 3. Error Handling

```typescript
try {
  const pool = await getConnection()
  // ... SQL operations
  return { success: true, data: result }
} catch (error) {
  console.error('[ActionName] Error:', error)
  return { success: false, error: String(error) }
}
```

---

## 🔄 Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Browser   │────▶│ Server Action │────▶│ SQL Server │
│  (Client)   │◀────│  (Next.js)   │◀────│    (DB)    │
└─────────────┘     └──────────────┘     └────────────┘
      │                    │
      ▼                    ▼
  State Update      revalidatePath()
```

---

## 🚀 Environment Variables

```env
# Database
DB_SERVER=10.8.8.88
DB_NAME=PMSoftware        # Test
# DB_NAME=MoveonDB        # Production
DB_USER=sa
DB_PASSWORD=Solutions@Moveon

# Auth
JWT_SECRET=your-secret-key
```

---

## 📌 Quick Reference

### Run Development
```bash
npm run dev
# → http://localhost:3000
```

### Database Environments
- **Test**: `DB_NAME=PMSoftware`
- **Production**: `DB_NAME=MoveonDB`

### Key Paths
- Actions: `/lib/actions/`
- Components: `/components/`
- Pages: `/app/(main)/`
- Types: `/types/`
- Menu: `/config/menu.ts`
- DB Schema: `/scripts/00_full_schema.sql`

---

> 📅 Last Updated: 2026-01-12
> 📧 For AI: ใช้เอกสารนี้เพื่อเข้าใจโครงสร้างและพัฒนาต่อได้ทันที
