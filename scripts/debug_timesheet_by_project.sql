-- Timesheet entries for project by code
SELECT
    p.project_code,
    s.story_code,
    t.task_code,
    mc.name AS milestone_name,
    ts.entry_date,
    ts.hours,
    e.first_name + ' ' + e.last_name AS employee
FROM pms.timesheet_entries ts
INNER JOIN pms.tasks t ON ts.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
LEFT JOIN pms.employees e ON ts.employee_id = e.id
WHERE p.project_code = '1322'
ORDER BY ts.entry_date DESC
