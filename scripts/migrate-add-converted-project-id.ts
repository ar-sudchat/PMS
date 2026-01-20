import * as dotenv from 'dotenv';
import sql from 'mssql';
import path from 'path';

// Force load .env.local from current working directory
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runMigration() {
    try {
        // Dynamic import after env vars are loaded
        const { getConnection } = await import('../lib/db');
        const pool = await getConnection();

        console.log('Starting migration...');

        // 1. Add converted_project_id column if not exists
        try {
            await pool.request().query(`
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID('pms.project_requests') 
                    AND name = 'converted_project_id'
                )
                BEGIN
                    ALTER TABLE pms.project_requests
                    ADD converted_project_id UNIQUEIDENTIFIER NULL;
                    
                    ALTER TABLE pms.project_requests
                    ADD CONSTRAINT FK_project_requests_projects
                    FOREIGN KEY (converted_project_id) REFERENCES pms.projects(id);
                    
                    PRINT 'Added converted_project_id to pms.project_requests';
                END
                ELSE
                BEGIN
                    PRINT 'converted_project_id already exists';
                END
            `);
        } catch (e) {
            console.error('Error adding column:', e);
        }

        // 2. Refresh/Update View
        // We need to recreate the view to include the new column and join with projects
        // Note: We need to see the ORIGINAL definition first to not lose other columns.
        // Assuming standard view definition based on previous knowledge + new columns.

        const viewDefinition = `
        ALTER VIEW pms.vw_project_requests AS
        SELECT 
            pr.*,
            c.name as customer_name,
            c.code as customer_code,
            pt.name as project_type_name,
            pt.color as project_type_color,
            p.name as priority_name,
            p.color as priority_color,
            
            -- Created By
            COALESCE(e_create.first_name_th + ' ' + e_create.last_name_th, e_create.first_name + ' ' + e_create.last_name) as created_by_name,
            e_create.avatar_url as created_by_avatar,

            -- Submitted By
            COALESCE(e_submit.first_name_th + ' ' + e_submit.last_name_th, e_submit.first_name + ' ' + e_submit.last_name) as submitted_by_name,
            
            -- Approved By
            COALESCE(e_approve.first_name_th + ' ' + e_approve.last_name_th, e_approve.first_name + ' ' + e_approve.last_name) as approved_by_name,
            
            -- Rejected By
            COALESCE(e_reject.first_name_th + ' ' + e_reject.last_name_th, e_reject.first_name + ' ' + e_reject.last_name) as rejected_by_name,

            -- Converted Project Info
            prj.project_code as converted_project_code,
            prj.name as converted_project_name,
            prj.id as project_id_ref
            
        FROM pms.project_requests pr
        LEFT JOIN pms.customers c ON pr.customer_id = c.id
        LEFT JOIN pms.project_types pt ON pr.project_type = pt.code
        LEFT JOIN pms.priorities p ON pr.priority = p.code
        LEFT JOIN pms.employees e_create ON pr.created_by = e_create.id
        LEFT JOIN pms.employees e_submit ON pr.submitted_by = e_submit.id
        LEFT JOIN pms.employees e_approve ON pr.approved_by = e_approve.id
        LEFT JOIN pms.employees e_reject ON pr.rejected_by = e_reject.id
        LEFT JOIN pms.projects prj ON pr.converted_project_id = prj.id
        `;

        await pool.request().query(viewDefinition);
        console.log('Updated pms.vw_project_requests');

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

runMigration();
