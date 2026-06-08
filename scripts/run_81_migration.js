const sql = require('mssql');
const fs = require('fs');
const path = require('path');

let envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) { console.error('.env or .env.local not found'); process.exit(1); }

const envVars = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (key && value) envVars[key] = value;
    }
});

const config = {
    server: envVars.DB_SERVER, database: envVars.DB_NAME,
    user: envVars.DB_USER, password: envVars.DB_PASSWORD,
    options: { encrypt: true, trustServerCertificate: true },
};

(async () => {
    try {
        console.log('Connecting...');
        await sql.connect(config);
        const sqlFile = path.join(__dirname, '81_create_project_scenarios.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        console.log('Executing 81_create_project_scenarios.sql...');
        const result = await sql.query(sqlContent);
        console.log('Migration completed.');
        console.log(result);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally { await sql.close(); }
})();
