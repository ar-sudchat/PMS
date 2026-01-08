// app/(main)/activities/page.tsx
"use client";

import * as React from "react";
import {
    Bell,
    Check,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Calendar,
    Clock,
    Target,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    XCircle,
    User,
    Users,
    ArrowRight,
    MessageSquare,
    FileText,
    Zap,
    Plus,
    Filter,
} from "lucide-react";

// ============================================
// Types
// ============================================

interface ActivityNotification {
    id: string;
    type: 'task_reassigned' | 'timeline_changed' | 'resource_changed' | 'risk_alert' | 'deadline_approaching';
    title: string;
    message: string;
    task_title?: string;
    activity_name?: string;
    triggered_by_name: string;
    triggered_at: string;
    is_read: boolean;
    is_acknowledged: boolean;
    action_required: boolean;
    severity?: 'info' | 'warning' | 'critical';
}

interface TaskInTimeline {
    id: string;
    title: string;
    assignee_name: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    start_week: number;
    duration_weeks: number;
    was_reassigned: boolean;
    original_assignee_name?: string;
    is_at_risk: boolean;
}

interface Activity {
    id: string;
    name: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'at_risk';
    progress_percent: number;
    planned_start_date: string;
    planned_end_date: string;
    estimated_mandays: number;
    actual_mandays: number;
    tasks: TaskInTimeline[];
    recent_changes: {
        type: string;
        description: string;
        changed_at: string;
        changed_by: string;
    }[];
    risks: {
        description: string;
        severity: 'low' | 'medium' | 'high';
    }[];
}

// ============================================
// Mock Data
// ============================================

const mockNotifications: ActivityNotification[] = [
    {
        id: 'n1',
        type: 'task_reassigned',
        title: 'Task Reassigned',
        message: 'Task "Payment Integration API" ถูกย้ายจาก ประสิทธิ์ โค้ดดี ไปให้ มานี รักงาน โดย PM สมชาย (Reason: Load Balancing)',
        task_title: 'Payment Integration API',
        activity_name: 'Backend Development',
        triggered_by_name: 'สมชาย มานะ (PM)',
        triggered_at: '2025-02-03T14:30:00',
        is_read: false,
        is_acknowledged: false,
        action_required: true,
        severity: 'warning',
    },
    {
        id: 'n2',
        type: 'risk_alert',
        title: 'Skill Gap Warning',
        message: 'มานี รักงาน ไม่มี Skill "Payment Gateway" - อาจต้องให้ ประสิทธิ์ เป็น Mentor',
        activity_name: 'Backend Development',
        triggered_by_name: 'System',
        triggered_at: '2025-02-03T14:31:00',
        is_read: false,
        is_acknowledged: false,
        action_required: true,
        severity: 'warning',
    },
    {
        id: 'n3',
        type: 'deadline_approaching',
        title: 'Deadline Approaching',
        message: 'Activity "Backend Development" ใกล้ถึง Deadline (Due: Mar 31)',
        activity_name: 'Backend Development',
        triggered_by_name: 'System',
        triggered_at: '2025-02-03T08:00:00',
        is_read: true,
        is_acknowledged: false,
        action_required: false,
        severity: 'info',
    },
];

