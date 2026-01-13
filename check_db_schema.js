const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function checkSchema() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'projects'
        `);
        console.table(result.recordset);
        await pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSchema();
