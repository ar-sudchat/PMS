# 📊 KPI Dashboard System

## Overview
สร้าง KPI Dashboard 2 แบบ:
1. **KPI Dashboard (ภาพรวมทีม)** - สำหรับ Admin/Manager ดูภาพรวม
2. **My KPI Dashboard (รายบุคคล)** - สำหรับพนักงานดูของตัวเอง

### Features
- ✅ Filter by Period (เดือน/ไตรมาส/ปี)
- ✅ Filter by Department
- ✅ KPI Trend Chart
- ✅ AI Analysis
- ✅ Export Report
- ✅ At Risk Alerts

---

## Part 1: Database Views สำหรับ KPI Calculation

```sql
-- =============================================
-- KPI Calculation Views
-- =============================================

-- 1. Time to Delivery Calculation
CREATE OR ALTER VIEW pms.vw_kpi_time_to_delivery AS
WITH MilestoneProgress AS (
    SELECT 
        pm.project_id,
        p.project_code,
        p.name AS project_name,
        YEAR(ISNULL(pm.actual_date, pm.planned_date)) AS year,
        MONTH(ISNULL(pm.actual_date, pm.planned_date)) AS month,
        DATEPART(QUARTER, ISNULL(pm.actual_date, pm.planned_date)) AS quarter,
        pm.name AS milestone_name,
        pm.planned_mandays,
        -- สัดส่วน Milestone สำหรับ Time to Delivery
        CASE pm.name
            WHEN 'Mapping Data' THEN 35
            WHEN 'System Test' THEN 20
            WHEN 'User Acceptance Test' THEN 30
            WHEN 'Go-Live' THEN 15
            ELSE 0
        END AS milestone_weight,
        -- คำนวณ % ที่ทำได้
        CASE 
            WHEN pm.status = 'completed' AND pm.actual_date <= pm.planned_date THEN 100
            WHEN pm.status = 'completed' AND pm.actual_date > pm.planned_date THEN 
                CASE 
                    WHEN DATEDIFF(DAY, pm.planned_date, pm.actual_date) <= 7 THEN 80
                    WHEN DATEDIFF(DAY, pm.planned_date, pm.actual_date) <= 14 THEN 60
                    ELSE 40
                END
            WHEN pm.status = 'in_progress' THEN 50
            ELSE 0
        END AS achievement_percent
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    WHERE pm.name IN ('Mapping Data', 'System Test', 'User Acceptance Test', 'Go-Live')
)
SELECT 
    year,
    month,
    quarter,
    project_id,
    project_code,
    project_name,
    -- สูตร: Σ(%milestone × manday) / Σ(manday × 100) × 100
    CASE 
        WHEN SUM(planned_mandays * 100) > 0 
        THEN CAST(ROUND(
            SUM(achievement_percent * milestone_weight * planned_mandays / 100.0) * 100.0 / 
            SUM(planned_mandays * milestone_weight), 2
        ) AS DECIMAL(5,2))
        ELSE 0 
    END AS time_to_delivery_percent,
    80 AS target_percent,
    CASE 
        WHEN SUM(planned_mandays * 100) > 0 AND 
             (SUM(achievement_percent * milestone_weight * planned_mandays / 100.0) * 100.0 / 
              SUM(planned_mandays * milestone_weight)) >= 80 
        THEN 1 ELSE 0 
    END AS is_pass
FROM MilestoneProgress
GROUP BY year, month, quarter, project_id, project_code, project_name;
GO

-- 2. Man-day Control Calculation
CREATE OR ALTER VIEW pms.vw_kpi_manday_control AS
WITH MilestoneManday AS (
    SELECT 
        pm.project_id,
        p.project_code,
        p.name AS project_name,
        YEAR(ISNULL(pm.actual_date, pm.planned_date)) AS year,
        MONTH(ISNULL(pm.actual_date, pm.planned_date)) AS month,
        DATEPART(QUARTER, ISNULL(pm.actual_date, pm.planned_date)) AS quarter,
        pm.name AS milestone_name,
        pm.planned_mandays,
        pm.actual_mandays,
        -- สัดส่วน Milestone สำหรับ Man-day Control
        CASE pm.name
            WHEN 'Mapping Data' THEN 30
            WHEN 'System Test' THEN 30
            WHEN 'User Acceptance Test' THEN 20
            WHEN 'Go-Live' THEN 10
            WHEN 'Close Go-Live' THEN 10
            ELSE 0
        END AS milestone_weight,
        -- คำนวณ % ที่ทำได้
        CASE 
            WHEN pm.actual_mandays IS NULL THEN 0
            WHEN pm.actual_mandays <= pm.planned_mandays THEN 100
            WHEN pm.actual_mandays <= pm.planned_mandays * 1.1 THEN 90
            WHEN pm.actual_mandays <= pm.planned_mandays * 1.2 THEN 70
            ELSE 50
        END AS achievement_percent
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    WHERE pm.name IN ('Mapping Data', 'System Test', 'User Acceptance Test', 'Go-Live', 'Close Go-Live')
)
SELECT 
    year,
    month,
    quarter,
    project_id,
    project_code,
    project_name,
    SUM(planned_mandays) AS total_planned_mandays,
    SUM(actual_mandays) AS total_actual_mandays,
    CASE 
        WHEN SUM(planned_mandays * 100) > 0 
        THEN CAST(ROUND(
            SUM(achievement_percent * milestone_weight * planned_mandays / 100.0) * 100.0 / 
            SUM(planned_mandays * milestone_weight), 2
        ) AS DECIMAL(5,2))
        ELSE 0 
    END AS manday_control_percent,
    85 AS target_percent,
    CASE 
        WHEN SUM(planned_mandays * 100) > 0 AND 
             (SUM(achievement_percent * milestone_weight * planned_mandays / 100.0) * 100.0 / 
              SUM(planned_mandays * milestone_weight)) >= 85 
        THEN 1 ELSE 0 
    END AS is_pass
FROM MilestoneManday
GROUP BY year, month, quarter, project_id, project_code, project_name;
GO

-- 3. Defect Ratio Calculation
CREATE OR ALTER VIEW pms.vw_kpi_defect_ratio AS
WITH TaskMandays AS (
    SELECT 
        t.id AS task_id,
        s.project_id,
        p.project_code,
        p.name AS project_name,
        YEAR(te.work_date) AS year,
        MONTH(te.work_date) AS month,
        DATEPART(QUARTER, te.work_date) AS quarter,
        t.task_type,
        ttc.is_defect,
        SUM(te.hours) / 7.0 AS mandays
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    INNER JOIN pms.projects p ON s.project_id = p.id
    LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.type_code
    LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id
    WHERE te.work_date IS NOT NULL
    GROUP BY t.id, s.project_id, p.project_code, p.name, 
             YEAR(te.work_date), MONTH(te.work_date), DATEPART(QUARTER, te.work_date),
             t.task_type, ttc.is_defect
)
SELECT 
    year,
    month,
    quarter,
    project_id,
    project_code,
    project_name,
    CAST(ROUND(SUM(CASE WHEN is_defect = 1 THEN mandays ELSE 0 END), 2) AS DECIMAL(10,2)) AS defect_mandays,
    CAST(ROUND(SUM(mandays), 2) AS DECIMAL(10,2)) AS total_mandays,
    CASE 
        WHEN SUM(mandays) > 0 
        THEN CAST(ROUND(SUM(CASE WHEN is_defect = 1 THEN mandays ELSE 0 END) * 100.0 / SUM(mandays), 2) AS DECIMAL(5,2))
        ELSE 0 
    END AS defect_ratio_percent,
    15 AS target_percent,
    CASE 
        WHEN SUM(mandays) > 0 AND 
             (SUM(CASE WHEN is_defect = 1 THEN mandays ELSE 0 END) * 100.0 / SUM(mandays)) <= 15 
        THEN 1 ELSE 0 
    END AS is_pass
FROM TaskMandays
GROUP BY year, month, quarter, project_id, project_code, project_name;
GO

-- 4. Post Go-live Rework Ratio
CREATE OR ALTER VIEW pms.vw_kpi_post_golive_rework AS
SELECT 
    YEAR(r.record_date) AS year,
    MONTH(r.record_date) AS month,
    DATEPART(QUARTER, r.record_date) AS quarter,
    r.project_id,
    p.project_code,
    p.name AS project_name,
    CAST(ROUND(SUM(r.rework_mandays), 2) AS DECIMAL(10,2)) AS rework_mandays,
    CAST(ROUND(SUM(r.total_mandays), 2) AS DECIMAL(10,2)) AS total_mandays,
    CASE 
        WHEN SUM(r.total_mandays) > 0 
        THEN CAST(ROUND(SUM(r.rework_mandays) * 100.0 / SUM(r.total_mandays), 2) AS DECIMAL(5,2))
        ELSE 0 
    END AS rework_ratio_percent,
    8 AS target_percent,
    CASE 
        WHEN SUM(r.total_mandays) > 0 AND 
             (SUM(r.rework_mandays) * 100.0 / SUM(r.total_mandays)) <= 8 
        THEN 1 ELSE 0 
    END AS is_pass
FROM pms.post_golive_rework_records r
INNER JOIN pms.projects p ON r.project_id = p.id
GROUP BY YEAR(r.record_date), MONTH(r.record_date), DATEPART(QUARTER, r.record_date),
         r.project_id, p.project_code, p.name;
GO

-- 5. Deploy Success Rate
CREATE OR ALTER VIEW pms.vw_kpi_deploy_success AS
SELECT 
    YEAR(d.deploy_date) AS year,
    MONTH(d.deploy_date) AS month,
    DATEPART(QUARTER, d.deploy_date) AS quarter,
    d.project_id,
    p.project_code,
    p.name AS project_name,
    COUNT(*) AS total_deploys,
    SUM(CASE WHEN d.is_success = 1 THEN 1 ELSE 0 END) AS successful_deploys,
    CASE 
        WHEN COUNT(*) > 0 
        THEN CAST(ROUND(SUM(CASE WHEN d.is_success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS DECIMAL(5,2))
        ELSE 0 
    END AS success_rate_percent,
    95 AS target_percent,
    CASE 
        WHEN COUNT(*) > 0 AND 
             (SUM(CASE WHEN d.is_success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) >= 95 
        THEN 1 ELSE 0 
    END AS is_pass
FROM pms.deploy_success_records d
INNER JOIN pms.projects p ON d.project_id = p.id
GROUP BY YEAR(d.deploy_date), MONTH(d.deploy_date), DATEPART(QUARTER, d.deploy_date),
         d.project_id, p.project_code, p.name;
GO

-- 6. Pre-deploy Backup
CREATE OR ALTER VIEW pms.vw_kpi_predeploy_backup AS
SELECT 
    YEAR(b.backup_date) AS year,
    MONTH(b.backup_date) AS month,
    DATEPART(QUARTER, b.backup_date) AS quarter,
    b.project_id,
    p.project_code,
    p.name AS project_name,
    COUNT(DISTINCT b.deploy_id) AS total_deploys,
    COUNT(DISTINCT CASE WHEN b.version_count >= 5 THEN b.deploy_id END) AS compliant_deploys,
    CASE 
        WHEN COUNT(DISTINCT b.deploy_id) > 0 
        THEN CAST(ROUND(COUNT(DISTINCT CASE WHEN b.version_count >= 5 THEN b.deploy_id END) * 100.0 / 
             COUNT(DISTINCT b.deploy_id), 2) AS DECIMAL(5,2))
        ELSE 100 
    END AS backup_compliance_percent,
    100 AS target_percent,
    CASE 
        WHEN COUNT(DISTINCT b.deploy_id) = 0 OR
             COUNT(DISTINCT CASE WHEN b.version_count >= 5 THEN b.deploy_id END) = COUNT(DISTINCT b.deploy_id)
        THEN 1 ELSE 0 
    END AS is_pass
FROM (
    SELECT 
        project_id,
        deploy_id,
        backup_date,
        COUNT(*) AS version_count
    FROM pms.deploy_backup_records
    GROUP BY project_id, deploy_id, backup_date
) b
INNER JOIN pms.projects p ON b.project_id = p.id
GROUP BY YEAR(b.backup_date), MONTH(b.backup_date), DATEPART(QUARTER, b.backup_date),
         b.project_id, p.project_code, p.name;
GO

-- 7. On-time Meeting Minutes (Personal)
CREATE OR ALTER VIEW pms.vw_kpi_meeting_minutes AS
SELECT 
    YEAR(m.meeting_date) AS year,
    MONTH(m.meeting_date) AS month,
    DATEPART(QUARTER, m.meeting_date) AS quarter,
    m.created_by AS employee_id,
    e.employee_code,
    e.first_name + ' ' + e.last_name AS employee_name,
    e.position,
    COUNT(*) AS total_meetings,
    SUM(CASE WHEN DATEDIFF(HOUR, m.meeting_end_time, m.submitted_at) <= 24 THEN 1 ELSE 0 END) AS ontime_count,
    SUM(CASE WHEN DATEDIFF(HOUR, m.meeting_end_time, m.submitted_at) > 24 THEN 1 ELSE 0 END) AS late_count,
    3 AS max_late_allowed,
    CASE 
        WHEN SUM(CASE WHEN DATEDIFF(HOUR, m.meeting_end_time, m.submitted_at) > 24 THEN 1 ELSE 0 END) <= 3 
        THEN 1 ELSE 0 
    END AS is_pass
FROM pms.meeting_minutes_records m
INNER JOIN pms.employees e ON m.created_by = e.id
GROUP BY YEAR(m.meeting_date), MONTH(m.meeting_date), DATEPART(QUARTER, m.meeting_date),
         m.created_by, e.employee_code, e.first_name, e.last_name, e.position;
GO

-- 8. Required Docs On-time (Personal)
CREATE OR ALTER VIEW pms.vw_kpi_docs_ontime AS
SELECT 
    YEAR(d.due_date) AS year,
    MONTH(d.due_date) AS month,
    DATEPART(QUARTER, d.due_date) AS quarter,
    d.employee_id,
    e.employee_code,
    e.first_name + ' ' + e.last_name AS employee_name,
    e.position,
    COUNT(*) AS total_docs,
    SUM(CASE WHEN d.submitted_at <= d.due_date THEN 1 ELSE 0 END) AS ontime_count,
    SUM(CASE WHEN d.submitted_at > d.due_date OR d.submitted_at IS NULL THEN 1 ELSE 0 END) AS late_count,
    CASE 
        WHEN COUNT(*) > 0 
        THEN CAST(ROUND(SUM(CASE WHEN d.submitted_at <= d.due_date THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS DECIMAL(5,2))
        ELSE 100 
    END AS ontime_percent,
    95 AS target_percent,
    CASE 
        WHEN COUNT(*) = 0 OR
             (SUM(CASE WHEN d.submitted_at <= d.due_date THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) >= 95 
        THEN 1 ELSE 0 
    END AS is_pass
FROM pms.docs_ontime_records d
INNER JOIN pms.employees e ON d.employee_id = e.id
GROUP BY YEAR(d.due_date), MONTH(d.due_date), DATEPART(QUARTER, d.due_date),
         d.employee_id, e.employee_code, e.first_name, e.last_name, e.position;
GO

-- 9. Issue Clearing (Personal)
CREATE OR ALTER VIEW pms.vw_kpi_issue_clearing AS
SELECT 
    YEAR(t.due_date) AS year,
    MONTH(t.due_date) AS month,
    DATEPART(QUARTER, t.due_date) AS quarter,
    t.assignee_id AS employee_id,
    e.employee_code,
    e.first_name + ' ' + e.last_name AS employee_name,
    e.position,
    COUNT(*) AS total_tasks,
    SUM(CASE WHEN t.status IN ('Done', 'Done (Not as Planned)') THEN 1 ELSE 0 END) AS cleared_tasks,
    SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) AS done_count,
    SUM(CASE WHEN t.status = 'Done (Not as Planned)' THEN 1 ELSE 0 END) AS done_not_planned_count,
    SUM(CASE WHEN t.status NOT IN ('Done', 'Done (Not as Planned)') THEN 1 ELSE 0 END) AS pending_count,
    CASE 
        WHEN COUNT(*) > 0 
        THEN CAST(ROUND(SUM(CASE WHEN t.status IN ('Done', 'Done (Not as Planned)') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS DECIMAL(5,2))
        ELSE 100 
    END AS clearing_percent,
    85 AS target_percent,
    CASE 
        WHEN COUNT(*) = 0 OR
             (SUM(CASE WHEN t.status IN ('Done', 'Done (Not as Planned)') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) >= 85 
        THEN 1 ELSE 0 
    END AS is_pass
FROM pms.tasks t
INNER JOIN pms.employees e ON t.assignee_id = e.id
WHERE t.assignee_id IS NOT NULL
GROUP BY YEAR(t.due_date), MONTH(t.due_date), DATEPART(QUARTER, t.due_date),
         t.assignee_id, e.employee_code, e.first_name, e.last_name, e.position;
GO

-- 10. Department KPI Summary View
CREATE OR ALTER VIEW pms.vw_kpi_department_summary AS
SELECT 
    year,
    month,
    quarter,
    'Time to Delivery' AS kpi_name,
    'Performance' AS category,
    '>= 80%' AS target,
    AVG(time_to_delivery_percent) AS actual_value,
    80 AS target_value,
    CASE WHEN AVG(time_to_delivery_percent) >= 80 THEN 1 ELSE 0 END AS is_pass,
    'PM,PG,SA' AS affected_positions
FROM pms.vw_kpi_time_to_delivery
GROUP BY year, month, quarter

UNION ALL

SELECT 
    year, month, quarter,
    'Man-day Control', 'Performance', '>= 85%',
    AVG(manday_control_percent), 85,
    CASE WHEN AVG(manday_control_percent) >= 85 THEN 1 ELSE 0 END,
    'PM,PG,SA'
FROM pms.vw_kpi_manday_control
GROUP BY year, month, quarter

UNION ALL

SELECT 
    year, month, quarter,
    'Defect Ratio', 'Quality', '<= 15%',
    AVG(defect_ratio_percent), 15,
    CASE WHEN AVG(defect_ratio_percent) <= 15 THEN 1 ELSE 0 END,
    'PG,SA'
FROM pms.vw_kpi_defect_ratio
GROUP BY year, month, quarter

UNION ALL

SELECT 
    year, month, quarter,
    'Post Go-live Rework', 'Quality', '<= 8%',
    AVG(rework_ratio_percent), 8,
    CASE WHEN AVG(rework_ratio_percent) <= 8 THEN 1 ELSE 0 END,
    'PM,PG,SA'
FROM pms.vw_kpi_post_golive_rework
GROUP BY year, month, quarter

UNION ALL

SELECT 
    year, month, quarter,
    'Deploy Success Rate', 'Quality', '>= 95%',
    AVG(success_rate_percent), 95,
    CASE WHEN AVG(success_rate_percent) >= 95 THEN 1 ELSE 0 END,
    'PG,SA'
FROM pms.vw_kpi_deploy_success
GROUP BY year, month, quarter

UNION ALL

SELECT 
    year, month, quarter,
    'Pre-deploy Backup', 'Availability', '100%',
    AVG(backup_compliance_percent), 100,
    CASE WHEN AVG(backup_compliance_percent) = 100 THEN 1 ELSE 0 END,
    'PM'
FROM pms.vw_kpi_predeploy_backup
GROUP BY year, month, quarter;
GO

-- 11. Employee KPI Summary View
CREATE OR ALTER VIEW pms.vw_kpi_employee_summary AS
WITH EmployeeKPI AS (
    -- Issue Clearing
    SELECT 
        year, month, quarter, employee_id, employee_code, employee_name, position,
        'Issue Clearing' AS kpi_name,
        clearing_percent AS actual_value,
        85 AS target_value,
        is_pass,
        'PM,PG' AS affected_positions
    FROM pms.vw_kpi_issue_clearing
    
    UNION ALL
    
    -- Meeting Minutes
    SELECT 
        year, month, quarter, employee_id, employee_code, employee_name, position,
        'On-time Meeting Minutes',
        CAST(late_count AS DECIMAL(5,2)),
        3,
        is_pass,
        'PM'
    FROM pms.vw_kpi_meeting_minutes
    
    UNION ALL
    
    -- Docs On-time
    SELECT 
        year, month, quarter, employee_id, employee_code, employee_name, position,
        'Required Docs On-time',
        ontime_percent,
        95,
        is_pass,
        'SA'
    FROM pms.vw_kpi_docs_ontime
)
SELECT * FROM EmployeeKPI;
GO
```

