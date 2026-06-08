const sql = require('mssql');
const fs = require('fs');
const path = require('path');

let envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
    envPath = path.join(__dirname, '..', '.env');
}
if (!fs.existsSync(envPath)) {
    console.error('.env or .env.local not found at project root');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (key && value) {
            envVars[key] = value;
        }
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

async function runMigration() {
    try {
        console.log('Connecting to database...');
        await sql.connect(config);
        console.log('Connected.');

        const sqlFile = path.join(__dirname, '79_create_task_dependencies.sql');
        if (!fs.existsSync(sqlFile)) {
            console.error('SQL file not found:', sqlFile);
            process.exit(1);
        }

        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        console.log('Executing 79_create_task_dependencies.sql...');
        const result = await sql.query(sqlContent);
        console.log('Migration completed successfully.');
        console.log(result);
    } catch (err) {
        console.error('Error running migration:', err);
        process.exit(1);
    } finally {
        await sql.close();
    }
}

runMigration();
