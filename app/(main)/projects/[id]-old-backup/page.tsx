// app/(main)/projects/[id]/page.tsx
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Plus,
    ChevronDown,
    ChevronRight,
    MoreHorizontal,
    Edit,
    Trash2,
    User,
    Calendar,
    Clock,
    CheckCircle2,
    Circle,
    AlertCircle,
    Pause,
    Target,
    ListTodo,
    Users,
    Briefcase,
    TrendingUp,
} from "lucide-react";

// ============================================
// Types
// ============================================

interface Task {
    id: string;
    activity_id: string;
    title: string;
    assignee_name?: string;
    estimated_mandays: number;
    actual_mandays: number;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    due_date?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface Activity {
    id: string;
    milestone_id: string;
    activity_code: string;
    name: string;
    owner_name: string;
    owner_position: 'SA' | 'BA' | 'PG';
    estimated_mandays: number;
    actual_mandays: number;
    status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
    progress_percent: number;
    planned_start_date: string;
    planned_end_date: string;
    tasks: Task[];
}

interface Milestone {
    id: string;
    code: string;
    name: string;
    planned_mandays: number;
    actual_mandays: number;
    weight_percent: number;
    status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
    progress_percent: number;
    planned_start_date: string;
    planned_end_date: string;
    activities: Activity[];
}

interface Project {
    id: string;
    project_code: string;
    project_name: string;
    customer_name: string;
    project_manager_name: string;
    status: string;
    progress_percent: number;
    sold_mandays: number;
    actual_mandays: number;
    milestones: Milestone[];
}

// ============================================
// Mock Data
// ============================================

const mockProject: Project = {
    id: "prj-001",
    project_code: "PRJ-2025-001",
    project_name: "E-Commerce Website",
    customer_name: "ABC Company",
    project_manager_name: "สมชาย มานะ",
    status: "in_progress",
    progress_percent: 45,
    sold_mandays: 120,
    actual_mandays: 54,
    milestones: [
        {
            id: "ms-1",
            code: "MS1",
            name: "Mapping Data",
            planned_mandays: 20,
            actual_mandays: 18,
            weight_percent: 20,
            status: "completed",
            progress_percent: 100,
            planned_start_date: "2025-01-15",
            planned_end_date: "2025-01-31",
            activities: [
                {
                    id: "act-1",
                    milestone_id: "ms-1",
                    activity_code: "ACT-001",
                    name: "Database Design",
                    owner_name: "สุภาพร ใจดี",
                    owner_position: "SA",
                    estimated_mandays: 10,
                    actual_mandays: 9,
                    status: "completed",
                    progress_percent: 100,
                    planned_start_date: "2025-01-15",
                    planned_end_date: "2025-01-25",
                    tasks: [
                        { id: "t1", activity_id: "act-1", title: "Design ERD", assignee_name: "มานี รักงาน", estimated_mandays: 3, actual_mandays: 3, status: "done", priority: "high" },
                        { id: "t2", activity_id: "act-1", title: "Create Data Dictionary", assignee_name: "มานี รักงาน", estimated_mandays: 2, actual_mandays: 2, status: "done", priority: "medium" },
                        { id: "t3", activity_id: "act-1", title: "Review with Customer", assignee_name: "สุภาพร ใจดี", estimated_mandays: 2, actual_mandays: 2, status: "done", priority: "high" },
                        { id: "t4", activity_id: "act-1", title: "Finalize Schema", assignee_name: "มานี รักงาน", estimated_mandays: 3, actual_mandays: 2, status: "done", priority: "medium" },
                    ],
                },
                {
                    id: "act-2",
                    milestone_id: "ms-1",
                    activity_code: "ACT-002",
                    name: "Requirement Analysis",
                    owner_name: "วิชัย เก่งกาจ",
                    owner_position: "BA",
                    estimated_mandays: 10,
                    actual_mandays: 9,
                    status: "completed",
                    progress_percent: 100,
                    planned_start_date: "2025-01-15",
                    planned_end_date: "2025-01-31",
                    tasks: [
                        { id: "t5", activity_id: "act-2", title: "Interview Stakeholders", assignee_name: "วิชัย เก่งกาจ", estimated_mandays: 3, actual_mandays: 3, status: "done", priority: "high" },
                        { id: "t6", activity_id: "act-2", title: "Write SRS Document", assignee_name: "วิชัย เก่งกาจ", estimated_mandays: 5, actual_mandays: 4, status: "done", priority: "high" },
                        { id: "t7", activity_id: "act-2", title: "Get Sign-off", assignee_name: "วิชัย เก่งกาจ", estimated_mandays: 2, actual_mandays: 2, status: "done", priority: "urgent" },
                    ],
                },
            ],
        },
        {
            id: "ms-2",
            code: "MS2",
            name: "Development",
            planned_mandays: 50,
            actual_mandays: 36,
            weight_percent: 35,
            status: "in_progress",
            progress_percent: 55,
            planned_start_date: "2025-02-01",
            planned_end_date: "2025-04-30",
            activities: [
                {
                    id: "act-3",
                    milestone_id: "ms-2",
                    activity_code: "ACT-003",
                    name: "Backend Development",
                    owner_name: "ประสิทธิ์ โค้ดดี",
                    owner_position: "PG",
                    estimated_mandays: 30,
                    actual_mandays: 22,
                    status: "in_progress",
                    progress_percent: 60,
                    planned_start_date: "2025-02-01",
                    planned_end_date: "2025-03-31",
                    tasks: [
                        { id: "t8", activity_id: "act-3", title: "Setup Project Structure", assignee_name: "ประสิทธิ์ โค้ดดี", estimated_mandays: 2, actual_mandays: 2, status: "done", priority: "high" },
                        { id: "t9", activity_id: "act-3", title: "User Authentication API", assignee_name: "ประสิทธิ์ โค้ดดี", estimated_mandays: 5, actual_mandays: 5, status: "done", priority: "high" },
                        { id: "t10", activity_id: "act-3", title: "Product CRUD API", assignee_name: "มานี รักงาน", estimated_mandays: 8, actual_mandays: 6, status: "in_progress", priority: "high", due_date: "2025-02-20" },
                        { id: "t11", activity_id: "act-3", title: "Order Management API", assignee_name: "มานี รักงาน", estimated_mandays: 10, actual_mandays: 0, status: "todo", priority: "high", due_date: "2025-03-15" },
                        { id: "t12", activity_id: "act-3", title: "Payment Integration", assignee_name: "ประสิทธิ์ โค้ดดี", estimated_mandays: 5, actual_mandays: 0, status: "todo", priority: "urgent", due_date: "2025-03-31" },
                    ],
                },
                {
                    id: "act-4",
                    milestone_id: "ms-2",
                    activity_code: "ACT-004",
                    name: "Frontend Development",
                    owner_name: "ประสิทธิ์ โค้ดดี",
                    owner_position: "PG",
                    estimated_mandays: 20,
                    actual_mandays: 14,
                    status: "in_progress",
                    progress_percent: 50,
                    planned_start_date: "2025-02-15",
                    planned_end_date: "2025-04-15",
                    tasks: [
                        { id: "t13", activity_id: "act-4", title: "Setup React Project", assignee_name: "มานี รักงาน", estimated_mandays: 1, actual_mandays: 1, status: "done", priority: "high" },
                        { id: "t14", activity_id: "act-4", title: "Login/Register Pages", assignee_name: "มานี รักงาน", estimated_mandays: 4, actual_mandays: 4, status: "done", priority: "high" },
                        { id: "t15", activity_id: "act-4", title: "Product Catalog Page", assignee_name: "มานี รักงาน", estimated_mandays: 5, actual_mandays: 3, status: "in_progress", priority: "high", due_date: "2025-02-25" },
                        { id: "t16", activity_id: "act-4", title: "Shopping Cart", assignee_name: "มานี รักงาน", estimated_mandays: 5, actual_mandays: 0, status: "todo", priority: "medium", due_date: "2025-03-10" },
                        { id: "t17", activity_id: "act-4", title: "Checkout Flow", assignee_name: "มานี รักงาน", estimated_mandays: 5, actual_mandays: 0, status: "todo", priority: "medium", due_date: "2025-03-20" },
                    ],
                },
            ],
        },
        {
            id: "ms-3",
            code: "MS3",
            name: "System Test",
            planned_mandays: 20,
            actual_mandays: 0,
            weight_percent: 15,
            status: "not_started",
            progress_percent: 0,
            planned_start_date: "2025-05-01",
            planned_end_date: "2025-05-31",
            activities: [],
        },
        {
            id: "ms-4",
            code: "MS4",
            name: "User Acceptance Test",
            planned_mandays: 20,
            actual_mandays: 0,
            weight_percent: 20,
            status: "not_started",
            progress_percent: 0,
            planned_start_date: "2025-06-01",
            planned_end_date: "2025-06-20",
            activities: [],
        },
        {
            id: "ms-5",
            code: "MS5",
            name: "Go-Live",
            planned_mandays: 10,
            actual_mandays: 0,
            weight_percent: 10,
            status: "not_started",
            progress_percent: 0,
            planned_start_date: "2025-06-21",
            planned_end_date: "2025-06-30",
            activities: [],
        },
    ],
};

// ============================================
// Status & Priority Config
// ============================================

const statusConfig = {
    not_started: { label: "Not Started", color: "#64748b", bg: "#f1f5f9", icon: Circle },
    in_progress: { label: "In Progress", color: "#3b82f6", bg: "#eff6ff", icon: TrendingUp },
    completed: { label: "Completed", color: "#22c55e", bg: "#f0fdf4", icon: CheckCircle2 },
    on_hold: { label: "On Hold", color: "#f59e0b", bg: "#fffbeb", icon: Pause },
    delayed: { label: "Delayed", color: "#ef4444", bg: "#fef2f2", icon: AlertCircle },
    todo: { label: "To Do", color: "#64748b", bg: "#f1f5f9", icon: Circle },
    review: { label: "Review", color: "#8b5cf6", bg: "#f5f3ff", icon: Target },
    done: { label: "Done", color: "#22c55e", bg: "#f0fdf4", icon: CheckCircle2 },
};

const positionColors = {
    SA: { color: "#8b5cf6", bg: "#f5f3ff" },
    BA: { color: "#f59e0b", bg: "#fffbeb" },
    PG: { color: "#3b82f6", bg: "#eff6ff" },
    PM: { color: "#22c55e", bg: "#f0fdf4" },
};

const priorityConfig = {
    low: { label: "Low", color: "#22c55e" },
    medium: { label: "Medium", color: "#f59e0b" },
    high: { label: "High", color: "#f97316" },
    urgent: { label: "Urgent", color: "#ef4444" },
};

// ============================================
// Components
// ============================================

// Status Badge
const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;
    const Icon = config.icon;

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 500,
                borderRadius: "6px",
                background: config.bg,
                color: config.color,
            }}
        >
            <Icon size={14} />
            {config.label}
        </span>
    );
};

