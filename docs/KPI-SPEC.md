# KPI Specification

## ภาพรวม

ระบบ KPI แบ่งเป็น 2 ระดับ:
- **Department KPI (ระดับแผนก/ทีม)** - ถ้าผ่าน = ผ่านทั้งทีม, ถ้าไม่ผ่าน = ไม่ผ่านทั้งทีม
- **Personal KPI (ระดับบุคคล)** - กระทบเฉพาะตัว แยกรายคน

---

## Department KPI (ระดับแผนก/ทีม)

| No | KPI Name | Index | Description | Category | PM | PG | SA |
|----|----------|-------|-------------|----------|:--:|:--:|:--:|
| 1 | Time to Delivery | >=80% | จัดส่งงานตรงเวลาตาม Milestone | Performance | ✓ | ✓ | ✓ |
| 2 | Man-day Control | >=85% | ใช้งาน resource ตาม Milestone อ้างอิงกับ Budget | Performance | ✓ | ✓ | ✓ |
| 3 | Defect Ratio | <=15% | ใช้ Manday สำหรับแก้ Defect ทุกประเภท / Manday ทั้งหมด | Quality | - | ✓ | ✓ |
| 4 | Post Go-live Rework Ratio | <=8% | ใช้ Manday สำหรับแก้บั๊คหลัง GoLive / Manday ทั้งหมด | Quality | ✓ | ✓ | ✓ |
| 5 | Deploy Success Rate | >=95% | Deploy ที่ไม่ต้อง rollback / Deploy ทั้งหมด | Quality | - | ✓ | ✓ |
| 6 | Pre-deploy Backup (5 Versions) | 100% | ทำเอกสาร deploy และมีการ backup | Availability | ✓ | - | - |

> **หมายเหตุ:** ✓ = กระทบตำแหน่งนี้, - = ไม่กระทบ

### สูตรการคำนวณ Department KPI

#### 1. Time to Delivery (>=80%)

**จุดประสงค์:** ใช้เพื่อวัดประสิทธิภาพและความต่อเนื่องของกระบวนการส่งมอบงาน ตั้งแต่เริ่มต้นจนถึงการส่งมอบจริง

**วิธีวัด:** ชี้วัดจากการส่งมอบงานได้ตามแผนยึดตามวันที่เอกสารตาม Milestone กับ Manday Budget

**สูตร:**
```
ผลรวมของ (%milestone ที่ทำได้ × manday)
─────────────────────────────────────── × 100
ผลรวมของ (manday × 100)
```

**สัดส่วน Milestone (ตัวอย่าง):**
| Milestone | สัดส่วน |
|-----------|--------|
| Mapping Data | 35% |
| System Test | 20% |
| User Acceptance Test | 30% |
| Go-Live | 15% |

> **หมายเหตุ:** สัดส่วน Milestone สามารถปรับได้ตามความสำคัญของงานจริง ตั้งค่าได้ในหน้าสร้างโครงการ (Tab Milestone)

---

#### 2. Man-day Control (>=85%)

**จุดประสงค์:** มีจุดประสงค์เพื่อควบคุมการใช้ทรัพยากรในการพัฒนา ให้เกิดผลลัพธ์สูงสุดตามแผนที่กำหนด

**วิธีวัด:** ชี้วัดจากการส่งมอบงานได้โดยใช้ทรัพยากรตามกำหนด ตาม Milestone กับ Manday Budget

**สูตร:**
```
ผลรวมของ (%milestone ที่ทำได้ × manday)
─────────────────────────────────────── × 100
ผลรวมของ (manday × 100)
```

**สัดส่วน Milestone:**
| Milestone | สัดส่วน |
|-----------|--------|
| Mapping Data | 30% |
| System Test | 30% |
| User Acceptance Test | 20% |
| Go-Live | 10% |
| Close Go-Live | 10% |

