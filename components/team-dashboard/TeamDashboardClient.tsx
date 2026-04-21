'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SmartCombobox, type Option } from '@/components/shared/SmartCombobox'
import {
  Users, CheckCircle, Clock, AlertTriangle, AlertOctagon,
  ListTodo, Eye, Loader2, RefreshCw, ChevronLeft, ChevronRight,
  User, Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getDailyViewData,
  type DailyViewData,
  type DailyMember,
  type DailyTask,
} from '@/lib/actions/team-dashboard-actions'

interface TeamDashboardClientProps {
  initialData: DailyViewData
  departmentOptions: { id: string; name: string }[]
  initialDepartmentId?: string
}

const STATUS_CONFIG: Record<string, { icon: any; label: string; bg: string; text: string }> = {
  in_progress: { icon: Clock, label: 'กำลังทำ', bg: 'bg-blue-100', text: 'text-blue-700' },
  review: { icon: Eye, label: 'รอ Review', bg: 'bg-purple-100', text: 'text-purple-700' },
  todo: { icon: ListTodo, label: 'รอทำ', bg: 'bg-gray-100', text: 'text-gray-600' },
  blocked: { icon: AlertOctagon, label: 'Blocked', bg: 'bg-red-100', text: 'text-red-700' },
  done: { icon: CheckCircle, label: 'เสร็จ', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  done_not_planned: { icon: AlertTriangle, label: 'เสร็จ (ไม่ตามแผน)', bg: 'bg-amber-100', text: 'text-amber-700' },
}

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-blue-400',
  low: 'bg-gray-300',
}

const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const MONTH_NAMES = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = DAY_NAMES[d.getDay()]
  const dd = d.getDate()
  const month = MONTH_NAMES[d.getMonth()]
  const year = d.getFullYear() + 543
  return `วัน${day}ที่ ${dd} ${month} ${year}`
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split('T')[0]
}

