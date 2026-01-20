
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runCallback() {
    try {
        const { getConnection } = await import('../lib/db');
        const pool = await getConnection();

        console.log('Checking pms.project_request_types columns:');
        const types = await pool.request().query("SELECT TOP 1 * FROM pms.project_request_types");
        console.log(Object.keys(types.recordset[0] || {}));

        console.log('Checking pms.project_request_priorities columns:');
        const priorities = await pool.request().query("SELECT TOP 1 * FROM pms.project_request_priorities");
        console.log(Object.keys(priorities.recordset[0] || {}));

    } catch (e) {
        console.error(e);
    }
}
runCallback();
