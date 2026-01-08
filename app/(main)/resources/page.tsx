// app/(main)/resources/page.tsx  
"use client";

import * as React from "react";
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Users,
    Clock,
    AlertTriangle,
    CheckCircle2,
    AlertCircle,
    X,
    User,
    Briefcase,
    Target,
    GripVertical,
    ArrowRight,
    Info,
    Bell,
    MessageSquare,
    Shield,
    Zap,
} from "lucide-react";

// ============================================
// Types (simplified for component)
// ============================================

interface Employee {
    id: string;
    name: string;
    position: string;
    position_code: 'PM' | 'SA' | 'BA' | 'PG';
    working_hours_per_day: number;
    skills: string[];
}

interface TaskAllocation {
    id: string;
    task_id: string;
    task_title: string;
    project_code: string;
    project_color: string;
    activity_id: string;
    activity_name: string;
    activity_owner_id: string;
    activity_owner_name: string;
    hours: number;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    required_skills: string[];
}

interface DayData {
    date: string;
    capacity: number;
    allocated: number;
    tasks: TaskAllocation[];
}

interface EmployeeWeekData {
    employee: Employee;
    days: DayData[];
    total_capacity: number;
    total_allocated: number;
    utilization_percent: number;
}

interface DragItem {
    task: TaskAllocation;
    fromEmployeeId: string;
    fromDate: string;
}

interface ReassignmentImpact {
    skill_match: {
        required: string[];
        has: string[];
        missing: string[];
        percent: number;
    };
    timeline_risk: boolean;
    overload_risk: boolean;
    warnings: { type: string; message: string; severity: 'info' | 'warning' | 'critical' }[];
    suggestions: string[];
}

// ============================================
// Mock Data
// ============================================

const mockEmployees: Employee[] = [
    { id: 'user-4', name: 'ประสิทธิ์ โค้ดดี', position: 'Senior PG', position_code: 'PG', working_hours_per_day: 8, skills: ['Node.js', 'TypeScript', 'React', 'PostgreSQL', 'AWS', 'Payment Gateway'] },
    { id: 'user-5', name: 'มานี รักงาน', position: 'Programmer', position_code: 'PG', working_hours_per_day: 8, skills: ['React', 'JavaScript', 'CSS', 'Node.js', 'TypeScript'] },
    { id: 'user-2', name: 'สุภาพร ใจดี', position: 'System Analyst', position_code: 'SA', working_hours_per_day: 8, skills: ['System Analysis', 'UML', 'Database Design', 'API Design'] },
    { id: 'user-3', name: 'วิชัย เก่งกาจ', position: 'Business Analyst', position_code: 'BA', working_hours_per_day: 8, skills: ['Business Analysis', 'Requirement', 'Process Modeling', 'UAT'] },
];

const projectColors: Record<string, string> = {
    'PRJ-001': '#6366f1',
    'PRJ-002': '#22c55e',
    'PRJ-003': '#f59e0b',
};