---

## Part 2: Server Actions

```typescript
// lib/actions/kpi-dashboard-actions.ts

'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'

// ============================================
// Department KPI Actions
// ============================================

// ดึง Department KPI Summary
export async function getDepartmentKPISummary(
  year: number, 
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  const pool = await getConnection()
  
  let whereClause = 'WHERE year = @year'
  if (period === 'month' && periodValue) {
    whereClause += ' AND month = @periodValue'
  } else if (period === 'quarter' && periodValue) {
    whereClause += ' AND quarter = @periodValue'
  }
  
  const result = await pool.request()
    .input('year', sql.Int, year)
    .input('periodValue', sql.Int, periodValue)
    .query(`
      SELECT 
        kpi_name,
        category,
        target,
        CAST(ROUND(AVG(actual_value), 2) AS DECIMAL(5,2)) AS actual_value,
        target_value,
        MAX(is_pass) AS is_pass,
        affected_positions
      FROM pms.vw_kpi_department_summary
      ${whereClause}
      GROUP BY kpi_name, category, target, target_value, affected_positions
      ORDER BY 
        CASE kpi_name 
          WHEN 'Time to Delivery' THEN 1
          WHEN 'Man-day Control' THEN 2
          WHEN 'Defect Ratio' THEN 3
          WHEN 'Post Go-live Rework' THEN 4
          WHEN 'Deploy Success Rate' THEN 5
          WHEN 'Pre-deploy Backup' THEN 6
        END
    `)
  
  return result.recordset
}

// ดึง Department KPI by Project
export async function getDepartmentKPIByProject(
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  const pool = await getConnection()
  
  let whereClause = 'WHERE year = @year'
  if (period === 'month' && periodValue) {
    whereClause += ' AND month = @periodValue'
  } else if (period === 'quarter' && periodValue) {
    whereClause += ' AND quarter = @periodValue'
  }
  
  // Time to Delivery by Project
  const ttd = await pool.request()
    .input('year', sql.Int, year)
    .input('periodValue', sql.Int, periodValue)
    .query(`SELECT * FROM pms.vw_kpi_time_to_delivery ${whereClause}`)
  
  // Man-day Control by Project  
  const mdc = await pool.request()
    .input('year', sql.Int, year)
    .input('periodValue', sql.Int, periodValue)
    .query(`SELECT * FROM pms.vw_kpi_manday_control ${whereClause}`)
  
  // Defect Ratio by Project
  const dr = await pool.request()
    .input('year', sql.Int, year)
    .input('periodValue', sql.Int, periodValue)
    .query(`SELECT * FROM pms.vw_kpi_defect_ratio ${whereClause}`)
  
  return {
    timeToDelivery: ttd.recordset,
    mandayControl: mdc.recordset,
    defectRatio: dr.recordset
  }
}

// ============================================
// Personal KPI Actions
// ============================================

// ดึง Personal KPI Summary รายบุคคล
export async function getPersonalKPISummary(
  employeeId: string,
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  const pool = await getConnection()
  
  let whereClause = 'WHERE year = @year AND employee_id = @employeeId'
  if (period === 'month' && periodValue) {
    whereClause += ' AND month = @periodValue'
  } else if (period === 'quarter' && periodValue) {
    whereClause += ' AND quarter = @periodValue'
  }
  
  const result = await pool.request()
    .input('year', sql.Int, year)
    .input('periodValue', sql.Int, periodValue)
    .input('employeeId', sql.UniqueIdentifier, employeeId)
    .query(`
      SELECT 
        kpi_name,
        actual_value,
        target_value,
        is_pass,
        affected_positions
      FROM pms.vw_kpi_employee_summary
      ${whereClause}
    `)
  
  return result.recordset
}

// ดึง Personal KPI ทุกคน (สำหรับ Dashboard ภาพรวม)
export async function getAllPersonalKPISummary(
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number,
  departmentId?: string
) {
  const pool = await getConnection()
  
  let whereClause = 'WHERE k.year = @year'
  if (period === 'month' && periodValue) {
    whereClause += ' AND k.month = @periodValue'
  } else if (period === 'quarter' && periodValue) {
    whereClause += ' AND k.quarter = @periodValue'
  }
  
  const result = await pool.request()
    .input('year', sql.Int, year)
    .input('periodValue', sql.Int, periodValue)
    .query(`
      SELECT 
        k.employee_id,
        k.employee_code,
        k.employee_name,
        k.position,
        k.kpi_name,
        k.actual_value,
        k.target_value,
        k.is_pass
      FROM pms.vw_kpi_employee_summary k
      ${whereClause}
      ORDER BY k.employee_name, k.kpi_name
    `)
  
  return result.recordset
}

// ดึงพนักงานที่ At Risk (KPI ไม่ผ่าน)
export async function getAtRiskEmployees(
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  const pool = await getConnection()
  
  let whereClause = 'WHERE year = @year AND is_pass = 0'
  if (period === 'month' && periodValue) {
    whereClause += ' AND month = @periodValue'
  } else if (period === 'quarter' && periodValue) {
    whereClause += ' AND quarter = @periodValue'
  }
  
  const result = await pool.request()
    .input('year', sql.Int, year)
    .input('periodValue', sql.Int, periodValue)
    .query(`
      SELECT 
        employee_id,
        employee_code,
        employee_name,
        position,
        STRING_AGG(kpi_name + ' (' + CAST(actual_value AS VARCHAR) + 
          CASE 
            WHEN kpi_name = 'On-time Meeting Minutes' THEN ' late)'
            ELSE '%)'
          END, ', ') AS failed_kpis,
        COUNT(*) AS failed_count
      FROM pms.vw_kpi_employee_summary
      ${whereClause}
      GROUP BY employee_id, employee_code, employee_name, position
      ORDER BY failed_count DESC
    `)
  
  return result.recordset
}

// ============================================
// KPI Trend Actions
// ============================================

// ดึง KPI Trend รายเดือน
export async function getKPITrend(
  year: number,
  kpiName?: string
) {
  const pool = await getConnection()
  
  const result = await pool.request()
    .input('year', sql.Int, year)
    .query(`
      SELECT 
        month,
        kpi_name,
        AVG(actual_value) AS actual_value,
        target_value
      FROM pms.vw_kpi_department_summary
      WHERE year = @year
      GROUP BY month, kpi_name, target_value
      ORDER BY month, kpi_name
    `)
  
  return result.recordset
}

// ดึง Personal KPI Trend รายเดือน
export async function getPersonalKPITrend(
  employeeId: string,
  year: number
) {
  const pool = await getConnection()
  
  const result = await pool.request()
    .input('year', sql.Int, year)
    .input('employeeId', sql.UniqueIdentifier, employeeId)
    .query(`
      SELECT 
        month,
        kpi_name,
        actual_value,
        target_value,
        is_pass
      FROM pms.vw_kpi_employee_summary
      WHERE year = @year AND employee_id = @employeeId
      ORDER BY month, kpi_name
    `)
  
  return result.recordset
}

// ============================================
// Employee Position Mapping
// ============================================

// ดึง KPI ที่กระทบตำแหน่ง
// ตาม Spec: PM=60, PG=60, SA=60 คะแนน
export function getKPIsByPosition(position: string): string[] {
  // Department KPIs ตาม Spec
  const deptKPIs: Record<string, string[]> = {
    // PM: Time to Delivery(25) + Man-day Control(30) = 55
    'PM': ['Time to Delivery', 'Man-day Control'],
    // PG: Time to Delivery(10) + Man-day Control(10) + Defect Ratio(10) + Post Go-live Rework(5) + Deploy Success Rate(5) + Pre-deploy Backup(5) = 45
    'PG': ['Time to Delivery', 'Man-day Control', 'Defect Ratio', 'Post Go-live Rework', 'Deploy Success Rate', 'Pre-deploy Backup'],
    // SA: Time to Delivery(15) + Man-day Control(15) + Defect Ratio(5) + Post Go-live Rework(5) + Deploy Success Rate(5) = 45
    'SA': ['Time to Delivery', 'Man-day Control', 'Defect Ratio', 'Post Go-live Rework', 'Deploy Success Rate']
  }

  // Personal KPIs ตาม Spec
  const personalKPIs: Record<string, string[]> = {
    // PM: On-time Meeting Minutes(5) = 5, รวม PM = 60
    'PM': ['On-time Meeting Minutes'],
    // PG: Issue Clearing(15) = 15, รวม PG = 60
    'PG': ['Issue Clearing'],
    // SA: On-time Meeting Minutes(5) + Required Docs On-time(5) + Issue Clearing(5) = 15, รวม SA = 60
    'SA': ['On-time Meeting Minutes', 'Required Docs On-time', 'Issue Clearing']
  }

  return [
    ...(deptKPIs[position] || []),
    ...(personalKPIs[position] || [])
  ]
}

// ============================================
// Dashboard Summary
// ============================================

export async function getKPIDashboardData(
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  const [deptKPIs, personalKPIs, atRiskEmployees, kpiTrend] = await Promise.all([
    getDepartmentKPISummary(year, period, periodValue),
    getAllPersonalKPISummary(year, period, periodValue),
    getAtRiskEmployees(year, period, periodValue),
    getKPITrend(year)
  ])
  
  // Calculate summary stats
  const deptPassCount = deptKPIs.filter(k => k.is_pass === 1).length
  const deptTotalCount = deptKPIs.length
  
  // Group personal KPIs by KPI name
  const personalKPIGroups = personalKPIs.reduce((acc, k) => {
    if (!acc[k.kpi_name]) {
      acc[k.kpi_name] = { pass: 0, fail: 0, total: 0 }
    }
    acc[k.kpi_name].total++
    if (k.is_pass === 1) {
      acc[k.kpi_name].pass++
    } else {
      acc[k.kpi_name].fail++
    }
    return acc
  }, {} as Record<string, { pass: number; fail: number; total: number }>)
  
  return {
    summary: {
      deptKPIPass: deptPassCount,
      deptKPITotal: deptTotalCount,
      deptKPIPercent: deptTotalCount > 0 ? Math.round(deptPassCount * 100 / deptTotalCount) : 0,
      atRiskCount: atRiskEmployees.length
    },
    departmentKPIs: deptKPIs,
    personalKPIGroups,
    atRiskEmployees,
    kpiTrend
  }
}

// ============================================
// My KPI Dashboard
// ============================================

export async function getMyKPIDashboardData(
  employeeId: string,
  position: string,
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  const [deptKPIs, personalKPIs, kpiTrend] = await Promise.all([
    getDepartmentKPISummary(year, period, periodValue),
    getPersonalKPISummary(employeeId, year, period, periodValue),
    getPersonalKPITrend(employeeId, year)
  ])
  
  // Filter dept KPIs by position
  const relevantKPIs = getKPIsByPosition(position)
  const myDeptKPIs = deptKPIs.filter(k => 
    k.affected_positions.includes(position)
  )
  
  // Combine all KPIs
  const allMyKPIs = [
    ...myDeptKPIs.map(k => ({ ...k, type: 'department' })),
    ...personalKPIs.map(k => ({ ...k, type: 'personal' }))
  ]
  
  const passCount = allMyKPIs.filter(k => k.is_pass === 1).length
  const totalCount = allMyKPIs.length
  const failedKPIs = allMyKPIs.filter(k => k.is_pass === 0)
  
  return {
    summary: {
      totalKPIs: totalCount,
      passCount,
      failCount: totalCount - passCount,
      passPercent: totalCount > 0 ? Math.round(passCount * 100 / totalCount) : 0,
      status: failedKPIs.length === 0 ? 'pass' : failedKPIs.length <= 2 ? 'at_risk' : 'fail'
    },
    departmentKPIs: myDeptKPIs,
    personalKPIs,
    failedKPIs,
    kpiTrend
  }
}
```

