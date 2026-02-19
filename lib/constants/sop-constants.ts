// S&OP Issue types, severities, statuses, and payment statuses

export const ISSUE_TYPES = [
    { code: 'BLOCKER', label: 'Blocker', labelTh: 'ตัวบล็อก', color: '#EF4444' },
    { code: 'RISK', label: 'Risk', labelTh: 'ความเสี่ยง', color: '#F59E0B' },
    { code: 'ISSUE', label: 'Issue', labelTh: 'ปัญหา', color: '#3B82F6' },
    { code: 'ESCALATION', label: 'Escalation', labelTh: 'Escalation', color: '#8B5CF6' },
] as const

export type IssueTypeCode = typeof ISSUE_TYPES[number]['code']

export const ISSUE_SEVERITIES = [
    { code: 'CRITICAL', label: 'Critical', labelTh: 'วิกฤต', color: '#DC2626' },
    { code: 'HIGH', label: 'High', labelTh: 'สูง', color: '#EA580C' },
    { code: 'MEDIUM', label: 'Medium', labelTh: 'ปานกลาง', color: '#CA8A04' },
    { code: 'LOW', label: 'Low', labelTh: 'ต่ำ', color: '#16A34A' },
] as const

export type IssueSeverityCode = typeof ISSUE_SEVERITIES[number]['code']

export const ISSUE_STATUSES = [
    { code: 'OPEN', label: 'Open', labelTh: 'เปิด', color: '#3B82F6' },
    { code: 'IN_PROGRESS', label: 'In Progress', labelTh: 'กำลังดำเนินการ', color: '#F59E0B' },
    { code: 'ESCALATED', label: 'Escalated', labelTh: 'Escalated', color: '#EF4444' },
    { code: 'RESOLVED', label: 'Resolved', labelTh: 'แก้ไขแล้ว', color: '#22C55E' },
    { code: 'CLOSED', label: 'Closed', labelTh: 'ปิด', color: '#64748B' },
] as const

export type IssueStatusCode = typeof ISSUE_STATUSES[number]['code']

export const PAYMENT_STATUSES = [
    { code: 'NOT_INVOICED', label: 'Not Invoiced', labelTh: 'ยังไม่ออกใบแจ้งหนี้', color: '#94A3B8' },
    { code: 'INVOICED', label: 'Invoiced', labelTh: 'ออกใบแจ้งหนี้แล้ว', color: '#3B82F6' },
    { code: 'PARTIAL_PAID', label: 'Partial Paid', labelTh: 'ชำระบางส่วน', color: '#F59E0B' },
    { code: 'PAID', label: 'Paid', labelTh: 'ชำระครบ', color: '#22C55E' },
    { code: 'OVERDUE', label: 'Overdue', labelTh: 'เกินกำหนด', color: '#EF4444' },
] as const

export type PaymentStatusCode = typeof PAYMENT_STATUSES[number]['code']

export const BILLING_STATUSES = [
    { code: 'BILLING', label: 'Billing', labelTh: 'ยังเก็บเงินอยู่', color: '#3B82F6' },
    { code: 'COMPLETED', label: 'Completed', labelTh: 'เก็บเงินครบแล้ว', color: '#22C55E' },
    { code: 'NOT_APPLICABLE', label: 'N/A', labelTh: 'ไม่ต้องเก็บเงิน', color: '#94A3B8' },
] as const

export type BillingStatusCode = typeof BILLING_STATUSES[number]['code']

// Thai month abbreviations for Sales x Cash In table
export const THAI_MONTH_ABBRS = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
] as const

// Default yearly sales target (THB)
export const DEFAULT_YEARLY_TARGET = 28_000_000
