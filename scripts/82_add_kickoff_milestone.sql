-- =============================================
-- Script 82: Add KICKOFF milestone config
-- Description: Inserts a "Kick off" milestone between Marketing (sort_order=0)
--              and Mapping Data (sort_order=10), at sort_order=5.
--              Idempotent — running twice is a no-op.
-- =============================================

IF NOT EXISTS (SELECT 1 FROM pms.milestone_configs WHERE code = 'KICKOFF')
BEGIN
    INSERT INTO pms.milestone_configs (
        code, name, name_th, color, sort_order, is_active
    )
    VALUES (
        'KICKOFF',
        'Kick off',
        N'เริ่มโครงการ',
        '#a78bfa',   -- purple-400 — distinct from the existing palette
        5,
        1
    );
    PRINT 'Inserted milestone_config: KICKOFF (sort_order=5)';
END
ELSE
BEGIN
    PRINT 'milestone_config KICKOFF already exists — no changes';
END