---

## Part 3: AI Analysis Action

```typescript
// lib/actions/kpi-ai-actions.ts

'use server'

import Anthropic from '@anthropic-ai/sdk'
import { getKPIDashboardData, getMyKPIDashboardData } from './kpi-dashboard-actions'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// AI วิเคราะห์ KPI Dashboard (ภาพรวมทีม)
export async function analyzeKPIDashboard(
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  const data = await getKPIDashboardData(year, period, periodValue)
  
  const periodLabel = period === 'month' 
    ? `เดือน ${periodValue}/${year}` 
    : period === 'quarter' 
    ? `Q${periodValue}/${year}` 
    : `ปี ${year}`
  
  const prompt = `
คุณเป็น HR Analytics Expert ช่วยวิเคราะห์ KPI ขององค์กร

## ข้อมูล KPI ${periodLabel}

### Department KPI Summary
${data.departmentKPIs.map(k => 
  `- ${k.kpi_name}: ${k.actual_value}% (Target: ${k.target}) ${k.is_pass ? '✅ Pass' : '❌ Fail'}`
).join('\n')}

### Department KPI Pass Rate
- ผ่าน: ${data.summary.deptKPIPass}/${data.summary.deptKPITotal} (${data.summary.deptKPIPercent}%)

### Personal KPI Summary
${Object.entries(data.personalKPIGroups).map(([name, stats]: [string, any]) => 
  `- ${name}: Pass ${stats.pass}/${stats.total}, Fail ${stats.fail}`
).join('\n')}

