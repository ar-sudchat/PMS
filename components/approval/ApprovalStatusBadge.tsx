'use client'

import { Clock, CheckCircle2, XCircle, FileEdit, Send } from 'lucide-react'

export type ApprovalStatus = 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

interface ApprovalStatusBadgeProps {
    status: ApprovalStatus | string
    size?: 'sm' | 'md' | 'lg'
    showIcon?: boolean
}

const statusConfig: Record<string, {
    label: string
    bgColor: string
    textColor: string
    icon: React.ReactNode
}> = {
    DRAFT: {
        label: 'Draft',
        bgColor: 'bg-slate-100',
        textColor: 'text-slate-600',
        icon: <FileEdit size={14} />
    },
    PENDING: {
        label: 'Pending',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        icon: <Clock size={14} />
    },
    IN_PROGRESS: {
        label: 'In Progress',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        icon: <Send size={14} />
    },
    APPROVED: {
        label: 'Approved',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        icon: <CheckCircle2 size={14} />
    },
    REJECTED: {
        label: 'Rejected',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        icon: <XCircle size={14} />
    },
    CANCELLED: {
        label: 'Cancelled',
        bgColor: 'bg-slate-200',
        textColor: 'text-slate-500',
        icon: <XCircle size={14} />
    }
}

const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
}

export function ApprovalStatusBadge({
    status,
    size = 'md',
    showIcon = true
}: ApprovalStatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.DRAFT

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
        >
            {showIcon && config.icon}
            {config.label}
        </span>
    )
}

// Helper function to get status label in Thai
export function getStatusLabelThai(status: ApprovalStatus | string): string {
    const labels: Record<string, string> = {
        DRAFT: 'ฉบับร่าง',
        PENDING: 'รออนุมัติ',
        IN_PROGRESS: 'กำลังดำเนินการ',
        APPROVED: 'อนุมัติแล้ว',
        REJECTED: 'ปฏิเสธ',
        CANCELLED: 'ยกเลิก'
    }
    return labels[status] || status
}
