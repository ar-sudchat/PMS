const sql = require('mssql');

const config = {
    server: '10.8.8.88',
    database: 'MoveonDB',
    user: 'sa',
    password: 'Solutions@Moveon',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function safeQuery(pool, query, description) {
    try {
        await pool.request().query(query);
        console.log(`   ${description} - Done.`);
    } catch (error) {
        if (error.message.includes('Invalid object name') || error.message.includes('Invalid column name')) {
            console.log(`   ${description} - Skipped (not exists).`);
        } else {
            throw error;
        }
    }
}

async function deleteMockupEmployees() {
    try {
        const pool = await sql.connect(config);

        // First check what we're about to delete
        const checkResult = await pool.request().query(`
            SELECT employee_code, first_name, last_name
            FROM pms.employees
            WHERE employee_code LIKE 'EMP-%'
            ORDER BY employee_code
        `);

        console.log('Found mockup employees:', checkResult.recordset.length);
        checkResult.recordset.forEach(emp => {
            console.log(`  - ${emp.employee_code}: ${emp.first_name} ${emp.last_name}`);
        });

        if (checkResult.recordset.length === 0) {
            console.log('No mockup employees to delete.');
            await pool.close();
            return;
        }

        // Step 1: Clear FK references
        console.log('\n1. Clearing FK references...');

        await safeQuery(pool, `
            UPDATE pms.departments
            SET head_id = NULL
            WHERE head_id IN (SELECT id FROM pms.employees WHERE employee_code LIKE 'EMP-%')
        `, 'departments.head_id');

        await safeQuery(pool, `
            DELETE FROM pms.project_members
            WHERE employee_id IN (SELECT id FROM pms.employees WHERE employee_code LIKE 'EMP-%')
        `, 'project_members');

        await safeQuery(pool, `
            UPDATE pms.tasks
            SET assignee_id = NULL
            WHERE assignee_id IN (SELECT id FROM pms.employees WHERE employee_code LIKE 'EMP-%')
        `, 'tasks.assignee_id');

        await safeQuery(pool, `
            UPDATE pms.tasks
            SET reviewer_id = NULL
            WHERE reviewer_id IN (SELECT id FROM pms.employees WHERE employee_code LIKE 'EMP-%')
        `, 'tasks.reviewer_id');

        await safeQuery(pool, `
            UPDATE pms.projects
            SET pm_id = NULL
            WHERE pm_id IN (SELECT id FROM pms.employees WHERE employee_code LIKE 'EMP-%')
        `, 'projects.pm_id');

        await safeQuery(pool, `
            DELETE FROM pms.timesheets
            WHERE employee_id IN (SELECT id FROM pms.employees WHERE employee_code LIKE 'EMP-%')
        `, 'timesheets');

        // Step 2: Delete mockup employees
        console.log('\n2. Deleting mockup employees...');
        const deleteResult = await pool.request().query(`
            DELETE FROM pms.employees
            WHERE employee_code LIKE 'EMP-%'
        `);

        console.log('\nDeleted', deleteResult.rowsAffected[0], 'mockup employees successfully!');

        await pool.close();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

deleteMockupEmployees();