### พนักงานที่ At Risk (${data.atRiskEmployees.length} คน)
${data.atRiskEmployees.slice(0, 10).map(e => 
  `- ${e.employee_name} (${e.position}): ${e.failed_kpis}`
).join('\n') || 'ไม่มี'}

---

กรุณาวิเคราะห์และตอบเป็นภาษาไทยในรูปแบบ JSON:
{
  "summary": "สรุปภาพรวม 2-3 ประโยค",
  "strengths": ["จุดแข็ง 1", "จุดแข็ง 2"],
  "concerns": ["จุดที่ต้องปรับปรุง 1", "จุดที่ต้องปรับปรุง 2"],
  "recommendations": ["คำแนะนำ 1", "คำแนะนำ 2"],
  "focus_areas": ["สิ่งที่ต้องโฟกัส 1", "สิ่งที่ต้องโฟกัส 2"],
  "overall_status": "good" | "warning" | "critical"
}
`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })
    
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      return {
        success: true,
        analysis: JSON.parse(jsonMatch[0])
      }
    }
    
    return { success: false, error: 'Failed to parse response' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// AI วิเคราะห์ My KPI
export async function analyzeMyKPI(
  employeeId: string,
  employeeName: string,
  position: string,
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  const data = await getMyKPIDashboardData(employeeId, position, year, period, periodValue)
  
  const periodLabel = period === 'month' 
    ? `เดือน ${periodValue}/${year}` 
    : period === 'quarter' 
    ? `Q${periodValue}/${year}` 
    : `ปี ${year}`
  
  const prompt = `
