
import sql from 'mssql'

// Database configuration
const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'P@ssword123',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'pms_db',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
}

async function seedTaskTypes() {
    try {
        console.log('Connecting to database...')
        await sql.connect(config)
        console.log('Connected!')

        // Create table if not exists
        console.log('Checking/Creating pms.task_type_configs table...')
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'task_type_configs' AND schema_id = SCHEMA_ID('pms'))
            BEGIN
                CREATE TABLE pms.task_type_configs (
                    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                    code NVARCHAR(50) NOT NULL UNIQUE,
                    name NVARCHAR(100) NOT NULL,
                    name_th NVARCHAR(100) NULL,
                    color NVARCHAR(20) NULL,
                    is_defect BIT NOT NULL DEFAULT 0,
                    is_active BIT NOT NULL DEFAULT 1,
                    sort_order INT NOT NULL DEFAULT 0,
                    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
                )
                PRINT 'Table created.'
            END
            ELSE
            BEGIN
                PRINT 'Table already exists.'
            END
        `)

        // Prepare data to insert
        // Use a MERGE statement or check existence before insert to avoid duplicates if re-run
        console.log('Seeding task types...')

        await sql.query(`
            MERGE pms.task_type_configs AS target
            USING (VALUES 
                ('DEVELOPMENT', 'Development', N'พัฒนาระบบ', '#3b82f6', 0, 1),
                ('BUG_FIX', 'Bug Fix', N'แก้ไขบัค', '#ef4444', 1, 2),
                ('DESIGN', 'Design', N'ออกแบบ', '#8b5cf6', 0, 3),
                ('TESTING', 'Testing', N'ทดสอบ', '#f59e0b', 0, 4),
                ('DOCUMENTATION', 'Documentation', N'เอกสาร', '#6b7280', 0, 5),
                ('MEETING', 'Meeting', N'ประชุม', '#10b981', 0, 6),
                ('SUPPORT', 'Support', N'ซัพพอร์ต', '#ec4899', 0, 7),
                ('DEPLOYMENT', 'Deployment', N'Deploy ระบบ', '#06b6d4', 0, 8),
                ('REVIEW', 'Code Review', N'รีวิวโค้ด', '#84cc16', 0, 9),
                ('OTHER', 'Other', N'อื่นๆ', '#9ca3af', 0, 99)
            ) AS source (code, name, name_th, color, is_defect, sort_order)
            ON target.code = source.code
            WHEN MATCHED THEN
                UPDATE SET 
                    name = source.name,
                    name_th = source.name_th,
                    color = source.color,
                    is_defect = source.is_defect,
                    sort_order = source.sort_order,
                    updated_at = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (code, name, name_th, color, is_defect, sort_order)
                VALUES (source.code, source.name, source.name_th, source.color, source.is_defect, source.sort_order);
        `)

        console.log('Seeding completed successfully.')

    } catch (err) {
        console.error('Error seeding task types:', err)
    } finally {
        await sql.close()
    }
}

seedTaskTypes()
