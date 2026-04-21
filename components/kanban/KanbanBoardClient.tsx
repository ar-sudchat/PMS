'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SmartCombobox, type Option } from '@/components/shared/SmartCombobox'
import {
  LayoutGrid, RefreshCw, Loader2, AlertTriangle, Clock,
  CheckCircle, Eye, AlertOctagon, ListTodo, Users, Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NOT_AS_PLANNED_REASONS } from '@/lib/constants/task-status'
import {
  getKanbanTasks, updateKanbanTaskStatus,
  type KanbanTask, type KanbanFilters
} from '@/lib/actions/kanban-actions'

// Kanban columns config
const KANBAN_COLUMNS = [
  { status: 'todo', label: 'รอดำเนินการ', icon: ListTodo, color: 'border-gray-300', bg: 'bg-gray-50', headerBg: 'bg-gray-100', text: 'text-gray-700' },
  { status: 'in_progress', label: 'กำลังทำ', icon: Clock, color: 'border-blue-300', bg: 'bg-blue-50/30', headerBg: 'bg-blue-100', text: 'text-blue-700' },
  { status: 'review', label: 'รอ Review', icon: Eye, color: 'border-purple-300', bg: 'bg-purple-50/30', headerBg: 'bg-purple-100', text: 'text-purple-700' },
  { status: 'blocked', label: 'ติดปัญหา', icon: AlertOctagon, color: 'border-red-300', bg: 'bg-red-50/30', headerBg: 'bg-red-100', text: 'text-red-700' },
  { status: 'done', label: 'เสร็จแล้ว', icon: CheckCircle, color: 'border-emerald-300', bg: 'bg-emerald-50/30', headerBg: 'bg-emerald-100', text: 'text-emerald-700' },
]

const priorityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Critical' },
  high: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'High' },
  medium: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Medium' },
  low: { color: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Low' },
}

interface KanbanBoardClientProps {
  initialTasks: KanbanTask[]
  projectOptions: { id: string; code: string; name: string }[]
  employeeOptions: { id: string; name: string; position_code: string }[]
  positionOptions: { code: string; name: string }[]
  currentUser: { id: string; employeeId?: string; name: string }
}