const mockActivities: Activity[] = [
    {
        id: 'act-backend',
        name: 'Backend Development',
        status: 'in_progress',
        progress_percent: 60,
        planned_start_date: '2025-02-01',
        planned_end_date: '2025-03-31',
        estimated_mandays: 45,
        actual_mandays: 27,
        tasks: [
            { id: 't1', title: 'Setup Environment', assignee_name: 'ประสิทธิ์ โค้ดดี', status: 'done', start_week: 0, duration_weeks: 1, was_reassigned: false, is_at_risk: false },
            { id: 't2', title: 'User Auth API', assignee_name: 'ประสิทธิ์ โค้ดดี', status: 'done', start_week: 1, duration_weeks: 1, was_reassigned: false, is_at_risk: false },
            { id: 't3', title: 'Product Catalog API', assignee_name: 'มานี รักงาน', status: 'in_progress', start_week: 1, duration_weeks: 2, was_reassigned: false, is_at_risk: false },
            { id: 't4', title: 'Order API', assignee_name: 'มานี รักงาน', status: 'todo', start_week: 3, duration_weeks: 2, was_reassigned: false, is_at_risk: true },
            { id: 't5', title: 'Payment API', assignee_name: 'มานี รักงาน', status: 'in_progress', start_week: 4, duration_weeks: 1.5, was_reassigned: true, original_assignee_name: 'ประสิทธิ์ โค้ดดี', is_at_risk: true },
        ],
        recent_changes: [
            { type: 'task_reassigned', description: 'Payment API reassigned from ประสิทธิ์ to มานี', changed_at: '2025-02-03T14:30:00', changed_by: 'สมชาย มานะ' },
            { type: 'progress_update', description: 'Progress updated to 60%', changed_at: '2025-02-02T16:00:00', changed_by: 'ประสิทธิ์ โค้ดดี' },
        ],
        risks: [
            { description: 'Payment API reassigned - may need supervision', severity: 'medium' },
            { description: 'Tight deadline for Order API', severity: 'high' },
        ],
    },
    {
        id: 'act-frontend',
        name: 'Frontend Development',
        status: 'in_progress',
        progress_percent: 45,
        planned_start_date: '2025-02-05',
        planned_end_date: '2025-03-25',
        estimated_mandays: 30,
        actual_mandays: 13.5,
        tasks: [
            { id: 't6', title: 'UI Components Library', assignee_name: 'มานี รักงาน', status: 'done', start_week: 0, duration_weeks: 1, was_reassigned: false, is_at_risk: false },
            { id: 't7', title: 'Product Pages', assignee_name: 'มานี รักงาน', status: 'in_progress', start_week: 1, duration_weeks: 2, was_reassigned: false, is_at_risk: false },
            { id: 't8', title: 'Shopping Cart', assignee_name: 'TBD', status: 'todo', start_week: 3, duration_weeks: 1.5, was_reassigned: false, is_at_risk: false },
            { id: 't9', title: 'Checkout Flow', assignee_name: 'TBD', status: 'todo', start_week: 4, duration_weeks: 2, was_reassigned: false, is_at_risk: false },
        ],
        recent_changes: [],
        risks: [
            { description: 'Shopping Cart & Checkout not yet assigned', severity: 'medium' },
        ],
    },
];

// ============================================
// Notification Card Component
// ============================================

