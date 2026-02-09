/**
 * Test SATO Printer Connection
 * ทดสอบการเชื่อมต่อและพิมพ์ตัวอย่างไปยัง SATO
 *
 * วิธีใช้: node test-printer.js
 */

const net = require('net')

// ==================== CONFIG ====================
const PRINTER_IP = '192.168.1.100'   // แก้เป็น IP ของ SATO
const PRINTER_PORT = 9100
// ================================================

/**
 * Generate test SBPL command
 */
function generateTestSBPL() {
    // SBPL commands for a simple test label
    let sbpl = ''

    sbpl += '\x02'      // STX
    sbpl += 'A\r\n'     // Clear buffer
    sbpl += 'V50\r\n'   // Vertical position
    sbpl += 'H50\r\n'   // Horizontal position
    sbpl += 'D11\r\n'   // Density (darkness)
    sbpl += 'S2\r\n'    // Print speed

    // Print text: "TEST PRINT"
    sbpl += 'L0202,0030,0020,0020,1,1,1,N,"TEST PRINT"\r\n'

    // Print date/time
    const now = new Date().toLocaleString('th-TH')
    sbpl += `L0201,0030,0060,0020,1,1,1,N,"${now}"\r\n`

    // Print barcode
    sbpl += 'B0128,0030,0100,1,3,50,0,1,"1234567890"\r\n'

    sbpl += 'Q1\r\n'    // Quantity = 1
    sbpl += 'Z\r\n'     // Print command
    sbpl += '\x03'      // ETX

    return sbpl
}

/**
 * Test connection only
 */
function testConnection() {
    return new Promise((resolve, reject) => {
        console.log(`\n📡 Testing connection to ${PRINTER_IP}:${PRINTER_PORT}...`)

        const client = new net.Socket()
        client.setTimeout(5000)

        client.connect(PRINTER_PORT, PRINTER_IP, () => {
            console.log('✅ Connection successful!')
            client.end()
            resolve(true)
        })

        client.on('timeout', () => {
            console.log('❌ Connection timeout')
            client.destroy()
            reject(new Error('timeout'))
        })

        client.on('error', (err) => {
            console.log(`❌ Connection error: ${err.message}`)
            reject(err)
        })
    })
}

/**
 * Send test print
 */
function sendTestPrint() {
    return new Promise((resolve, reject) => {
        console.log(`\n🖨️ Sending test print to ${PRINTER_IP}:${PRINTER_PORT}...`)

        const client = new net.Socket()
        client.setTimeout(10000)

        client.connect(PRINTER_PORT, PRINTER_IP, () => {
            console.log('📡 Connected')

            const sbpl = generateTestSBPL()
            console.log(`📄 Sending SBPL command (${sbpl.length} bytes)`)

            // Debug: show SBPL command
            console.log('\n--- SBPL Command ---')
            console.log(sbpl.replace(/\x02/g, '<STX>').replace(/\x03/g, '<ETX>'))
            console.log('--- End SBPL ---\n')

            client.write(Buffer.from(sbpl, 'utf8'), () => {
                console.log('✅ Test print sent!')
                client.end()
                resolve(true)
            })
        })

        client.on('timeout', () => {
            console.log('❌ Connection timeout')
            client.destroy()
            reject(new Error('timeout'))
        })

        client.on('error', (err) => {
            console.log(`❌ Error: ${err.message}`)
            reject(err)
        })
    })
}

// Main
async function main() {
    console.log('╔════════════════════════════════════════╗')
    console.log('║     SATO Printer Test                  ║')
    console.log('╚════════════════════════════════════════╝')
    console.log(`\nPrinter IP: ${PRINTER_IP}`)
    console.log(`Printer Port: ${PRINTER_PORT}`)

    const args = process.argv.slice(2)

    try {
        if (args.includes('--print') || args.includes('-p')) {
            // Test with actual print
            await sendTestPrint()
            console.log('\n🎉 Test print completed!')
        } else {
            // Connection test only
            await testConnection()
            console.log('\nTo send a test print, run:')
            console.log('  node test-printer.js --print')
        }
    } catch (error) {
        console.log('\n💡 Troubleshooting:')
        console.log('1. ตรวจสอบว่า SATO เปิดอยู่และเชื่อมต่อ WiFi')
        console.log('2. ตรวจสอบ IP Address ของ SATO (ดูจากเมนูเครื่อง)')
        console.log('3. ตรวจสอบว่าไม่มี Firewall บล็อก Port 9100')
        console.log('4. ลอง ping IP ของ SATO ก่อน')
        process.exit(1)
    }
}

main()