คุณเป็น Performance Coach ช่วยวิเคราะห์ KPI ของพนักงาน

## ข้อมูล KPI ${periodLabel}
พนักงาน: ${employeeName}
ตำแหน่ง: ${position}

### KPI Summary
- ผ่าน: ${data.summary.passCount}/${data.summary.totalKPIs} (${data.summary.passPercent}%)
- ไม่ผ่าน: ${data.summary.failCount}
- สถานะ: ${data.summary.status}

### Department KPI (ที่กระทบตำแหน่ง ${position})
${data.departmentKPIs.map(k => 
  `- ${k.kpi_name}: ${k.actual_value}% (Target: ${k.target}) ${k.is_pass ? '✅' : '❌'}`
).join('\n')}

### Personal KPI
${data.personalKPIs.map(k => 
  `- ${k.kpi_name}: ${k.actual_value}${k.kpi_name.includes('Meeting') ? ' ครั้ง' : '%'} (Target: ${k.target_value}) ${k.is_pass ? '✅' : '❌'}`
).join('\n')}

### KPI ที่ไม่ผ่าน
${data.failedKPIs.map(k => 
  `- ${k.kpi_name}: ${k.actual_value} (ห่างจาก Target: ${Math.abs(k.actual_value - k.target_value)})`
).join('\n') || 'ไม่มี'}

