# PMS PROJECT - DATA DICTIONARY
**Version:** 1.0
**Date:** 2026-01-10
**Database:** Microsoft SQL Server
**Schema:** pms

---

## TABLE OF CONTENTS
1. [Database Overview](#database-overview)
2. [Project Management Tables](#project-management-tables)
3. [Human Resources Tables](#human-resources-tables)
4. [Configuration Tables](#configuration-tables)
5. [Timesheet & Sprint Tables](#timesheet--sprint-tables)
6. [Database Views](#database-views)
7. [Stored Procedures](#stored-procedures)
8. [Entity Relationships](#entity-relationships)
9. [Data Types Reference](#data-types-reference)
10. [Business Rules](#business-rules)

---

## WORKSHEET 1: DATABASE OVERVIEW

### Database Information
| Property | Value |
|----------|-------|
| Database Type | Microsoft SQL Server |
| Schema Name | pms |
| Total Core Tables | 16 |
| Total Views | 11 |
| Total Stored Procedures | 2 |
| Character Set | Unicode (NVARCHAR) |
| Collation | SQL_Latin1_General_CP1_CI_AS |

### Table Categories
| Category | Table Count | Tables |
|----------|-------------|--------|
| Project Management | 5 | projects, project_milestones, project_milestone_deliverables, stories, tasks |
| Human Resources | 3 | employees, departments, positions |
| Configuration | 6 | milestone_configs, deliverable_configs, project_status_configs, task_type_configs, customers, system_configs |
| Operations | 2 | timesheet_entries, sprints |

---

## WORKSHEET 2: PROJECTS TABLE

### Table: pms.projects
**Description:** Core project information and tracking
**Primary Key:** id
**Record Type:** Transactional
**Soft Delete:** is_active = 0

| # | Column Name | Data Type | Length | Nullable | Default | Description | Constraints | References |
|---|-------------|-----------|---------|----------|---------|-------------|-------------|------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key | PK, UNIQUE | - |
| 2 | project_code | NVARCHAR | 50 | NO | - | Project code (YYXXXX format) | UNIQUE | - |
| 3 | project_year | INT | 4 | NO | - | Year of project creation | - | - |
| 4 | name | NVARCHAR | 255 | NO | - | Project name (English) | - | - |
| 5 | name_th | NVARCHAR | 255 | YES | NULL | Project name (Thai) | - | - |
| 6 | description | NVARCHAR | MAX | YES | NULL | Project description | - | - |
| 7 | customer_id | UNIQUEIDENTIFIER | 16 | NO | - | Customer/client reference | FK | customers.id |
| 8 | project_manager_id | UNIQUEIDENTIFIER | 16 | NO | - | Project manager | FK | employees.id |
| 9 | project_owner_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Project owner | FK | employees.id |
| 10 | sold_mandays | DECIMAL | (10,2) | NO | 0 | Contracted man-days | CHECK >= 0 | - |
| 11 | manday_rate | DECIMAL | (10,2) | NO | 0 | Rate per man-day | CHECK >= 0 | - |
| 12 | total_value | DECIMAL | (15,2) | NO | 0 | Total project value | CHECK >= 0 | - |
| 13 | warranty_end_date | DATE | 3 | YES | NULL | Warranty expiration | - | - |
| 14 | status_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Current status | FK | project_status_configs.id |
| 15 | current_milestone_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Current milestone | FK | project_milestones.id |
| 16 | actual_mandays | DECIMAL | (10,2) | YES | 0 | Used man-days | - | - |
| 17 | end_date | DATE | 3 | YES | NULL | Project end date | - | - |
| 18 | contract_end_date | DATE | 3 | YES | NULL | Contract completion | - | - |
| 19 | is_active | BIT | 1 | NO | 1 | Active status flag | - | - |
| 20 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp | - | - |
| 21 | updated_at | DATETIME2 | 8 | NO | GETDATE() | Last update timestamp | - | - |

**Indexes:**
- PK_projects (CLUSTERED) ON id
- IX_projects_code (UNIQUE) ON project_code
- IX_projects_status ON status_id
- IX_projects_manager ON project_manager_id
- IX_projects_year ON project_year

**Business Rules:**
1. project_code must follow YYXXXX format (2-digit year + 4-digit sequence)
2. total_value = sold_mandays × manday_rate
3. actual_mandays cannot exceed sold_mandays
4. Warranty check: Display warning if milestone end_date > warranty_end_date

---

## WORKSHEET 3: PROJECT_MILESTONES TABLE

### Table: pms.project_milestones
**Description:** Milestone instances within projects
**Primary Key:** id
**Record Type:** Transactional

| # | Column Name | Data Type | Length | Nullable | Default | Description | Constraints | References |
|---|-------------|-----------|---------|----------|---------|-------------|-------------|------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key | PK, UNIQUE | - |
| 2 | project_id | UNIQUEIDENTIFIER | 16 | NO | - | Parent project | FK | projects.id |
| 3 | milestone_config_id | UNIQUEIDENTIFIER | 16 | NO | - | Milestone type | FK | milestone_configs.id |
| 4 | planned_mandays | DECIMAL | (10,2) | NO | 0 | Planned effort | CHECK >= 0 | - |
| 5 | weight_percent | DECIMAL | (5,2) | NO | 0 | % of project value | CHECK 0-100 | - |
| 6 | due_date | DATE | 3 | YES | NULL | Target completion | - | - |
| 7 | actual_mandays | DECIMAL | (10,2) | YES | 0 | Actual effort used | - | - |
| 8 | completed_date | DATE | 3 | YES | NULL | Completion date | - | - |
| 9 | status | NVARCHAR | 20 | NO | 'pending' | Milestone status | IN ('pending', 'in_progress', 'completed') | - |
| 10 | sort_order | INT | 4 | YES | 0 | Display order | - | - |
| 11 | is_active | BIT | 1 | NO | 1 | Active flag | - | - |
| 12 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp | - | - |
| 13 | updated_at | DATETIME2 | 8 | NO | GETDATE() | Update timestamp | - | - |

**Indexes:**
- PK_project_milestones (CLUSTERED) ON id
- IX_milestones_project ON project_id
- IX_milestones_config ON milestone_config_id
- IX_milestones_status ON status

**Business Rules:**
1. Sum of weight_percent for all milestones in a project should equal 100%
2. Status transitions: pending → in_progress → completed
3. completed_date required when status = 'completed'
4. actual_mandays cannot exceed planned_mandays (warning only)

---

## WORKSHEET 4: STORIES TABLE

### Table: pms.stories
**Description:** User stories/requirements within projects
**Primary Key:** id
**Record Type:** Transactional

| # | Column Name | Data Type | Length | Nullable | Default | Description | Constraints | References |
|---|-------------|-----------|---------|----------|---------|-------------|-------------|------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key | PK, UNIQUE | - |
| 2 | project_id | UNIQUEIDENTIFIER | 16 | NO | - | Parent project | FK | projects.id |
| 3 | milestone_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Associated milestone | FK | project_milestones.id |
| 4 | story_code | NVARCHAR | 50 | NO | - | Story identifier | UNIQUE | - |
| 5 | title | NVARCHAR | 255 | NO | - | Story title | - | - |
| 6 | title_th | NVARCHAR | 255 | YES | NULL | Story title (Thai) | - | - |
| 7 | description | NVARCHAR | MAX | YES | NULL | Story description | - | - |
| 8 | acceptance_criteria | NVARCHAR | MAX | YES | NULL | Acceptance criteria | - | - |
| 9 | priority | NVARCHAR | 20 | NO | 'medium' | Priority level | IN ('critical', 'high', 'medium', 'low') | - |
| 10 | status | NVARCHAR | 20 | NO | 'backlog' | Story status | IN ('backlog', 'ready', 'in_progress', 'review', 'done', 'cancelled') | - |
| 11 | estimated_md | DECIMAL | (10,2) | NO | 0 | Estimated man-days | CHECK >= 0 | - |
| 12 | actual_md | DECIMAL | (10,2) | YES | 0 | Actual man-days | - | - |
| 13 | progress_percent | INT | 4 | NO | 0 | % completion | CHECK 0-100 | - |
| 14 | start_date | DATE | 3 | YES | NULL | Start date | - | - |
| 15 | due_date | DATE | 3 | YES | NULL | Due date | - | - |
| 16 | completed_date | DATE | 3 | YES | NULL | Completion date | - | - |
| 17 | depends_on_story_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Dependency | FK | stories.id (self-join) |
| 18 | sort_order | INT | 4 | YES | 0 | Display order | - | - |
| 19 | is_active | BIT | 1 | NO | 1 | Active flag | - | - |
| 20 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp | - | - |

**Indexes:**
- PK_stories (CLUSTERED) ON id
- IX_stories_code (UNIQUE) ON story_code
- IX_stories_project ON project_id
- IX_stories_milestone ON milestone_id
- IX_stories_status ON status

**Business Rules:**
1. story_code format: S-XXXX (auto-generated)
2. progress_percent calculated from child tasks: (completed_tasks / total_tasks) × 100
3. due_date must be >= start_date
4. completed_date required when status = 'done'
5. Cannot delete story if has active dependencies

---

## WORKSHEET 5: TASKS TABLE

### Table: pms.tasks
**Description:** Detailed tasks within stories
**Primary Key:** id
**Record Type:** Transactional

| # | Column Name | Data Type | Length | Nullable | Default | Description | Constraints | References |
|---|-------------|-----------|---------|----------|---------|-------------|-------------|------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key | PK, UNIQUE | - |
| 2 | task_code | NVARCHAR | 50 | NO | - | Task identifier | UNIQUE | - |
| 3 | story_id | UNIQUEIDENTIFIER | 16 | NO | - | Parent story | FK | stories.id |
| 4 | title | NVARCHAR | 255 | NO | - | Task title | - | - |
| 5 | description | NVARCHAR | MAX | YES | NULL | Task description | - | - |
| 6 | task_type | NVARCHAR | 20 | NO | 'feature' | Task type | FK | task_type_configs.code |
| 7 | assignee_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Assigned employee | FK | employees.id |
| 8 | reviewer_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Reviewer | FK | employees.id |
| 9 | priority | NVARCHAR | 20 | NO | 'medium' | Priority level | IN ('critical', 'high', 'medium', 'low') | - |
| 10 | status | NVARCHAR | 20 | NO | 'todo' | Task status | IN ('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled') | - |
| 11 | estimated_hours | DECIMAL | (10,2) | YES | 0 | Estimated hours | CHECK >= 0 | - |
| 12 | actual_hours | DECIMAL | (10,2) | NO | 0 | Logged hours | CHECK >= 0 | - |
| 13 | start_date | DATE | 3 | YES | NULL | Start date | - | - |
| 14 | due_date | DATE | 3 | YES | NULL | Due date | - | - |
| 15 | sprint_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Sprint assignment | FK | sprints.id |
| 16 | is_active | BIT | 1 | NO | 1 | Active flag | - | - |
| 17 | created_by | UNIQUEIDENTIFIER | 16 | YES | NULL | Creator | FK | employees.id |
| 18 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp | - | - |
| 19 | updated_at | DATETIME2 | 8 | NO | GETDATE() | Update timestamp | - | - |

**Indexes:**
- PK_tasks (CLUSTERED) ON id
- IX_tasks_code (UNIQUE) ON task_code
- IX_tasks_story ON story_id
- IX_tasks_assignee ON assignee_id
- IX_tasks_status ON status
- IX_tasks_sprint ON sprint_id

**Business Rules:**
1. task_code format: T-XXXX (auto-generated)
2. actual_hours sum from timesheet_entries
3. Cannot assign task if assignee workload > 100%
4. due_date cannot be before start_date
5. status = 'review' requires reviewer_id

---

## WORKSHEET 6: EMPLOYEES TABLE

### Table: pms.employees
**Description:** Employee master data
**Primary Key:** id
**Record Type:** Master Data

| # | Column Name | Data Type | Length | Nullable | Default | Description | Constraints | References |
|---|-------------|-----------|---------|----------|---------|-------------|-------------|------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key | PK, UNIQUE | - |
| 2 | employee_code | NVARCHAR | 20 | NO | - | Employee code | UNIQUE | - |
| 3 | employee_id | NVARCHAR | 20 | YES | NULL | Alt employee ID | - | - |
| 4 | email | NVARCHAR | 100 | NO | - | Email address | UNIQUE | - |
| 5 | first_name | NVARCHAR | 100 | NO | - | First name (EN) | - | - |
| 6 | last_name | NVARCHAR | 100 | NO | - | Last name (EN) | - | - |
| 7 | first_name_th | NVARCHAR | 100 | YES | NULL | First name (TH) | - | - |
| 8 | last_name_th | NVARCHAR | 100 | YES | NULL | Last name (TH) | - | - |
| 9 | nickname | NVARCHAR | 50 | YES | NULL | Nickname | - | - |
| 10 | phone | NVARCHAR | 20 | YES | NULL | Phone number | - | - |
| 11 | department_id | UNIQUEIDENTIFIER | 16 | NO | - | Department | FK | departments.id |
| 12 | position_id | UNIQUEIDENTIFIER | 16 | NO | - | Position | FK | positions.id |
| 13 | manager_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Line manager | FK | employees.id (self) |
| 14 | employment_type | NVARCHAR | 20 | YES | 'full_time' | Employment type | IN ('full_time', 'part_time', 'contract', 'intern') | - |
| 15 | employment_status | NVARCHAR | 20 | NO | 'active' | Employment status | IN ('active', 'inactive', 'suspended', 'resigned') | - |
| 16 | start_date | DATE | 3 | NO | - | Employment start | - | - |
| 17 | end_date | DATE | 3 | YES | NULL | Employment end | - | - |
| 18 | role | NVARCHAR | 20 | NO | 'member' | System role | IN ('super_admin', 'admin', 'manager', 'member', 'viewer') | - |
| 19 | password_hash | NVARCHAR | 255 | YES | NULL | Hashed password | - | - |
| 20 | must_change_password | BIT | 1 | NO | 0 | Password change flag | - | - |
| 21 | last_login | DATETIME2 | 8 | YES | NULL | Last login time | - | - |
| 22 | login_attempts | INT | 4 | NO | 0 | Failed login count | - | - |
| 23 | locked_until | DATETIME2 | 8 | YES | NULL | Account lock expiry | - | - |
| 24 | is_active | BIT | 1 | NO | 1 | Active flag | - | - |
| 25 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp | - | - |
| 26 | updated_at | DATETIME2 | 8 | NO | GETDATE() | Update timestamp | - | - |

**Indexes:**
- PK_employees (CLUSTERED) ON id
- IX_employees_code (UNIQUE) ON employee_code
- IX_employees_email (UNIQUE) ON email
- IX_employees_department ON department_id
- IX_employees_manager ON manager_id
- IX_employees_active ON is_active

**Business Rules:**
1. employee_code format: EMP-XXXX (auto-generated)
2. email must be unique and valid format
3. Account locked after 5 failed login attempts
4. end_date required when employment_status = 'resigned'
5. Cannot delete employee with active project assignments

---

## WORKSHEET 7: DEPARTMENTS TABLE

### Table: pms.departments
**Description:** Organizational departments
**Primary Key:** id
**Record Type:** Master Data

| # | Column Name | Data Type | Length | Nullable | Default | Description | Constraints | References |
|---|-------------|-----------|---------|----------|---------|-------------|-------------|------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key | PK, UNIQUE | - |
| 2 | code | NVARCHAR | 50 | NO | - | Department code | UNIQUE | - |
| 3 | name | NVARCHAR | 255 | NO | - | Department name (EN) | - | - |
| 4 | name_th | NVARCHAR | 255 | YES | NULL | Department name (TH) | - | - |
| 5 | description | NVARCHAR | MAX | YES | NULL | Description | - | - |
| 6 | head_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Department head | FK | employees.id |
| 7 | parent_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Parent department | FK | departments.id (self) |
| 8 | color | NVARCHAR | 20 | YES | NULL | UI color (hex) | - | - |
| 9 | is_active | BIT | 1 | NO | 1 | Active flag | - | - |
| 10 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp | - | - |

**Indexes:**
- PK_departments (CLUSTERED) ON id
- IX_departments_code (UNIQUE) ON code
- IX_departments_parent ON parent_id

**Business Rules:**
1. Cannot delete department with active employees
2. parent_id cannot create circular reference
3. head_id must be an employee in the department

---

## WORKSHEET 8: POSITIONS TABLE

### Table: pms.positions
**Description:** Job positions/roles
**Primary Key:** id
**Record Type:** Master Data

| # | Column Name | Data Type | Length | Nullable | Default | Description | Constraints | References |
|---|-------------|-----------|---------|----------|---------|-------------|-------------|------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key | PK, UNIQUE | - |
| 2 | code | NVARCHAR | 50 | NO | - | Position code | UNIQUE | - |
| 3 | name | NVARCHAR | 255 | NO | - | Position name (EN) | - | - |
| 4 | name_th | NVARCHAR | 255 | YES | NULL | Position name (TH) | - | - |
| 5 | level | INT | 4 | NO | 1 | Level/seniority | CHECK 1-5 | - |
| 6 | department_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Default department | FK | departments.id |
| 7 | description | NVARCHAR | MAX | YES | NULL | Position description | - | - |
| 8 | min_salary | DECIMAL | (12,2) | YES | NULL | Minimum salary | - | - |
| 9 | max_salary | DECIMAL | (12,2) | YES | NULL | Maximum salary | - | - |
| 10 | hourly_rate | DECIMAL | (10,2) | YES | NULL | Hourly rate | - | - |
| 11 | daily_rate | DECIMAL | (10,2) | YES | NULL | Daily rate | - | - |
| 12 | color | NVARCHAR | 20 | YES | NULL | UI color | - | - |
| 13 | is_active | BIT | 1 | NO | 1 | Active flag | - | - |
| 14 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp | - | - |

**Indexes:**
- PK_positions (CLUSTERED) ON id
- IX_positions_code (UNIQUE) ON code

**Business Rules:**
1. Position codes: PM, SA, BA, PG, QA, etc.
2. level: 1=Junior, 2=Mid, 3=Senior, 4=Lead, 5=Principal
3. max_salary >= min_salary

---

## WORKSHEET 9: CONFIGURATION TABLES

### Table: pms.milestone_configs
**Description:** Milestone type definitions
**Record Type:** Configuration

| # | Column Name | Data Type | Length | Nullable | Default | Description |
|---|-------------|-----------|---------|----------|---------|-------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key |
| 2 | code | NVARCHAR | 50 | NO | - | Milestone code (REQ, DES, DEV, TEST) |
| 3 | name | NVARCHAR | 255 | NO | - | Milestone name (EN) |
| 4 | name_th | NVARCHAR | 255 | YES | NULL | Milestone name (TH) |
| 5 | description | NVARCHAR | MAX | YES | NULL | Description |
| 6 | color | NVARCHAR | 20 | NO | - | UI color (hex) |
| 7 | icon | NVARCHAR | 100 | YES | NULL | Icon name |
| 8 | sort_order | INT | 4 | NO | 0 | Display order |
| 9 | is_active | BIT | 1 | NO | 1 | Active flag |
| 10 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp |

---

### Table: pms.deliverable_configs
**Description:** Deliverable type definitions
**Record Type:** Configuration

| # | Column Name | Data Type | Length | Nullable | Default | Description |
|---|-------------|-----------|---------|----------|---------|-------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key |
| 2 | code | NVARCHAR | 50 | NO | - | Deliverable code |
| 3 | name | NVARCHAR | 255 | NO | - | Deliverable name |
| 4 | name_th | NVARCHAR | 255 | YES | NULL | Name (Thai) |
| 5 | sort_order | INT | 4 | NO | 0 | Display order |
| 6 | is_active | BIT | 1 | NO | 1 | Active flag |

**Examples:** Design Document, Source Code, Test Report, User Manual

---

### Table: pms.project_status_configs
**Description:** Project status definitions
**Record Type:** Configuration

| # | Column Name | Data Type | Length | Nullable | Default | Description |
|---|-------------|-----------|---------|----------|---------|-------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key |
| 2 | code | NVARCHAR | 50 | NO | - | Status code |
| 3 | name | NVARCHAR | 255 | NO | - | Status name (EN) |
| 4 | name_th | NVARCHAR | 255 | YES | NULL | Status name (TH) |
| 5 | color | NVARCHAR | 20 | NO | - | UI color (hex) |
| 6 | is_final | BIT | 1 | NO | 0 | Is final/closed status |
| 7 | sort_order | INT | 4 | NO | 0 | Display order |
| 8 | is_active | BIT | 1 | NO | 1 | Active flag |
| 9 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp |

**Default Statuses:** active, on_hold, completed, cancelled, closed

---

### Table: pms.task_type_configs
**Description:** Task type definitions
**Record Type:** Configuration

| # | Column Name | Data Type | Length | Nullable | Default | Description |
|---|-------------|-----------|---------|----------|---------|-------------|
| 1 | code | NVARCHAR | 50 | NO | - | Task type code (PK) |
| 2 | name | NVARCHAR | 255 | NO | - | Type name (EN) |
| 3 | name_th | NVARCHAR | 255 | YES | NULL | Type name (TH) |
| 4 | color | NVARCHAR | 20 | NO | - | UI color (hex) |
| 5 | icon | NVARCHAR | 100 | YES | NULL | Icon name |
| 6 | is_active | BIT | 1 | NO | 1 | Active flag |
| 7 | category | NVARCHAR | 50 | YES | NULL | Category |

**Default Types:** feature, bug, documentation, refactor, test, spike

---

### Table: pms.customers
**Description:** Client/customer information
**Record Type:** Master Data

| # | Column Name | Data Type | Length | Nullable | Default | Description |
|---|-------------|-----------|---------|----------|---------|-------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key |
| 2 | code | NVARCHAR | 50 | NO | - | Customer code |
| 3 | name | NVARCHAR | 255 | NO | - | Customer name |
| 4 | address | NVARCHAR | MAX | YES | NULL | Address |
| 5 | tax_id | NVARCHAR | 50 | YES | NULL | Tax ID |
| 6 | contact_name | NVARCHAR | 255 | YES | NULL | Contact person |
| 7 | contact_email | NVARCHAR | 100 | YES | NULL | Contact email |
| 8 | contact_phone | NVARCHAR | 20 | YES | NULL | Contact phone |
| 9 | is_active | BIT | 1 | NO | 1 | Active flag |
| 10 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp |
| 11 | updated_at | DATETIME2 | 8 | NO | GETDATE() | Update timestamp |

---

### Table: pms.system_configs
**Description:** System-wide configuration settings
**Record Type:** Configuration

| # | Column Name | Data Type | Length | Nullable | Default | Description |
|---|-------------|-----------|---------|----------|---------|-------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key |
| 2 | config_key | NVARCHAR | 100 | NO | - | Configuration key (UNIQUE) |
| 3 | config_value | NVARCHAR | 500 | NO | - | Configuration value |
| 4 | config_type | NVARCHAR | 50 | NO | 'string' | Data type |
| 5 | description | NVARCHAR | 500 | YES | NULL | Description |
| 6 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp |
| 7 | updated_at | DATETIME2 | 8 | NO | GETDATE() | Update timestamp |

**Default Configurations:**
- WORKING_HOURS_PER_DAY = 7
- WORKING_DAYS_PER_WEEK = 5
- WORKLOAD_WARNING_PERCENT = 70
- WORKLOAD_FULL_PERCENT = 100
- MANDAY_HOURS = 7

---

## WORKSHEET 10: TIMESHEET & SPRINT TABLES

### Table: pms.timesheet_entries
**Description:** Daily timesheet entries
**Primary Key:** id
**Record Type:** Transactional

| # | Column Name | Data Type | Length | Nullable | Default | Description | Constraints | References |
|---|-------------|-----------|---------|----------|---------|-------------|-------------|------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key | PK, UNIQUE | - |
| 2 | employee_id | UNIQUEIDENTIFIER | 16 | NO | - | Employee | FK | employees.id |
| 3 | task_id | UNIQUEIDENTIFIER | 16 | NO | - | Task | FK | tasks.id |
| 4 | entry_date | DATE | 3 | NO | - | Work date | - | - |
| 5 | hours | DECIMAL | (10,2) | NO | 0 | Hours logged | CHECK > 0 | - |
| 6 | description | NVARCHAR | MAX | YES | NULL | Work description | - | - |
| 7 | status | NVARCHAR | 20 | NO | 'draft' | Entry status | IN ('draft', 'submitted', 'approved', 'rejected', 'locked') | - |
| 8 | is_billable | BIT | 1 | NO | 1 | Billable flag | - | - |
| 9 | is_overtime | BIT | 1 | NO | 0 | Overtime flag | - | - |
| 10 | submitted_at | DATETIME2 | 8 | YES | NULL | Submission time | - | - |
| 11 | submitted_by | UNIQUEIDENTIFIER | 16 | YES | NULL | Submitter | FK | employees.id |
| 12 | approved_at | DATETIME2 | 8 | YES | NULL | Approval time | - | - |
| 13 | approved_by | UNIQUEIDENTIFIER | 16 | YES | NULL | Approver | FK | employees.id |
| 14 | is_active | BIT | 1 | NO | 1 | Active flag | - | - |
| 15 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp | - | - |
| 16 | updated_at | DATETIME2 | 8 | NO | GETDATE() | Update timestamp | - | - |

**Indexes:**
- PK_timesheet_entries (CLUSTERED) ON id
- IX_timesheet_employee_date ON (employee_id, entry_date)
- IX_timesheet_task ON task_id
- IX_timesheet_status ON status

**Business Rules:**
1. Cannot log > 24 hours per day per employee
2. Cannot edit timesheet if status = 'locked'
3. Status workflow: draft → submitted → approved/rejected
4. approved_by cannot be same as employee_id

---

### Table: pms.sprints
**Description:** Sprint planning and tracking
**Primary Key:** id
**Record Type:** Transactional

| # | Column Name | Data Type | Length | Nullable | Default | Description | Constraints | References |
|---|-------------|-----------|---------|----------|---------|-------------|-------------|------------|
| 1 | id | UNIQUEIDENTIFIER | 16 | NO | NEWID() | Primary key | PK, UNIQUE | - |
| 2 | sprint_code | NVARCHAR | 50 | NO | - | Sprint identifier | UNIQUE | - |
| 3 | name | NVARCHAR | 255 | NO | - | Sprint name | - | - |
| 4 | goal | NVARCHAR | MAX | YES | NULL | Sprint goal | - | - |
| 5 | start_date | DATE | 3 | NO | - | Sprint start | - | - |
| 6 | end_date | DATE | 3 | NO | - | Sprint end | - | - |
| 7 | status | NVARCHAR | 20 | NO | 'planned' | Sprint status | IN ('planned', 'active', 'completed', 'cancelled') | - |
| 8 | project_id | UNIQUEIDENTIFIER | 16 | YES | NULL | Associated project | FK | projects.id |
| 9 | created_by | UNIQUEIDENTIFIER | 16 | YES | NULL | Creator | FK | employees.id |
| 10 | created_at | DATETIME2 | 8 | NO | GETDATE() | Creation timestamp | - | - |
| 11 | updated_by | UNIQUEIDENTIFIER | 16 | YES | NULL | Last updater | FK | employees.id |
| 12 | updated_at | DATETIME2 | 8 | NO | GETDATE() | Update timestamp | - | - |
| 13 | is_active | BIT | 1 | NO | 1 | Active flag | - | - |

**Indexes:**
- PK_sprints (CLUSTERED) ON id
- IX_sprints_code (UNIQUE) ON sprint_code
- IX_sprints_project ON project_id
- IX_sprints_dates ON (start_date, end_date)

**Business Rules:**
1. sprint_code format: SPRINT-XX (auto-generated)
2. end_date must be > start_date
3. Typical sprint duration: 2 weeks
4. Only one active sprint per project at a time

---

## WORKSHEET 11: DATABASE VIEWS

### View Summary
| # | View Name | Description | Base Tables | Refresh |
|---|-----------|-------------|-------------|---------|
| 1 | vw_dashboard_my_tasks_summary | Employee's task summary by status | tasks, employees | Real-time |
| 2 | vw_dashboard_overdue_tasks | Overdue tasks with project context | tasks, stories, projects | Real-time |
| 3 | vw_dashboard_today_tasks | Tasks due today | tasks, employees | Real-time |
| 4 | vw_dashboard_my_timesheet_today | Daily timesheet summary | timesheet_entries | Real-time |
| 5 | vw_dashboard_my_timesheet_today_detail | Detailed daily timesheet | timesheet_entries, tasks | Real-time |
| 6 | vw_dashboard_my_projects | Projects with task counts | projects, tasks | Real-time |
| 7 | vw_dashboard_upcoming_milestones | Milestones coming due | project_milestones, milestone_configs | Real-time |
| 8 | vw_dashboard_team_overview | Team KPI summary | employees, projects, tasks | Real-time |
| 9 | vw_dashboard_team_workload | Team workload analysis | employees, tasks, timesheet_entries | Real-time |
| 10 | vw_dashboard_kpi_summary | Quality metrics | tasks, timesheet_entries | Real-time |
| 11 | vw_employee_daily_workload | Daily workload per employee | employees, tasks | Real-time |

### Key View Columns

**vw_dashboard_my_tasks_summary:**
- employee_id, employee_name, todo_count, in_progress_count, review_count, done_count, blocked_count, total_count

**vw_dashboard_overdue_tasks:**
- task_id, task_code, title, assignee_id, assignee_name, due_date, days_overdue, project_name, story_code, priority

**vw_employee_daily_workload:**
- employee_id, work_date, capacity_hours, allocated_hours, available_hours, utilization_percent, status (available/optimal/busy/overloaded)

---

## WORKSHEET 12: STORED PROCEDURES

### Procedure: pms.sp_get_gantt_data
**Description:** Retrieves hierarchical project data for Gantt chart
**Returns:** 4 result sets (Projects, Milestones, Stories, Tasks)

**Parameters:**
| # | Parameter Name | Data Type | Direction | Required | Description |
|---|----------------|-----------|-----------|----------|-------------|
| 1 | @employee_id | UNIQUEIDENTIFIER | IN | Yes | Filter by employee |
| 2 | @year | INT | IN | No | Filter by project year |
| 3 | @customer_id | UNIQUEIDENTIFIER | IN | No | Filter by customer |
| 4 | @manager_id | UNIQUEIDENTIFIER | IN | No | Filter by PM |
| 5 | @owner_id | UNIQUEIDENTIFIER | IN | No | Filter by owner |
| 6 | @status_id | UNIQUEIDENTIFIER | IN | No | Filter by status |
| 7 | @search | NVARCHAR(500) | IN | No | Text search |
| 8 | @milestone_ids | NVARCHAR(MAX) | IN | No | CSV milestone IDs |

**Result Set 1: Projects**
- id, project_code, name, customer_name, manager_name, status_code, status_name, warranty_end_date, progress_percent

**Result Set 2: Milestones**
- id, project_id, milestone_code, milestone_name, color, due_date, status, progress_percent, start_date, end_date

**Result Set 3: Stories**
- id, project_id, milestone_id, story_code, title, priority, status, start_date, due_date, progress_percent

**Result Set 4: Tasks**
- id, story_id, task_code, title, task_type, assignee_name, priority, status, start_date, due_date, estimated_hours, actual_hours

---

### Procedure: pms.sp_get_team_workload
**Description:** Calculates team workload analysis with capacity utilization

**Parameters:**
| # | Parameter Name | Data Type | Direction | Required | Description |
|---|----------------|-----------|-----------|----------|-------------|
| 1 | @start_date | DATE | IN | Yes | Period start |
| 2 | @end_date | DATE | IN | Yes | Period end |
| 3 | @new_task_hours | DECIMAL(10,2) | IN | No | Hours for impact analysis |

**Result Set: Team Workload**
- employee_id, employee_name, department_name, position_name
- capacity_hours, allocated_hours, available_hours
- utilization_percent, status (available/optimal/busy/overloaded)
- task_count, project_count

**Business Logic:**
1. Calculates capacity: working_hours_per_day × business_days_in_period
2. Sums allocated hours from tasks in period
3. available_hours = capacity_hours - allocated_hours
4. utilization_percent = (allocated_hours / capacity_hours) × 100
5. Status thresholds:
   - available: < 70%
   - optimal: 70-85%
   - busy: 85-100%
   - overloaded: > 100%

---

## WORKSHEET 13: ENTITY RELATIONSHIPS

### Primary Relationships

**Project Hierarchy:**
```
customers (1) ────< (N) projects
                          │
                          ├─< (N) stories
                          │         │
                          │         └─< (N) tasks
                          │                   │
                          │                   └─< (N) timesheet_entries
                          │
                          └─< (N) project_milestones
                                      │
                                      └─< (N) project_milestone_deliverables
```

**Organization Hierarchy:**
```
departments (1) ────< (N) employees (via department_id)
departments (1) ────< (1) employees (via head_id)
departments (1) ────< (N) departments (via parent_id - self-join)

positions (1) ────< (N) employees

employees (1) ────< (N) employees (via manager_id - self-join)
```

**Assignment Relationships:**
```
employees (1) ────< (N) projects (as project_manager_id)
employees (1) ────< (N) projects (as project_owner_id)
employees (1) ────< (N) tasks (as assignee_id)
employees (1) ────< (N) tasks (as reviewer_id)
employees (1) ────< (N) timesheet_entries (as employee_id)
```

**Configuration Relationships:**
```
project_status_configs (1) ────< (N) projects
milestone_configs (1) ────< (N) project_milestones
deliverable_configs (1) ────< (N) project_milestone_deliverables
task_type_configs (1) ────< (N) tasks
```

**Sprint Relationships:**
```
projects (1) ────< (N) sprints
sprints (1) ────< (N) tasks
```

---

## WORKSHEET 14: DATA TYPES REFERENCE

### SQL Server Data Types Used

| Data Type | Size (bytes) | Range/Precision | Usage in PMS | Example Columns |
|-----------|--------------|-----------------|--------------|-----------------|
| UNIQUEIDENTIFIER | 16 | UUID/GUID | Primary Keys, Foreign Keys | id, project_id, employee_id |
| NVARCHAR(n) | 2n | Unicode strings up to n chars | Names, codes, descriptions | name, email, title, code |
| NVARCHAR(MAX) | Variable | Up to 2GB | Long text fields | description, acceptance_criteria |
| DECIMAL(10,2) | 5 | ±999,999,999.99 | Man-days, hours | estimated_md, actual_hours |
| DECIMAL(12,2) | 6 | ±9,999,999,999.99 | Salary amounts | min_salary, max_salary |
| DECIMAL(15,2) | 7 | ±999,999,999,999,999.99 | Project values | total_value |
| DECIMAL(5,2) | 3 | ±999.99 | Percentages | weight_percent |
| INT | 4 | -2,147,483,648 to 2,147,483,647 | Counters, years | project_year, sort_order, level |
| BIT | 1 | 0 or 1 | Boolean flags | is_active, is_billable |
| DATE | 3 | 0001-01-01 to 9999-12-31 | Date fields | start_date, due_date |
| DATETIME2 | 8 | 0001-01-01 to 9999-12-31 | Timestamps | created_at, updated_at |

### Naming Conventions
- **Tables:** Plural nouns (employees, projects, tasks)
- **Columns:** Snake_case (first_name, project_id, is_active)
- **Primary Keys:** Always named "id"
- **Foreign Keys:** table_name_id (project_id, employee_id)
- **Flags:** Prefix with is_ (is_active, is_billable)
- **Dates:** Suffix with _date (start_date, due_date)
- **Timestamps:** Suffix with _at (created_at, updated_at)
- **Codes:** Suffix with _code (project_code, employee_code)

---

## WORKSHEET 15: BUSINESS RULES & CONSTRAINTS

### Data Validation Rules

**1. Code Generation Patterns:**
- Project Code: `YYXXXX` (26001, 260002, ...)
- Employee Code: `EMP-XXXX` (EMP-0001, EMP-0002, ...)
- Story Code: `S-XXXX` (S-0001, S-0002, ...)
- Task Code: `T-XXXX` (T-0001, T-0002, ...)
- Sprint Code: `SPRINT-XX` (SPRINT-01, SPRINT-02, ...)

**2. Date Validation:**
- project.end_date >= project.start_date (if both exist)
- sprint.end_date > sprint.start_date (required)
- task.due_date >= task.start_date (if both exist)
- story.due_date >= story.start_date (if both exist)
- employee.end_date > employee.start_date (if end_date exists)

**3. Numeric Constraints:**
- All man-day/hour fields: >= 0
- Percentage fields: 0-100
- Priority levels: 1-5
- Utilization: 0-infinite (warning at 70%, critical at 100%)

**4. Status Workflows:**

**Project Status:**
- draft → active → on_hold/completed/cancelled
- Cannot reactivate cancelled/completed projects

**Milestone Status:**
- pending → in_progress → completed
- Cannot skip statuses

**Story Status:**
- backlog → ready → in_progress → review → done
- Can move to cancelled from any status

**Task Status:**
- todo → in_progress → review → done
- Can move to blocked from any active status
- Cannot move from done to other statuses

**Timesheet Status:**
- draft → submitted → approved/rejected
- locked (final state, cannot edit)

**5. Deletion Rules:**
- Soft delete (is_active = 0) for: projects, employees, departments
- Cascade delete for: project_milestones when project deleted
- Restrict delete when:
  - Department has active employees
  - Employee has active project assignments
  - Story has active tasks
  - Project has non-cancelled stories

**6. Unique Constraints:**
- employee.email (case-insensitive)
- employee.employee_code
- project.project_code
- story.story_code
- task.task_code
- sprint.sprint_code
- system_configs.config_key

**7. Required Fields on Status Change:**
- story.completed_date required when status = 'done'
- task.reviewer_id required when status = 'review'
- milestone.completed_date required when status = 'completed'
- employee.end_date required when employment_status = 'resigned'

**8. Calculated Fields:**
- project.total_value = sold_mandays × manday_rate
- story.progress_percent = (completed_tasks / total_tasks) × 100
- task.actual_hours = SUM(timesheet_entries.hours)
- milestone progress = (completed_tasks / total_tasks) × 100

**9. Security Rules:**
- Password must be hashed (bcrypt, cost factor 10)
- Account locked after 5 failed login attempts
- Lock duration: 30 minutes
- Password must change on first login if must_change_password = 1

**10. Workload Rules:**
- Warning threshold: utilization >= 70%
- Full threshold: utilization >= 100%
- Cannot assign task if total utilization > 120%
- Daily capacity = working_hours_per_day (default 7)
- Weekly capacity = working_days_per_week (default 5)

---

## WORKSHEET 16: CHANGE LOG

### Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-10 | System | Initial Data Dictionary creation |

### Future Enhancements Planned
1. Document attachments table (project_documents)
2. Audit trail table (audit_log)
3. Notification preferences (employee_notifications)
4. Project risks table (project_risks)
5. Change requests table (change_requests)
6. Resource allocation forecast (resource_forecast)

---

## APPENDIX A: GLOSSARY

**Man-day (MD):** Unit of work equal to one person working for one full day (7 hours in this system)

**Sprint:** Fixed time period (typically 2 weeks) for completing a set of tasks

**Story:** User story or requirement representing a feature or functionality

**Task:** Smallest unit of work, assigned to an individual

**Milestone:** Major phase or checkpoint in a project

**Deliverable:** Tangible output or document produced during a milestone

**Utilization:** Percentage of an employee's capacity allocated to tasks

**Backlog:** List of stories/tasks not yet started

**Soft Delete:** Marking record as inactive (is_active = 0) instead of physical deletion

**Foreign Key (FK):** Column referencing primary key in another table

**Primary Key (PK):** Unique identifier for each record in a table

---

## APPENDIX B: CONTACT & SUPPORT

For questions or updates to this Data Dictionary:
- **Project:** PMS (Project Management System)
- **Database Schema:** pms
- **Last Updated:** 2026-01-10
- **Documentation Location:** /docs/DATA_DICTIONARY.md

---

**END OF DATA DICTIONARY**
