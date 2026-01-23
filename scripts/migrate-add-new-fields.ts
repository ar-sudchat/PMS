
import * as dotenv from 'dotenv';
import path from 'path';

// Force load .env.local from current working directory
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runMigration() {
    try {
        // Dynamic import after env vars are loaded
        const { getConnection } = await import('../lib/db');
        const pool = await getConnection();

        console.log('Starting migration...');

        // 1. Add Columns if not exists
        const columns = [
            'converted_project_id',
            'customer_contact_date',
            'last_meeting_date',
            'quotation_date'
            // 'approval_date' // User asked for "Approved Date", if they want to Manually key in, we add it. 
            // Let's add it to be safe as 'manual_approval_date' or just 'approval_date' separate from system 'approved_at'
        ];

        // Let's stick to 3 requested dates + converted_link for now. 
        // User said "Add Approved Date". System has approved_at. I will add 'manual_approval_date' to differentiate? 
        // Or maybe they just want to RECORD when it was approved offline?
        // I will add 'approved_date' column.

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_requests') AND name = 'converted_project_id')
            BEGIN
                ALTER TABLE pms.project_requests ADD converted_project_id UNIQUEIDENTIFIER NULL;
                ALTER TABLE pms.project_requests ADD CONSTRAINT FK_project_requests_projects FOREIGN KEY (converted_project_id) REFERENCES pms.projects(id);
                PRINT 'Added converted_project_id';
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_requests') AND name = 'customer_contact_date')
            BEGIN
                ALTER TABLE pms.project_requests ADD customer_contact_date DATE NULL;
                PRINT 'Added customer_contact_date';
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_requests') AND name = 'last_meeting_date')
            BEGIN
                ALTER TABLE pms.project_requests ADD last_meeting_date DATE NULL;
                PRINT 'Added last_meeting_date';
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_requests') AND name = 'quotation_date')
            BEGIN
                ALTER TABLE pms.project_requests ADD quotation_date DATE NULL;
                PRINT 'Added quotation_date';
            END
            
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_requests') AND name = 'approval_date')
            BEGIN
                ALTER TABLE pms.project_requests ADD approval_date DATE NULL;
                PRINT 'Added approval_date';
            END
        `);


        // 2. Refresh/Update View
        const viewDefinition = `
        ALTER VIEW pms.vw_project_requests AS
        SELECT
        pr.*,
            c.name as customer_name,
            c.code as customer_code,
            pt.name as project_type_name,

            p.name as priority_name,
            p.color as priority_color,

            --Created By
        COALESCE(e_create.first_name_th + ' ' + e_create.last_name_th, e_create.first_name + ' ' + e_create.last_name) as created_by_name,
            e_create.avatar_url as created_by_avatar,

            --Submitted By
        COALESCE(e_submit.first_name_th + ' ' + e_submit.last_name_th, e_submit.first_name + ' ' + e_submit.last_name) as submitted_by_name,

            --Approved By
        COALESCE(e_approve.first_name_th + ' ' + e_approve.last_name_th, e_approve.first_name + ' ' + e_approve.last_name) as approved_by_name,

            --Rejected By
        COALESCE(e_reject.first_name_th + ' ' + e_reject.last_name_th, e_reject.first_name + ' ' + e_reject.last_name) as rejected_by_name,

            --Converted Project Info
        prj.project_code as converted_project_code,
            prj.name as converted_project_name,
            prj.id as project_id_ref
            
        FROM pms.project_requests pr
        LEFT JOIN pms.customers c ON pr.customer_id = c.id
        LEFT JOIN pms.project_request_types pt ON pr.project_type = pt.code
        LEFT JOIN pms.project_request_priorities p ON pr.priority = p.code
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