export function KanbanBoardClient({
  initialTasks, projectOptions, employeeOptions, positionOptions, currentUser
}: KanbanBoardClientProps) {
  const [isPending, startTransition] = useTransition()
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null)
  const [showReasonModal, setShowReasonModal] = useState<{ taskId: string; fromStatus: string } | null>(null)
  const [selectedReason, setSelectedReason] = useState('')

  // Find current user in employee list
  const currentEmpId = currentUser.employeeId || currentUser.id
  const currentEmp = employeeOptions.find(e => e.id === currentEmpId)

  // Filters - default to current logged-in user
  const [selectedProject, setSelectedProject] = useState<Option>({ value: 'all', label: 'ทุกโครงการ' })
  const [selectedEmployee, setSelectedEmployee] = useState<Option>(
    currentEmp
      ? { value: currentEmp.id, label: `${currentEmp.name} (${currentEmp.position_code})` }
      : { value: 'all', label: 'ทุกคน' }
  )
  const [selectedPosition, setSelectedPosition] = useState<Option>({ value: 'all', label: 'ทุกตำแหน่ง' })
  const today = new Date().toISOString().split('T')[0]
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, KanbanTask[]> = {}
    KANBAN_COLUMNS.forEach(col => { grouped[col.status] = [] })
    tasks.forEach(task => {
      const col = task.status === 'done_not_planned' ? 'done' : task.status
      if (grouped[col]) grouped[col].push(task)
    })
    return grouped
  }, [tasks])

  const projectOpts: Option[] = useMemo(() => [
    { value: 'all', label: 'ทุกโครงการ' },
    ...projectOptions.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))
  ], [projectOptions])

  const employeeOpts: Option[] = useMemo(() => [
    { value: 'all', label: 'ทุกคน' },
    ...employeeOptions.map(e => ({ value: e.id, label: `${e.name} (${e.position_code})` }))
  ], [employeeOptions])

  const positionOpts: Option[] = useMemo(() => [
    { value: 'all', label: 'ทุกตำแหน่ง' },
    ...positionOptions.map(p => ({ value: p.code, label: p.name }))
  ], [positionOptions])

  const buildFilters = useCallback((overrides?: Partial<{
    projectId: string; assigneeId: string; positionCode: string; dateFrom: string; dateTo: string
  }>): KanbanFilters => ({
    projectId: overrides?.projectId ?? String(selectedProject.value),
    assigneeId: overrides?.assigneeId ?? String(selectedEmployee.value),
    positionCode: overrides?.positionCode ?? String(selectedPosition.value),
    dateFrom: overrides?.dateFrom ?? (dateFrom || undefined),
    dateTo: overrides?.dateTo ?? (dateTo || undefined),
  }), [selectedProject, selectedEmployee, selectedPosition, dateFrom, dateTo])

  const refreshData = useCallback((overrides?: Parameters<typeof buildFilters>[0]) => {
    startTransition(async () => {
      const f = buildFilters(overrides)
      const newTasks = await getKanbanTasks(f)
      setTasks(newTasks)
    })
  }, [buildFilters])

  const handleProjectChange = (o: Option | null) => {
    if (!o) return
    setSelectedProject(o)
    refreshData({ projectId: String(o.value) })
  }

  const handleEmployeeChange = (o: Option | null) => {
    if (!o) return
    setSelectedEmployee(o)
    refreshData({ assigneeId: String(o.value) })
  }

  const handlePositionChange = (o: Option | null) => {
    if (!o) return
    setSelectedPosition(o)
    // When changing position, reset employee to 'all'
    setSelectedEmployee({ value: 'all', label: 'ทุกคน' })
    refreshData({ positionCode: String(o.value), assigneeId: 'all' })
  }

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    if (type === 'from') {
      setDateFrom(value)
      refreshData({ dateFrom: value || undefined })
    } else {
      setDateTo(value)
      refreshData({ dateTo: value || undefined })
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = String(active.id)
    const newStatus = String(over.id)
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const currentStatus = task.status === 'done_not_planned' ? 'done' : task.status
    if (currentStatus === newStatus) return

    // Optimistic update + server call
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    startTransition(async () => {
      const result = await updateKanbanTaskStatus(taskId, newStatus)
      if (!result.success) refreshData()
    })
  }

  const handleReasonSubmit = () => {
    if (!showReasonModal || !selectedReason) return
    const { taskId } = showReasonModal
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done_not_planned' } : t))
    startTransition(async () => {
      await updateKanbanTaskStatus(taskId, 'done_not_planned', selectedReason)
    })
    setShowReasonModal(null)
    setSelectedReason('')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutGrid className="h-7 w-7" />
              Kanban Board
            </h1>
            <p className="text-violet-200 mt-1">บอร์ดบริหารงาน — ลากย้ายเพื่อเปลี่ยนสถานะ</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refreshData()} disabled={isPending}
            className="text-white border-white/30 hover:bg-white/20 bg-white/10">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 flex-wrap mt-4">
          <div className="w-40">
            <SmartCombobox options={positionOpts} value={selectedPosition}
              onChange={handlePositionChange} placeholder="ตำแหน่ง..." />
          </div>
          <div className="w-52">
            <SmartCombobox options={employeeOpts} value={selectedEmployee}
              onChange={handleEmployeeChange} placeholder="คน..." />
          </div>
          <div className="w-52">
            <SmartCombobox options={projectOpts} value={selectedProject}
              onChange={handleProjectChange} placeholder="โครงการ..." />
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-violet-200">วันที่</span>
            <input type="date" value={dateFrom} onChange={e => handleDateChange('from', e.target.value)}
              className="rounded-md px-2 py-1.5 text-sm text-gray-800 border-0 bg-white/90 focus:ring-2 focus:ring-violet-300" />
            <span className="text-violet-200">ถึง</span>
            <input type="date" value={dateTo} onChange={e => handleDateChange('to', e.target.value)}
              className="rounded-md px-2 py-1.5 text-sm text-gray-800 border-0 bg-white/90 focus:ring-2 focus:ring-violet-300" />
          </div>
        </div>
      </div>

      {/* Board */}
      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
          {KANBAN_COLUMNS.map(col => (
            <KanbanColumn
              key={col.status}
              column={col}
              tasks={tasksByStatus[col.status] || []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Reason Modal for done_not_planned */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="font-bold text-lg mb-4">เหตุผลที่เสร็จไม่ตามแผน</h3>
            <div className="space-y-2">
              {NOT_AS_PLANNED_REASONS.map(r => (
                <label key={r.value} className={cn(
                  'flex items-center gap-2 p-2 rounded cursor-pointer border',
                  selectedReason === r.value ? 'bg-amber-50 border-amber-300' : 'border-gray-200 hover:bg-gray-50'
                )}>
                  <input type="radio" name="reason" value={r.value}
                    checked={selectedReason === r.value}
                    onChange={() => setSelectedReason(r.value)} />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setShowReasonModal(null); setSelectedReason(''); refreshData() }}>
                ยกเลิก
              </Button>
              <Button onClick={handleReasonSubmit} disabled={!selectedReason}
                className="bg-amber-500 hover:bg-amber-600">
                ยืนยัน
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Column Component
function KanbanColumn({ column, tasks }: {
  column: typeof KANBAN_COLUMNS[number]
  tasks: KanbanTask[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status })
  const Icon = column.icon

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-72 rounded-xl border-2 flex flex-col transition-all',
        column.color, column.bg,
        isOver && 'ring-2 ring-offset-2 ring-violet-400 scale-[1.01]'
      )}
    >
      <div className={cn('p-3 rounded-t-lg flex items-center justify-between', column.headerBg)}>
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', column.text)} />
          <span className={cn('font-semibold text-sm', column.text)}>{column.label}</span>
        </div>
        <Badge variant="outline" className={cn('text-xs', column.text)}>
          {tasks.length}
        </Badge>
      </div>

      <div className="p-2 flex-1 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 52px)' }}>
        {tasks.map(task => (
          <DraggableTaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-xs">ไม่มีงาน</div>
        )}
      </div>
    </div>
  )
}

// Draggable Task Card
function DraggableTaskCard({ task }: { task: KanbanTask }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task }
  })

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={cn(isDragging && 'opacity-30')}>
      <TaskCard task={task} />
    </div>
  )
}

