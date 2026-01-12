-- ============================================
-- Update Default Weights for Milestone Configs
-- Run this script to add default_weight columns and set values
-- ============================================

USE PMSoftware;
GO

-- 1. Add default_weight_ttd column if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs' AND COLUMN_NAME = 'default_weight_ttd')
BEGIN
    ALTER TABLE pms.milestone_configs ADD default_weight_ttd DECIMAL(5,2) NOT NULL DEFAULT 0;
    PRINT 'Added column: default_weight_ttd';
END
ELSE
    PRINT 'Column already exists: default_weight_ttd';
GO

-- 2. Add default_weight_mdc column if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs' AND COLUMN_NAME = 'default_weight_mdc')
BEGIN
    ALTER TABLE pms.milestone_configs ADD default_weight_mdc DECIMAL(5,2) NOT NULL DEFAULT 0;
    PRINT 'Added column: default_weight_mdc';
END
ELSE
    PRINT 'Column already exists: default_weight_mdc';
GO

-- 3. Update default weights based on milestone name (case insensitive)
UPDATE pms.milestone_configs SET default_weight_ttd = 35, default_weight_mdc = 30 WHERE UPPER(name) LIKE '%MAPPING%';
UPDATE pms.milestone_configs SET default_weight_ttd = 20, default_weight_mdc = 30 WHERE UPPER(name) LIKE '%SYSTEM%TEST%' OR UPPER(code) LIKE '%SYSTEMTEST%';
UPDATE pms.milestone_configs SET default_weight_ttd = 30, default_weight_mdc = 20 WHERE UPPER(name) LIKE '%UAT%';
UPDATE pms.milestone_configs SET default_weight_ttd = 15, default_weight_mdc = 10 WHERE UPPER(name) LIKE '%GO%LIVE%' AND UPPER(name) NOT LIKE '%CLOSE%';
UPDATE pms.milestone_configs SET default_weight_ttd = 0, default_weight_mdc = 10 WHERE UPPER(name) LIKE '%CLOSE%GO%LIVE%';

-- 4. Also update kpi_weight columns (for backward compatibility)
UPDATE pms.milestone_configs SET kpi_weight_ttd = default_weight_ttd, kpi_weight_mdc = default_weight_mdc
WHERE kpi_weight_ttd = 0 AND kpi_weight_mdc = 0;

PRINT 'Updated default weights for milestone configs';
GO

-- 5. Verify results
SELECT code, name, default_weight_ttd, default_weight_mdc, kpi_weight_ttd, kpi_weight_mdc
FROM pms.milestone_configs
ORDER BY sort_order;
GO
