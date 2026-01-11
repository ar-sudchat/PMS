-- Insert deliverables for existing project_milestones
INSERT INTO pms.project_deliverables (project_milestone_id, deliverable_config_id, name, name_th, is_required, sort_order, is_active)
SELECT 
    pm.id AS project_milestone_id,
    dc.id AS deliverable_config_id,
    dc.name,
    dc.name_th,
    dc.is_required,
    dc.sort_order,
    1 -- is_active
FROM pms.project_milestones pm
INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
INNER JOIN pms.deliverable_configs dc ON dc.milestone_config_id = mc.id
WHERE NOT EXISTS (
    SELECT 1 FROM pms.project_deliverables pd 
    WHERE pd.project_milestone_id = pm.id 
    AND pd.deliverable_config_id = dc.id
);

-- Verify counts
SELECT pm.id, count(pd.id) as deliverable_count
FROM pms.project_milestones pm
LEFT JOIN pms.project_deliverables pd ON pd.project_milestone_id = pm.id
GROUP BY pm.id;
