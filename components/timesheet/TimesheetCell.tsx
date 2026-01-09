'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimesheetCellProps {
  entries: any[]
  totalHours: number
  date: string
  employeeId: string
  onAddClick?: () => void
}

const typeColors: Record<string, string> = {
  dev: 'border-l-blue-500 bg-blue-50',
  bug: 'border-l-red-500 bg-red-50',
  rework: 'border-l-amber-500 bg-amber-50',
  doc: 'border-l-purple-500 bg-purple-50',
  test: 'border-l-green-500 bg-green-50',
  meeting: 'border-l-indigo-500 bg-indigo-50',
  support: 'border-l-pink-500 bg-pink-50'
}

const typeIcons: Record<string, string> = {
  dev: '🔧',
  bug: '🐛',
  rework: '🔄',
  doc: '📄',
  test: '🧪',
  meeting: '📋',
  support: '💬'
}

export function TimesheetCell({ entries, totalHours, date, employeeId, onAddClick }: TimesheetCellProps) {
  if (entries.length === 0) {
    return (
      <div className="min-h-[60px] p-1">
        <button
          onClick={onAddClick}
          className="w-full h-full rounded bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors group"
        >
          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    )
  }
  
  return (
    <div className="min-h-[60px] p-1 space-y-1">
      {entries.map((entry: any, idx: number) => (
        <div
          key={entry.id || idx}
          className={cn(
            "px-2 py-1 rounded text-xs border-l-2 cursor-pointer hover:shadow-sm transition-shadow",
            typeColors[entry.task_type] || 'border-l-slate-500 bg-slate-50'
          )}
          title={`${entry.project_code} > ${entry.story_code} > ${entry.task_code}\n${entry.description || entry.task_title}\nMilestone: ${entry.milestone_name || '-'}`}
        >
          <div className="flex items-start justify-between gap-1">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {entry.description || entry.task_title}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {entry.project_code}
              </div>
            </div>
            <span className="shrink-0 font-medium">
              {entry.hours}h
            </span>
          </div>
          
          <div className="flex items-center justify-between mt-0.5 text-[10px] text-slate-500">
            <span>{typeIcons[entry.task_type]} {entry.task_type_name}</span>
            {entry.milestone_code && (
              <span>M: {entry.milestone_code}</span>
            )}
          </div>
        </div>
      ))}
      
      {entries.length > 1 && (
        <div className="text-[10px] text-center text-slate-500 font-medium">
          Total: {totalHours}h
        </div>
      )}
    </div>
  )
}
