
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
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

        const migrationFile = path.join(__dirname, 'migration_task_checklist.sql');
        const migrationSql = fs.readFileSync(migrationFile, 'utf8');

        console.log("Running migration...");
        await pool.request().query(migrationSql);

        console.log("Migration completed.");

        await pool.close();
    } catch (err) {
        console.error("Migration Error:", err);
    }
}

runMigration();
