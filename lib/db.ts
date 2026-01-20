
import sql from 'mssql'

const config: sql.config = {
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true' || (process.env.DB_SERVER ? !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(process.env.DB_SERVER) : true),
        trustServerCertificate: true,
        enableArithAbort: true,
    },
    connectionTimeout: 30000, // 30 seconds (increased for slow networks)
    requestTimeout: 60000,    // 60 seconds
    pool: {
        max: 20,              // Increased pool size
        min: 2,               // Keep minimum connections alive
        idleTimeoutMillis: 60000  // Keep idle connections longer
    }
}

let pool: sql.ConnectionPool | null = null
let connecting: Promise<sql.ConnectionPool> | null = null

export async function getConnection() {
    if (!process.env.DB_SERVER) {
        throw new Error("DB_SERVER is missing. Please configure .env.local");
    }

    // Return existing connection if available
    if (pool && pool.connected) {
        return pool
    }

    // Wait for ongoing connection attempt
    if (connecting) {
        return connecting
    }

    // Create new connection
    try {
        console.log('[DB] Connecting to:', process.env.DB_SERVER, '/', process.env.DB_NAME)
        connecting = sql.connect(config)
        pool = await connecting
        console.log('[DB] Connected successfully')

        // Handle connection errors
        pool.on('error', err => {
            console.error('[DB] Pool error:', err)
            pool = null
        })

        connecting = null
        return pool
    } catch (err) {
        console.error('[DB] Connection Failed:', err)
        pool = null
        connecting = null
        throw err
    }
}
