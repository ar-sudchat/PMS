-- =============================================
-- 60: Update Chance Configs to 7-Level Pipeline
-- Description: Update chance stages with proper percentages and criteria
-- =============================================

-- Update existing records and add new ones using MERGE
MERGE pms.chance_configs AS target
USING (VALUES
    ('NEW',     'New',                  N'New 0%',                  N'ยังไม่เสนอราคา', 0, '#94A3B8', 1),
    ('COLD',    'Cold',                 N'Cold 10%',                N'เสนอราคาอย่างเดียว', 10, '#3B82F6', 2),
    ('WARM',    'Warm',                 N'Warm 30%',                N'ส่งใบเสนอราคาแล้ว และได้นำเสนอ Solutions ให้ระดับ Operation เรียบร้อยแล้ว', 30, '#F97316', 3),
    ('HOT',     'Hot',                  N'Hot 50%',                 N'ส่งใบเสนอราคาแล้ว และได้นำเสนอ Solutions ให้ระดับ Management ที่มีอำนาจตัดสินใจเรียบร้อยแล้ว', 50, '#EF4444', 4),
    ('PROSPECT','Prospect',             N'Prospect 70%',            N'ส่งใบเสนอราคาแล้ว, พบผู้ตัดสินใจได้, รู้กำหนดการตัดสินใจ และงบประมาณผ่านแล้ว', 70, '#8B5CF6', 5),
    ('VERBAL',  'Verbal Confirmation',  N'Verbal Confirmation 90%', N'ลูกค้าตกลงสั่งซื้อด้วยวาจา (รอเอกสารทางการ)', 90, '#10B981', 6),
    ('CUSTOMER','Customer',             N'Customer 100%',           N'ได้รับใบสั่งซื้อ (PO) เรียบร้อยแล้ว', 100, '#22C55E', 7)
) AS source (code, name, name_th, description, percentage, color, sort_order)
ON target.code = source.code
WHEN MATCHED THEN
    UPDATE SET
        name = source.name,
        name_th = source.name_th,
        description = source.description,
        percentage = source.percentage,
        color = source.color,
        sort_order = source.sort_order,
        updated_at = GETDATE()
WHEN NOT MATCHED BY TARGET THEN
    INSERT (code, name, name_th, description, percentage, color, sort_order, is_active)
    VALUES (source.code, source.name, source.name_th, source.description, source.percentage, source.color, source.sort_order, 1);

-- Deactivate HOLD (no longer in the new pipeline)
UPDATE pms.chance_configs
SET is_active = 0, updated_at = GETDATE()
WHERE code = 'HOLD';

PRINT 'Updated chance_configs to 7-level pipeline';
GO
