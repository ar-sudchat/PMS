
import sql from 'mssql'

const config: sql.config = {
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
}

let pool: sql.ConnectionPool | null = null

export async function getConnection() {
    if (!process.env.DB_SERVER) {
        throw new Error("DB_SERVER is missing. Please configure .env.local");
    }

    if (!pool) {
        try {
            pool = await sql.connect(config)
        } catch (err) {
            console.error('Database Connection Failed! Bad Config: ', config)
            throw err
        }
    }
    return pool
}