// Position Badge
const PositionBadge = ({ position }: { position: string }) => {
    const config = positionColors[position as keyof typeof positionColors] || positionColors.PG;

    return (
        <span
            style={{
                padding: "2px 8px",
                fontSize: "11px",
                fontWeight: 600,
                borderRadius: "4px",
                background: config.bg,
                color: config.color,
            }}
        >
            {position}
        </span>
    );
};

// Progress Bar
const ProgressBar = ({ percent, size = "md" }: { percent: number; size?: "sm" | "md" }) => {
    const height = size === "sm" ? "6px" : "8px";
    const getColor = (p: number) => {
        if (p >= 100) return "#22c55e";
        if (p >= 75) return "#3b82f6";
        if (p >= 50) return "#f59e0b";
        return "#ef4444";
    };

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
            }}
        >
            <div
                style={{
                    flex: 1,
                    height,
                    background: "#e2e8f0",
                    borderRadius: "4px",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        width: `${Math.min(percent, 100)}%`,
                        height: "100%",
                        background: getColor(percent),
                        borderRadius: "4px",
                        transition: "width 0.3s",
                    }}
                />
            </div>
            <span style={{ fontSize: "12px", fontWeight: 600, color: getColor(percent), minWidth: "40px" }}>
                {percent}%
            </span>
        </div>
    );
};

