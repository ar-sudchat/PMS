const sql = require('mssql'); const fs = require('fs'); const path = require('path')
let envPath = path.join(__dirname, '..', '.env.local')
if (!fs.existsSync(envPath)) envPath = path.join(__dirname, '..', '.env')
const env = {}
fs.readFileSync(envPath, 'utf8').split('\n').forEach(l => { const [k, ...v] = l.split('='); if (k && v.length) env[k.trim()] = v.join('=').trim() })
;(async () => {
    try {
        await sql.connect({
            server: env.DB_SERVER, database: env.DB_NAME,
            user: env.DB_USER, password: env.DB_PASSWORD,
            options: { encrypt: true, trustServerCertificate: true },
        })
        const content = fs.readFileSync(path.join(__dirname, '83_add_actual_dates_to_project_milestones.sql'), 'utf8')
        console.log('Executing 83_add_actual_dates_to_project_milestones.sql ...')
        await sql.query(content)
        const r = await sql.query(`SELECT TOP 5 COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='pms' AND TABLE_NAME='project_milestones' AND COLUMN_NAME IN ('actual_start_date', 'actual_duration_days')`)
        console.log('New columns now present:'); r.recordset.forEach(c => console.log('  ' + c.COLUMN_NAME))
    } catch (e) { console.error('Error:', e.message); process.exit(1) }
    finally { await sql.close() }
})()
