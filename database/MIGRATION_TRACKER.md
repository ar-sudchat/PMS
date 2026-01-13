# 📊 Database Migration Tracker

> **Session:** 2026-01-12 → Deploy พรุ่งนี้
> **Test DB:** PMSoftware (10.8.8.88)
> **Production DB:** MoveonDB (10.8.8.88)

---

## 🔄 Workflow

1. ทำงานบน Test DB (`PMSoftware`) ก่อน
2. เมื่อเสร็จแต่ละ script → เพิ่มใน section "Pending Migrations"
3. พรุ่งนี้ deploy → รันทุก script บน Production (`MoveonDB`)
4. รันเสร็จ → ย้ายไป "Completed Migrations"

---

## ⏳ Pending Migrations (รอ Deploy)

### [001] Fix Gantt NULL Dates
- **File:** `migrations/001_fix_gantt_null_dates.sql`
- **Created:** 2026-01-12 19:45
- **Description:** แก้ไข sp_get_gantt_data ให้ส่ง NULL จริงๆ เมื่อไม่มีวันที่
- **Changes:**
  - ไม่ใช้ `COALESCE(..., GETDATE())` เป็น fallback สำหรับ start_date/end_date
  - ทำให้ Projects, Milestones, Stories ส่ง NULL เมื่อไม่มีวันที่จริง
  - Frontend จะแสดง "-" แทนวันที่ปัจจุบัน
- **Test Status:** ✅ Tested on PMSoftware
- **Rollback:** รัน `scripts/gantt-schema-v3.sql` (version เดิม)

<!-- Template สำหรับเพิ่ม migration ใหม่:

### [XXX] ชื่อ Migration
- **File:** `migrations/XXX_description.sql`
- **Created:** 2026-01-12 HH:MM
- **Description:** อธิบายสิ่งที่ทำ
- **Changes:**
  - รายการเปลี่ยนแปลง
- **Test Status:** ✅ Tested on PMSoftware / ❌ Not tested
- **Rollback:** SQL สำหรับ rollback (ถ้ามี)

-->

---

## ✅ Completed Migrations (Deploy แล้ว)

_ยังไม่มี_

---

## 📝 Notes

- ก่อน deploy Production ให้ **BACKUP** ก่อนเสมอ
- รัน scripts ตามลำดับ (001, 002, 003...)
- ถ้ามี error ให้ดู Rollback instructions

---

## 🔧 Quick Commands

```bash
# ต่อ Test DB (PMSoftware)
# แก้ .env.local → DB_NAME=PMSoftware

# ต่อ Production DB (MoveonDB)
# แก้ .env.local → DB_NAME=MoveonDB

# รัน SQL script
npx ts-node scripts/run-sql.ts < database/migrations/XXX_name.sql
```
