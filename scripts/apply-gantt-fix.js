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
envContent.split('\n').forEach(line => {
    // Basic parse, ignore comments #
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
};

async function run() {
    try {
        console.log(`Connecting to ${config.server}:${config.port}/${config.database}...`);
        await sql.connect(config);

        const sqlPath = path.join(__dirname, 'gantt-schema-v3.sql');
        console.log(`Reading SQL from ${sqlPath}`);
        const sqlFile = fs.readFileSync(sqlPath, 'utf8');

        // Split by GO on its own line
        const batches = sqlFile.split(/^GO\s*$/mgi);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch) {
                console.log(`Executing batch ${i + 1}...`);
                try {
                    await sql.query(batch);
                } catch (e) {
                    console.error(`Error in batch ${i + 1}:`, e.message);
                    console.error('Batch content:', batch.substring(0, 100) + '...');
                }
            }
        }

        console.log('Update completed successfully.');
    } catch (err) {
        console.error("Fatal Error:", err);
    } finally {
        await sql.close();
    }
}

run();
