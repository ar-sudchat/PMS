# 📁 Database Directory Structure

```
database/
├── MIGRATION_TRACKER.md    # ← Track ว่า script ไหนรันแล้ว/ยังไม่รัน
├── migrations/             # ← SQL migrations (เรียงตามลำดับ)
│   ├── 001_description.sql
│   ├── 002_description.sql
│   └── ...
├── views/                  # ← Views/Stored procedures
├── procedures/             # ← Stored Procedures
└── seeds/                  # ← Mock data / Initial data
```

## 📌 Naming Convention

| ประเภท | Format | ตัวอย่าง |
|--------|--------|----------|
| Migration | `NNN_short_description.sql` | `001_add_checklist_table.sql` |
| View | `vw_name.sql` | `vw_project_health.sql` |
| Procedure | `sp_name.sql` | `sp_get_team_workload.sql` |
| Seed | `seed_name.sql` | `seed_initial_data.sql` |

## 🔄 Workflow

1. **พัฒนา** - ทำงานบน Test DB (`PMSoftware`)
2. **สร้าง Script** - เพิ่มไฟล์ใน `migrations/`
3. **Track** - อัพเดท `MIGRATION_TRACKER.md`
4. **Deploy** - รัน scripts บน Production (`MoveonDB`)
5. **Mark Done** - อัพเดท status ใน tracker

## ⚠️ Important

- **BACKUP** ก่อน deploy Production เสมอ
- รัน migrations ตาม **ลำดับ**
- Test บน `PMSoftware` ก่อน deploy `MoveonDB`
