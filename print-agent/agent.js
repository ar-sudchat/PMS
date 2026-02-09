/**
 * PMS Print Agent
 * ดึงงานพิมพ์จาก API และส่งไปยังเครื่อง SATO ผ่าน Network
 *
 * วิธีใช้:
 * 1. npm install
 * 2. แก้ไข config ด้านล่าง
 * 3. npm start
 */

const net = require('net')
const fetch = require('node-fetch')

// ==================== CONFIG ====================
const CONFIG = {
    // PMS API Server
    apiBaseUrl: 'http://localhost:3000',  // แก้เป็น URL ของ PMS server
    apiKey: 'pms-print-agent-key-2024',   // ไว้ยืนยันตัวตน

    // SATO Printer
    printerIp: '192.168.1.100',           // แก้เป็น IP ของ SATO
    printerPort: 9100,                     // Port มาตรฐานของ SATO
    printerName: 'SATO-Main',              // ชื่อเครื่องพิมพ์ใน PMS

    // Polling
    pollInterval: 3000,                    // ตรวจสอบทุก 3 วินาที
    retryLimit: 3,

    // Debug
    debug: true
}
// ================================================

let isProcessing = false

function log(message, ...args) {
    if (CONFIG.debug) {
        const timestamp = new Date().toLocaleTimeString('th-TH')
        console.log(`[${timestamp}] ${message}`, ...args)
    }
}

function logError(message, ...args) {
    const timestamp = new Date().toLocaleTimeString('th-TH')
    console.error(`[${timestamp}] ❌ ${message}`, ...args)
}

/**
 * สร้าง SBPL command สำหรับพิมพ์ sticker บน SATO
 */
function generateSBPL(data) {
    const { code, name, barcode, quantity = 1 } = data

    // SBPL (SATO Barcode Printer Language) commands
    // Reference: SATO Programmer's Manual
    let sbpl = ''

    for (let i = 0; i < quantity; i++) {
        sbpl += '\x02'  // STX - Start of text
        sbpl += 'A\r\n' // Clear buffer
        sbpl += 'V50\r\n' // Vertical position
        sbpl += 'H50\r\n' // Horizontal position
        sbpl += 'D11\r\n' // Density
        sbpl += 'S2\r\n'  // Speed

        // Print code (large font)
        sbpl += `L0202,0030,0020,0020,1,1,1,N,"${code}"\r\n`

        // Print name (medium font)
        sbpl += `L0201,0030,0070,0020,1,1,1,N,"${name}"\r\n`

        // Print barcode if exists
        if (barcode) {
            // Code128 barcode
            sbpl += `B0128,0030,0120,1,3,60,0,1,"${barcode}"\r\n`
        }

        sbpl += 'Q1\r\n'  // Quantity = 1 per label
        sbpl += 'Z\r\n'   // Print command
        sbpl += '\x03'    // ETX - End of text
    }

    return sbpl
}

/**
 * ส่งข้อมูลไปยัง SATO printer ผ่าน TCP/IP
 */
function sendToPrinter(data) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket()
        let connected = false

        client.setTimeout(10000) // 10 second timeout

        client.connect(CONFIG.printerPort, CONFIG.printerIp, () => {
            connected = true
            log(`📡 Connected to SATO at ${CONFIG.printerIp}:${CONFIG.printerPort}`)

            const sbpl = generateSBPL(data)
            log(`📄 Sending SBPL command (${sbpl.length} bytes)`)

            client.write(Buffer.from(sbpl, 'utf8'), () => {
                log('✅ Data sent successfully')
                client.end()
                resolve({ success: true })
            })
        })

        client.on('timeout', () => {
            logError('Connection timeout')
            client.destroy()
            reject(new Error('Connection timeout'))
        })

        client.on('error', (err) => {
            if (!connected) {
                logError(`Cannot connect to printer: ${err.message}`)
            } else {
                logError(`Print error: ${err.message}`)
            }
            reject(err)
        })

        client.on('close', () => {
            if (connected) {
                log('📴 Connection closed')
            }
        })
    })
}

/**
 * ดึงงานพิมพ์จาก API
 */
