
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        requestTimeout: 60000
    }
};

async function runMigration() {
    try {
        const pool = await sql.connect(config);
        const migrationFile = path.join(__dirname, 'migration_current_milestone.sql');
        const query = fs.readFileSync(migrationFile, 'utf8');

        console.log('Running migration...');
        await pool.request().query(query);
        console.log('Migration completed successfully.');

        await pool.close();
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
