'use server'

import Anthropic from '@anthropic-ai/sdk'
import { getTimesheetDataForAI, TimesheetDashboardData } from './timesheet-dashboard-actions'

// AI Analysis Result Type
export interface AIAnalysisResult {
  summary: string
  highlights: string[]
  concerns: string[]
  recommendations: string[]
  trends: string[]
  risk_level: 'low' | 'medium' | 'high'
}

export interface AnalyzeTimesheetResponse {
  success: boolean
  analysis?: AIAnalysisResult
  error?: string
  rawData: TimesheetDashboardData
}

export interface AskTimesheetResponse {
  success: boolean
  answer?: string
  error?: string
}

// Check if API key is configured
function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY is not configured')
    return null
  }
  return new Anthropic({ apiKey })
}

// AI วิเคราะห์ Timesheet อัตโนมัติ
export async function analyzeTimesheetWithAI(year: number, month: number): Promise<AnalyzeTimesheetResponse> {
  const data = await getTimesheetDataForAI(year, month)

  const anthropic = getAnthropicClient()
  if (!anthropic) {
    // Return mock analysis when API key is not configured
    return {
      success: true,
      analysis: generateMockAnalysis(data),
      rawData: data
    }
  }

  const prompt = `
คุณเป็น HR Analytics Expert ช่วยวิเคราะห์ข้อมูล Timesheet ขององค์กร

## ข้อมูล Timesheet เดือน ${month}/${year}

### สรุปภาพรวม
- ชั่วโมงทำงานรวม: ${data.summary.total_hours || 0} ชั่วโมง
- จำนวนพนักงานที่บันทึก: ${data.summary.active_employees || 0} คน
- จำนวนโครงการ: ${data.summary.active_projects || 0} โครงการ
- เปลี่ยนแปลงจากเดือนก่อน: ${data.summary.hours_change_percent || 0}%

### ชั่วโมงรายแผนก
${data.departments.map(d => `- ${d.department_name}: ${d.total_hours} ชั่วโมง`).join('\n') || '- ไม่มีข้อมูล'}

### Top 5 โครงการ
${data.projects.slice(0, 5).map(p => `- ${p.project_name}: ${p.total_hours} ชั่วโมง (${p.budget_used_percent}% of budget)`).join('\n') || '- ไม่มีข้อมูล'}

### พนักงานที่ Utilization ต่ำกว่า 70%
${data.lowUtil.map(e => `- ${e.employee_name} (${e.department_name}): ${e.utilization_percent}%`).join('\n') || '- ไม่มี'}

### พนักงานที่ยังไม่บันทึก Timesheet
${data.missing.map(e => `- ${e.employee_name}: ${e.status}`).join('\n') || '- ไม่มี'}

### โครงการที่ใช้เวลาเกิน Budget
${data.overBudget.map(p => `- ${p.project_name}: ${p.budget_used_percent}% (เกิน ${Math.round(p.budget_used_percent - 100)}%)`).join('\n') || '- ไม่มี'}

---

กรุณาวิเคราะห์และตอบเป็นภาษาไทยในรูปแบบ JSON ดังนี้:
{
  "summary": "สรุปภาพรวม 2-3 ประโยค",
  "highlights": ["จุดเด่น 1", "จุดเด่น 2"],
  "concerns": ["จุดที่ต้องสังเกต 1", "จุดที่ต้องสังเกต 2"],
  "recommendations": ["คำแนะนำ 1", "คำแนะนำ 2", "คำแนะนำ 3"],
  "trends": ["แนวโน้ม 1", "แนวโน้ม 2"],
  "risk_level": "low" | "medium" | "high"
}
`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]) as AIAnalysisResult
      return {
        success: true,
        analysis,
        rawData: data
      }
    }

    return {
      success: false,
      error: 'Failed to parse AI response',
      rawData: data
    }
  } catch (error: any) {
    console.error('AI Analysis error:', error)
    // Fallback to mock analysis
    return {
      success: true,
      analysis: generateMockAnalysis(data),
      rawData: data
    }
  }
}

