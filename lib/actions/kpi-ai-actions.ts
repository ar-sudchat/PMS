'use server'

import Anthropic from '@anthropic-ai/sdk'
import { getKPIDashboardData, getMyKPIDashboardData } from './kpi-dashboard-actions'

// Check if API key is available
const hasApiKey = !!process.env.ANTHROPIC_API_KEY

// Only create client if API key exists
const anthropic = hasApiKey ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
}) : null

// AI วิเคราะห์ KPI Dashboard (ภาพรวมทีม)
export async function analyzeKPIDashboard(
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  // Return early if no API key
  if (!anthropic) {
    return { success: false, error: 'ANTHROPIC_API_KEY not configured' }
  }

  try {
    const data = await getKPIDashboardData(year, period, periodValue)

    const periodLabel = period === 'month'
      ? `เดือน ${periodValue}/${year}`
      : period === 'quarter'
      ? `Q${periodValue}/${year}`
      : `ปี ${year}`

    const prompt = `
คุณเป็น HR Analytics Expert ช่วยวิเคราะห์ KPI ขององค์กร

## ข้อมูล KPI ${periodLabel}

### Department KPI Summary
${data.departmentKPIs.map((k: any) =>
  `- ${k.kpi_name}: ${k.actual_value}% (Target: ${k.target}) ${k.is_pass ? '✅ Pass' : '❌ Fail'}`
).join('\n')}

### Department KPI Pass Rate
- ผ่าน: ${data.summary.deptKPIPass}/${data.summary.deptKPITotal} (${data.summary.deptKPIPercent}%)

### Personal KPI Summary
${Object.entries(data.personalKPIGroups).map(([name, stats]: [string, any]) =>
  `- ${name}: Pass ${stats.pass}/${stats.total}, Fail ${stats.fail}`
).join('\n')}

### พนักงานที่ At Risk (${data.atRiskEmployees.length} คน)
${data.atRiskEmployees.slice(0, 10).map((e: any) =>
  `- ${e.employee_name} (${e.position}): ${e.failed_kpis}`
).join('\n') || 'ไม่มี'}

---

กรุณาวิเคราะห์และตอบเป็นภาษาไทยในรูปแบบ JSON:
{
  "summary": "สรุปภาพรวม 2-3 ประโยค",
  "strengths": ["จุดแข็ง 1", "จุดแข็ง 2"],
  "concerns": ["จุดที่ต้องปรับปรุง 1", "จุดที่ต้องปรับปรุง 2"],
  "recommendations": ["คำแนะนำ 1", "คำแนะนำ 2"],
  "focus_areas": ["สิ่งที่ต้องโฟกัส 1", "สิ่งที่ต้องโฟกัส 2"],
  "overall_status": "good" | "warning" | "critical"
}
`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      return {
        success: true,
        analysis: JSON.parse(jsonMatch[0])
      }
    }

    return { success: false, error: 'Failed to parse response' }
  } catch (error: any) {
    console.error('analyzeKPIDashboard error:', error)
    return { success: false, error: error.message }
  }
}

// AI วิเคราะห์ My KPI
export async function analyzeMyKPI(
  employeeId: string,
  employeeName: string,
  position: string,
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  // Return early if no API key
  if (!anthropic) {
    return { success: false, error: 'ANTHROPIC_API_KEY not configured' }
  }

  try {
    const data = await getMyKPIDashboardData(employeeId, position, year, period, periodValue)

    const periodLabel = period === 'month'
      ? `เดือน ${periodValue}/${year}`
      : period === 'quarter'
      ? `Q${periodValue}/${year}`
      : `ปี ${year}`

    const prompt = `
คุณเป็น Performance Coach ช่วยวิเคราะห์ KPI ของพนักงาน

## ข้อมูล KPI ${periodLabel}
พนักงาน: ${employeeName}
ตำแหน่ง: ${position}

### KPI Summary
- ผ่าน: ${data.summary.passCount}/${data.summary.totalKPIs} (${data.summary.passPercent}%)
- ไม่ผ่าน: ${data.summary.failCount}
- สถานะ: ${data.summary.status}

### Department KPI (ที่กระทบตำแหน่ง ${position})
${data.departmentKPIs.map((k: any) =>
  `- ${k.kpi_name}: ${k.actual_value}% (Target: ${k.target}) ${k.is_pass ? '✅' : '❌'}`
).join('\n')}

### Personal KPI
${data.personalKPIs.map((k: any) =>
  `- ${k.kpi_name}: ${k.actual_value}${k.kpi_name.includes('Meeting') ? ' ครั้ง' : '%'} (Target: ${k.target_value}) ${k.is_pass ? '✅' : '❌'}`
).join('\n')}

### KPI ที่ไม่ผ่าน
${data.failedKPIs.map((k: any) =>
  `- ${k.kpi_name}: ${k.actual_value} (ห่างจาก Target: ${Math.abs(k.actual_value - k.target_value)})`
).join('\n') || 'ไม่มี'}

---

กรุณาวิเคราะห์และให้คำแนะนำเป็นภาษาไทยในรูปแบบ JSON:
{
  "summary": "สรุปผลงาน 2-3 ประโยค",
  "achievements": ["ความสำเร็จ 1", "ความสำเร็จ 2"],
  "improvement_areas": ["สิ่งที่ต้องปรับปรุง 1", "สิ่งที่ต้องปรับปรุง 2"],
  "action_items": ["สิ่งที่ควรทำ 1", "สิ่งที่ควรทำ 2", "สิ่งที่ควรทำ 3"],
  "motivation": "ข้อความให้กำลังใจ",
  "risk_level": "low" | "medium" | "high"
}
`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      return {
        success: true,
        analysis: JSON.parse(jsonMatch[0])
      }
    }

    return { success: false, error: 'Failed to parse response' }
  } catch (error: any) {
    console.error('analyzeMyKPI error:', error)
    return { success: false, error: error.message }
  }
}
