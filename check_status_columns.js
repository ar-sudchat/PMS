const sql = require('mssql');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
    },
};

async function checkSchema() {
    try {
        await sql.connect(config);

        const tables = ['tasks', 'project_milestones', 'projects'];

        for (const table of tables) {
            const result = await sql.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = '${table}'
            `);
            console.log(`Columns in pms.${table}:`, result.recordset.map(r => r.COLUMN_NAME));

            // Check specifically for 'status'
            const hasStatus = result.recordset.some(r => r.COLUMN_NAME === 'status');
            console.log(`Has 'status'? ${hasStatus}`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

checkSchema();
