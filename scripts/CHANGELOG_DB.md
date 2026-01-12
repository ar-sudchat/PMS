# Database Changelog

รายการ SQL scripts ที่ต้องรันเพื่ออัพเดท production database
เรียงตามลำดับเวลา (ใหม่สุดอยู่บน)

---

## How to Use

1. ดู scripts ที่ยังไม่ได้รัน (status: PENDING)
2. รันตามลำดับจากเก่าไปใหม่
3. เปลี่ยน status เป็น DONE หลังรันสำเร็จ

---

## Pending Scripts (ยังไม่ได้รันที่ Production)

### [2026-01-12] Update vw_my_tasks with Checklist
- **File:** `update-vw-my-tasks-checklist.sql`
- **Status:** PENDING
- **Description:** อัพเดท view vw_my_tasks เพิ่ม checklist summary
- **Changes:**
  - เพิ่ม columns `checklist_total`, `checklist_completed` ใน view
  - ใช้ LEFT JOIN subquery สำหรับ aggregation
- **Impact:** My Tasks page - แสดง checklist progress
- **Dependency:** ต้องรัน `task-checklist-schema.sql` ก่อน
- **Rollback:** รัน script เดิมจาก timesheet-mytasks-schema.sql

---

### [2026-01-12] Task Checklist Schema
- **File:** `task-checklist-schema.sql`
- **Status:** PENDING
- **Description:** สร้างตาราง task_checklist_items สำหรับ checklist ของ task
- **Changes:**
  - สร้างตาราง `pms.task_checklist_items`
  - FK to tasks (ON DELETE CASCADE)
  - FK to employees (completed_by)
- **Impact:** Task management - เพิ่ม checklist feature
- **Rollback:** DROP TABLE pms.task_checklist_items

---

### [2026-01-12] Task Status - Done Not as Planned (Updated)
- **File:** `task-status-done-not-planned.sql`
- **Status:** PENDING
- **Description:** เพิ่มสถานะ "Done (Not as Planned)" สำหรับ Issue Clearing KPI
- **KPI Formula:** Issue Clearing Rate = (Done / Total Completed) x 100, Target >= 85%
- **Changes:**
  - เพิ่ม columns `not_as_planned_reason`, `not_as_planned_notes` ใน `pms.tasks`
  - อัพเดท CHECK constraint สำหรับ status ใหม่ `done_not_planned`
  - สร้าง View `vw_issue_clearing_weekly` (รายสัปดาห์)
  - สร้าง View `vw_issue_clearing_kpi_monthly` (รายเดือน)
  - สร้าง View `vw_issue_clearing_kpi_yearly` (รายปี)
  - สร้าง View `vw_tasks_not_as_planned` (รายละเอียด)
- **Impact:** Task management, KPI calculation
- **Rollback:** ไม่จำเป็น (เพิ่ม column และ view ใหม่)

---

### [2026-01-12] Sprint Schema
- **File:** `sprint-schema.sql`
- **Status:** PENDING
- **Description:** สร้าง Sprint management tables และ views
- **Changes:**
  - สร้างตาราง `pms.sprints`
  - เพิ่ม column `sprint_id` ใน `pms.tasks`
  - สร้าง View `vw_sprints_with_tasks`
- **Impact:** Sprint/Scrum management
- **Rollback:** DROP TABLE pms.sprints, DROP VIEW pms.vw_sprints_with_tasks

---

### [2026-01-12] Fix All name_th Columns
- **File:** `fix-all-name-th-columns.sql`
- **Status:** PENDING
- **Description:** เพิ่ม column name_th ให้ทุกตารางที่ขาด
- **Changes:**
  - เพิ่ม `name_th` ใน positions, departments, task_type_configs
  - เพิ่ม `name_th` ใน deliverable_configs, project_status_configs
  - เพิ่ม `name_th` ใน milestone_configs, project_deliverables
- **Impact:** Multi-language support
- **Rollback:** ไม่จำเป็น

---

## Completed Scripts (รันแล้วที่ Production)

_ยังไม่มี - เพิ่มหลังจากรันสำเร็จ_

---

## Notes

- ก่อนรันที่ Production ควร backup database ก่อน
- ทดสอบที่ Development/Staging ก่อนเสมอ
- ถ้ามี error ให้ดู rollback instructions

---

## Quick Reference

```sql
-- ดู scripts ที่ต้องรัน (เรียงตามลำดับ)
-- 1. sprint-schema.sql
-- 2. fix-all-name-th-columns.sql
-- 3. task-status-done-not-planned.sql
-- 4. task-checklist-schema.sql
-- 5. update-vw-my-tasks-checklist.sql (ต้องรัน #4 ก่อน)

-- หลังรัน task-status-done-not-planned.sql จะได้:
-- - Task status ใหม่: done_not_planned
-- - Views: vw_issue_clearing_weekly, vw_issue_clearing_kpi_monthly, vw_issue_clearing_kpi_yearly
-- - KPI: Issue Clearing Rate = (Done / Total Completed) x 100, Target >= 85%

-- หลังรัน task-checklist-schema.sql + update-vw-my-tasks-checklist.sql จะได้:
-- - Table: pms.task_checklist_items
-- - View vw_my_tasks จะมี columns: checklist_total, checklist_completed
```
