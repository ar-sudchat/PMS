-- =============================================
-- Print System Tables for PMS
-- Supports auto-printing to SATO and other printers
-- =============================================

-- 1. Printers Table - เก็บรายการเครื่องพิมพ์
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pms.printers') AND type = 'U')
BEGIN
    CREATE TABLE pms.printers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(100) NOT NULL,           -- ชื่อเครื่องพิมพ์ (แสดงใน UI)
        printer_type NVARCHAR(50) NOT NULL,    -- SATO, ZEBRA, EPSON, GENERIC
        connection_type NVARCHAR(20) NOT NULL, -- USB, NETWORK, SERIAL
        connection_string NVARCHAR(255),       -- IP:Port หรือ COM Port
        printer_model NVARCHAR(100),           -- รุ่นเครื่อง เช่น SATO CL4NX
        print_language NVARCHAR(20),           -- SBPL, ZPL, ESC/POS
        is_default BIT DEFAULT 0,
        is_active BIT DEFAULT 1,
        settings NVARCHAR(MAX),                -- JSON: DPI, speed, etc.
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    )
    PRINT 'Created table pms.printers'
END
GO

-- 2. Print Jobs Table - คิวงานพิมพ์
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pms.print_jobs') AND type = 'U')
BEGIN
    CREATE TABLE pms.print_jobs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        job_type NVARCHAR(50) NOT NULL,        -- sticker, label, barcode, report
        printer_name NVARCHAR(100) NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, printing, completed, failed
        payload NVARCHAR(MAX) NOT NULL,        -- JSON data to print
        copies INT DEFAULT 1,
        priority INT DEFAULT 5,                -- 1=highest, 10=lowest
        created_at DATETIME DEFAULT GETDATE(),
        started_at DATETIME,
        printed_at DATETIME,
        error_message NVARCHAR(500),
        retry_count INT DEFAULT 0,
        created_by UNIQUEIDENTIFIER NOT NULL,
        CONSTRAINT FK_print_jobs_employee FOREIGN KEY (created_by)
            REFERENCES pms.employees(id)
    )
    PRINT 'Created table pms.print_jobs'
END
GO

-- 3. Print Templates Table - เทมเพลตการพิมพ์
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pms.print_templates') AND type = 'U')
BEGIN
    CREATE TABLE pms.print_templates (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(255),
        template_type NVARCHAR(50) NOT NULL,   -- sticker, label, barcode
        printer_type NVARCHAR(50),             -- SATO, ZEBRA, GENERIC
        width_mm INT NOT NULL,                 -- ความกว้าง (mm)
        height_mm INT NOT NULL,                -- ความสูง (mm)
        template_content NVARCHAR(MAX),        -- SBPL/ZPL template with placeholders
        preview_html NVARCHAR(MAX),            -- HTML preview template
        is_default BIT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER
    )
    PRINT 'Created table pms.print_templates'
END
GO

-- 4. Indexes for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_print_jobs_status_priority')
BEGIN
    CREATE INDEX IX_print_jobs_status_priority
    ON pms.print_jobs(status, priority, created_at)
    PRINT 'Created index IX_print_jobs_status_priority'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_print_jobs_printer_status')
BEGIN
    CREATE INDEX IX_print_jobs_printer_status
    ON pms.print_jobs(printer_name, status)
    PRINT 'Created index IX_print_jobs_printer_status'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_print_jobs_created_by')
BEGIN
    CREATE INDEX IX_print_jobs_created_by
    ON pms.print_jobs(created_by, created_at DESC)
    PRINT 'Created index IX_print_jobs_created_by'
END
GO

-- 5. Insert default SATO printer configuration
IF NOT EXISTS (SELECT 1 FROM pms.printers WHERE name = 'SATO-Main')
BEGIN
    INSERT INTO pms.printers (
        name, printer_type, connection_type, connection_string,
        printer_model, print_language, is_default, settings
    ) VALUES (
        'SATO-Main',
        'SATO',
        'NETWORK',
        '192.168.1.100:9100',  -- ต้องแก้เป็น IP จริง
        'SATO CL4NX',
        'SBPL',
        1,
        '{"dpi": 203, "speed": 4, "darkness": 10}'
    )
    PRINT 'Inserted default SATO printer'
END
GO

-- 6. Insert sample print template for SATO sticker
IF NOT EXISTS (SELECT 1 FROM pms.print_templates WHERE name = 'Basic Sticker 50x30')
BEGIN
    INSERT INTO pms.print_templates (
        name, description, template_type, printer_type,
        width_mm, height_mm, template_content, preview_html, is_default
    ) VALUES (
        'Basic Sticker 50x30',
        'สติ๊กเกอร์พื้นฐาน 50x30mm สำหรับ SATO',
        'sticker',
        'SATO',
        50,
        30,
        -- SBPL Template (SATO Barcode Printer Language)
        '<STX>L
D11
H10
S2
121100001000010{{code}}
121100001500040{{name}}
{{#if barcode}}
B2110000200007{{barcode}}
{{/if}}
E',
        -- HTML Preview
        '<div style="width:50mm;height:30mm;border:1px dashed #ccc;padding:2mm;font-family:sans-serif;">
<div style="font-size:10pt;font-weight:bold;">{{code}}</div>
<div style="font-size:9pt;margin-top:1mm;">{{name}}</div>
{{#if barcode}}<div style="font-size:8pt;margin-top:2mm;font-family:monospace;">{{barcode}}</div>{{/if}}
</div>',
        1
    )
    PRINT 'Inserted default sticker template'
END
GO

PRINT '========================================'
PRINT 'Print System Tables Created Successfully'
PRINT '========================================'
PRINT ''
PRINT 'Next Steps:'
PRINT '1. Update printer IP address in pms.printers table'
PRINT '2. Install Print Agent on PC connected to SATO printer'
PRINT '3. Configure Print Agent with correct connection settings'