// Generate week data with proper task assignments
const generateWeekData = (): EmployeeWeekData[] => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week

    return mockEmployees.map((employee) => {
        const days: DayData[] = [];
        let totalAllocated = 0;
        let totalCapacity = 0;

        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dayOfWeek = date.getDay();
            const isWorkingDay = dayOfWeek !== 0 && dayOfWeek !== 6;
            const dateStr = date.toISOString().split('T')[0];

            const capacity = isWorkingDay ? employee.working_hours_per_day : 0;
            totalCapacity += capacity;

            const tasks: TaskAllocation[] = [];
            let allocated = 0;

            if (isWorkingDay) {
                // Assign tasks based on employee
                if (employee.id === 'user-4') {
                    // ประสิทธิ์ - heavy load
                    if (i === 1) {
                        tasks.push({
                            id: `ta-${employee.id}-${i}-1`,
                            task_id: 't-auth',
                            task_title: 'User Auth API',
                            project_code: 'PRJ-001',
                            project_color: projectColors['PRJ-001'],
                            activity_id: 'act-backend',
                            activity_name: 'Backend Development',
                            activity_owner_id: 'user-4',
                            activity_owner_name: 'ประสิทธิ์ โค้ดดี',
                            hours: 8,
                            priority: 'high',
                            required_skills: ['Node.js', 'TypeScript', 'JWT'],
                        });
                        allocated = 8;
                    } else if (i === 2 || i === 3) {
                        tasks.push({
                            id: `ta-${employee.id}-${i}-1`,
                            task_id: 't-payment',
                            task_title: 'Payment Integration',
                            project_code: 'PRJ-001',
                            project_color: projectColors['PRJ-001'],
                            activity_id: 'act-backend',
                            activity_name: 'Backend Development',
                            activity_owner_id: 'user-4',
                            activity_owner_name: 'ประสิทธิ์ โค้ดดี',
                            hours: 8,
                            priority: 'urgent',
                            required_skills: ['Node.js', 'Payment Gateway', 'API Integration'],
                        });
                        allocated = 8;
                    } else if (i === 4 || i === 5) {
                        tasks.push({
                            id: `ta-${employee.id}-${i}-1`,
                            task_id: 't-order',
                            task_title: 'Order Management API',
                            project_code: 'PRJ-001',
                            project_color: projectColors[' PRJ-001'],
                            activity_id: 'act-backend',
                            activity_name: 'Backend Development',
                            activity_owner_id: 'user-4',
                            activity_owner_name: 'ประสิทธิ์ โค้ดดี',
                            hours: i === 5 ? 6 : 8,
                            priority: 'high',
                            required_skills: ['Node.js', 'PostgreSQL'],
                        });
                        allocated = i === 5 ? 6 : 8;
                    }
                } else if (employee.id === 'user-5') {
                    // มานี - partial load
                    if (i === 1 || i === 2) {
                        tasks.push({
                            id: `ta-${employee.id}-${i}-1`,
                            task_id: 't-catalog',
                            task_title: 'Product Catalog UI',
                            project_code: 'PRJ-001',
                            project_color: projectColors['PRJ-001'],
                            activity_id: 'act-frontend',
                            activity_name: 'Frontend Development',
                            activity_owner_id: 'user-4',
                            activity_owner_name: 'ประสิทธิ์ โค้ดดี',
                            hours: i === 2 ? 6 : 8,
                            priority: 'high',
                            required_skills: ['React', 'CSS'],
                        });
                        allocated = i === 2 ? 6 : 8;
                    } else if (i === 3) {
                        tasks.push({
                            id: `ta-${employee.id}-${i}-1`,
                            task_id: 't-bugfix',
                            task_title: 'Bug Fixes',
                            project_code: 'PRJ-002',
                            project_color: projectColors['PRJ-002'],
                            activity_id: 'act-support',
                            activity_name: 'Support & Maintenance',
                            activity_owner_id: 'user-2',
                            activity_owner_name: 'สุภาพร ใจดี',
                            hours: 4,
                            priority: 'medium',
                            required_skills: ['React', 'JavaScript'],
                        });
                        allocated = 4;
                    }
                    // i === 4, 5 are free
                } else if (employee.id === 'user-2') {
                    // สุภาพร SA - fully booked
                    allocated = 8;
                    const projectCode = i < 3 ? 'PRJ-002' : 'PRJ-003';
                    tasks.push({
                        id: `ta-${employee.id}-${i}-1`,
                        task_id: `t-design-${i}`,
                        task_title: i < 3 ? 'System Design Review' : 'API Specification',
                        project_code: projectCode,
                        project_color: projectColors[projectCode],
                        activity_id: 'act-analysis',
                        activity_name: 'System Analysis',
                        activity_owner_id: 'user-2',
                        activity_owner_name: 'สุภาพร ใจดี',
                        hours: 8,
                        priority: 'high',
                        required_skills: ['System Analysis', 'API Design'],
                    });
                } else if (employee.id === 'user-3') {
                    // วิชัย BA - partial load
                    if (i === 1 || i === 2) {
                        tasks.push({
                            id: `ta-${employee.id}-${i}-1`,
                            task_id: 't-req',
                            task_title: 'Requirement Review',
                            project_code: 'PRJ-001',
                            project_color: projectColors['PRJ-001'],
                            activity_id: 'act-req',
                            activity_name: 'Requirement Analysis',
                            activity_owner_id: 'user-3',
                            activity_owner_name: 'วิชัย เก่งกาจ',
                            hours: 4,
                            priority: 'medium',
                            required_skills: ['Business Analysis'],
                        });
                        allocated = 4;
                    } else if (i >= 4) {
                        tasks.push({
                            id: `ta-${employee.id}-${i}-1`,
                            task_id: 't-uat',
                            task_title: 'UAT Preparation',
                            project_code: 'PRJ-002',
                            project_color: projectColors['PRJ-002'],
                            activity_id: 'act-uat',
                            activity_name: 'UAT',
                            activity_owner_id: 'user-3',
                            activity_owner_name: 'วิชัย เก่งกาจ',
                            hours: 8,
                            priority: 'high',
                            required_skills: ['UAT', 'Test Cases'],
                        });
                        allocated = 8;
                    }
                }
            }

            totalAllocated += allocated;

            days.push({
                date: dateStr,
                capacity,
                allocated,
                tasks,
            });
        }

        return {
            employee,
            days,
            total_capacity: totalCapacity,
            total_allocated: totalAllocated,
            utilization_percent: totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0,
        };
    });
};

