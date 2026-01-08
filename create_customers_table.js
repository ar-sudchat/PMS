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

async function createTable() {
    try {
        await sql.connect(config);

        const query = `
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'customers')
            BEGIN
                CREATE TABLE customers (
                    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                    code NVARCHAR(50) NOT NULL UNIQUE,
                    name NVARCHAR(255) NOT NULL,
                    status NVARCHAR(20) DEFAULT 'Active',
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table customers created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table customers already exists.';
            END
        `;

        await sql.query(query);
        console.log("Database setup completed.");

    } catch (err) {
        console.error("Error creating table:", err);
    } finally {
        await sql.close();
    }
}

createTable();