// Task Card
function TaskCard({ task, isDragging }: { task: KanbanTask; isDragging?: boolean }) {
  const prio = priorityConfig[task.priority] || priorityConfig.medium

  return (
    <div className={cn(
      'bg-white rounded-lg border p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md',
      isDragging && 'shadow-lg ring-2 ring-violet-400 rotate-2',
      task.is_overdue && 'border-l-4 border-l-red-400'
    )}>
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[10px] text-gray-500 font-mono truncate">{task.project_code}</span>
        <Badge className={cn('text-[10px] px-1 py-0', prio.color)}>{prio.label}</Badge>
      </div>

      <p className="text-sm font-medium leading-snug mb-1.5 line-clamp-2">{task.title}</p>

      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] font-mono text-gray-400">{task.task_code}</span>
        {task.task_type_name && task.task_type_name !== '-' && (
          <Badge className="text-[10px] px-1 py-0" style={{
            backgroundColor: task.task_type_color + '20',
            color: task.task_type_color,
          }}>
            {task.task_type_name}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <div className="flex items-center gap-1 truncate">
          <Users className="h-3 w-3" />
          <span className="truncate">{task.assignee_nickname || task.assignee_name || 'Unassigned'}</span>
        </div>
        {task.due_date && (
          <div className={cn('flex items-center gap-0.5',
            task.is_overdue ? 'text-red-500 font-medium' : task.days_until_due !== null && task.days_until_due <= 3 ? 'text-orange-500' : ''
          )}>
            <Calendar className="h-3 w-3" />
            <span>{task.due_date}</span>
            {task.is_overdue && <AlertTriangle className="h-3 w-3" />}
          </div>
        )}
      </div>

      {(task.estimated_hours > 0 || task.checklist_total > 0) && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
          {task.estimated_hours > 0 && <span>{task.actual_hours}/{task.estimated_hours}h</span>}
          {task.checklist_total > 0 && <span>✓ {task.checklist_completed}/{task.checklist_total}</span>}
        </div>
      )}
    </div>
  )
}
