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

async function checkSchema() {
    try {
        await sql.connect(config);

        // Check Schema
        const schemaRes = await sql.query`SELECT * FROM sys.schemas WHERE name = 'pms'`;
        console.log("Schema 'pms' exists:", schemaRes.recordset.length > 0);

        // Check Tables
        const tables = ['projects', 'project_milestones', 'project_milestone_deliverables', 'milestone_configs', 'deliverable_configs', 'project_status_configs', 'employees', 'customers'];

        for (const tbl of tables) {
            const res = await sql.query`SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ${tbl}`;
            if (res.recordset.length > 0) {
                console.log(`Table '${tbl}' exists in schema(s):`, res.recordset.map(r => r.TABLE_SCHEMA).join(', '));
            } else {
                console.log(`Table '${tbl}' does NOT exist.`);
            }
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sql.close();
    }
}

checkSchema();
