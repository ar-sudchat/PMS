// Task Status Configuration for KPI Calculation
// ============================================

export interface TaskStatusConfig {
  value: string
  label: string
  label_th: string
  color: string
  bgColor: string
  isCompleted: boolean
  countForKPI: boolean
  kpiResult?: 'pass' | 'fail'
}

export const TASK_STATUSES: TaskStatusConfig[] = [
  {
    value: 'todo',
    label: 'To Do',
    label_th: 'รอดำเนินการ',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    isCompleted: false,
    countForKPI: false
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    label_th: 'กำลังดำเนินการ',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    isCompleted: false,
    countForKPI: false
  },
  {
    value: 'review',
    label: 'Review',
    label_th: 'รอตรวจสอบ',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    isCompleted: false,
    countForKPI: false
  },
  {
    value: 'blocked',
    label: 'Blocked',
    label_th: 'ติดปัญหา',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    isCompleted: false,
    countForKPI: false
  },
  {
    value: 'done',
    label: 'Done',
    label_th: 'เสร็จสมบูรณ์',
    color: '#10B981',
    bgColor: '#D1FAE5',
    isCompleted: true,
    countForKPI: true,
    kpiResult: 'pass'
  },
  {
    value: 'done_not_planned',
    label: 'Done (Not as Planned)',
    label_th: 'เสร็จไม่ตามแผน',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    isCompleted: true,
    countForKPI: true,
    kpiResult: 'fail'
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    label_th: 'ยกเลิก',
    color: '#9CA3AF',
    bgColor: '#F3F4F6',
    isCompleted: false,
    countForKPI: false
  },
]

// Helper functions
export const getTaskStatusConfig = (status: string): TaskStatusConfig | undefined => {
  return TASK_STATUSES.find(s => s.value === status)
}

export const getCompletedStatuses = (): string[] =>
  TASK_STATUSES.filter(s => s.isCompleted).map(s => s.value)

export const getKPICountStatuses = (): string[] =>
  TASK_STATUSES.filter(s => s.countForKPI).map(s => s.value)

export const getKPIPassStatuses = (): string[] =>
  TASK_STATUSES.filter(s => s.kpiResult === 'pass').map(s => s.value)

export const getKPIFailStatuses = (): string[] =>
  TASK_STATUSES.filter(s => s.kpiResult === 'fail').map(s => s.value)

export const getActiveStatuses = (): string[] =>
  TASK_STATUSES.filter(s => !s.isCompleted && s.value !== 'cancelled').map(s => s.value)

// Reasons for "Done (Not as Planned)"
export const NOT_AS_PLANNED_REASONS = [
  { value: 'urgent_interrupt', label: 'ถูกแทรกงานด่วน' },
  { value: 'scope_change', label: 'Scope เปลี่ยนระหว่างทำ' },
  { value: 'dependency_wait', label: 'รอ Dependency จากคนอื่น' },
  { value: 'technical_issue', label: 'ปัญหาทางเทคนิค' },
  { value: 'missing_requirements', label: 'ขาดข้อมูล/Requirements' },
  { value: 'resource_unavailable', label: 'ขาดทรัพยากร/เครื่องมือ' },
  { value: 'other', label: 'อื่นๆ' },
]

// KPI Target
export const ISSUE_CLEARING_TARGET = 85 // percent