---

กรุณาวิเคราะห์และให้คำแนะนำเป็นภาษาไทยในรูปแบบ JSON:
{
  "summary": "สรุปผลงาน 2-3 ประโยค",
  "achievements": ["ความสำเร็จ 1", "ความสำเร็จ 2"],
  "improvement_areas": ["สิ่งที่ต้องปรับปรุง 1", "สิ่งที่ต้องปรับปรุง 2"],
  "action_items": ["สิ่งที่ควรทำ 1", "สิ่งที่ควรทำ 2", "สิ่งที่ควรทำ 3"],
  "motivation": "ข้อความให้กำลังใจ",
  "risk_level": "low" | "medium" | "high"
}
`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })
    
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      return {
        success: true,
        analysis: JSON.parse(jsonMatch[0])
      }
    }
    
    return { success: false, error: 'Failed to parse response' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

---

## Part 4: KPI Dashboard Page (ภาพรวมทีม)

```typescript
// app/(main)/kpi-dashboard/page.tsx

import { Suspense } from 'react'
import { KPIDashboard } from '@/components/kpi/KPIDashboard'
import { getKPIDashboardData } from '@/lib/actions/kpi-dashboard-actions'
import { analyzeKPIDashboard } from '@/lib/actions/kpi-ai-actions'

export default async function KPIDashboardPage({
  searchParams
}: {
  searchParams: { 
    year?: string
    period?: 'month' | 'quarter' | 'year'
    value?: string 
  }
}) {
  const now = new Date()
  const year = parseInt(searchParams.year || now.getFullYear().toString())
  const period = searchParams.period || 'quarter'
  const periodValue = parseInt(searchParams.value || Math.ceil((now.getMonth() + 1) / 3).toString())
  
  const [dashboardData, aiAnalysis] = await Promise.all([
    getKPIDashboardData(year, period, periodValue),
    analyzeKPIDashboard(year, period, periodValue)
  ])
  
  return (
    <div className="p-6">
      <Suspense fallback={<div>Loading...</div>}>
        <KPIDashboard 
          data={dashboardData}
          aiAnalysis={aiAnalysis}
          year={year}
          period={period}
          periodValue={periodValue}
        />
      </Suspense>
    </div>
  )
}
```

---

## Part 5: KPI Dashboard Component (ภาพรวมทีม)

```typescript
// components/kpi/KPIDashboard.tsx

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Target, Users, AlertTriangle, TrendingUp, TrendingDown,
  CheckCircle, XCircle, Brain, Download, Building2, User
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface KPIDashboardProps {
  data: any
  aiAnalysis: any
  year: number
  period: 'month' | 'quarter' | 'year'
  periodValue: number
}

