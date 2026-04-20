import sql from 'mssql'

/**
 * Generate unique Task Code in format YMMNNNN (7 digits)
 * Y   = last digit of year (2026 → 6)
 * MM  = 2-digit month (01-12)
 * NNNN = 4-digit running number, reset each month
 *
 * Example: 6040001 = year 2026, April, sequence #1
 *
 * Uses UPDLOCK + HOLDLOCK to prevent race conditions
 * when multiple tasks are created concurrently.
 *
 * Can be called with a pool (creates own request) or within an existing transaction request.
 */
export async function generateTaskCode(
    poolOrRequest: sql.ConnectionPool | sql.Request,
    now: Date = new Date()
): Promise<string> {
    const yearDigit = now.getFullYear() % 10
    const month = now.getMonth() + 1
    const prefix = `${yearDigit}${String(month).padStart(2, '0')}` // e.g. "604"

    // If it's a ConnectionPool, call .request(); otherwise use the Request as-is
    const request = typeof (poolOrRequest as sql.ConnectionPool).request === 'function' && !('parameters' in poolOrRequest)
        ? (poolOrRequest as sql.ConnectionPool).request()
        : (poolOrRequest as sql.Request)

    // Lock tasks table briefly (UPDLOCK + HOLDLOCK) to prevent concurrent duplicates
    const result = await request
        .input('prefix', sql.VarChar, prefix)
        .input('prefixLen', sql.Int, prefix.length)
        .query(`
            SELECT ISNULL(MAX(TRY_CAST(SUBSTRING(task_code, @prefixLen + 1, 4) AS INT)), 0) AS max_seq
            FROM pms.tasks WITH (UPDLOCK, HOLDLOCK)
            WHERE task_code LIKE @prefix + '%'
              AND LEN(task_code) = 7
        `)

    const nextSeq = (result.recordset[0]?.max_seq || 0) + 1
    return `${prefix}${String(nextSeq).padStart(4, '0')}`
}
