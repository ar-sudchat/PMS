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

### [2026-01-12] Task Status - Done Not as Planned
- **File:** `task-status-done-not-planned.sql`
- **Status:** PENDING
- **Description:** เพิ่มสถานะ "Done (Not as Planned)" สำหรับ Issue Clearing KPI
- **Changes:**
  - เพิ่ม column `not_as_planned_reason` ใน `pms.tasks`
  - อัพเดท CHECK constraint สำหรับ status ใหม่ `done_not_planned`
  - สร้าง View `vw_issue_clearing_kpi`
  - สร้าง View `vw_tasks_not_as_planned`
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
-- ดู scripts ที่ต้องรัน
-- 1. sprint-schema.sql
-- 2. fix-all-name-th-columns.sql
-- 3. task-status-done-not-planned.sql
```