> **Close Go-Live คืออะไร?**
> คือขั้นตอนปิดโครงการหลังส่งมอบระบบแล้ว โดยทีมพัฒนาจะไม่ดูแลระบบอีกต่อไป
> - ส่งมอบให้ทีม MA (Maintenance) ดูแลต่อ หรือ
> - ส่งมอบให้ทีม IT ของลูกค้าดูแลเอง
>
> Man-day Control มี Close Go-Live เพราะต้องควบคุมทรัพยากรในช่วงส่งมอบงานด้วย
> Time to Delivery ไม่มี Close Go-Live เพราะวัดแค่ว่าส่งมอบตรงเวลาหรือไม่ (จบที่ Go-Live)

---

#### 3. Defect Ratio (<=15%)

**จุดประสงค์:** มีจุดประสงค์เพื่อควบคุมคุณภาพงานพัฒนา โดยลดการแก้ไขซ้ำและการสูญเสียทรัพยากรให้อยู่ในระดับที่เหมาะสม

**สูตร:**
```
Manday ที่ใช้ในการแก้ Defect
───────────────────────────── × 100
Manday ที่ใช้ในการพัฒนาทั้งหมด
```

- นับจาก `tasks.task_type` ที่ `is_defect = 1` ใน `task_type_configs`
- Manday = `SUM(timesheet_entries.hours) / 7`

---

#### 4. Post Go-live Rework Ratio (<=8%)

**จุดประสงค์:** มีจุดประสงค์เพื่อควบคุมคุณภาพของระบบหลังส่งมอบ โดยลดการแก้ไขงานซ้ำในช่วงใช้งานจริงให้อยู่ในระดับที่ยอมรับได้

**สูตร:**
```
Manday ที่เกิดขึ้นหลัง Go-Live
───────────────────────────── × 100
Manday ที่ใช้ในการพัฒนาทั้งหมด
```

- ดูจาก `post_golive_rework_records`

---

#### 5. Deploy Success Rate (>=95%)

**จุดประสงค์:** มีจุดประสงค์เพื่อให้มั่นใจว่าการนำระบบขึ้นใช้งาน เป็นไปอย่างถูกต้อง เสถียร และไม่ส่งผลกระทบต่อผู้ใช้งาน

**สูตร:**
```
จำนวนที่ Deploy สำเร็จ
───────────────────── × 100
จำนวนที่ Deploy ทั้งหมด
```

- ดูจาก `deploy_success_records.is_success`
- Deploy สำเร็จ = ไม่ต้อง rollback

---

#### 6. Pre-deploy Backup (100%)

**จุดประสงค์:** มีจุดประสงค์เพื่อป้องกันความเสียหายจากการ deploy และทำให้ระบบสามารถกู้คืนได้อย่างรวดเร็วเมื่อเกิดเหตุผิดพลาด

**เกณฑ์:** ทุกครั้งที่ Deploy ต้องมีการ Backup (5 Versions)

- ดูจาก `deploy_backup_records`

---

## Personal KPI (ระดับบุคคล)

| No | KPI Name | Index | Description | Category | PM | PG | SA |
|----|----------|-------|-------------|----------|:--:|:--:|:--:|
| 1 | On-time Meeting Minutes | ส่งช้าไม่เกิน 3 ครั้ง | ไม่เกิน 24 hour หลังประชุมจบ ส่งรายงานการประชุมผ่าน email | Availability | ✓ | - | - |
| 2 | Required Docs On-time | >=95% | ทำเอกสารจำเป็นส่ง ครบ ไม่ late ตาม milestone date | Availability | - | - | ✓ |
| 3 | Issue Clearing | >=85% | Clear Issue ในแต่ละวันตามที่ถูก assign นับ task/total task | Performance | ✓ | ✓ | - |

> **หมายเหตุ:** ✓ = กระทบตำแหน่งนี้, - = ไม่กระทบ

### สูตรการคำนวณ Personal KPI

#### 1. On-time Meeting Minutes (ส่งภายใน 24 ชม. ช้าได้ไม่เกิน 3 ครั้ง)

**จุดประสงค์:** จุดประสงค์เพื่อให้ข้อมูลจากการประชุมพร้อมใช้งานทันเวลา ช่วยให้งานเดินต่อได้อย่างราบรื่นและมีประสิทธิภาพ

**เกณฑ์:** ส่ง MoM ภายใน 24 ชั่วโมงหลังประชุมจบ ช้าได้ไม่เกิน 3 ครั้ง/เดือน

