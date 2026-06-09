const sql = require('mssql'); const fs = require('fs'); const path = require('path')
let envPath = path.join(__dirname, '..', '.env.local')
if (!fs.existsSync(envPath)) envPath = path.join(__dirname, '..', '.env')
const env = {}
fs.readFileSync(envPath, 'utf8').split('\n').forEach(l => { const [k, ...v] = l.split('='); if (k && v.length) env[k.trim()] = v.join('=').trim() })
;(async () => {
    try {
        await sql.connect({ server: env.DB_SERVER, database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD, options: { encrypt: true, trustServerCertificate: true } })
        const content = fs.readFileSync(path.join(__dirname, '86_make_entry_date_nullable.sql'), 'utf8')
        console.log('Executing 86_make_entry_date_nullable.sql ...')
        await sql.query(content)
        console.log('Done')
    } catch (e) { console.error('Error:', e.message); process.exit(1) }
    finally { await sql.close() }
})()
