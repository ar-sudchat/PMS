
-- Update Milestone Configs with Thai Names
UPDATE pms.milestone_configs SET name_th = N'แผนผังข้อมูล' WHERE code = 'MAPPING';
UPDATE pms.milestone_configs SET name_th = N'ทดสอบระบบ' WHERE code = 'SYSTEMTEST';
UPDATE pms.milestone_configs SET name_th = N'ทดสอบโดยผู้ใช้' WHERE code = 'UAT';
UPDATE pms.milestone_configs SET name_th = N'ขึ้นระบบจริง' WHERE code = 'GOLIVE';
UPDATE pms.milestone_configs SET name_th = N'ปิดโครงการ' WHERE code = 'CLOSEGOLIVE';

-- Update Task Type Configs with Thai Names
UPDATE pms.task_type_configs SET name_th = N'แก้ไขบั๊ก' WHERE code = 'BUG_FIX';
UPDATE pms.task_type_configs SET name_th = N'ทดสอบ' WHERE code = 'TESTING';
UPDATE pms.task_type_configs SET name_th = N'ออกแบบ' WHERE code = 'DESIGN';
UPDATE pms.task_type_configs SET name_th = N'ติดตั้งระบบ' WHERE code = 'DEPLOYMENT';
UPDATE pms.task_type_configs SET name_th = N'จัดทำเอกสาร' WHERE code = 'DOCUMENTATION';