export function KPIDashboard({ data, aiAnalysis, year, period, periodValue }: KPIDashboardProps) {
  const router = useRouter()
  const analysis = aiAnalysis?.analysis
  
  const handlePeriodChange = (newPeriod: string) => {
    router.push(`/kpi-dashboard?year=${year}&period=${newPeriod}&value=${periodValue}`)
  }
  
  const handleYearChange = (newYear: string) => {
    router.push(`/kpi-dashboard?year=${newYear}&period=${period}&value=${periodValue}`)
  }
  
  const handleValueChange = (newValue: string) => {
    router.push(`/kpi-dashboard?year=${year}&period=${period}&value=${newValue}`)
  }
  
  const getStatusColor = (isPass: number, isLowerBetter?: boolean) => {
    return isPass === 1 ? 'text-green-600' : 'text-red-600'
  }
  
  const getStatusIcon = (isPass: number) => {
    return isPass === 1 
      ? <CheckCircle className="h-5 w-5 text-green-600" />
      : <XCircle className="h-5 w-5 text-red-600" />
  }
  
  const getOverallStatus = () => {
    const status = analysis?.overall_status
    if (status === 'good') return { label: '🟢 Good', color: 'bg-green-100 text-green-700' }
    if (status === 'warning') return { label: '🟡 Warning', color: 'bg-yellow-100 text-yellow-700' }
    return { label: '🔴 Critical', color: 'bg-red-100 text-red-700' }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            📊 KPI Dashboard
          </h1>
          <p className="text-gray-500">ภาพรวม KPI ของทีม</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Period Type */}
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">รายเดือน</SelectItem>
              <SelectItem value="quarter">รายไตรมาส</SelectItem>
              <SelectItem value="year">รายปี</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Period Value */}
          {period === 'month' && (
            <Select value={periodValue.toString()} onValueChange={handleValueChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
                      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {period === 'quarter' && (
            <Select value={periodValue.toString()} onValueChange={handleValueChange}>
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Q1</SelectItem>
                <SelectItem value="2">Q2</SelectItem>
                <SelectItem value="3">Q3</SelectItem>
                <SelectItem value="4">Q4</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {/* Year */}
          <Select value={year.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Export */}
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.summary.deptKPIPercent}%
            </div>
            <Progress value={data.summary.deptKPIPercent} className="mt-2 h-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Dept KPI Pass
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.summary.deptKPIPass}/{data.summary.deptKPITotal}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {data.summary.deptKPIPercent}% ผ่าน
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal KPI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Object.keys(data.personalKPIGroups).length}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              KPIs tracked
            </p>
          </CardContent>
        </Card>
        
        <Card className={data.summary.atRiskCount > 0 ? 'border-red-200' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${data.summary.atRiskCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {data.summary.atRiskCount}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              พนักงาน
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* AI Insights */}
      {analysis && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Insights
              <Badge className={getOverallStatus().color}>
                {getOverallStatus().label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">{analysis.summary}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.strengths?.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-700 mb-2">✅ จุดแข็ง</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {analysis.strengths.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysis.concerns?.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-700 mb-2">⚠️ จุดที่ต้องปรับปรุง</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {analysis.concerns.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {analysis.recommendations?.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-700 mb-2">💡 คำแนะนำ</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  {analysis.recommendations.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Department KPI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Department KPI
          </CardTitle>
          <CardDescription>KPI ระดับแผนก/ทีม - ถ้าไม่ผ่านกระทบทั้งทีม</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">KPI</th>
                  <th className="text-center py-3 px-2">Category</th>
                  <th className="text-center py-3 px-2">Target</th>
                  <th className="text-center py-3 px-2">Actual</th>
                  <th className="text-center py-3 px-2">Status</th>
                  <th className="text-center py-3 px-2">Affected</th>
                </tr>
              </thead>
              <tbody>
                {data.departmentKPIs.map((kpi: any, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{kpi.kpi_name}</td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="outline">{kpi.category}</Badge>
                    </td>
                    <td className="text-center py-3 px-2">{kpi.target}</td>
                    <td className={`text-center py-3 px-2 font-bold ${getStatusColor(kpi.is_pass)}`}>
                      {kpi.actual_value}%
                    </td>
                    <td className="text-center py-3 px-2">
                      {getStatusIcon(kpi.is_pass)}
                    </td>
                    <td className="text-center py-3 px-2">
                      <div className="flex justify-center gap-1">
                        {kpi.affected_positions.split(',').map((pos: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {pos.trim()}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Personal KPI Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal KPI Summary
          </CardTitle>
          <CardDescription>KPI ระดับบุคคล - กระทบเฉพาะตัว</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">KPI</th>
                  <th className="text-center py-3 px-2">Target</th>
                  <th className="text-center py-3 px-2">Pass</th>
                  <th className="text-center py-3 px-2">Fail</th>
                  <th className="text-center py-3 px-2">Affected</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.personalKPIGroups).map(([name, stats]: [string, any], idx: number) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{name}</td>
                    <td className="text-center py-3 px-2">
                      {name.includes('Meeting') ? '≤3 ครั้ง' : '≥85%'}
                    </td>
                    <td className="text-center py-3 px-2 text-green-600 font-medium">
                      {stats.pass}
                    </td>
                    <td className="text-center py-3 px-2 text-red-600 font-medium">
                      {stats.fail}
                    </td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="secondary" className="text-xs">
                        {name.includes('Meeting') ? 'PM' : name.includes('Docs') ? 'SA' : 'PM,PG'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* At Risk Employees */}
      {data.atRiskEmployees.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              At Risk Employees ({data.atRiskEmployees.length})
            </CardTitle>
            <CardDescription>พนักงานที่มี KPI ไม่ผ่าน</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.atRiskEmployees.map((emp: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">👤</span>
                    <div>
                      <p className="font-medium">{emp.employee_name}</p>
                      <p className="text-sm text-gray-500">{emp.position}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600">{emp.failed_kpis}</p>
                    <Badge variant="destructive" className="mt-1">
                      {emp.failed_count} KPI ไม่ผ่าน
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## Part 6: My KPI Dashboard Page

```typescript
// app/(main)/my-kpi/page.tsx

import { Suspense } from 'react'
import { MyKPIDashboard } from '@/components/kpi/MyKPIDashboard'
import { getMyKPIDashboardData } from '@/lib/actions/kpi-dashboard-actions'
import { analyzeMyKPI } from '@/lib/actions/kpi-ai-actions'
import { getCurrentUser } from '@/lib/auth'

export default async function MyKPIPage({
  searchParams
}: {
  searchParams: { 
    year?: string
    period?: 'month' | 'quarter' | 'year'
    value?: string 
  }
}) {
  const user = await getCurrentUser()
  
  if (!user) {
    return <div>Please login</div>
  }
  
  const now = new Date()
  const year = parseInt(searchParams.year || now.getFullYear().toString())
  const period = searchParams.period || 'quarter'
  const periodValue = parseInt(searchParams.value || Math.ceil((now.getMonth() + 1) / 3).toString())
  
  const [dashboardData, aiAnalysis] = await Promise.all([
    getMyKPIDashboardData(user.id, user.position, year, period, periodValue),
    analyzeMyKPI(user.id, user.name, user.position, year, period, periodValue)
  ])
  
  return (
    <div className="p-6">
      <Suspense fallback={<div>Loading...</div>}>
        <MyKPIDashboard 
          data={dashboardData}
          aiAnalysis={aiAnalysis}
          user={user}
          year={year}
          period={period}
          periodValue={periodValue}
        />
      </Suspense>
    </div>
  )
}
```

---

## Part 7: My KPI Dashboard Component

```typescript
// components/kpi/MyKPIDashboard.tsx

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Target, CheckCircle, XCircle, Brain, TrendingUp,
  Building2, User, AlertTriangle, Award
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MyKPIDashboardProps {
  data: any
  aiAnalysis: any
  user: { id: string; name: string; position: string }
  year: number
  period: 'month' | 'quarter' | 'year'
  periodValue: number
}

export function MyKPIDashboard({ data, aiAnalysis, user, year, period, periodValue }: MyKPIDashboardProps) {
  const router = useRouter()
  const analysis = aiAnalysis?.analysis
  
  const handlePeriodChange = (newPeriod: string) => {
    router.push(`/my-kpi?year=${year}&period=${newPeriod}&value=${periodValue}`)
  }
  
  const handleYearChange = (newYear: string) => {
    router.push(`/my-kpi?year=${newYear}&period=${period}&value=${periodValue}`)
  }
  
  const handleValueChange = (newValue: string) => {
    router.push(`/my-kpi?year=${year}&period=${period}&value=${newValue}`)
  }
  
  const getStatusBadge = () => {
    const status = data.summary.status
    if (status === 'pass') return { label: '✅ ผ่านทั้งหมด', color: 'bg-green-100 text-green-700' }
    if (status === 'at_risk') return { label: '⚠️ At Risk', color: 'bg-yellow-100 text-yellow-700' }
    return { label: '❌ ต้องปรับปรุง', color: 'bg-red-100 text-red-700' }
  }
  
  const getRiskBadge = () => {
    const risk = analysis?.risk_level
    if (risk === 'low') return { label: '🟢 Low Risk', color: 'bg-green-100 text-green-700' }
    if (risk === 'medium') return { label: '🟡 Medium Risk', color: 'bg-yellow-100 text-yellow-700' }
    return { label: '🔴 High Risk', color: 'bg-red-100 text-red-700' }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            📊 My KPI Dashboard
          </h1>
          <p className="text-gray-500">
            👤 {user.name} ({user.position})
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">รายเดือน</SelectItem>
              <SelectItem value="quarter">รายไตรมาส</SelectItem>
              <SelectItem value="year">รายปี</SelectItem>
            </SelectContent>
          </Select>
          
          {period === 'quarter' && (
            <Select value={periodValue.toString()} onValueChange={handleValueChange}>
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Q1</SelectItem>
                <SelectItem value="2">Q2</SelectItem>
                <SelectItem value="3">Q3</SelectItem>
                <SelectItem value="4">Q4</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          <Select value={year.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.summary.passPercent}%</div>
            <Progress value={data.summary.passPercent} className="mt-2 h-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              KPI Passed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {data.summary.passCount}/{data.summary.totalKPIs}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              KPI Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {data.summary.failCount}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusBadge().color}>
              {getStatusBadge().label}
            </Badge>
          </CardContent>
        </Card>
      </div>
      
      {/* AI Insights */}
      {analysis && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Coach
              <Badge className={getRiskBadge().color}>
                {getRiskBadge().label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">{analysis.summary}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.achievements?.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-700 mb-2">🏆 ความสำเร็จ</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {analysis.achievements.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysis.improvement_areas?.length > 0 && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-orange-700 mb-2">📈 สิ่งที่ต้องปรับปรุง</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {analysis.improvement_areas.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {analysis.action_items?.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-700 mb-2">📋 Action Items</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  {analysis.action_items.map((a: string, i: number) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {analysis.motivation && (
              <div className="p-4 bg-purple-100 rounded-lg text-center">
                <p className="text-purple-800 font-medium">💪 {analysis.motivation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Department KPI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Department KPI
          </CardTitle>
          <CardDescription>KPI ที่กระทบตำแหน่ง {user.position}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.departmentKPIs.map((kpi: any, idx: number) => (
              <div key={idx} className={`p-4 rounded-lg border-2 ${kpi.is_pass ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm">{kpi.kpi_name}</span>
                  {kpi.is_pass ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className={`text-2xl font-bold ${kpi.is_pass ? 'text-green-700' : 'text-red-700'}`}>
                  {kpi.actual_value}%
                </div>
                <p className="text-xs text-gray-500 mt-1">Target: {kpi.target}</p>
                <Progress 
                  value={Math.min(kpi.actual_value, 100)} 
                  className={`mt-2 h-2 ${kpi.is_pass ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Personal KPI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal KPI
          </CardTitle>
          <CardDescription>KPI ส่วนบุคคลของคุณ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.personalKPIs.map((kpi: any, idx: number) => (
              <div key={idx} className={`p-4 rounded-lg border-2 ${kpi.is_pass ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{kpi.kpi_name}</h4>
                    <p className="text-sm text-gray-500">
                      Target: {kpi.kpi_name.includes('Meeting') ? `≤${kpi.target_value} ครั้ง` : `≥${kpi.target_value}%`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${kpi.is_pass ? 'text-green-700' : 'text-red-700'}`}>
                      {kpi.actual_value}{kpi.kpi_name.includes('Meeting') ? ' ครั้ง' : '%'}
                    </div>
                    <Badge className={kpi.is_pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {kpi.is_pass ? '✅ Pass' : '❌ Fail'}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={kpi.kpi_name.includes('Meeting') 
                    ? Math.max(0, 100 - (kpi.actual_value / kpi.target_value * 100))
                    : kpi.actual_value
                  } 
                  className={`mt-3 h-2 ${kpi.is_pass ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Failed KPI Details */}
      {data.failedKPIs.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              KPI ที่ต้องปรับปรุง
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.failedKPIs.map((kpi: any, idx: number) => (
                <div key={idx} className="p-4 bg-red-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-red-700">❌ {kpi.kpi_name}</h4>
                    <Badge variant="destructive">
                      Gap: {Math.abs(kpi.actual_value - kpi.target_value).toFixed(1)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Target:</span>
                      <span className="ml-2 font-medium">{kpi.target_value}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Actual:</span>
                      <span className="ml-2 font-medium text-red-600">{kpi.actual_value}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2">{kpi.type === 'department' ? 'Dept' : 'Personal'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## Summary

### Files to Create

| File | Description |
|------|-------------|
| SQL Views (11 views) | คำนวณ KPI ทั้งหมด |
| `kpi-dashboard-actions.ts` | Server Actions |
| `kpi-ai-actions.ts` | AI Analysis |
| `kpi-dashboard/page.tsx` | Dashboard Page (ภาพรวม) |
| `KPIDashboard.tsx` | Dashboard Component |
| `my-kpi/page.tsx` | My KPI Page |
| `MyKPIDashboard.tsx` | My KPI Component |

### Features

| Feature | KPI Dashboard (ทีม) | My KPI (บุคคล) |
|---------|:------------------:|:--------------:|
| Summary Cards | ✅ | ✅ |
| AI Insights | ✅ | ✅ (Coach) |
| Department KPI | ✅ (ทั้งหมด) | ✅ (เฉพาะตำแหน่ง) |
| Personal KPI | ✅ (Summary) | ✅ (รายละเอียด) |
| At Risk List | ✅ | - |
| Failed KPI Details | - | ✅ |
| Period Filter | ✅ | ✅ |
| Export | ✅ | ✅ |

### Menu Structure

```
├── KPI Dashboard      (Admin/Manager)
└── My KPI             (ทุกคน - ดูของตัวเอง)
```❌   │ │ ⚠️ At Risk│        │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘        │
│                                                                 │
│ 🤖 AI Coach                                      🟡 Medium Risk │
│ ├── 🏆 ความสำเร็จ                                              │
│ ├── 📈 สิ่งที่ต้องปรับปรุง                                     │
│ ├── 📋 Action Items                                            │
│ └── 💪 ข้อความให้กำลังใจ                                       │
│                                                                 │
│ 🏢 DEPARTMENT KPI (ที่กระทบ PG)                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │ Time to Del │ │ Man-day Ctrl│ │ Defect Ratio│                │
│ │    82% ✅   │ │    88% ✅   │ │    12% ✅   │                │
│ └─────────────┘ └─────────────┘ └─────────────┘                │
│ ┌─────────────┐ ┌─────────────┐                                │
│ │ Post GoLive │ │ Deploy Succ │                                │
│ │    10% ❌   │ │    98% ✅   │                                │
│ └─────────────┘ └─────────────┘                                │
│                                                                 │
│ 👤 PERSONAL KPI                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Issue Clearing                                              ││
│ │ Target: >=85%    Current: 88%    ✅ Pass                    ││
│ │ ████████████████████░░░░                                    ││
│ │ Done: 40 | Done (Not as Planned): 4 | Pending: 6            ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ❌ KPI ที่ต้องปรับปรุง                                          │
│ ├── Post Go-live Rework: 10% (Target <=8%, Gap: 2%)            │
│ └── สาเหตุ: Bug หลัง Go-Live 5 mandays                         │
└─────────────────────────────────────────────────────────────────┘

---

### 📋 Features ทั้ง 2 Dashboard

| Feature | KPI Dashboard (ทีม) | My KPI (บุคคล) |
|---------|:------------------:|:--------------:|
| Summary Cards | ✅ | ✅ |
| 🤖 AI Insights | ✅ | ✅ (Coach) |
| Department KPI | ✅ ทั้งหมด | ✅ เฉพาะตำแหน่ง |
| Personal KPI | ✅ Summary | ✅ รายละเอียด |
| At Risk List | ✅ | - |
| Failed KPI Details | - | ✅ |
| Filter (เดือน/ไตรมาส/ปี) | ✅ | ✅ |
| Export Report | ✅ | ✅ |

---

### 🤖 AI Features

| Dashboard | AI ทำอะไร |
|-----------|----------|
| **KPI Dashboard** | วิเคราะห์ภาพรวม, จุดแข็ง/จุดอ่อน, คำแนะนำระดับองค์กร |
| **My KPI** | เป็น Coach ส่วนตัว, ชมความสำเร็จ, แนะนำ Action Items, ให้กำลังใจ |

---

### ⚠️ สิ่งที่ต้องเตรียม

| รายการ | หมายเหตุ |
|--------|----------|
| **ANTHROPIC_API_KEY** | ใส่ใน `.env.local` |
| **SQL Views** | รัน 11 Views ก่อน |
| **task_type_configs.is_defect** | ต้องมี flag สำหรับ Defect Ratio |