const NotificationCard = ({
    notification,
    onAcknowledge,
}: {
    notification: ActivityNotification;
    onAcknowledge: () => void;
}) => {
    const getIcon = () => {
        switch (notification.type) {
            case 'task_reassigned': return <ArrowRight size={18} color="#f59e0b" />;
            case 'risk_alert': return <AlertTriangle size={18} color="#ef4444" />;
            case 'deadline_approaching': return <Clock size={18} color="#3b82f6" />;
            case 'timeline_changed': return <Calendar size={18} color="#8b5cf6" />;
            default: return <Bell size={18} color="#64748b" />;
        }
    };

    const getBgColor = () => {
        if (notification.severity === 'critical') return '#fef2f2';
        if (notification.severity === 'warning') return '#fffbeb';
        return '#f8fafc';
    };

    const getBorderColor = () => {
        if (notification.severity === 'critical') return '#fecaca';
        if (notification.severity === 'warning') return '#fcd34d';
        return '#e2e8f0';
    };

    const timeAgo = () => {
        const now = new Date();
        const then = new Date(notification.triggered_at);
        const diffMs = now.getTime() - then.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHours > 0) return `${diffHours}h ago`;
        if (diffMins > 0) return `${diffMins}m ago`;
        return 'Just now';
    };

    return (
        <div
            style={{
                padding: '16px',
                background: notification.is_read ? 'white' : getBgColor(),
                border: `1px solid ${getBorderColor()}`,
                borderRadius: '12px',
                display: 'flex',
                gap: '12px',
                position: 'relative',
                opacity: notification.is_read ? 0.7 : 1,
            }}
        >
            {/* Icon */}
            <div
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: notification.severity === 'critical' ? '#fee2e2' : notification.severity === 'warning' ? '#fef3c7' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                {getIcon()}
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        {notification.title}
                    </span>
                    {!notification.is_read && (
                        <span
                            style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#ef4444',
                            }}
                        />
                    )}
                </div>

                <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 8px', lineHeight: '1.5' }}>
                    {notification.message}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#94a3b8' }}>
                    <span>{notification.triggered_by_name}</span>
                    <span>•</span>
                    <span>{timeAgo()}</span>
                    {notification.activity_name && (
                        <>
                            <span>•</span>
                            <span style={{ color: '#6366f1' }}>{notification.activity_name}</span>
                        </>
                    )}
                </div>

                {notification.action_required && !notification.is_acknowledged && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                        <button
                            onClick={onAcknowledge}
                            style={{
                                padding: '6px 12px',
                                background: '#6366f1',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <Check size={14} />
                            Acknowledge
                        </button>
                        <button
                            style={{
                                padding: '6px 12px',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#475569',
                                cursor: 'pointer',
                            }}
                        >
                            View Details
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// Activity Timeline Component
// ============================================

const ActivityTimeline = ({ activity }: { activity: Activity }) => {
    const [isExpanded, setIsExpanded] = React.useState(true);

    const getStatusColor = () => {
        switch (activity.status) {
            case 'completed': return { bg: '#dcfce7', text: '#16a34a', label: 'Completed' };
            case 'in_progress': return { bg: '#dbeafe', text: '#2563eb', label: 'In Progress' };
            case 'at_risk': return { bg: '#fee2e2', text: '#dc2626', label: 'At Risk' };
            case 'on_hold': return { bg: '#fef3c7', text: '#d97706', label: 'On Hold' };
            default: return { bg: '#f1f5f9', text: '#64748b', label: 'Not Started' };
        }
    };

    const statusColor = getStatusColor();

    const totalWeeks = 6;
    const completedTasks = activity.tasks.filter((t) => t.status === 'done').length;
    const totalTasks = activity.tasks.length;
    const remainingMandays = activity.estimated_mandays - activity.actual_mandays;

    return (
        <div
            style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                overflow: 'hidden',
                marginBottom: '16px',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '20px 24px',
                    background: activity.status === 'at_risk' ? '#fef2f2' : '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            {isExpanded ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />}
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                                {activity.name}
                            </h3>
                            <span
                                style={{
                                    padding: '4px 10px',
                                    background: statusColor.bg,
                                    color: statusColor.text,
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                }}
                            >
                                {statusColor.label}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#64748b' }}>
                            <span>📅 {new Date(activity.planned_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(activity.planned_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span>⏱️ {activity.actual_mandays} / {activity.estimated_mandays} MD ({remainingMandays} remaining)</span>
                            <span>✅ {completedTasks} / {totalTasks} tasks</span>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '32px', fontWeight: 700, color: activity.progress_percent >= 80 ? '#22c55e' : activity.progress_percent >= 50 ? '#3b82f6' : '#f59e0b' }}>
                            {activity.progress_percent}%
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Progress</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div
                    style={{
                        marginTop: '16px',
                        height: '8px',
                        background: '#e2e8f0',
                        borderRadius: '4px',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            width: `${activity.progress_percent}%`,
                            height: '100%',
                            background: activity.progress_percent >= 80 ? '#22c55e' : activity.progress_percent >= 50 ? '#3b82f6' : '#f59e0b',
                            transition: 'width 0.3s',
                        }}
                    />
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div style={{ padding: '24px' }}>
                    {/* Risks */}
                    {activity.risks.length > 0 && (
                        <div
                            style={{
                                padding: '16px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '12px',
                                marginBottom: '20px',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <AlertTriangle size={18} color="#ef4444" />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                                    Risks & Issues
                                </span>
                            </div>
                            {activity.risks.map((risk, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: '10px 12px',
                                        background: 'white',
                                        borderRadius: '8px',
                                        marginBottom: i < activity.risks.length - 1 ? '8px' : '0',
                                        fontSize: '13px',
                                        color: '#1e293b',
                                    }}
                                >
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: risk.severity === 'high' ? '#ef4444' : risk.severity === 'medium' ? '#f59e0b' : '#22c55e',
                                            marginRight: '8px',
                                        }}
                                    />
                                    {risk.description}
                                </div>
                            ))}
                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                <button
                                    style={{
                                        padding: '8px 14px',
                                        background: '#ef4444',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <Zap size={14} />
                                    Request Change
                                </button>
                                <button
                                    style={{
                                        padding: '8px 14px',
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: '#475569',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Add Buffer Time
                                </button>
                                <button
                                    style={{
                                        padding: '8px 14px',
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: '#475569',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Request Support
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tasks Timeline */}
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
                            Tasks Timeline
                        </div>

                        {/* Week Headers */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '180px repeat(6, 1fr)',
                                gap: '8px',
                                marginBottom: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#94a3b8',
                            }}
                        >
                            <div></div>
                            {Array.from({ length: totalWeeks }, (_, i) => (
                                <div key={i} style={{ textAlign: 'center' }}>
                                    Week {i + 1}
                                </div>
                            ))}
                        </div>

                        {/* Task Rows */}
                        {activity.tasks.map((task) => {
                            const getTaskColor = () => {
                                if (task.status === 'done') return { bg: '#dcfce7', bar: '#22c55e' };
                                if (task.status === 'in_progress') return { bg: '#dbeafe', bar: '#3b82f6' };
                                if (task.is_at_risk) return { bg: '#fee2e2', bar: '#ef4444' };
                                return { bg: '#f1f5f9', bar: '#94a3b8' };
                            };

                            const colors = getTaskColor();

                            return (
                                <div
                                    key={task.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '180px repeat(6, 1fr)',
                                        gap: '8px',
                                        marginBottom: '12px',
                                        alignItems: 'center',
                                    }}
                                >
                                    {/* Task Name */}
                                    <div style={{ fontSize: '13px', color: '#1e293b' }}>
                                        <div style={{ fontWeight: 500, marginBottom: '2px' }}>
                                            {task.title}
                                            {task.was_reassigned && (
                                                <span
                                                    style={{
                                                        marginLeft: '6px',
                                                        padding: '2px 6px',
                                                        background: '#fef3c7',
                                                        color: '#d97706',
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    🔄 Reassigned
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                            {task.assignee_name}
                                            {task.original_assignee_name && (
                                                <span style={{ color: '#94a3b8' }}>
                                                    {' '}(was {task.original_assignee_name})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timeline Bar */}
                                    {Array.from({ length: totalWeeks }, (_, weekIndex) => {
                                        const isInTask = weekIndex >= task.start_week && weekIndex < task.start_week + task.duration_weeks;
                                        const isFirstWeek = weekIndex === task.start_week;
                                        const isLastWeek = weekIndex === Math.ceil(task.start_week + task.duration_weeks) - 1;

                                        return (
                                            <div
                                                key={weekIndex}
                                                style={{
                                                    height: '32px',
                                                    background: isInTask ? colors.bg : 'transparent',
                                                    borderRadius: isFirstWeek ? '6px 0 0 6px' : isLastWeek ? '0 6px 6px 0' : '0',
                                                    position: 'relative',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                {isInTask && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            bottom: 0,
                                                            left: 0,
                                                            right: 0,
                                                            height: '4px',
                                                            background: colors.bar,
                                                            borderRadius: isFirstWeek ? '0 0 0 6px' : isLastWeek ? '0 0 6px 0' : '0',
                                                        }}
                                                    />
                                                )}
                                                {isInTask && task.status !== 'todo' && (
                                                    <span style={{ fontSize: '10px', color: colors.bar, fontWeight: 600 }}>
                                                        {task.status === 'done' ? '✓' : '▶'}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {/* Recent Changes */}
                    {activity.recent_changes.length > 0 && (
                        <div style={{ marginTop: '24px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                                Recent Changes
                            </div>
                            {activity.recent_changes.map((change, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        padding: '10px 14px',
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        marginBottom: '6px',
                                        fontSize: '12px',
                                        color: '#475569',
                                    }}
                                >
                                    <MessageSquare size={14} color="#64748b" style={{ marginTop: '2px' }} />
                                    <div style={{ flex: 1 }}>
                                        <span>{change.description}</span>
                                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
                                            {change.changed_by} • {new Date(change.changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================
// Main Component
// ============================================

export default function ActivityOwnerDashboard() {
    const [notifications, setNotifications] = React.useState(mockNotifications);
    const [showUnreadOnly, setShowUnreadOnly] = React.useState(false);

    const handleAcknowledge = (id: string) => {
        setNotifications(notifications.map((n) => n.id === id ? { ...n, is_acknowledged: true, is_read: true } : n));
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const actionRequiredCount = notifications.filter((n) => n.action_required && !n.is_acknowledged).length;

    const filteredNotifications = showUnreadOnly ? notifications.filter((n) => !n.is_read) : notifications;

    const totalActivities = mockActivities.length;
    const inProgress = mockActivities.filter((a) => a.status === 'in_progress').length;
    const atRisk = mockActivities.filter((a) => a.status === 'at_risk').length;
    const totalTasks = mockActivities.reduce((sum, a) => sum + a.tasks.length, 0);
    const completedTasks = mockActivities.reduce((sum, a) => sum + a.tasks.filter((t) => t.status === 'done').length, 0);
    const reassignedTasks = mockActivities.reduce((sum, a) => sum + a.tasks.filter((t) => t.was_reassigned).length, 0);

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        My Activities
                    </h1>
                    <span
                        style={{
                            padding: '4px 10px',
                            background: '#f3e8ff',
                            color: '#9333ea',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                        }}
                    >
                        SA
                    </span>
                </div>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                    Monitor your activities and review task assignments  • ประสิทธิ์ โค้ดดี
                </p>
            </div>

            {/* Summary Cards */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '12px',
                    marginBottom: '24px',
                }}
            >
                <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>{totalActivities}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Total Activities</div>
                </div>
                <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>{inProgress}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>In Progress</div>
                </div>
                <div style={{ padding: '16px', background: atRisk > 0 ? '#fef2f2' : 'white', borderRadius: '12px', border: `1px solid ${atRisk > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: atRisk > 0 ? '#ef4444' : '#64748b' }}>{atRisk}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>At Risk</div>
                </div>
                <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{completedTasks} / {totalTasks}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Tasks Completed</div>
                </div>
                <div style={{ padding: '16px', background: reassignedTasks > 0 ? '#fffbeb' : 'white', borderRadius: '12px', border: `1px solid ${reassignedTasks > 0 ? '#fcd34d' : '#e2e8f0'}` }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: reassignedTasks > 0 ? '#f59e0b' : '#64748b' }}>{reassignedTasks}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Reassigned Tasks</div>
                </div>
                <div style={{ padding: '16px', background: unreadCount > 0 ? '#eef2ff' : 'white', borderRadius: '12px', border: `1px solid ${unreadCount > 0 ? '#c7d2fe' : '#e2e8f0'}` }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: unreadCount > 0 ? '#6366f1' : '#64748b' }}>{unreadCount}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Unread Notifications</div>
                </div>
            </div>

            {/* Notifications Section */}
            <div
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '24px',
                    marginBottom: '24px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Bell size={20} color="#6366f1" />
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                            Notifications
                        </h2>
                        {actionRequiredCount > 0 && (
                            <span
                                style={{
                                    padding: '4px 10px',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                }}
                            >
                                {actionRequiredCount} action required
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                        style={{
                            padding: '8px 14px',
                            background: showUnreadOnly ? '#6366f1' : 'white',
                            border: `1px solid ${showUnreadOnly ? '#6366f1' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: showUnreadOnly ? 'white' : '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <Filter size={14} />
                        {showUnreadOnly ? 'Show All' : 'Unread Only'}
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredNotifications.length > 0 ? (
                        filteredNotifications.map((notification) => (
                            <NotificationCard
                                key={notification.id}
                                notification={notification}
                                onAcknowledge={() => handleAcknowledge(notification.id)}
                            />
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            <CheckCircle2 size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                            <p style={{ fontSize: '14px', margin: 0 }}>No {showUnreadOnly ? 'unread' : ''} notifications</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Activities */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                        My Activities
                    </h2>
                </div>

                {mockActivities.map((activity) => (
                    <ActivityTimeline key={activity.id} activity={activity} />
                ))}
            </div>
        </div>
    );
}