- ดูจาก `meeting_minutes_records.submitted_at - meeting_end_time > 24 hours`

---

#### 2. Required Docs On-time (>=95%)

**จุดประสงค์:** จุดประสงค์เพื่อให้ข้อมูลและเอกสารที่จำเป็นพร้อมใช้งานตามแผน สนับสนุนความต่อเนื่องและความพร้อมของกระบวนการทำงาน (Availability)

**สูตร:**
```
เอกสารที่ส่งตรงเวลา
─────────────────── × 100
เอกสารที่ต้องส่งทั้งหมด
```

- ดูจาก `docs_ontime_records`
- ไม่ late ตาม milestone date

---

#### 3. Issue Clearing (>=85%)

**จุดประสงค์:** จุดประสงค์เพื่อวัดประสิทธิภาพในการดำเนินงาน และความสามารถในการแปลงงานที่ได้รับมอบหมายให้เสร็จตามเป้าหมาย (Performance)

**สูตร:**
```
Task ที่ Clear ได้
─────────────────── × 100
Task ที่ถูก Assign ทั้งหมด
```

- นับจาก `tasks.assignee_id = employee_id`
- Task ที่ Clear = status เป็น `done` หรือ `done_not_planned`
- นับเป็นรายวัน/รายสัปดาห์

---

## สถานะการพัฒนาในระบบ

| KPI | มีในระบบแล้ว | หมายเหตุ |
|-----|-------------|----------|
| Deploy Success | ✅ | `deploy_success_records` |
| Pre-deploy Backup | ✅ | `deploy_backup_records` |
| Meeting Minutes | ✅ | `meeting_minutes_records` - ต้องเพิ่มการนับ "ส่งช้า" |
| Docs On-time | ✅ | `docs_ontime_records` |
| Issue Clearing | ✅ | `issue_clearing_records` - ต้องผูกกับ tasks ที่ assign รายบุคคล |
| Post Go-live Rework | ✅ | `post_golive_rework_records` |
| Time to Delivery | ❌ | ต้องคำนวณจาก Milestone |
| Man-day Control | ❌ | ต้องคำนวณจาก Budget vs Actual |
| Defect Ratio | ❌ | ต้องคำนวณจาก task_type = defect |

---

## Database Tables ที่เกี่ยวข้อง

### KPI Record Tables
- `pms.deploy_success_records` - บันทึก Deploy Success
- `pms.deploy_backup_records` - บันทึก Backup ก่อน Deploy
- `pms.meeting_minutes_records` - บันทึกรายงานการประชุม
- `pms.docs_ontime_records` - บันทึกการส่งเอกสาร
- `pms.issue_clearing_records` - บันทึกงานคงค้าง
- `pms.post_golive_rework_records` - บันทึก Rework หลัง Go-Live

### Supporting Tables
- `pms.project_milestones` - ข้อมูล Milestone (planned/actual dates, mandays)
- `pms.tasks` - Tasks พร้อม task_type, assignee_id
- `pms.task_type_configs` - Config ประเภทงาน (is_defect flag)
- `pms.timesheet_entries` - บันทึกชั่วโมงทำงาน

---

## Menu Structure

```
KPI Record
├── KPI Tracking
│   ├── Deploy Success (admin, manager)
│   ├── Deploy Backup (admin, manager)
│   ├── Meeting Minutes (admin, manager)
│   ├── Docs On-time (admin, manager)
│   ├── Issue Clearing (admin, manager)
│   └── Post Go-Live Rework (admin, manager)
└── Settings
    ├── Backup Sources (admin, manager)
    └── Backup Types (admin, manager)
```

---

## หมายเหตุ

- **PM** = Project Manager
- **PG** = Programmer
- **SA** = System Analyst
- ✓ = KPI นี้กระทบตำแหน่งดังกล่าว (ถ้าไม่ผ่าน จะกระทบคะแนนของตำแหน่งนั้น)
- Department KPI ถ้าทีมไม่ผ่าน = ทุกคนในทีมที่มี ✓ ไม่ผ่าน
- Personal KPI กระทบเฉพาะตัวบุคคลที่มี ✓