// AI ตอบคำถามเกี่ยวกับ Timesheet
export async function askTimesheetAI(question: string, year: number, month: number): Promise<AskTimesheetResponse> {
  const data = await getTimesheetDataForAI(year, month)

  const anthropic = getAnthropicClient()
  if (!anthropic) {
    // Return mock answer when API key is not configured
    return {
      success: true,
      answer: generateMockAnswer(question, data)
    }
  }

  const prompt = `
คุณเป็น HR Analytics Assistant ช่วยตอบคำถามเกี่ยวกับ Timesheet

## ข้อมูล Timesheet เดือน ${month}/${year}

### สรุป
- ชั่วโมงรวม: ${data.summary.total_hours || 0} ชม.
- พนักงาน: ${data.summary.active_employees || 0} คน
- โครงการ: ${data.summary.active_projects || 0} โครงการ

### พนักงาน (เรียงตามชั่วโมง)
${data.employees.slice(0, 10).map(e =>
  `- ${e.employee_name} (${e.department_name}): ${e.total_hours} ชม. (${e.utilization_percent}%)`
).join('\n')}

### แผนก
${data.departments.map(d => `- ${d.department_name}: ${d.total_hours} ชม.`).join('\n')}

### โครงการ
${data.projects.map(p => `- ${p.project_name}: ${p.total_hours} ชม.`).join('\n')}

---

คำถาม: ${question}

ตอบเป็นภาษาไทย กระชับ ชัดเจน ถ้ามีตัวเลขให้ระบุด้วย
`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    return {
      success: true,
      answer: text
    }
  } catch (error: any) {
    console.error('AI Question error:', error)
    // Fallback to mock answer
    return {
      success: true,
      answer: generateMockAnswer(question, data)
    }
  }
}

// Generate mock analysis when API is not available
function generateMockAnalysis(data: TimesheetDashboardData): AIAnalysisResult {
  const { summary, employees, departments, lowUtil, missing, overBudget } = data

  const avgUtil = employees.length > 0
    ? Math.round(employees.reduce((sum, e) => sum + (e.utilization_percent || 0), 0) / employees.length)
    : 0

  const highlights: string[] = []
  const concerns: string[] = []
  const recommendations: string[] = []
  const trends: string[] = []

  // Analyze data and generate insights
  if (summary.total_hours > 0) {
    highlights.push(`ทีมบันทึกเวลาทำงานรวม ${summary.total_hours} ชั่วโมง จาก ${summary.active_employees} คน`)
  }

  if (avgUtil >= 80) {
    highlights.push(`ค่าเฉลี่ย Utilization อยู่ที่ ${avgUtil}% ซึ่งสูงกว่าเป้าหมาย 80%`)
  }

  if (lowUtil.length > 0) {
    concerns.push(`มีพนักงาน ${lowUtil.length} คนที่มี Utilization ต่ำกว่า 70%`)
  }

  if (missing.length > 0) {
    concerns.push(`มีพนักงาน ${missing.length} คนที่ยังไม่บันทึก Timesheet`)
  }

  if (overBudget.length > 0) {
    concerns.push(`มี ${overBudget.length} โครงการที่ใช้เวลาเกินงบประมาณ`)
  }

  if ((summary.hours_change_percent || 0) > 0) {
    trends.push(`ชั่วโมงทำงานเพิ่มขึ้น ${summary.hours_change_percent}% จากเดือนก่อน`)
  } else if ((summary.hours_change_percent || 0) < 0) {
    trends.push(`ชั่วโมงทำงานลดลง ${Math.abs(summary.hours_change_percent || 0)}% จากเดือนก่อน`)
  }

  // Add recommendations
  if (lowUtil.length > 0) {
    recommendations.push('ควรตรวจสอบภาระงานของพนักงานที่มี Utilization ต่ำ')
  }
  if (missing.length > 0) {
    recommendations.push('ควรติดตามให้พนักงานบันทึก Timesheet ให้ครบถ้วน')
  }
  if (overBudget.length > 0) {
    recommendations.push('ควรทบทวนการจัดสรรทรัพยากรในโครงการที่เกินงบประมาณ')
  }
  if (recommendations.length === 0) {
    recommendations.push('รักษามาตรฐานการทำงานที่ดีต่อไป')
  }

  // Determine risk level
  let risk_level: 'low' | 'medium' | 'high' = 'low'
  if (lowUtil.length > 3 || missing.length > 5 || overBudget.length > 2) {
    risk_level = 'high'
  } else if (lowUtil.length > 1 || missing.length > 2 || overBudget.length > 0) {
    risk_level = 'medium'
  }

  return {
    summary: `เดือนนี้มีการบันทึก Timesheet รวม ${summary.total_hours} ชั่วโมง จากพนักงาน ${summary.active_employees} คน ค่าเฉลี่ย Utilization อยู่ที่ ${avgUtil}%`,
    highlights: highlights.length > 0 ? highlights : ['ยังไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์'],
    concerns: concerns.length > 0 ? concerns : ['ไม่พบประเด็นที่น่ากังวล'],
    recommendations,
    trends: trends.length > 0 ? trends : ['ยังไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์แนวโน้ม'],
    risk_level
  }
}

