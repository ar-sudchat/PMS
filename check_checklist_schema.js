
const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
    try {
        const config = {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_NAME,
            options: {
                encrypt: false,
                trustServerCertificate: true
            }
        };

        const pool = await sql.connect(config);

        console.log("Checking for pms.task_checklist_items table...");
        const result = await pool.request().query(`
            SELECT * 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'pms' 
            AND TABLE_NAME = 'task_checklist_items'
        `);

        if (result.recordset.length > 0) {
            console.log("Table pms.task_checklist_items EXISTS.");

            // Check columns
            const columns = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'pms' 
                AND TABLE_NAME = 'task_checklist_items'
            `);
            console.log("Columns:", columns.recordset);
        } else {
            console.log("Table pms.task_checklist_items DOES NOT EXIST.");
        }

        await pool.close();
    } catch (err) {
        console.error("Error:", err);
    }
}

checkSchema();
