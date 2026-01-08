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

async function checkData() {
    try {
        await sql.connect(config);
        console.log("Connected...");

        // Try query
        const result = await sql.query`SELECT * FROM dbo.customers`;
        console.log("Row count:", result.rowsAffected[0]);
        console.log("Data:", result.recordset);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sql.close();
    }
}

checkData();
