const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Manually read .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const config = {
    server: envVars.DB_SERVER,
    database: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

async function checkTable() {
    try {
        await sql.connect(config);
        const result = await sql.query`
            SELECT * 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'customers'
        `;

        console.log("Table exists:", result.recordset.length > 0);

        if (result.recordset.length > 0) {
            const columns = await sql.query`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'customers'
            `;
            console.log("Columns:", columns.recordset);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sql.close();
    }
}

checkTable();