// Task Row
const TaskRow = ({ task, onEdit }: { task: Task; onEdit: (task: Task) => void }) => {
    const isDone = task.status === "done";

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "24px 1fr 120px 80px 80px 100px 40px",
                gap: "12px",
                padding: "12px 16px",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                opacity: isDone ? 0.7 : 1,
            }}
        >
            {/* Checkbox */}
            <div
                style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "6px",
                    border: isDone ? "none" : "2px solid #cbd5e1",
                    background: isDone ? "#22c55e" : "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    cursor: "pointer",
                }}
            >
                {isDone && <CheckCircle2 size={14} />}
            </div>

            {/* Title */}
            <div>
                <span
                    style={{
                        fontSize: "14px",
                        color: "#1e293b",
                        textDecoration: isDone ? "line-through" : "none",
                    }}
                >
                    {task.title}
                </span>
            </div>

            {/* Assignee */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {task.assignee_name ? (
                    <>
                        <div
                            style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "6px",
                                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "10px",
                                fontWeight: 600,
                            }}
                        >
                            {task.assignee_name.charAt(0)}
                        </div>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                            {task.assignee_name.split(" ")[0]}
                        </span>
                    </>
                ) : (
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>Unassigned</span>
                )}
            </div>

            {/* Mandays */}
            <div style={{ fontSize: "13px", color: "#64748b", textAlign: "center" }}>
                {task.actual_mandays}/{task.estimated_mandays} MD
            </div>

            {/* Due Date */}
            <div style={{ fontSize: "12px", color: "#64748b" }}>
                {task.due_date ? new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
            </div>

            {/* Status */}
            <StatusBadge status={task.status} />

            {/* Actions */}
            <button
                onClick={() => onEdit(task)}
                style={{
                    padding: "6px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    color: "#64748b",
                }}
            >
                <MoreHorizontal size={16} />
            </button>
        </div>
    );
};