// ============================================
// Impact Analysis Modal
// ============================================

const ImpactAnalysisModal = ({
    dragItem,
    targetEmployee,
    targetDate,
    onConfirm,
    onCancel,
}: {
    dragItem: DragItem;
    targetEmployee: Employee;
    targetDate: string;
    onConfirm: (note: string) => void;
    onCancel: () => void;
}) => {
    const [note, setNote] = React.useState('');
    const [reason, setReason] = React.useState<string>('load_balancing');

    const fromEmployee = mockEmployees.find((e) => e.id === dragItem.fromEmployeeId);

    // Calculate impact
    const requiredSkills = dragItem.task.required_skills;
    const targetSkills = targetEmployee.skills;
    const matchingSkills = requiredSkills.filter((s) => targetSkills.includes(s));
    const missingSkills = requiredSkills.filter((s) => !targetSkills.includes(s));
    const skillMatchPercent = requiredSkills.length > 0
        ? Math.round((matchingSkills.length / requiredSkills.length) * 100)
        : 100;

    const impact: ReassignmentImpact = {
        skill_match: {
            required: requiredSkills,
            has: matchingSkills,
            missing: missingSkills,
            percent: skillMatchPercent,
        },
        timeline_risk: missingSkills.length > 0,
        overload_risk: false, // Would calculate from actual data
        warnings: [],
        suggestions: [],
    };

    // Generate warnings
    if (missingSkills.length > 0) {
        impact.warnings.push({
            type: 'skill_gap',
            message: `${targetEmployee.name} ไม่มี Skill: ${missingSkills.join(', ')}`,
            severity: 'warning',
        });
        impact.suggestions.push(`ให้ ${fromEmployee?.name} เป็น Mentor หรือ Reviewer`);
    }

    if (dragItem.task.priority === 'urgent') {
        impact.warnings.push({
            type: 'priority',
            message: 'Task นี้เป็น Urgent - ต้องมั่นใจว่าสามารถทำได้ทันเวลา',
            severity: 'critical',
        });
        impact.suggestions.push('พิจารณาเพิ่มเวลา Buffer');
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '20px',
                    width: '600px',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '24px',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                            Task Reassignment
                        </h2>
                        <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0' }}>
                            Review impact before confirming
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '8px',
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#64748b',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {/* Task Info */}
                    <div
                        style={{
                            padding: '16px',
                            background: '#f8fafc',
                            borderRadius: '12px',
                            marginBottom: '20px',
                        }}
                    >
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                            {dragItem.task.project_code} • {dragItem.task.activity_name}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                            {dragItem.task.task_title}
                        </div>
                    </div>

                    {/* Assignment Change */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            marginBottom: '24px',
                        }}
                    >
                        <div
                            style={{
                                flex: 1,
                                padding: '16px',
                                background: '#fef2f2',
                                borderRadius: '12px',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>From</div>
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #ef4444, #f97316)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '18px',
                                    margin: '0 auto 8px',
                                }}
                            >
                                {fromEmployee?.name.charAt(0)}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                                {fromEmployee?.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                {fromEmployee?.position_code}
                            </div>
                        </div>

                        <ArrowRight size={24} color="#64748b" />

                        <div
                            style={{
                                flex: 1,
                                padding: '16px',
                                background: '#f0fdf4',
                                borderRadius: '12px',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>To</div>
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #22c55e, #10b981)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '18px',
                                    margin: '0 auto 8px',
                                }}
                            >
                                {targetEmployee.name.charAt(0)}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                                {targetEmployee.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                {targetEmployee.position_code}
                            </div>
                        </div>
                    </div>

                    {/* Skill Analysis */}
                    <div
                        style={{
                            padding: '16px',
                            background: skillMatchPercent >= 80 ? '#f0fdf4' : skillMatchPercent >= 50 ? '#fffbeb' : '#fef2f2',
                            border: `1px solid ${skillMatchPercent >= 80 ? '#86efac' : skillMatchPercent >= 50 ? '#fcd34d' : '#fecaca'}`,
                            borderRadius: '12px',
                            marginBottom: '16px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Shield size={18} color={skillMatchPercent >= 80 ? '#22c55e' : skillMatchPercent >= 50 ? '#f59e0b' : '#ef4444'} />
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                                Skill Match: {skillMatchPercent}%
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            {impact.skill_match.required.map((skill) => {
                                const hasSkill = impact.skill_match.has.includes(skill);
                                return (
                                    <span
                                        key={skill}
                                        style={{
                                            padding: '4px 10px',
                                            background: hasSkill ? '#dcfce7' : '#fee2e2',
                                            color: hasSkill ? '#16a34a' : '#dc2626',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}
                                    >
                                        {hasSkill ? <CheckCircle2 size={12} /> : <X size={12} />}
                                        {skill}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Warnings */}
                    {impact.warnings.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            {impact.warnings.map((warning, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        padding: '12px 16px',
                                        background: warning.severity === 'critical' ? '#fef2f2' : '#fffbeb',
                                        border: `1px solid ${warning.severity === 'critical' ? '#fecaca' : '#fcd34d'}`,
                                        borderRadius: '10px',
                                        marginBottom: '8px',
                                    }}
                                >
                                    <AlertTriangle size={18} color={warning.severity === 'critical' ? '#ef4444' : '#f59e0b'} />
                                    <span style={{ fontSize: '13px', color: '#1e293b' }}>{warning.message}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Suggestions */}
                    {impact.suggestions.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                                💡 Suggestions
                            </div>
                            {impact.suggestions.map((suggestion, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 14px',
                                        background: '#f0f9ff',
                                        borderRadius: '8px',
                                        marginBottom: '6px',
                                        fontSize: '13px',
                                        color: '#0369a1',
                                    }}
                                >
                                    <Zap size={14} />
                                    {suggestion}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Activity Owner Notification */}
                    <div
                        style={{
                            padding: '16px',
                            background: '#f8fafc',
                            borderRadius: '12px',
                            marginBottom: '20px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Bell size={18} color="#6366f1" />
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                                Notify Activity Owner
                            </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                            <strong>{dragItem.task.activity_owner_name}</strong> (Owner of {dragItem.task.activity_name}) will be notified about this change.
                        </div>

                        {/* Reason Selection */}
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                                Reason for Reassignment
                            </label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    color: '#1e293b',
                                }}
                            >
                                <option value="load_balancing">Load Balancing</option>
                                <option value="skill_match">Better Skill Match</option>
                                <option value="availability">Availability</option>
                                <option value="urgent">Urgent Request</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Note */}
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                                Additional Note (Optional)
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Add any additional context for the activity owner..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    resize: 'none',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '20px 24px',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                    }}
                >
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '12px 24px',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#475569',
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(note)}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        <Bell size={16} />
                        Notify Owner & Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// Day Cell with Drag & Drop
// ============================================

const DayCell = ({
    day,
    employee,
    onDragStart,
    onDrop,
}: {
    day: DayData;
    employee: Employee;
    onDragStart: (task: TaskAllocation) => void;
    onDrop: () => void;
}) => {
    const [isDragOver, setIsDragOver] = React.useState(false);

    const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6;

    if (isWeekend) {
        return (
            <div
                style={{
                    padding: '8px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    height: '100%',
                    minHeight: '90px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    fontSize: '11px',
                }}
            >
                Off
            </div>
        );
    }

    const getStatusColor = () => {
        const percent = day.capacity > 0 ? (day.allocated / day.capacity) * 100 : 0;
        if (percent >= 100) return { bg: '#fef2f2', bar: '#ef4444' };
        if (percent >= 80) return { bg: '#fffbeb', bar: '#f59e0b' };
        if (percent > 0) return { bg: '#eff6ff', bar: '#3b82f6' };
        return { bg: '#f0fdf4', bar: '#22c55e' };
    };

    const colors = getStatusColor();

    return (
        <div
            style={{
                padding: '8px',
                background: isDragOver ? '#dbeafe' : colors.bg,
                borderRadius: '8px',
                height: '100%',
                minHeight: '90px',
                position: 'relative',
                border: isDragOver ? '2px dashed #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s',
            }}
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                onDrop();
            }}
        >
            {/* Hours indicator */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    color: '#64748b',
                    marginBottom: '6px',
                }}
            >
                <span>{day.allocated}h</span>
                {day.allocated < day.capacity && (
                    <span style={{ color: '#22c55e' }}>+{day.capacity - day.allocated}h</span>
                )}
            </div>

            {/* Tasks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {day.tasks.map((task) => (
                    <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            onDragStart(task);
                        }}
                        style={{
                            padding: '6px 8px',
                            background: task.project_color,
                            borderRadius: '6px',
                            fontSize: '10px',
                            color: 'white',
                            cursor: 'grab',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        <GripVertical size={10} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.task_title.length > 12 ? task.task_title.substring(0, 12) + '...' : task.task_title}
                        </span>
                        <span style={{ fontSize: '9px', opacity: 0.8 }}>{task.hours}h</span>
                    </div>
                ))}
            </div>

            {/* Add task button when empty or has space */}
            {day.allocated < day.capacity && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        right: '8px',
                        padding: '4px',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '4px',
                        textAlign: 'center',
                        fontSize: '10px',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        opacity: isDragOver ? 1 : 0.5,
                        transition: 'opacity 0.2s',
                    }}
                >
                    Drop here
                </div>
            )}

            {/* Progress bar */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: '#e2e8f0',
                    borderRadius: '0 0 8px 8px',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        width: `${Math.min((day.allocated / day.capacity) * 100, 100)}%`,
                        height: '100%',
                        background: colors.bar,
                    }}
                />
            </div>
        </div>
    );
};

