import sql from 'mssql'

async function debugEmployees() {
    try {
        console.log('Connecting to DB...')

        const config = {
            server: '10.8.8.88',
            database: 'MoveonDB',
            user: 'sa',
            password: 'Solutions@Moveon',
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
        }

        const pool = await sql.connect(config)
        console.log('Connected.')

        // Check Positions
        const positions = await pool.request().query("SELECT id, name FROM pms.positions")
        console.log('Positions found:', positions.recordset.length)
        console.table(positions.recordset)

        // Count Active Employees
        const count = await pool.request().query("SELECT COUNT(*) as count FROM pms.employees WHERE is_active = 1")
        console.log('Active Employees:', count.recordset[0].count)

        // List Active Employees with Position
        const employees = await pool.request().query("SELECT e.id, e.first_name, e.last_name, e.position_id, e.is_active FROM pms.employees e WHERE e.is_active = 1")
        console.table(employees.recordset)

    } catch (error) {
        console.error('Error:', error)
    } finally {
        process.exit(0)
    }
}

debugEmployees()