async function fetchPendingJobs() {
    try {
        const response = await fetch(
            `${CONFIG.apiBaseUrl}/api/print/jobs?printer=${encodeURIComponent(CONFIG.printerName)}&status=pending`,
            {
                headers: {
                    'X-Print-Agent-Key': CONFIG.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        )

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        return data.jobs || []
    } catch (error) {
        logError('Failed to fetch jobs:', error.message)
        return []
    }
}

/**
 * อัพเดทสถานะงานพิมพ์
 */
async function updateJobStatus(jobId, status, errorMessage = null) {
    try {
        const response = await fetch(
            `${CONFIG.apiBaseUrl}/api/print/jobs/${jobId}/status`,
            {
                method: 'PATCH',
                headers: {
                    'X-Print-Agent-Key': CONFIG.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, error_message: errorMessage })
            }
        )

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        return true
    } catch (error) {
        logError('Failed to update job status:', error.message)
        return false
    }
}

/**
 * ประมวลผลงานพิมพ์
 */
async function processJob(job) {
    log(`🖨️ Processing job: ${job.id} (${job.job_type})`)

    // Update status to printing
    await updateJobStatus(job.id, 'printing')

    try {
        const payload = typeof job.payload === 'string'
            ? JSON.parse(job.payload)
            : job.payload

        // Handle different job types
        if (job.job_type === 'sticker' || job.job_type === 'label') {
            // If payload is array, print each item
            if (Array.isArray(payload)) {
                for (const item of payload) {
                    await sendToPrinter(item)
                }
            } else {
                await sendToPrinter(payload)
            }
        } else {
            // For other types, try generic print
            await sendToPrinter(payload)
        }

        // Update status to completed
        await updateJobStatus(job.id, 'completed')
        log(`✅ Job ${job.id} completed`)

    } catch (error) {
        logError(`Job ${job.id} failed: ${error.message}`)

        // Update status to failed
        await updateJobStatus(job.id, 'failed', error.message)
    }
}

/**
 * Main polling loop
 */
async function pollForJobs() {
    if (isProcessing) {
        return
    }

    isProcessing = true

    try {
        const jobs = await fetchPendingJobs()

        if (jobs.length > 0) {
            log(`📋 Found ${jobs.length} pending job(s)`)

            // Process jobs one by one
            for (const job of jobs) {
                await processJob(job)
            }
        }
    } catch (error) {
        logError('Poll error:', error.message)
    } finally {
        isProcessing = false
    }
}

/**
 * Test printer connection
 */
async function testConnection() {
    log(`Testing connection to SATO at ${CONFIG.printerIp}:${CONFIG.printerPort}...`)

    return new Promise((resolve) => {
        const client = new net.Socket()

        client.setTimeout(5000)

        client.connect(CONFIG.printerPort, CONFIG.printerIp, () => {
            log('✅ Printer connection OK!')
            client.end()
            resolve(true)
        })

        client.on('timeout', () => {
            logError('Connection timeout')
            client.destroy()
            resolve(false)
        })

        client.on('error', (err) => {
            logError(`Connection failed: ${err.message}`)
            resolve(false)
        })
    })
}

// ==================== MAIN ====================

async function main() {
    console.log('╔════════════════════════════════════════╗')
    console.log('║     PMS Print Agent for SATO           ║')
    console.log('╠════════════════════════════════════════╣')
    console.log(`║ API Server: ${CONFIG.apiBaseUrl.padEnd(25)}║`)
    console.log(`║ Printer:    ${CONFIG.printerIp}:${CONFIG.printerPort}`.padEnd(42) + '║')
    console.log(`║ Printer Name: ${CONFIG.printerName.padEnd(23)}║`)
    console.log('╚════════════════════════════════════════╝')
    console.log('')

    // Test printer connection
    const connected = await testConnection()
    if (!connected) {
        logError('Cannot connect to printer. Please check IP and port.')
        logError('Agent will continue and retry...')
    }

    log(`Starting polling every ${CONFIG.pollInterval / 1000} seconds...`)
    log('Press Ctrl+C to stop')
    console.log('')

    // Start polling
    setInterval(pollForJobs, CONFIG.pollInterval)

    // Initial poll
    pollForJobs()
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Print Agent stopping...')
    process.exit(0)
})

main()
