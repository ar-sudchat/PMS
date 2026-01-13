
import sql from 'mssql'

const config: sql.config = {
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true' || (process.env.DB_SERVER ? !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(process.env.DB_SERVER) : true),
        trustServerCertificate: true,
    },
    connectionTimeout: 15000, // 15 seconds
    requestTimeout: 30000,    // 30 seconds
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
}

let pool: sql.ConnectionPool | null = null

export async function getConnection() {
    if (!process.env.DB_SERVER) {
        throw new Error("DB_SERVER is missing. Please configure .env.local");
    }

    if (!pool || !pool.connected) {
        try {
            console.log('[DB] Connecting to:', process.env.DB_SERVER, '/', process.env.DB_NAME)
            pool = await sql.connect(config)
            console.log('[DB] Connected successfully')
        } catch (err) {
            console.error('[DB] Connection Failed:', err)
            pool = null
            throw err
        }
    }
    return pool
}