export function TeamDashboardClient({ initialData, departmentOptions, initialDepartmentId }: TeamDashboardClientProps) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<DailyViewData>(initialData)
  const [currentDate, setCurrentDate] = useState(initialData.date)
  const [selectedDept, setSelectedDept] = useState<Option>(
    initialDepartmentId && initialDepartmentId !== 'all'
      ? { value: initialDepartmentId, label: departmentOptions.find(d => d.id === initialDepartmentId)?.name || 'All' }
      : { value: 'all', label: 'ทุกแผนก' }
  )

  const deptOptions: Option[] = [
    { value: 'all', label: 'ทุกแผนก' },
    ...departmentOptions.map(d => ({ value: d.id, label: d.name }))
  ]

  const loadData = (date: string, deptId?: string) => {
    startTransition(async () => {
      const newData = await getDailyViewData(date, deptId ?? String(selectedDept.value))
      setData(newData)
    })
  }

  const goDay = (offset: number) => {
    const d = new Date(currentDate + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    const newDate = d.toISOString().split('T')[0]
    setCurrentDate(newDate)
    loadData(newDate)
  }

  const goToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setCurrentDate(today)
    loadData(today)
  }

  const handleDeptChange = (option: Option | null) => {
    if (!option) return
    setSelectedDept(option)
    loadData(currentDate, String(option.value))
  }

  const { members } = data
  const totalTasks = members.reduce((sum, m) => sum + m.tasks.length, 0)
  const membersWithTasks = members.filter(m => m.tasks.length > 0)
  const membersNoTasks = members.filter(m => m.tasks.length === 0)

  return (
    <div className="space-y-5">
      {/* Header with date navigation */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7" />
              Team Dashboard
            </h1>
            <p className="text-teal-100 mt-1">ภาพรวมงานรายวัน</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-52">
              <SmartCombobox options={deptOptions} value={selectedDept}
                onChange={handleDeptChange} placeholder="เลือกแผนก..." />
            </div>
          </div>
        </div>

        {/* Date Nav */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button size="sm" variant="ghost" onClick={() => goDay(-1)}
            className="text-white hover:bg-white/20 h-9 w-9 p-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="text-center min-w-[220px]">
            <p className="text-xl font-bold">{formatThaiDate(currentDate)}</p>
            {!isToday(currentDate) && (
              <button onClick={goToday} className="text-xs text-teal-200 hover:text-white underline mt-0.5">
                กลับวันนี้
              </button>
            )}
            {isToday(currentDate) && (
              <p className="text-xs text-teal-200 mt-0.5">วันนี้</p>
            )}
          </div>

          <Button size="sm" variant="ghost" onClick={() => goDay(1)}
            className="text-white hover:bg-white/20 h-9 w-9 p-0">
            <ChevronRight className="h-5 w-5" />
          </Button>

          {isPending && <Loader2 className="h-4 w-4 animate-spin text-teal-200" />}
        </div>

        {/* Quick stats */}
        <div className="flex items-center justify-center gap-6 mt-3 text-sm text-teal-100">
          <span>{members.length} คน</span>
          <span>{totalTasks} งาน</span>
          <span>{membersWithTasks.length} คนมีงาน</span>
          {membersNoTasks.length > 0 && <span className="text-teal-300">{membersNoTasks.length} คนไม่มีงาน</span>}
        </div>
      </div>

      {/* Members with tasks */}
      <div className="space-y-4">
        {membersWithTasks.map(m => (
          <MemberDailyCard key={m.employee_id} member={m} date={currentDate} />
        ))}
      </div>

      {/* Members without tasks */}
      {membersNoTasks.length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-2">ไม่มีงานในวันนี้ ({membersNoTasks.length} คน)</p>
          <div className="flex flex-wrap gap-2">
            {membersNoTasks.map(m => (
              <span key={m.employee_id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-500">
                <User className="h-3.5 w-3.5" />
                {m.employee_name}
                <span className="text-[10px] text-gray-400">({m.position_code})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && (
        <p className="text-center text-gray-400 py-16">ไม่พบข้อมูลสมาชิก</p>
      )}
    </div>
  )
}

// ===== Member Daily Card =====
function MemberDailyCard({ member: m, date }: { member: DailyMember; date: string }) {
  const blockedCount = m.tasks.filter(t => t.status === 'blocked').length
  const overdueCount = m.tasks.filter(t => t.is_overdue).length
  const hasIssue = blockedCount > 0 || overdueCount > 0

  return (
    <Card className={cn('transition-all', hasIssue && 'border-l-4 border-l-red-400')}>
      <CardContent className="p-4">
        {/* Member header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
              hasIssue ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-600'
            )}>
              {m.employee_name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold">{m.employee_name}</p>
              <p className="text-xs text-gray-500">{m.position_name} · {m.tasks.length} งาน
                {m.hours_logged > 0 && <span className="ml-2 text-teal-600">บันทึก {m.hours_logged} ชม.</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {blockedCount > 0 && (
              <Badge className="bg-red-100 text-red-700 text-xs">Blocked {blockedCount}</Badge>
            )}
            {overdueCount > 0 && (
              <Badge className="bg-orange-100 text-orange-700 text-xs">เกินกำหนด {overdueCount}</Badge>
            )}
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-1.5">
          {m.tasks.map(task => (
            <TaskRow key={task.task_id} task={task} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ===== Task Row =====
function TaskRow({ task: t }: { task: DailyTask }) {
  const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.todo
  const Icon = sc.icon

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
      t.is_overdue ? 'bg-orange-50' : t.status === 'blocked' ? 'bg-red-50' : 'bg-gray-50'
    )}>
      {/* Status icon */}
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap', sc.bg, sc.text)}>
        <Icon className="h-3 w-3" />
        {sc.label}
      </span>

      {/* Priority dot */}
      <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_DOT[t.priority] || PRIORITY_DOT.medium)} title={t.priority} />

      {/* Title */}
      <span className="font-medium truncate flex-1">{t.title}</span>

      {/* Project code */}
      <span className="text-[11px] text-gray-400 font-mono shrink-0">{t.project_code}</span>

      {/* Task type */}
      {t.task_type_name && t.task_type_name !== '-' && (
        <Badge className="text-[10px] px-1.5 py-0 shrink-0" style={{
          backgroundColor: t.task_type_color + '20', color: t.task_type_color
        }}>
          {t.task_type_name}
        </Badge>
      )}

      {/* Due date / Overdue */}
      {t.due_date && (
        <span className={cn('text-[11px] shrink-0 flex items-center gap-0.5',
          t.is_overdue ? 'text-red-500 font-medium' : 'text-gray-400'
        )}>
          {t.is_overdue && <AlertTriangle className="h-3 w-3" />}
          {t.due_date}
        </span>
      )}

      {/* Hours */}
      {t.estimated_hours > 0 && (
        <span className="text-[11px] text-gray-400 shrink-0">{t.actual_hours}/{t.estimated_hours}h</span>
      )}
    </div>
  )
}
