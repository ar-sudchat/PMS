const sql = require('mssql')
const fs = require('fs')
const path = require('path')

let envPath = path.join(__dirname, '..', '.env.local')
if (!fs.existsSync(envPath)) envPath = path.join(__dirname, '..', '.env')
const env = {}
fs.readFileSync(envPath, 'utf8').split('\n').forEach(l => {
    const [k, ...v] = l.split('=')
    if (k && v.length) env[k.trim()] = v.join('=').trim()
})

;(async () => {
    try {
        await sql.connect({
            server: env.DB_SERVER, database: env.DB_NAME,
            user: env.DB_USER, password: env.DB_PASSWORD,
            options: { encrypt: true, trustServerCertificate: true },
        })
        const file = path.join(__dirname, '82_add_kickoff_milestone.sql')
        const content = fs.readFileSync(file, 'utf8')
        console.log('Executing 82_add_kickoff_milestone.sql ...')
        await sql.query(content)
        const r = await sql.query(`SELECT code, name, sort_order FROM pms.milestone_configs ORDER BY sort_order`)
        console.log('Result — milestone_configs now:')
        r.recordset.forEach(x => console.log(`  ${x.sort_order} | ${x.code} | ${x.name}`))
    } catch (e) { console.error('Error:', e.message); process.exit(1) }
    finally { await sql.close() }
})()