// Activity Card
const ActivityCard = ({
    activity,
    onAddTask,
    onEditActivity,
}: {
    activity: Activity;
    onAddTask: (activityId: string) => void;
    onEditActivity: (activity: Activity) => void;
}) => {
    const [isExpanded, setIsExpanded] = React.useState(true);

    return (
        <div
            style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                overflow: "hidden",
                marginBottom: "16px",
            }}
        >
            {/* Activity Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px 20px",
                    background: "#fafbfc",
                    borderBottom: isExpanded ? "1px solid #e2e8f0" : "none",
                    cursor: "pointer",
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <button
                    style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: "white",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#64748b",
                    }}
                >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>{activity.activity_code}</span>
                        <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#1e293b", margin: 0 }}>
                            {activity.name}
                        </h4>
                        <StatusBadge status={activity.status} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        {/* Owner */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <User size={14} color="#64748b" />
                            <span style={{ fontSize: "13px", color: "#64748b" }}>{activity.owner_name}</span>
                            <PositionBadge position={activity.owner_position} />
                        </div>

                        {/* Mandays */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b" }}>
                            <Clock size={14} />
                            {activity.actual_mandays}/{activity.estimated_mandays} MD
                        </div>

                        {/* Tasks Count */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b" }}>
                            <ListTodo size={14} />
                            {activity.tasks.filter((t) => t.status === "done").length}/{activity.tasks.length} Tasks
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div style={{ width: "150px" }}>
                    <ProgressBar percent={activity.progress_percent} size="sm" />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onAddTask(activity.id)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 12px",
                            background: "#6366f1",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "white",
                            cursor: "pointer",
                        }}
                    >
                        <Plus size={14} />
                        Add Task
                    </button>
                    <button
                        onClick={() => onEditActivity(activity)}
                        style={{
                            padding: "8px",
                            background: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            cursor: "pointer",
                            color: "#64748b",
                        }}
                    >
                        <MoreHorizontal size={16} />
                    </button>
                </div>
            </div>

            {/* Tasks List */}
            {isExpanded && activity.tasks.length > 0 && (
                <div>
                    {/* Tasks Header */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "24px 1fr 120px 80px 80px 100px 40px",
                            gap: "12px",
                            padding: "10px 16px",
                            background: "#f8fafc",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                        }}
                    >
                        <div></div>
                        <div>Task</div>
                        <div>Assignee</div>
                        <div style={{ textAlign: "center" }}>Mandays</div>
                        <div>Due Date</div>
                        <div>Status</div>
                        <div></div>
                    </div>

                    {/* Tasks */}
                    {activity.tasks.map((task) => (
                        <TaskRow key={task.id} task={task} onEdit={(t) => console.log("Edit task:", t)} />
                    ))}
                </div>
            )}

            {/* Empty Tasks */}
            {isExpanded && activity.tasks.length === 0 && (
                <div
                    style={{
                        padding: "32px",
                        textAlign: "center",
                        color: "#64748b",
                    }}
                >
                    <ListTodo size={32} color="#cbd5e1" style={{ marginBottom: "8px" }} />
                    <p style={{ margin: 0, fontSize: "14px" }}>No tasks yet</p>
                    <button
                        onClick={() => onAddTask(activity.id)}
                        style={{
                            marginTop: "12px",
                            padding: "8px 16px",
                            background: "#6366f1",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "white",
                            cursor: "pointer",
                        }}
                    >
                        Add First Task
                    </button>
                </div>
            )}
        </div>
    );
};