// ============================================
// Employee Row
// ============================================

const EmployeeRow = ({
    data,
    onDragStart,
    onDrop,
}: {
    data: EmployeeWeekData;
    onDragStart: (task: TaskAllocation, employeeId: string, date: string) => void;
    onDrop: (employeeId: string, date: string) => void;
}) => {
    const getStatusStyle = () => {
        if (data.utilization_percent >= 100) return { color: '#ef4444', icon: '🔴', label: 'Overload' };
        if (data.utilization_percent >= 80) return { color: '#f59e0b', icon: '⚠️', label: 'Busy' };
        if (data.utilization_percent >= 50) return { color: '#3b82f6', icon: '✅', label: 'Optimal' };
        return { color: '#22c55e', icon: '✅', label: 'Available' };
    };

    const status = getStatusStyle();

    const positionColors: Record<string, { bg: string; text: string }> = {
        PM: { bg: '#dcfce7', text: '#16a34a' },
        SA: { bg: '#f3e8ff', text: '#9333ea' },
        BA: { bg: '#fef3c7', text: '#d97706' },
        PG: { bg: '#dbeafe', text: '#2563eb' },
    };

    const posColor = positionColors[data.employee.position_code] || positionColors.PG;

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '220px repeat(7, 1fr) 100px',
                gap: '8px',
                padding: '12px 16px',
                background: 'white',
                borderBottom: '1px solid #f1f5f9',
                alignItems: 'stretch',
            }}
        >
            {/* Employee Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '16px',
                    }}
                >
                    {data.employee.name.charAt(0)}
                </div>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        {data.employee.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span
                            style={{
                                padding: '2px 6px',
                                background: posColor.bg,
                                color: posColor.text,
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                            }}
                        >
                            {data.employee.position_code}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {data.employee.working_hours_per_day}h/day
                        </span>
                    </div>
                </div>
            </div>

            {/* Days */}
            {data.days.map((day) => (
                <DayCell
                    key={day.date}
                    day={day}
                    employee={data.employee}
                    onDragStart={(task) => onDragStart(task, data.employee.id, day.date)}
                    onDrop={() => onDrop(data.employee.id, day.date)}
                />
            ))}

            {/* Status */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                }}
            >
                <div style={{ fontSize: '18px', fontWeight: 700, color: status.color }}>
                    {data.utilization_percent}%
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {data.total_allocated}h / {data.total_capacity}h
                </div>
                <div style={{ fontSize: '11px' }}>
                    {status.icon} {status.label}
                </div>
                {data.total_allocated < data.total_capacity && (
                    <div style={{ fontSize: '10px', color: '#22c55e' }}>
                        {data.total_capacity - data.total_allocated}h ว่าง
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// Main Component
// ============================================

export default function ResourcePlanningPage() {
    const [weekData, setWeekData] = React.useState<EmployeeWeekData[]>([]);
    const [dragItem, setDragItem] = React.useState<DragItem | null>(null);
    const [dropTarget, setDropTarget] = React.useState<{ employeeId: string; date: string } | null>(null);
    const [showImpactModal, setShowImpactModal] = React.useState(false);

    // Current week dates
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        return date;
    });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Load data
    React.useEffect(() => {
        setWeekData(generateWeekData());
    }, []);

    // Handle drag start
    const handleDragStart = (task: TaskAllocation, employeeId: string, date: string) => {
        setDragItem({ task, fromEmployeeId: employeeId, fromDate: date });
    };

    // Handle drop
    const handleDrop = (employeeId: string, date: string) => {
        if (!dragItem) return;

        // Check if dropping on different employee or date
        if (dragItem.fromEmployeeId !== employeeId || dragItem.fromDate !== date) {
            setDropTarget({ employeeId, date });
            setShowImpactModal(true);
        }
    };

    // Handle confirm reassignment
    const handleConfirmReassignment = (note: string) => {
        console.log('Reassignment confirmed:', {
            task: dragItem?.task,
            from: dragItem?.fromEmployeeId,
            to: dropTarget?.employeeId,
            date: dropTarget?.date,
            note,
        });

        // TODO: Update state and send notification

        setShowImpactModal(false);
        setDragItem(null);
        setDropTarget(null);
    };

    // Stats
    const totalCapacity = weekData.reduce((sum, d) => sum + d.total_capacity, 0);
    const totalAllocated = weekData.reduce((sum, d) => sum + d.total_allocated, 0);
    const totalAvailable = totalCapacity - totalAllocated;
    const overloadedCount = weekData.filter((d) => d.utilization_percent >= 100).length;
    const availableCount = weekData.filter((d) => d.utilization_percent < 80).length;

    const targetEmployee = dropTarget ? mockEmployees.find((e) => e.id === dropTarget.employeeId) : null;

    return (
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                }}
            >
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        Resource Planning
                    </h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0' }}>
                        Drag & drop tasks to reassign • Activity owners will be notified
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '14px',
                            color: '#475569',
                            cursor: 'pointer',
                        }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', minWidth: '200px', textAlign: 'center' }}>
                        {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '14px',
                            color: '#475569',
                            cursor: 'pointer',
                        }}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px',
                    marginBottom: '24px',
                }}
            >
                <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                            <Users size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>{totalCapacity}h</div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>Total Capacity</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <Target size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>{totalAllocated}h</div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>Allocated ({Math.round((totalAllocated / totalCapacity) * 100)}%)</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{totalAvailable}h</div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>Available • {availableCount} people</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '20px', background: overloadedCount > 0 ? '#fef2f2' : 'white', borderRadius: '12px', border: `1px solid ${overloadedCount > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: overloadedCount > 0 ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: overloadedCount > 0 ? '#ef4444' : '#64748b' }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: overloadedCount > 0 ? '#ef4444' : '#64748b' }}>{overloadedCount}</div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>Overloaded</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Grid */}
            <div
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '220px repeat(7, 1fr) 100px',
                        gap: '8px',
                        padding: '16px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                    }}
                >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Employee</div>
                    {weekDates.map((date, i) => {
                        const isToday = date.toDateString() === today.toDateString();
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        return (
                            <div
                                key={i}
                                style={{
                                    textAlign: 'center',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    background: isToday ? '#6366f1' : 'transparent',
                                    color: isToday ? 'white' : isWeekend ? '#94a3b8' : '#1e293b',
                                }}
                            >
                                <div style={{ fontSize: '11px', fontWeight: 500 }}>{weekDays[date.getDay()]}</div>
                                <div style={{ fontSize: '18px', fontWeight: 700 }}>{date.getDate()}</div>
                            </div>
                        );
                    })}
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textAlign: 'center' }}>Utilization</div>
                </div>

                {/* Employee Rows */}
                {weekData.map((data) => (
                    <EmployeeRow
                        key={data.employee.id}
                        data={data}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                    />
                ))}
            </div>

            {/* Impact Analysis Modal */}
            {showImpactModal && dragItem && targetEmployee && dropTarget && (
                <ImpactAnalysisModal
                    dragItem={dragItem}
                    targetEmployee={targetEmployee}
                    targetDate={dropTarget.date}
                    onConfirm={handleConfirmReassignment}
                    onCancel={() => {
                        setShowImpactModal(false);
                        setDragItem(null);
                        setDropTarget(null);
                    }}
                />
            )}
        </div>
    );
}
