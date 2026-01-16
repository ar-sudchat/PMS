const fs = require('fs');
const sql = require('mssql');

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

async function runMigration() {
    try {
        const pool = await sql.connect(config);
        const sqlContent = fs.readFileSync('/Users/artitsudchat/PMSoftware/scripts/04_fix_gantt_missing_start_dates.sql', 'utf8');

        // Split by GO if possible, but mssql drive might handle batch or not.
        // Usually splitting by GO is safer for T-SQL scripts.
        const matches = sqlContent.split(/^GO/gm);

        for (const batch of matches) {
            if (batch.trim()) {
                console.log('Executing batch...');
                await pool.request().query(batch);
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
