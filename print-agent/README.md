# PMS Print Agent for SATO

โปรแกรมสำหรับดึงงานพิมพ์จาก PMS และส่งไปยังเครื่องพิมพ์ SATO ผ่าน Network (WiFi)

## สถาปัตยกรรม

```
iPad/Web Browser
      ↓
   PMS Server (Next.js)
      ↓ API
   Print Agent (Node.js) ← รันบน PC/Laptop เครื่องใดก็ได้ในเครือข่ายเดียวกัน
      ↓ TCP/IP Port 9100
   SATO Printer (WiFi)
```

## ข้อกำหนด

- Node.js 18+
- เครือข่ายเดียวกันกับ SATO Printer
- IP Address ของ SATO Printer

## การติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
cd print-agent
npm install
```

### 2. หา IP Address ของ SATO

วิธีหา IP Address ของ SATO:
- เข้าเมนู SATO → Settings → Network → TCP/IP
- หรือพิมพ์ Config Label จากเครื่อง

### 3. แก้ไขค่า Config

เปิดไฟล์ `agent.js` และแก้ไข:

```javascript
const CONFIG = {
    apiBaseUrl: 'http://your-pms-server:3000',  // URL ของ PMS Server
    printerIp: '192.168.1.xxx',                  // IP ของ SATO
    printerPort: 9100,                           // Port มาตรฐาน (ปกติไม่ต้องแก้)
    printerName: 'SATO-Main',                    // ชื่อเครื่องพิมพ์ใน PMS
}
```

### 4. ทดสอบการเชื่อมต่อ

```bash
# ทดสอบเชื่อมต่อกับ SATO
node test-printer.js

# ทดสอบพิมพ์จริง
node test-printer.js --print
```

### 5. รัน Print Agent

```bash
# Development mode (restart อัตโนมัติเมื่อแก้ไขไฟล์)
npm run dev

# Production mode
npm start
```

## การ Setup บน PMS Server

### 1. รัน SQL Migration

รัน script นี้บน SQL Server:
```sql
-- ดูไฟล์ scripts/09_create_print_system_tables.sql
```

### 2. เพิ่มเครื่องพิมพ์ในฐานข้อมูล

```sql
INSERT INTO pms.printers (
    name, printer_type, connection_type, connection_string,
    printer_model, print_language, is_default
) VALUES (
    'SATO-Main',
    'SATO',
    'NETWORK',
    '192.168.1.xxx:9100',  -- แก้เป็น IP จริง
    'SATO CL4NX',          -- แก้เป็นรุ่นจริง
    'SBPL',
    1
)
```

## การแก้ปัญหา

### ไม่สามารถเชื่อมต่อ SATO ได้

1. ตรวจสอบว่า SATO เปิดอยู่และเชื่อมต่อ WiFi
2. ลอง ping IP ของ SATO: `ping 192.168.1.xxx`
3. ตรวจสอบว่าไม่มี Firewall บล็อก Port 9100
4. ตรวจสอบ IP Address ใน SATO menu

### พิมพ์ไม่ออก / ออกมาเป็นอักษรแปลกๆ

1. ตรวจสอบรุ่น SATO ว่ารองรับ SBPL หรือไม่
2. บาง SATO รุ่นใหม่ใช้ SATO Label Language (SLL) แทน SBPL
3. ติดต่อ SATO support เพื่อดูคู่มือการเขียน command

### งานพิมพ์ค้าง status = pending

1. ตรวจสอบว่า Print Agent กำลังรันอยู่
2. ตรวจสอบ URL ของ PMS Server ใน config
3. ดู log ของ Print Agent

## Files

```
print-agent/
├── package.json       # Dependencies
├── agent.js           # Print Agent หลัก
├── test-printer.js    # ทดสอบการเชื่อมต่อ
└── README.md          # คู่มือนี้
```

## SATO SBPL Reference

Basic SBPL Commands:
- `<STX>` (0x02) = Start of text
- `<ETX>` (0x03) = End of text
- `A` = Clear buffer
- `V` = Vertical position
- `H` = Horizontal position
- `D` = Density
- `S` = Speed
- `L` = Draw text
- `B` = Draw barcode
- `Q` = Quantity
- `Z` = Print

ดูคู่มือฉบับเต็มได้ที่: [SATO Programmer's Reference](https://www.sato-global.com/)
