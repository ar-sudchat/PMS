// Run this script to execute database schema files
// Usage: node scripts/run-sql.js [schema-file.sql]

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file manually
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...values] = trimmedLine.split('=');
                if (key && values.length > 0) {
                    const value = values.join('=').trim().replace(/^["']|["']$/g, '');
                    process.env[key.trim()] = value;
                }
            }
        });
    }
}

loadEnv();

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'PMSoftware',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

async function runSqlFile(filePath) {
    try {
        console.log(`📄 Reading SQL file: ${filePath}`);

        // Read the SQL file
        const sqlContent = fs.readFileSync(filePath, 'utf8');

        // Split by GO statements
        const batches = sqlContent
            .split(/^\s*GO\s*$/gim)
            .map(batch => batch.trim())
            .filter(batch => batch.length > 0);

        console.log(`📦 Found ${batches.length} SQL batches to execute\n`);

        // Connect to database
        console.log('🔌 Connecting to database...');
        console.log(`   Server: ${config.server}`);
        console.log(`   Database: ${config.database}`);
        await sql.connect(config);
        console.log('✅ Connected to database\n');

        // Execute each batch
        for (let i = 0; i < batches.length; i++) {
            try {
                console.log(`⚙️  Executing batch ${i + 1}/${batches.length}...`);
                const result = await sql.query(batches[i]);

                // Print any messages
                if (result.recordset && result.recordset.length > 0) {
                    console.log(result.recordset);
                }

                console.log(`✅ Batch ${i + 1} completed`);
            } catch (batchError) {
                console.error(`❌ Error in batch ${i + 1}:`, batchError.message);
                if (batchError.message.includes('already exists')) {
                    console.log('   ℹ️  Object already exists, continuing...');
                } else {
                    throw batchError;
                }
            }
        }

        console.log('\n✅ All batches executed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await sql.close();
        console.log('🔌 Database connection closed');
    }
}

// Get file from command line argument
const sqlFile = process.argv[2];

if (!sqlFile) {
    console.error('❌ Usage: node scripts/run-sql.js <sql-file>');
    console.error('   Example: node scripts/run-sql.js scripts/dashboard-schema.sql');
    process.exit(1);
}

const fullPath = path.resolve(sqlFile);

if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`);
    process.exit(1);
}

runSqlFile(fullPath);
