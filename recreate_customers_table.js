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

async function recreateTable() {
    try {
        await sql.connect(config);

        // Check if table exists and drop it
        await sql.query`IF OBJECT_ID('dbo.customers', 'U') IS NOT NULL DROP TABLE dbo.customers`;
        console.log("Dropped existing customers table.");

        // Create new table matching the user's spec (using dbo instead of pms for safety)
        const query = `
            CREATE TABLE dbo.customers (
                id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                code NVARCHAR(20) NOT NULL UNIQUE,
                name NVARCHAR(200) NOT NULL,
                is_active BIT DEFAULT 1,
                created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
                updated_at DATETIME2 DEFAULT SYSUTCDATETIME()
            );
        `;

        await sql.query(query);
        console.log("Created users table dbo.customers successfully.");

    } catch (err) {
        console.error("Error recreating table:", err);
    } finally {
        await sql.close();
    }
}

recreateTable();
