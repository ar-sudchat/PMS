'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GanttData, GanttTask, updateGanttTaskDates, updateGanttTaskProgress } from '@/lib/actions/gantt-actions'

export type ZoomLevel = 'day' | 'week' | 'month'

interface GanttChartProps {
  data: GanttData
  zoom: ZoomLevel
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

  // Store callbacks in refs
  const callbacksRef = useRef({
    onTaskClick,
    onTaskDblClick,
    onContextMenu,
    onDataChange,
    onAddStory,
    onAddTask
  })

  // Update callback refs
  useEffect(() => {
    callbacksRef.current = {
      onTaskClick,
      onTaskDblClick,
      onContextMenu,
      onDataChange,
      onAddStory,
      onAddTask
    }
  }, [onTaskClick, onTaskDblClick, onContextMenu, onDataChange, onAddStory, onAddTask])

  // ============================================
  // Initialize Gantt (runs once)
  // ============================================
  useEffect(() => {
    let isMounted = true

    const initGantt = async () => {
      if (!containerRef.current) return

      try {
        // Dynamic import
        const ganttModule = await import('dhtmlx-gantt')
        await import('dhtmlx-gantt/codebase/dhtmlxgantt.css')

        const gantt = ganttModule.gantt || ganttModule.default

        if (!isMounted) return

        ganttInstanceRef.current = gantt

        // ============================================
        // CONFIGURATION
        // ============================================

        gantt.config.date_format = '%Y-%m-%d'
        gantt.config.xml_date = '%Y-%m-%d'

        // Columns
        gantt.config.columns = [
          {
            name: 'text',
            label: 'Task',
            tree: true,
            width: 280,
            resize: true
          },
          {
            name: 'start_date',
            label: 'Start',
            width: 85,
            align: 'center',
            template: (task: any) => {
              if (!task.start_date) return '-'
              const d = new Date(task.start_date)
              return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
            }
          },
          {
            name: 'duration',
            label: 'Days',
            width: 50,
            align: 'center',
            template: (task: any) => {
              if (task.type === 'milestone') return '-'
              return task.duration || '-'
            }
          },
          {
            name: 'progress',
            label: '%',
            width: 50,
            align: 'center',
            template: (task: any) => Math.round((task.progress || 0) * 100) + '%'
          },
          {
            name: 'add',
            label: '+',
            width: 40,
            align: 'center'
          }
        ]

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
        gantt.attachEvent('onTaskClick', (id: string, e: any) => {
          // Handle 'Add' button click in the grid
          const target = e.target as HTMLElement;
          if (target.closest(".gantt_add")) {
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
            await updateGanttTaskProgress(id, progress)
          } else {
            // Handle move/resize
            const startDate = gantt.date.date_to_str('%Y-%m-%d')(task.start_date)
            const endDate = gantt.date.date_to_str('%Y-%m-%d')(task.end_date)
            await updateGanttTaskDates(id, startDate, endDate)
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
  // Apply Zoom Level
  // ============================================
  useEffect(() => {
    const gantt = ganttInstanceRef.current
    if (!gantt || !isInitialized) return

    switch (zoom) {
      case 'day':
        gantt.config.scales = [
          { unit: 'month', step: 1, date: '%F %Y' },
          { unit: 'day', step: 1, date: '%D %d' }
        ]
        gantt.config.min_column_width = 50
        gantt.config.scale_height = 50
        break

      case 'week':
        gantt.config.scales = [
          { unit: 'month', step: 1, date: '%F %Y' },
          { unit: 'week', step: 1, date: 'Week %W' },
          { unit: 'day', step: 1, date: '%d' }
        ]
        gantt.config.min_column_width = 30
        gantt.config.scale_height = 50
        break

      case 'month':
        gantt.config.scales = [
          { unit: 'year', step: 1, date: '%Y' },
          { unit: 'month', step: 1, date: '%F' }
        ]
        gantt.config.min_column_width = 50
        gantt.config.scale_height = 50
        break
    }

    gantt.render()
  }, [zoom, isInitialized])

  // ============================================
  // Load/Update Data
  // ============================================
  useEffect(() => {
    const gantt = ganttInstanceRef.current
    if (!gantt || !isInitialized || !data) return

    gantt.clearAll()
    gantt.parse(data)

    // Scroll to today
    setTimeout(() => {
      gantt.showDate(new Date())
    }, 100)
  }, [data, isInitialized])

  // ============================================
  // Navigation Methods (Exposed via Window)
  // ============================================
  const scrollToToday = useCallback(() => {
    const gantt = ganttInstanceRef.current
    if (gantt) {
      gantt.showDate(new Date())
    }
  }, [])

  const scrollPrev = useCallback(() => {
    const gantt = ganttInstanceRef.current
    if (!gantt) return

    const state = gantt.getState()
    let newDate: Date

    switch (zoom) {
      case 'day':
        newDate = gantt.date.add(state.min_date, -7, 'day')
        break
      case 'week':
        newDate = gantt.date.add(state.min_date, -4, 'week')
        break
      case 'month':
        newDate = gantt.date.add(state.min_date, -3, 'month')
        break
      default:
        newDate = gantt.date.add(state.min_date, -7, 'day')
    }

    gantt.showDate(newDate)
  }, [zoom])

  const scrollNext = useCallback(() => {
    const gantt = ganttInstanceRef.current
    if (!gantt) return

    const state = gantt.getState()
    let newDate: Date

    switch (zoom) {
      case 'day':
        newDate = gantt.date.add(state.min_date, 7, 'day')
        break
      case 'week':
        newDate = gantt.date.add(state.min_date, 4, 'week')
        break
      case 'month':
        newDate = gantt.date.add(state.min_date, 3, 'month')
        break
      default:
        newDate = gantt.date.add(state.min_date, 7, 'day')
    }

    gantt.showDate(newDate)
  }, [zoom])

  // Expose methods via window
  useEffect(() => {
    const w = window as any
    w.__ganttScrollToToday = scrollToToday
    w.__ganttScrollPrev = scrollPrev
    w.__ganttScrollNext = scrollNext

    return () => {
      delete w.__ganttScrollToToday
      delete w.__ganttScrollPrev
      delete w.__ganttScrollNext
    }
  }, [scrollToToday, scrollPrev, scrollNext])

  return (
    <>
      <style jsx global>{`
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
          border-radius: 4px !important;
          border: none !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
        }
        
        /* Project bar */
        .gantt_task_line.gantt-project {
          background: linear-gradient(135deg, #1e40af, #3b82f6) !important;
        }
        
        /* Story bar */
        .gantt_task_line.gantt-story {
          background: linear-gradient(135deg, #3b82f6, #60a5fa) !important;
        }
        
        /* Task bar */
        .gantt_task_line.gantt-task-item {
          background: linear-gradient(135deg, #60a5fa, #93c5fd) !important;
        }
        
        /* Status colors */
        .gantt_task_line.gantt-done {
          background: linear-gradient(135deg, #16a34a, #22c55e) !important;
        }
        .gantt_task_line.gantt-in-progress {
          background: linear-gradient(135deg, #d97706, #f59e0b) !important;
        }
        .gantt_task_line.gantt-blocked {
          background: linear-gradient(135deg, #dc2626, #ef4444) !important;
        }
        .gantt_task_line.gantt-overdue {
          background: linear-gradient(135deg, #dc2626, #ef4444) !important;
          animation: pulse-red 2s infinite;
        }
        
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
        }
        
        /* ============================================ */
        /* MILESTONE DIAMOND                           */
        /* ============================================ */
        
        .gantt_task_line.gantt-milestone {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          width: 0 !important;
          height: 0 !important;
          margin-left: -10px !important;
          overflow: visible !important;
        }
        
        .gantt_task_line.gantt-milestone .gantt_task_content {
          background: linear-gradient(135deg, #7c3aed, #8b5cf6) !important;
          width: 18px !important;
          height: 18px !important;
          transform: rotate(45deg) !important;
          border-radius: 3px !important;
          margin-top: 3px !important;
          margin-left: 1px !important;
          box-shadow: 0 2px 4px rgba(124, 58, 237, 0.3) !important;
        }
        
        .gantt_task_line.gantt-milestone.gantt-done .gantt_task_content {
          background: linear-gradient(135deg, #16a34a, #22c55e) !important;
          box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3) !important;
        }
        
        .gantt_task_line.gantt-milestone .gantt_task_progress {
          display: none !important;
        }
        
        /* ============================================ */
        /* PROGRESS BAR                                */
        /* ============================================ */
        
        .gantt_task_progress {
          background: rgba(0,0,0,0.15) !important;
          border-radius: 4px !important;
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
      `}</style>

      <div
        ref={containerRef}
        style={{ width: '100%', height: '600px' }}
      />
    </>
  )
}
