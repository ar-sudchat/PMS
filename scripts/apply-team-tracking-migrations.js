const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Read .env.local or .env
let envContent = '';
const rootDir = path.join(__dirname, '..');

try {
    if (fs.existsSync(path.join(rootDir, '.env.local'))) {
        envContent = fs.readFileSync(path.join(rootDir, '.env.local'), 'utf8');
    } else {
        envContent = fs.readFileSync(path.join(rootDir, '.env'), 'utf8');
    }
} catch (e) {
    console.error('Could not read .env files');
    process.exit(1);
}

const envVars = {};
envContent.split('\n').forEach((line) => {
    if (line.trim().startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx !== -1) {
        const key = line.substring(0, idx).trim();
        let value = line.substring(idx + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        envVars[key] = value;
    }
});

const config = {
    server: envVars.DB_SERVER || 'localhost',
    database: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    port: parseInt(envVars.DB_PORT || '1433'),
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
    connectionTimeout: 15000,
    requestTimeout: 30000,
};

const SCRIPTS = [
    '75_create_team_tracking_table.sql',
    '76_add_icon_to_team_tracking.sql',
];

async function runFile(fileName) {
    const sqlPath = path.join(__dirname, fileName);
    console.log(`\n--- ${fileName} ---`);
    const sqlFile = fs.readFileSync(sqlPath, 'utf8');

    const batches = sqlFile.split(/^GO\s*$/mgi);
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i].trim();
        if (!batch) continue;
        try {
            const result = await sql.query(batch);
            // Surface PRINT messages from SQL Server
            if (result && result.recordsets && result.output) {
                // no-op
            }
            console.log(`  Batch ${i + 1}: OK`);
        } catch (e) {
            console.error(`  Batch ${i + 1}: FAILED — ${e.message}`);
            throw e;
        }
    }
}

async function verify() {
    console.log('\n--- Verification ---');
    const tableCheck = await sql.query(`
        SELECT COUNT(*) AS c
        FROM sys.tables
        WHERE schema_id = SCHEMA_ID('pms') AND name = 'team_tracking_entries'
    `);
    const tableExists = tableCheck.recordset[0].c > 0;
    console.log(`  Table pms.team_tracking_entries: ${tableExists ? 'EXISTS' : 'MISSING'}`);

    if (tableExists) {
        const colCheck = await sql.query(`
            SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('pms.team_tracking_entries')
            ORDER BY column_id
        `);
        const cols = colCheck.recordset.map((r) => r.name);
        console.log(`  Columns: ${cols.join(', ')}`);
        console.log(`  Has icon column: ${cols.includes('icon') ? 'YES' : 'NO'}`);
    }
}

async function run() {
    try {
        console.log(`Connecting to ${config.server}:${config.port}/${config.database} as ${config.user}...`);
        await sql.connect(config);
        console.log('Connected.');

        for (const f of SCRIPTS) {
            await runFile(f);
        }

        await verify();
        console.log('\nMigration complete.');
    } catch (err) {
        console.error('\nFatal Error:', err.message || err);
        process.exitCode = 1;
    } finally {
        await sql.close();
    }
}

run();
