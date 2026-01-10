'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GanttData, GanttTask, updateGanttTaskDates, updateGanttTaskProgress } from '@/lib/actions/gantt-actions'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'

export type ZoomLevel = 'day' | 'month'

interface GanttChartProps {
  data: GanttData
  zoom: ZoomLevel
  readOnly?: boolean
  onTaskClick?: (task: GanttTask) => void
  onTaskDblClick?: (task: GanttTask) => void
  onContextMenu?: (task: GanttTask, position: { x: number; y: number }) => void
  onDataChange?: () => void
  onAddStory?: (projectId: string, milestoneId?: string) => void
  onAddTask?: (storyId: string) => void
  onRefresh?: () => void
  // Keeping these optional for compatibility if parent doesn't pass them yet
  currentUser?: any
  projectId?: string
  zoomLevel?: any // legacy prop just in case
}

export function GanttChart({
  data,
  zoom,
  readOnly,
  onTaskClick,
  onTaskDblClick,
  onContextMenu,
  onDataChange,
  onAddStory,
  onAddTask
}: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ganttInstanceRef = useRef<any>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const currentDateRef = useRef<Date>(new Date()) // เก็บวันที่ปัจจุบันที่กำลังแสดง

  // Store callbacks in refs
  const callbacksRef = useRef({
    onTaskClick,
    onTaskDblClick,
    onContextMenu,
    onDataChange,
    onAddStory,
    onAddTask,
    readOnly
  })

  // Helper to get columns
  const getColumns = (isReadOnly: boolean) => {
    const columns = [
      { name: 'text', label: 'Task', tree: true, width: 280, resize: true },
      {
        name: 'start_date', label: 'Start', width: 85, align: 'center',
        template: (task: any) => {
          if (!task.start_date || task.unscheduled) return '-'
          const d = new Date(task.start_date)
          return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
        }
      },
      {
        name: 'duration', label: 'Days', width: 50, align: 'center',
        template: (task: any) => {
          if (task.type === 'milestone') return '-'
          return task.duration || '-'
        }
      },
      {
        name: 'progress', label: '%', width: 50, align: 'center',
        template: (task: any) => Math.round((task.progress || 0) * 100) + '%'
      }
    ]

    if (!isReadOnly) {
      columns.push({ name: 'add', label: '+', width: 40, align: 'center', template: (obj: any) => '+' })
    }
    return columns
  }

  // Update callback refs and config
  useEffect(() => {
    callbacksRef.current = {
      onTaskClick,
      onTaskDblClick,
      onContextMenu,
      onDataChange,
      onAddStory,
      onAddTask,
      readOnly
    }

    // Update readonly and columns dynamically if initialized
    if (ganttInstanceRef.current) {
      ganttInstanceRef.current.config.readonly = !!readOnly
      ganttInstanceRef.current.config.columns = getColumns(!!readOnly)
      ganttInstanceRef.current.render()
    }
  }, [onTaskClick, onTaskDblClick, onContextMenu, onDataChange, onAddStory, onAddTask, readOnly])

  // ============================================
  // Initialize Gantt (runs once)
  // ============================================
  useEffect(() => {
    let isMounted = true

    const initGantt = async () => {
      if (!containerRef.current) return

      try {
        const ganttModule = await import('dhtmlx-gantt')

        const gantt = ganttModule.gantt || ganttModule.default

        if (!isMounted) return

        ganttInstanceRef.current = gantt

        // ============================================
        // CONFIGURATION
        // ============================================

        gantt.config.date_format = '%Y-%m-%d'
        gantt.config.xml_date = '%Y-%m-%d'

        // Columns
        // Columns
        gantt.config.columns = getColumns(!!readOnly)

        // Layout
        gantt.config.row_height = 32
        gantt.config.bar_height = 20
        gantt.config.scale_height = 50
        gantt.config.min_column_width = 35

        // Features
        gantt.config.drag_move = true
        gantt.config.drag_resize = true
        gantt.config.drag_progress = true
        gantt.config.drag_links = false
        gantt.config.show_progress = true
        gantt.config.fit_tasks = true
        gantt.config.auto_scheduling = false
        gantt.config.open_tree_initially = true
        gantt.config.preserve_scroll = true
        gantt.config.smart_rendering = true
        gantt.config.details_on_dblclick = false
        gantt.config.touch = true
        gantt.config.readonly = false
        gantt.config.show_tasks_outside_timescale = true // แสดงรายการแม้อยู่นอกช่วงเวลาที่กำลังแสดง

        // Plugins
        gantt.plugins({
          marker: true,
          tooltip: true
        })

        // ============================================
        // TEMPLATES
        // ============================================

        // Task class
        gantt.templates.task_class = (start: Date, end: Date, task: any) => {
          const classes: string[] = []

          if (task.type === 'milestone') classes.push('gantt-milestone')
          if (task.entity_type === 'project') classes.push('gantt-project')
          if (task.entity_type === 'story') classes.push('gantt-story')
          if (task.entity_type === 'task') classes.push('gantt-task-item')

          if (task.status === 'done' || task.status === 'completed') classes.push('gantt-done')
          if (task.status === 'in_progress') classes.push('gantt-in-progress')
          if (task.status === 'blocked') classes.push('gantt-blocked')
          if (task.is_overdue) classes.push('gantt-overdue')

          return classes.join(' ')
        }

        // Grid row class
        gantt.templates.grid_row_class = (start: Date, end: Date, task: any) => {
          const classes: string[] = []
          // ซ่อน dummy tasks
          if (task.id === '__timeline_start__' || task.id === '__timeline_end__') {
            classes.push('gantt-row-hidden')
          }
          if (task.is_overdue) classes.push('gantt-row-overdue')
          if (task.type === 'milestone') classes.push('gantt-row-milestone')
          if (task.entity_type === 'project') classes.push('gantt-row-project')
          return classes.join(' ')
        }

        // Task text inside bar
        gantt.templates.task_text = (start: Date, end: Date, task: any) => {
          if (task.type === 'milestone') return ''
          if (task.assignee_name) {
            return `<span class="gantt-bar-text">${task.assignee_name}</span>`
          }
          return ''
        }

        // Timeline cell class (Weekends) - แสดงสีเทาเฉพาะ Day view
        gantt.templates.timeline_cell_class = (item: any, date: Date) => {
          // ไม่แสดงสีเทาใน Month view
          if (gantt.config.scale_unit === 'month') {
            return ''
          }
          // แสดงสีเทาสำหรับวันเสาร์-อาทิตย์ใน Day view
          if (date.getDay() === 0 || date.getDay() === 6) {
            return 'gantt-weekend'
          }
          return ''
        }

        // Tooltip
        gantt.templates.tooltip_text = (start: Date, end: Date, task: any) => {
          let html = '<div class="gantt-tooltip-box">'
          html += `<div class="font-semibold text-slate-800 mb-2">${task.text}</div>`
          html += `<div class="text-xs space-y-1">`
          html += `<div><span class="text-slate-500">Status:</span> ${task.status || '-'}</div>`
          html += `<div><span class="text-slate-500">Progress:</span> ${Math.round((task.progress || 0) * 100)}%</div>`
          if (task.type !== 'milestone') {
            html += `<div><span class="text-slate-500">Duration:</span> ${task.duration || 0} days</div>`
          }
          if (task.assignee_name) {
            html += `<div><span class="text-slate-500">Assignee:</span> ${task.assignee_name}</div>`
          }
          if (task.is_overdue) {
            html += `<div class="text-red-500 font-semibold mt-1">⚠️ OVERDUE</div>`
          }
          html += '</div></div>'
          return html
        }

        // Event Handlers
        gantt.attachEvent('onBeforeTaskDrag', (id: string, mode: string) => {
          if (callbacksRef.current.readOnly) return false
          return true
        })

        gantt.attachEvent('onTaskClick', (id: string, e: any) => {
          // Handle 'Add' button click in the grid
          const target = e.target as HTMLElement;
          if (target.closest(".gantt_add")) {
            if (callbacksRef.current.readOnly) return false

            const task = gantt.getTask(id)
            if (task.entity_type === 'project' || task.entity_type === 'milestone') {
              const projectId = task.entity_type === 'project' ? task.entity_id : task.project_id
              callbacksRef.current.onAddStory?.(projectId, task.milestone_id || undefined)
            } else if (task.entity_type === 'story') {
              callbacksRef.current.onAddTask?.(task.entity_id)
            }
            return false;
          }

          // Handle normal selection
          const task = gantt.getTask(id)
          callbacksRef.current.onTaskClick?.(task as unknown as GanttTask)
          return true
        })

        gantt.attachEvent('onTaskDblClick', (id: string, e: any) => {
          const task = gantt.getTask(id)
          if (task) {
            callbacksRef.current.onTaskDblClick?.(task as unknown as GanttTask)
          }
          return false
        })

        gantt.attachEvent('onContextMenu', (taskId: string, linkId: string, e: MouseEvent) => {
          if (taskId) {
            e.preventDefault()
            const task = gantt.getTask(taskId)
            callbacksRef.current.onContextMenu?.(task as unknown as GanttTask, { x: e.clientX, y: e.clientY })
            return false
          }
          return true
        })

        gantt.attachEvent('onAfterTaskDrag', async (id: string, mode: string) => {
          const task = gantt.getTask(id)

          if (mode === 'progress') {
            // Handle progress update
            const progress = task.progress || 0
            await updateGanttTaskProgress(id, task.entity_type, progress)
          } else {
            // Handle move/resize
            const startDate = gantt.date.date_to_str('%Y-%m-%d')(task.start_date)
            const endDate = gantt.date.date_to_str('%Y-%m-%d')(task.end_date)
            await updateGanttTaskDates(id, task.entity_type, startDate, endDate)
          }

          callbacksRef.current.onDataChange?.()
        })

        // We use onAfterTaskDrag for drag_progress as well?
        // Mode 'progress'
        // Yes, mode can be "move", "resize", "progress"

        // ============================================
        // TODAY MARKER
        // ============================================

        const today = new Date()
        gantt.addMarker({
          start_date: today,
          css: 'gantt-today-marker',
          text: 'Today'
        })

        // ============================================
        // INITIALIZE
        // ============================================

        gantt.init(containerRef.current)
        setIsInitialized(true)

      } catch (error) {
        console.error('Failed to initialize Gantt:', error)
      }
    }

    initGantt()

    return () => {
      isMounted = false
      if (ganttInstanceRef.current) {
        ganttInstanceRef.current.clearAll()
      }
    }
  }, [])

  // ============================================
  // ZOOM CONFIG
  // ============================================

  const configureZoom = useCallback((level: ZoomLevel) => {
    if (!ganttInstanceRef.current) return

    const gantt = ganttInstanceRef.current
    const today = new Date()

    switch (level) {
      case 'day':
        // Day view: แสดง 7 วัน เริ่มจากวันอาทิตย์ของสัปดาห์ปัจจุบัน
        gantt.config.scale_unit = 'day'
        gantt.config.scales = [
          { unit: 'month', step: 1, date: '%F %Y' },
          { unit: 'day', step: 1, date: '%D %d' }
        ]
        gantt.config.step = 1
        gantt.config.min_column_width = 60
        gantt.config.scale_height = 50

        // หาวันอาทิตย์ของสัปดาห์นี้
        const dayStart = new Date(today)
        const currentDay = dayStart.getDay() // 0 = Sunday, 6 = Saturday
        dayStart.setDate(dayStart.getDate() - currentDay) // ย้อนกลับไปวันอาทิตย์

        const dayEnd = new Date(dayStart)
        dayEnd.setDate(dayEnd.getDate() + 6) // อาทิตย์ + 6 = เสาร์

        gantt.config.start_date = gantt.date.date_part(dayStart)
        gantt.config.end_date = gantt.date.date_part(dayEnd)
        break

      case 'month':
        // Month view: แสดงทั้ง 12 เดือนของปี (แค่ 12 ช่อง ไม่มี subscales)
        gantt.config.scale_unit = 'month'
        gantt.config.scales = [
          { unit: 'month', step: 1, date: '%F %Y' }
        ]
        gantt.config.step = 1
        gantt.config.min_column_width = 80
        gantt.config.scale_height = 50

        // แสดงทั้งปี
        const yearStart = new Date(today.getFullYear(), 0, 1) // 1 ม.ค.
        const yearEnd = new Date(today.getFullYear(), 11, 31) // 31 ธ.ค.
        gantt.config.start_date = gantt.date.date_part(yearStart)
        gantt.config.end_date = gantt.date.date_part(yearEnd)
        break
    }

    gantt.render()
  }, []) // No dependencies needed as it uses ref

  // Apply zoom when it changes
  useEffect(() => {
    if (isInitialized) {
      configureZoom(zoom)
    }
  }, [zoom, isInitialized, configureZoom])

  // ============================================
  // Load/Update Data
  // ============================================
  useEffect(() => {
    const gantt = ganttInstanceRef.current
    if (!gantt || !isInitialized || !data) return

    // แปลง NULL dates เป็นวันที่ปัจจุบัน เพื่อให้รายการไม่หายเมื่อเลื่อนช่วงเวลา
    // แต่เก็บ flag unscheduled เพื่อไม่วาดแท่ง
    const today = new Date().toISOString().split('T')[0]

    const processedData = {
      ...data,
      data: data.data.map(task => {
        // Task/Story ถือว่า unscheduled ถ้า:
        // 1. ไม่มี start_date หรือ end_date (NULL จาก SQL)
        // 2. หรือ duration = 0 (Story ที่ SQL ใช้ COALESCE แล้วแต่ยังไม่มีวันที่จริง)
        const hasNoDate = !task.start_date || !task.end_date
        const isUnscheduled = hasNoDate || (task.duration === 0 && task.entity_type === 'task')

        return {
          ...task,
          start_date: task.start_date || today,
          end_date: task.end_date || today,
          duration: hasNoDate ? 0 : task.duration, // duration = 0 จะไม่วาดแท่ง
          unscheduled: isUnscheduled // flag สำหรับแสดง UI ว่ายังไม่กำหนดวันที่
        }
      })
    }

    gantt.clearAll()
    gantt.parse(processedData)

    // Scroll to today
    setTimeout(() => {
      gantt.showDate(new Date())
    }, 100)
  }, [data, isInitialized])

  // ============================================
  // NAVIGATION - ปรับให้เลื่อนตาม Zoom Level
  // ============================================

  useEffect(() => {
    if (!ganttInstanceRef.current || !isInitialized) return

    const gantt = ganttInstanceRef.current

    // Scroll Previous - เลื่อนถอยหลัง
    ; (window as any).__ganttScrollPrev = () => {
      if (zoom === 'day') {
        // Day view: ถอยหลัง 7 วัน (ไปสัปดาห์ก่อนหน้า อาทิตย์-เสาร์)
        const state = gantt.getState()
        const newStart = new Date(state.min_date)
        newStart.setDate(newStart.getDate() - 7)
        const newEnd = new Date(newStart)
        newEnd.setDate(newEnd.getDate() + 6)
        gantt.config.start_date = gantt.date.date_part(newStart)
        gantt.config.end_date = gantt.date.date_part(newEnd)
        gantt.render()
      } else {
        // Month view: ถอยหลัง 1 ปี
        const state = gantt.getState()
        const currentStart = new Date(state.min_date)
        const prevYear = currentStart.getFullYear() - 1
        const yearStart = new Date(prevYear, 0, 1)
        const yearEnd = new Date(prevYear, 11, 31)
        gantt.config.start_date = gantt.date.date_part(yearStart)
        gantt.config.end_date = gantt.date.date_part(yearEnd)
        gantt.render()
      }
    }

    // Scroll Next - เลื่อนไปข้างหน้า
    ; (window as any).__ganttScrollNext = () => {
      if (zoom === 'day') {
        // Day view: เลื่อนไป 7 วัน (ไปสัปดาห์ถัดไป อาทิตย์-เสาร์)
        const state = gantt.getState()
        const newStart = new Date(state.min_date)
        newStart.setDate(newStart.getDate() + 7)
        const newEnd = new Date(newStart)
        newEnd.setDate(newEnd.getDate() + 6)
        gantt.config.start_date = gantt.date.date_part(newStart)
        gantt.config.end_date = gantt.date.date_part(newEnd)
        gantt.render()
      } else {
        // Month view: เลื่อนไป 1 ปี
        const state = gantt.getState()
        const currentStart = new Date(state.min_date)
        const nextYear = currentStart.getFullYear() + 1
        const yearStart = new Date(nextYear, 0, 1)
        const yearEnd = new Date(nextYear, 11, 31)
        gantt.config.start_date = gantt.date.date_part(yearStart)
        gantt.config.end_date = gantt.date.date_part(yearEnd)
        gantt.render()
      }
    }

    // Scroll to Today - กลับไปที่วันนี้ตาม zoom level
    ; (window as any).__ganttScrollToToday = () => {
      const today = new Date()

      if (zoom === 'day') {
        // Day view: แสดง 7 วัน เริ่มจากวันอาทิตย์ของสัปดาห์ปัจจุบัน
        const dayStart = new Date(today)
        const currentDay = dayStart.getDay()
        dayStart.setDate(dayStart.getDate() - currentDay)
        const dayEnd = new Date(dayStart)
        dayEnd.setDate(dayEnd.getDate() + 6)
        gantt.config.start_date = gantt.date.date_part(dayStart)
        gantt.config.end_date = gantt.date.date_part(dayEnd)
        gantt.render()
      } else {
        // Month view: แสดงทั้งปีนี้
        const yearStart = new Date(today.getFullYear(), 0, 1)
        const yearEnd = new Date(today.getFullYear(), 11, 31)
        gantt.config.start_date = gantt.date.date_part(yearStart)
        gantt.config.end_date = gantt.date.date_part(yearEnd)
        gantt.render()
      }
    }

    return () => {
      delete (window as any).__ganttScrollPrev
      delete (window as any).__ganttScrollNext
      delete (window as any).__ganttScrollToToday
    }
  }, [zoom, isInitialized, configureZoom])

  return (
    <>
      <style jsx global>{`
        /* ============================================ */
        /* WEEKEND STYLE                               */
        /* ============================================ */
        
        .gantt_task_cell.gantt-weekend {
          background-color: #e2e8f0 !important;
          border-left: 1px solid #cbd5e1;
        }

        /* ============================================ */
        /* GANTT BASE STYLES                           */
        /* ============================================ */
        
        .gantt_container {
          font-family: inherit !important;
          border: none !important;
          background: #fff !important;
        }
        
        /* Grid Header */
        .gantt_grid_head_cell {
          font-weight: 600 !important;
          font-size: 12px !important;
          background: #f8fafc !important;
          color: #475569 !important;
          border-color: #e2e8f0 !important;
        }
        
        /* Scale Header */
        .gantt_scale_cell {
          font-weight: 500 !important;
          font-size: 11px !important;
          background: #f1f5f9 !important;
          color: #64748b !important;
          border-color: #e2e8f0 !important;
        }
        
        /* Grid Rows */
        .gantt_row, .gantt_row.odd {
          background: #fff !important;
          border-color: #f1f5f9 !important;
        }
        .gantt_row:hover, .gantt_row.odd:hover {
          background: #f8fafc !important;
        }
        .gantt_row.gantt-row-project {
          background: #eff6ff !important;
          font-weight: 600;
        }
        .gantt_row.gantt-row-milestone {
          background: #faf5ff !important;
        }
        .gantt_row.gantt-row-overdue {
          background: #fef2f2 !important;
        }
        
        /* Grid cells */
        .gantt_cell {
          border-color: #f1f5f9 !important;
          font-size: 12px !important;
        }
        
        /* Tree content */
        .gantt_tree_content {
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 12px;
        }
        
        /* ============================================ */
        /* TASK BARS                                   */
        /* ============================================ */
        
        .gantt_task_line {
          border-radius: 12px !important; /* Pill shape */
          border: none !important;
          box-shadow: 0 2px 5px rgba(0,0,0,0.08) !important;
          transition: all 0.2s;
        }
        .gantt_task_line:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.12) !important;
          transform: translateY(-1px);
        }
        
        /* Project bar - Premium Indigo */
        .gantt_task_line.gantt-project {
          background: linear-gradient(135deg, #4f46e5, #6366f1) !important;
        }
        
        /* Story bar - Modern Blue */
        .gantt_task_line.gantt-story {
          background: linear-gradient(135deg, #2563eb, #3b82f6) !important;
        }
        
        /* Task bar - Soft Sky */
        .gantt_task_line.gantt-task-item {
          background: linear-gradient(135deg, #0ea5e9, #38bdf8) !important;
        }
        
        /* Status colors override - keep shape but use semantic colors if needed, 
           or maybe keep the blue theme and use indicators? 
           Let's stick to the blue theme for type hierarchy as requested for "Beauty". 
           We will let status change just the border or indicator if needed, 
           but currently the code overrides with status colors. 
           Let's make sure status colors are also "Modern" if they apply.
        */
        .gantt_task_line.gantt-done {
          background: linear-gradient(135deg, #059669, #10b981) !important; /* Emerald */
          opacity: 0.8;
        }
        .gantt_task_line.gantt-overdue {
          background: linear-gradient(135deg, #dc2626, #ef4444) !important;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.4) !important;
        }

        /* Progress Bar - Soft Overlay */
        .gantt_task_progress {
          background: rgba(255, 255, 255, 0.3) !important;
          border-radius: 12px !important;
          box-shadow: none !important;
          border-right: 1px solid rgba(255,255,255,0.4);
        }
        
        /* Text inside bar */
        .gantt-bar-text {
          font-size: 10px !important;
          color: white !important;
          padding: 0 6px !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        
        /* ============================================ */
        /* TODAY MARKER                                */
        /* ============================================ */
        
        .gantt-today-marker {
          background: #ef4444 !important;
          width: 2px !important;
        }
        .gantt-today-marker .gantt_marker_content {
          background: #ef4444 !important;
          color: white !important;
          padding: 3px 10px !important;
          border-radius: 4px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3) !important;
        }
        
        /* ============================================ */
        /* TOOLTIP                                     */
        /* ============================================ */
        
        .gantt_tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          padding: 0 !important;
          font-family: inherit !important;
          max-width: 280px !important;
        }
        
        .gantt-tooltip-box {
          padding: 12px 14px;
        }
        
        /* ============================================ */
        /* SCROLLBAR                                   */
        /* ============================================ */
        
        .gantt_hor_scroll::-webkit-scrollbar,
        .gantt_ver_scroll::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .gantt_hor_scroll::-webkit-scrollbar-track,
        .gantt_ver_scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .gantt_hor_scroll::-webkit-scrollbar-thumb,
        .gantt_ver_scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .gantt_hor_scroll::-webkit-scrollbar-thumb:hover,
        .gantt_ver_scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        /* ============================================ */
        /* ADD BUTTON COLUMN                           */
        /* ============================================ */

        .gantt_add {
          opacity: 0.5;
          transition: opacity 0.2s;
          cursor: pointer;
        }
        .gantt_row:hover .gantt_add {
          opacity: 1;
        }

        /* ============================================ */
        /* HIDE DUMMY TIMELINE TASKS                   */
        /* ============================================ */

        .gantt-row-hidden {
          display: none !important;
        }
      `}</style>

      <div
        ref={containerRef}
        style={{ width: '100%', height: '600px' }}
      />
    </>
  )
}
