
// Use direct relative path without complex resolving
const sql = require('mssql');

// Hardcoded config to bypass import issues
const config = {
    user: 'sa',
    password: 'YourStrong!Passw0rd',
    server: 'localhost',
    database: 'master',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);

        const sqlPath = path.join(process.cwd(), 'scripts', '04_fix_gantt_missing_start_dates.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Split by GO for T-SQL compatibility
        const batches = sqlContent.split(/^GO/gm);

        for (const batch of batches) {
            if (batch.trim()) {
                console.log('Executing batch...');
                try {
                    await pool.request().query(batch);
                } catch (e) {
                    console.error('Batch failed:', e.message);
                    throw e;
                }
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