// Generate mock answer for questions
function generateMockAnswer(question: string, data: TimesheetDashboardData): string {
  const lowerQuestion = question.toLowerCase()

  if (lowerQuestion.includes('ใครทำงานมากสุด') || lowerQuestion.includes('ใครทำงานมากที่สุด')) {
    const topEmployee = data.employees[0]
    if (topEmployee) {
      return `${topEmployee.employee_name} ทำงานมากที่สุดเดือนนี้ รวม ${topEmployee.total_hours} ชั่วโมง (Utilization ${topEmployee.utilization_percent}%)`
    }
    return 'ยังไม่มีข้อมูล Timesheet สำหรับเดือนนี้'
  }

  if (lowerQuestion.includes('แผนก') && (lowerQuestion.includes('มากสุด') || lowerQuestion.includes('มากที่สุด'))) {
    const topDept = data.departments[0]
    if (topDept) {
      return `แผนก ${topDept.department_name} ใช้เวลามากที่สุด รวม ${topDept.total_hours} ชั่วโมง จากพนักงาน ${topDept.employee_count} คน`
    }
    return 'ยังไม่มีข้อมูล Timesheet สำหรับเดือนนี้'
  }

  if (lowerQuestion.includes('เปรียบเทียบ') || lowerQuestion.includes('เดือนที่แล้ว') || lowerQuestion.includes('เดือนก่อน')) {
    const change = data.summary.hours_change_percent || 0
    if (change > 0) {
      return `ชั่วโมงทำงานเดือนนี้ (${data.summary.total_hours} ชม.) เพิ่มขึ้น ${change}% จากเดือนที่แล้ว (${data.summary.prev_month_hours} ชม.)`
    } else if (change < 0) {
      return `ชั่วโมงทำงานเดือนนี้ (${data.summary.total_hours} ชม.) ลดลง ${Math.abs(change)}% จากเดือนที่แล้ว (${data.summary.prev_month_hours} ชม.)`
    }
    return `ชั่วโมงทำงานเดือนนี้ (${data.summary.total_hours} ชม.) ไม่เปลี่ยนแปลงจากเดือนที่แล้ว`
  }

  if (lowerQuestion.includes('โครงการ') || lowerQuestion.includes('project')) {
    const topProjects = data.projects.slice(0, 3)
    if (topProjects.length > 0) {
      return `Top 3 โครงการที่ใช้เวลามากสุด:\n${topProjects.map((p, i) => `${i + 1}. ${p.project_name}: ${p.total_hours} ชม.`).join('\n')}`
    }
    return 'ยังไม่มีข้อมูลโครงการสำหรับเดือนนี้'
  }

  // Default response
  return `สรุปข้อมูล Timesheet เดือน ${data.meta.month}/${data.meta.year}:
- ชั่วโมงรวม: ${data.summary.total_hours} ชม.
- พนักงานที่บันทึก: ${data.summary.active_employees} คน
- โครงการ: ${data.summary.active_projects} โครงการ
- เปลี่ยนแปลงจากเดือนก่อน: ${data.summary.hours_change_percent}%`
}