// Milestone Section
const MilestoneSection = ({
    milestone,
    onAddActivity,
}: {
    milestone: Milestone;
    onAddActivity: (milestoneId: string) => void;
}) => {
    const [isExpanded, setIsExpanded] = React.useState(milestone.status === "in_progress");

    return (
        <div
            style={{
                background: "white",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                overflow: "hidden",
                marginBottom: "24px",
            }}
        >
            {/* Milestone Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "20px 24px",
                    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                    borderBottom: isExpanded ? "1px solid #e2e8f0" : "none",
                    cursor: "pointer",
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <button
                    style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "10px",
                        background: "white",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#64748b",
                    }}
                >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                <div
                    style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: milestone.status === "completed" ? "#dcfce7" : milestone.status === "in_progress" ? "#dbeafe" : "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "14px",
                        color: milestone.status === "completed" ? "#16a34a" : milestone.status === "in_progress" ? "#2563eb" : "#64748b",
                    }}
                >
                    {milestone.code}
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", margin: 0 }}>
                            {milestone.name}
                        </h3>
                        <StatusBadge status={milestone.status} />
                        <span
                            style={{
                                padding: "4px 10px",
                                background: "#f1f5f9",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#64748b",
                            }}
                        >
                            Weight: {milestone.weight_percent}%
                        </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: "13px", color: "#64748b" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Calendar size={14} />
                            {new Date(milestone.planned_start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(milestone.planned_end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Clock size={14} />
                            {milestone.actual_mandays}/{milestone.planned_mandays} Mandays
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Briefcase size={14} />
                            {milestone.activities.length} Activities
                        </span>
                    </div>
                </div>

                {/* Progress */}
                <div style={{ width: "200px" }}>
                    <ProgressBar percent={milestone.progress_percent} />
                </div>

                {/* Add Activity Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddActivity(milestone.id);
                    }}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 16px",
                        background: "#6366f1",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "white",
                        cursor: "pointer",
                    }}
                >
                    <Plus size={16} />
                    Add Activity
                </button>
            </div>

            {/* Activities */}
            {isExpanded && (
                <div style={{ padding: "20px 24px" }}>
                    {milestone.activities.length > 0 ? (
                        milestone.activities.map((activity) => (
                            <ActivityCard
                                key={activity.id}
                                activity={activity}
                                onAddTask={(activityId) => console.log("Add task to:", activityId)}
                                onEditActivity={(act) => console.log("Edit activity:", act)}
                            />
                        ))
                    ) : (
                        <div
                            style={{
                                padding: "48px",
                                textAlign: "center",
                                background: "#f8fafc",
                                borderRadius: "12px",
                                border: "2px dashed #e2e8f0",
                            }}
                        >
                            <Briefcase size={40} color="#cbd5e1" style={{ marginBottom: "12px" }} />
                            <h4 style={{ fontSize: "16px", fontWeight: 600, color: "#64748b", margin: "0 0 4px" }}>
                                No activities yet
                            </h4>
                            <p style={{ fontSize: "14px", color: "#94a3b8", margin: "0 0 16px" }}>
                                Create activities and assign them to SA/BA/PG
                            </p>
                            <button
                                onClick={() => onAddActivity(milestone.id)}
                                style={{
                                    padding: "12px 24px",
                                    background: "#6366f1",
                                    border: "none",
                                    borderRadius: "10px",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    color: "white",
                                    cursor: "pointer",
                                }}
                            >
                                Create First Activity
                            </button>
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

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const project = mockProject;

    const handleAddActivity = (milestoneId: string) => {
        console.log("Add activity to milestone:", milestoneId);
        // Open modal or navigate to create activity page
    };

    return (
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <button
                    onClick={() => router.push("/projects")}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 16px",
                        background: "transparent",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#64748b",
                        marginBottom: "16px",
                    }}
                >
                    <ArrowLeft size={18} />
                    Back to Projects
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                            <span style={{ fontSize: "14px", color: "#64748b" }}>{project.project_code}</span>
                            <StatusBadge status={project.status} />
                        </div>
                        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1e293b", margin: "0 0 8px" }}>
                            {project.project_name}
                        </h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: "14px", color: "#64748b" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Users size={16} />
                                {project.customer_name}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <User size={16} />
                                PM: {project.project_manager_name}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                        <button
                            style={{
                                padding: "12px 20px",
                                background: "white",
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#475569",
                                cursor: "pointer",
                            }}
                        >
                            <Edit size={18} style={{ marginRight: "8px" }} />
                            Edit Project
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "16px",
                    marginBottom: "32px",
                }}
            >
                <div
                    style={{
                        padding: "20px",
                        background: "white",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                    }}
                >
                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>Overall Progress</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>
                        {project.progress_percent}%
                    </div>
                    <ProgressBar percent={project.progress_percent} size="sm" />
                </div>
                <div
                    style={{
                        padding: "20px",
                        background: "white",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                    }}
                >
                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>Mandays Used</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "#1e293b" }}>
                        {project.actual_mandays}
                        <span style={{ fontSize: "16px", fontWeight: 400, color: "#64748b" }}>
                            /{project.sold_mandays}
                        </span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>
                        {project.sold_mandays - project.actual_mandays} remaining
                    </div>
                </div>
                <div
                    style={{
                        padding: "20px",
                        background: "white",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                    }}
                >
                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>Milestones</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "#1e293b" }}>
                        {project.milestones.filter((m) => m.status === "completed").length}
                        <span style={{ fontSize: "16px", fontWeight: 400, color: "#64748b" }}>
                            /{project.milestones.length}
                        </span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>completed</div>
                </div>
                <div
                    style={{
                        padding: "20px",
                        background: "white",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                    }}
                >
                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>Activities</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "#1e293b" }}>
                        {project.milestones.reduce((sum, m) => sum + m.activities.filter((a) => a.status === "completed").length, 0)}
                        <span style={{ fontSize: "16px", fontWeight: 400, color: "#64748b" }}>
                            /{project.milestones.reduce((sum, m) => sum + m.activities.length, 0)}
                        </span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>completed</div>
                </div>
            </div>

            {/* Milestones */}
            <div>
                <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#1e293b", marginBottom: "16px" }}>
                    Milestones & Activities
                </h2>

                {project.milestones.map((milestone) => (
                    <MilestoneSection
                        key={milestone.id}
                        milestone={milestone}
                        onAddActivity={handleAddActivity}
                    />
                ))}
            </div>
        </div>
    );
}
