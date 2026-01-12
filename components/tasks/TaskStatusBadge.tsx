'use client'

import { getTaskStatusConfig } from '@/lib/constants/task-status'

interface TaskStatusBadgeProps {
  status: string
  showIcon?: boolean
  size?: 'sm' | 'md'
}

export function TaskStatusBadge({ status, showIcon = true, size = 'md' }: TaskStatusBadgeProps) {
  const config = getTaskStatusConfig(status)

  if (!config) {
    return <span className="text-slate-500">{status}</span>
  }

  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-xs'
    : 'px-2 py-1 text-xs'

  // Icons for different statuses
  const getIcon = () => {
    if (!showIcon) return null
    switch (status) {
      case 'done':
        return <span className="mr-1">✅</span>
      case 'done_not_planned':
        return <span className="mr-1">⚠️</span>
      case 'in_progress':
        return <span className="mr-1">🔄</span>
      case 'review':
        return <span className="mr-1">👀</span>
      case 'blocked':
        return <span className="mr-1">🚫</span>
      case 'cancelled':
        return <span className="mr-1">❌</span>
      default:
        return null
    }
  }

  return (
    <span
      className={`inline-flex items-center rounded font-medium ${sizeClasses}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color
      }}
    >
      {getIcon()}
      {config.label}
    </span>
  )
}
