
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// Load env vars FIRST
dotenv.config({ path: '.env.local' });
dotenv.config();

async function runMigration() {
    try {
        // Dynamic import to ensure process.env is populated
        const { getConnection } = await import('../lib/db');

        const migrationPath = path.join(process.cwd(), 'database', 'migrations', '005_standup_system.sql');
        const sqlContent = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing migration from:', migrationPath);

        const pool = await getConnection();

        // Check connection
        if (!pool.connected) {
            await pool.connect();
        }

        await pool.query(sqlContent);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
