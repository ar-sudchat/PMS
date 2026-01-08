"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import {
    Building2,
    Calendar,
    Users,
    DollarSign,
    Plus,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    Info,
} from "lucide-react";
import { SuperTable } from "@/components/shared/SuperTable/SuperTable";
import { ColumnDef } from "@tanstack/react-table";

// ============================================
// Types
// ============================================

interface Customer {
    id: string;
    code: string;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
}

interface Milestone {
    id: string;
    name: string;
    mandays: number;
    weight_percent: number;
    planned_start_date: string;
    planned_end_date: string;
    deliverables?: string;
}

export interface ProjectFormData {
    // Basic Info
    project_code: string;
    project_name: string;
    project_name_th?: string;
    description?: string;

    // Customer
    customer_id: string;

    // Contract
    contract_start_date: string;
    contract_end_date: string;
    warranty_end_date?: string;

    // Mandays & Pricing
    sold_mandays: number;
    manday_rate: number;
    total_value: number;

    // Team
    project_manager_id: string;

    // Milestones
    milestones: Milestone[];
}

// ============================================
// Mock Data
// ============================================

const mockCustomers: Customer[] = [
    { id: "cust-1", code: "ABC", name: "ABC Company", contact_person: "คุณสมชาย", email: "contact@abc.com", phone: "02-123-4567" },
    { id: "cust-2", code: "XYZ", name: "XYZ Bank", contact_person: "คุณสุภาพร", email: "contact@xyz.com", phone: "02-234-5678" },
    { id: "cust-3", code: "TECH", name: "Tech Solutions", contact_person: "คุณวิชัย", email: "contact@tech.com", phone: "02-345-6789" },
    { id: "cust-4", code: "DIG", name: "Digital Agency", contact_person: "คุณมานี", email: "contact@digital.com", phone: "02-456-7890" },
];

const mockProjectManagers = [
    { id: "user-1", name: "สมชาย มานะ", position: "Project Manager" },
    { id: "user-2", name: "สุภาพร ใจดี", position: "System Analyst" },
];

const defaultMilestones: Omit<Milestone, "id">[] = [
    { name: "Mapping Data", mandays: 0, weight_percent: 20, planned_start_date: "", planned_end_date: "", deliverables: "SRS, ERD, Data Dictionary" },
    { name: "Development", mandays: 0, weight_percent: 35, planned_start_date: "", planned_end_date: "", deliverables: "Source Code, Unit Test" },
    { name: "System Test", mandays: 0, weight_percent: 15, planned_start_date: "", planned_end_date: "", deliverables: "Test Cases, Test Report" },
    { name: "User Acceptance Test", mandays: 0, weight_percent: 20, planned_start_date: "", planned_end_date: "", deliverables: "UAT Sign-off" },
    { name: "Go-Live", mandays: 0, weight_percent: 10, planned_start_date: "", planned_end_date: "", deliverables: "Deployment, User Manual" },
];

// ============================================
// Helper Components
// ============================================

const FormSection = ({
    title,
    icon: Icon,
    children,
    description,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    description?: string;
}) => (
    <div
        style={{
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "24px",
            marginBottom: "24px",
        }}
    >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div
                style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#eef2ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6366f1",
                }}
            >
                <Icon size={20} />
            </div>
            <div>
                <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", margin: 0 }}>{title}</h2>
                {description && (
                    <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0" }}>{description}</p>
                )}
            </div>
        </div>
        <div style={{ marginTop: "20px" }}>{children}</div>
    </div>
);

const FormField = ({
    label,
    required,
    error,
    children,
    hint,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
    hint?: string;
}) => (
    <div style={{ marginBottom: "16px" }}>
        <label
            style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#475569",
                marginBottom: "6px",
            }}
        >
            {label}
            {required && <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>}
        </label>
        {children}
        {hint && !error && (
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{hint}</p>
        )}
        {error && (
            <p style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                <AlertTriangle size={12} />
                {error}
            </p>
        )}
    </div>
);

const Input = ({
    type = "text",
    value,
    onChange,
    placeholder,
    disabled,
    style: customStyle,
}: {
    type?: string;
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    style?: React.CSSProperties;
}) => (
    <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
            width: "100%",
            padding: "12px 16px",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            fontSize: "14px",
            color: disabled ? "#94a3b8" : "#1e293b",
            background: disabled ? "#f8fafc" : "white",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
            ...customStyle,
        }}
        onFocus={(e) => {
            e.currentTarget.style.borderColor = "#6366f1";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
        }}
        onBlur={(e) => {
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.boxShadow = "none";
        }}
    />
);

const Select = ({
    value,
    onChange,
    options,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
}) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
            width: "100%",
            padding: "12px 16px",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            fontSize: "14px",
            color: value ? "#1e293b" : "#94a3b8",
            background: "white",
            cursor: "pointer",
            outline: "none",
        }}
    >
        {placeholder && (
            <option value="" disabled>
                {placeholder}
            </option>
        )}
        {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
                {opt.label}
            </option>
        ))}
    </select>
);

const Textarea = ({
    value,
    onChange,
    placeholder,
    rows = 3,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
}) => (
    <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
            width: "100%",
            padding: "12px 16px",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            fontSize: "14px",
            color: "#1e293b",
            resize: "vertical",
            outline: "none",
            fontFamily: "inherit",
        }}
    />
);

// ============================================
// Milestone Configuration Component
// ============================================

const MilestoneConfig = ({
    milestones,
    onChange,
    totalMandays,
}: {
    milestones: Milestone[];
    onChange: (milestones: Milestone[]) => void;
    totalMandays: number;
}) => {
    const totalWeight = milestones.reduce((sum, m) => sum + m.weight_percent, 0);
    const totalMilestoneMandays = milestones.reduce((sum, m) => sum + m.mandays, 0);
    const isWeightValid = totalWeight === 100;
    const isMandaysValid = totalMilestoneMandays === totalMandays || totalMandays === 0;

    const addMilestone = () => {
        const newMilestone: Milestone = {
            id: `ms-${Date.now()}`,
            name: "",
            mandays: 0,
            weight_percent: 0,
            planned_start_date: "",
            planned_end_date: "",
            deliverables: "",
        };
        onChange([...milestones, newMilestone]);
    };

    const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
        const updated = [...milestones];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    const removeMilestone = (index: number) => {
        if (milestones.length <= 1) return;
        onChange(milestones.filter((_, i) => i !== index));
    };

    // Auto-distribute mandays based on weight
    const autoDistributeMandays = () => {
        if (totalMandays === 0 || totalWeight !== 100) return;

        const updated = milestones.map((m) => ({
            ...m,
            mandays: Math.round((m.weight_percent / 100) * totalMandays),
        }));

        // Adjust rounding difference
        const diff = totalMandays - updated.reduce((sum, m) => sum + m.mandays, 0);
        if (diff !== 0 && updated.length > 0) {
            updated[updated.length - 1].mandays += diff;
        }

        onChange(updated);
    };

    const columns: ColumnDef<Milestone>[] = [
        {
            header: "Milestone Name",
            accessorKey: "name",
            cell: ({ row }) => (
                <input
                    type="text"
                    value={row.original.name}
                    onChange={(e) => updateMilestone(row.index, "name", e.target.value)}
                    placeholder="Milestone name"
                    style={{
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        width: "100%",
                        outline: "none",
                    }}
                />
            ),
        },
        {
            header: "Mandays",
            accessorKey: "mandays",
            size: 100,
            cell: ({ row }) => (
                <input
                    type="number"
                    value={row.original.mandays || ""}
                    onChange={(e) => updateMilestone(row.index, "mandays", Number(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    style={{
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        textAlign: "center",
                        width: "100%",
                        outline: "none",
                    }}
                />
            ),
        },
        {
            header: "Weight (%)",
            accessorKey: "weight_percent",
            size: 100,
            cell: ({ row }) => (
                <input
                    type="number"
                    value={row.original.weight_percent || ""}
                    onChange={(e) => updateMilestone(row.index, "weight_percent", Number(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    max="100"
                    style={{
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        textAlign: "center",
                        width: "100%",
                        outline: "none",
                    }}
                />
            ),
        },
        {
            header: "Start Date",
            accessorKey: "planned_start_date",
            size: 150,
            cell: ({ row }) => (
                <input
                    type="date"
                    value={row.original.planned_start_date}
                    onChange={(e) => updateMilestone(row.index, "planned_start_date", e.target.value)}
                    style={{
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        width: "100%",
                        outline: "none",
                    }}
                />
            ),
        },
        {
            header: "End Date",
            accessorKey: "planned_end_date",
            size: 150,
            cell: ({ row }) => (
                <input
                    type="date"
                    value={row.original.planned_end_date}
                    onChange={(e) => updateMilestone(row.index, "planned_end_date", e.target.value)}
                    style={{
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        width: "100%",
                        outline: "none",
                    }}
                />
            ),
        },
        {
            header: "Deliverables",
            accessorKey: "deliverables",
            cell: ({ row }) => (
                <input
                    type="text"
                    value={row.original.deliverables || ""}
                    onChange={(e) => updateMilestone(row.index, "deliverables", e.target.value)}
                    placeholder="Documents, Sign-off, etc."
                    style={{
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        width: "100%",
                        outline: "none",
                    }}
                />
            ),
        },
        {
            id: "actions",
            header: "",
            size: 50,
            cell: ({ row }) => (
                <button
                    type="button"
                    onClick={() => removeMilestone(row.index)}
                    disabled={milestones.length <= 1}
                    style={{
                        width: "36px",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "transparent",
                        border: "none",
                        borderRadius: "8px",
                        cursor: milestones.length <= 1 ? "not-allowed" : "pointer",
                        color: milestones.length <= 1 ? "#cbd5e1" : "#ef4444",
                    }}
                >
                    <Trash2 size={18} />
                </button>
            ),
        },
    ];

    return (
        <div>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                }}
            >
                <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", margin: 0 }}>
                        Milestone Configuration (KPI)
                    </h3>
                    <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
                        กำหนด Milestone และ Weight สำหรับคำนวณ KPI
                    </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        type="button"
                        onClick={autoDistributeMandays}
                        disabled={totalMandays === 0 || totalWeight !== 100}
                        style={{
                            padding: "10px 16px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: totalMandays === 0 || totalWeight !== 100 ? "#94a3b8" : "#475569",
                            cursor: totalMandays === 0 || totalWeight !== 100 ? "not-allowed" : "pointer",
                        }}
                    >
                        Auto Distribute MD
                    </button>
                    <button
                        type="button"
                        onClick={addMilestone}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "10px 16px",
                            background: "#6366f1",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "white",
                            cursor: "pointer",
                        }}
                    >
                        <Plus size={16} />
                        Add Milestone
                    </button>
                </div>
            </div>

            {/* SuperTable */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                <SuperTable
                    data={milestones}
                    columns={columns}
                    enableSorting={false}
                    enableGlobalFilter={false}
                    enablePagination={false}
                    enableColumnVisibility={false}
                    size="md"
                />

                {/* Summary Logic - Moved outside table body */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 100px 100px 150px 150px 1fr 50px", // Approximate column widths
                        gap: "0px",
                        padding: "12px 16px",
                        background: "#f8fafc",
                        borderTop: "1px solid #e2e8f0",
                        fontWeight: 600,
                        fontSize: "14px",
                    }}
                >
                    <div style={{ color: "#1e293b", paddingLeft: "16px" }}>Total</div>
                    <div
                        style={{
                            textAlign: "center",
                            color: isMandaysValid ? "#22c55e" : "#ef4444",
                        }}
                    >
                        {totalMilestoneMandays} / {totalMandays}
                    </div>
                    <div
                        style={{
                            textAlign: "center",
                            color: isWeightValid ? "#22c55e" : "#ef4444",
                        }}
                    >
                        {totalWeight}%
                    </div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
            </div>

            {/* Validation Messages */}
            {!isWeightValid && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 16px",
                        background: "#fef3c7",
                        border: "1px solid #fcd34d",
                        borderRadius: "8px",
                        marginTop: "12px",
                        fontSize: "13px",
                        color: "#92400e",
                    }}
                >
                    <AlertTriangle size={16} />
                    Milestone weights must sum to exactly 100% for correct KPI calculation. (Current: {totalWeight}%)
                </div>
            )}

            {totalMandays > 0 && !isMandaysValid && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 16px",
                        background: "#fef3c7",
                        border: "1px solid #fcd34d",
                        borderRadius: "8px",
                        marginTop: "12px",
                        fontSize: "13px",
                        color: "#92400e",
                    }}
                >
                    <AlertTriangle size={16} />
                    Total milestone mandays ({totalMilestoneMandays}) does not match sold mandays ({totalMandays})
                </div>
            )}

            {isWeightValid && (totalMandays === 0 || isMandaysValid) && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 16px",
                        background: "#dcfce7",
                        border: "1px solid #86efac",
                        borderRadius: "8px",
                        marginTop: "12px",
                        fontSize: "13px",
                        color: "#166534",
                    }}
                >
                    <CheckCircle2 size={16} />
                    Milestone configuration is valid
                </div>
            )}
        </div>
    );
};

// ============================================
// Main Component
// ============================================

interface CreateProjectModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function CreateProjectModal({ open, onClose, onSuccess }: CreateProjectModalProps) {
    const currentYear = new Date().getFullYear();

    // Form State
    const [formData, setFormData] = React.useState<ProjectFormData>({
        project_code: `PRJ-${currentYear}-`,
        project_name: "",
        project_name_th: "",
        description: "",
        customer_id: "",
        contract_start_date: "",
        contract_end_date: "",
        warranty_end_date: "",
        sold_mandays: 0,
        manday_rate: 15000,
        total_value: 0,
        project_manager_id: "",
        milestones: defaultMilestones.map((m, i) => ({ ...m, id: `ms-${i}` })),
    });

    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

    // Calculate total value
    React.useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            total_value: prev.sold_mandays * prev.manday_rate,
        }));
    }, [formData.sold_mandays, formData.manday_rate]);

    // Handle customer selection
    const handleCustomerChange = (customerId: string) => {
        const customer = mockCustomers.find((c) => c.id === customerId);
        setSelectedCustomer(customer || null);
        setFormData((prev) => ({ ...prev, customer_id: customerId }));
    };

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Form Data:", formData);
        // TODO: API call to create project
        if (onSuccess) onSuccess();
        onClose();
    };

    return (
        <Modal open={open} onClose={onClose} title="Create New Project" size="xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Basic Information */}
                <FormSection title="Project Information" icon={Info}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <FormField label="Project Code" required>
                            <Input
                                value={formData.project_code}
                                onChange={(v) => setFormData({ ...formData, project_code: v })}
                                placeholder="PRJ-2025-001"
                            />
                        </FormField>

                        <FormField label="Project Name (English)" required>
                            <Input
                                value={formData.project_name}
                                onChange={(v) => setFormData({ ...formData, project_name: v })}
                                placeholder="Enter project name"
                            />
                        </FormField>

                        <FormField label="Project Name (Thai)">
                            <Input
                                value={formData.project_name_th || ""}
                                onChange={(v) => setFormData({ ...formData, project_name_th: v })}
                                placeholder="ชื่อโครงการภาษาไทย"
                            />
                        </FormField>

                        <FormField label="Project Manager" required>
                            <Select
                                value={formData.project_manager_id}
                                onChange={(v) => setFormData({ ...formData, project_manager_id: v })}
                                options={mockProjectManagers.map((pm) => ({
                                    value: pm.id,
                                    label: `${pm.name} (${pm.position})`,
                                }))}
                                placeholder="Select project manager"
                            />
                        </FormField>
                    </div>

                    <FormField label="Description">
                        <Textarea
                            value={formData.description || ""}
                            onChange={(v) => setFormData({ ...formData, description: v })}
                            placeholder="Brief description of the project..."
                            rows={3}
                        />
                    </FormField>
                </FormSection>

                {/* Section 2: Customer Information */}
                <FormSection
                    title="Customer Information"
                    icon={Building2}
                    description="Select or create a customer for this project"
                >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <FormField label="Customer" required>
                            <Select
                                value={formData.customer_id}
                                onChange={handleCustomerChange}
                                options={mockCustomers.map((c) => ({
                                    value: c.id,
                                    label: `[${c.code}] ${c.name}`,
                                }))}
                                placeholder="Select customer"
                            />
                        </FormField>

                        {selectedCustomer && (
                            <>
                                <FormField label="Contact Person">
                                    <Input value={selectedCustomer.contact_person || ""} onChange={() => { }} disabled />
                                </FormField>
                                <FormField label="Email">
                                    <Input value={selectedCustomer.email || ""} onChange={() => { }} disabled />
                                </FormField>
                                <FormField label="Phone">
                                    <Input value={selectedCustomer.phone || ""} onChange={() => { }} disabled />
                                </FormField>
                            </>
                        )}
                    </div>

                    {!selectedCustomer && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "12px 16px",
                                background: "#f0f9ff",
                                border: "1px solid #bae6fd",
                                borderRadius: "8px",
                                marginTop: "8px",
                                fontSize: "13px",
                                color: "#0369a1",
                            }}
                        >
                            <Info size={16} />
                            Select a customer or{" "}
                            <button
                                type="button"
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#0369a1",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                }}
                            >
                                create a new customer
                            </button>
                        </div>
                    )}
                </FormSection>

                {/* Section 3: Contract & Timeline */}
                <FormSection title="Contract & Timeline" icon={Calendar}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                        <FormField label="Contract Start Date" required>
                            <Input
                                type="date"
                                value={formData.contract_start_date}
                                onChange={(v) => setFormData({ ...formData, contract_start_date: v })}
                            />
                        </FormField>

                        <FormField label="Contract End Date" required>
                            <Input
                                type="date"
                                value={formData.contract_end_date}
                                onChange={(v) => setFormData({ ...formData, contract_end_date: v })}
                            />
                        </FormField>

                        <FormField label="Warranty End Date" hint="หลังจาก Go-Live">
                            <Input
                                type="date"
                                value={formData.warranty_end_date || ""}
                                onChange={(v) => setFormData({ ...formData, warranty_end_date: v })}
                            />
                        </FormField>
                    </div>
                </FormSection>

                {/* Section 4: Pricing */}
                <FormSection title="Mandays & Pricing" icon={DollarSign}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                        <FormField label="Sold Mandays" required hint="จำนวนวันทำงานที่ขายให้ลูกค้า">
                            <Input
                                type="number"
                                value={formData.sold_mandays || ""}
                                onChange={(v) => setFormData({ ...formData, sold_mandays: Number(v) || 0 })}
                                placeholder="0"
                            />
                        </FormField>

                        <FormField label="Manday Rate (THB)" required hint="อัตราค่าจ้างต่อวัน">
                            <Input
                                type="number"
                                value={formData.manday_rate || ""}
                                onChange={(v) => setFormData({ ...formData, manday_rate: Number(v) || 0 })}
                                placeholder="15000"
                            />
                        </FormField>

                        <FormField label="Total Value (THB)" hint="คำนวณอัตโนมัติ">
                            <Input
                                value={formData.total_value.toLocaleString()}
                                onChange={() => { }}
                                disabled
                                style={{ fontWeight: 600, color: "#22c55e" }}
                            />
                        </FormField>
                    </div>
                </FormSection>

                {/* Section 5: Milestone Configuration */}
                <FormSection title="Milestone Configuration" icon={CheckCircle2}>
                    <MilestoneConfig
                        milestones={formData.milestones}
                        onChange={(milestones) => setFormData({ ...formData, milestones })}
                        totalMandays={formData.sold_mandays}
                    />
                </FormSection>

                {/* Actions */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "12px",
                        paddingTop: "24px",
                        borderTop: "1px solid #e2e8f0",
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: "14px 28px",
                            background: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "#475569",
                            cursor: "pointer",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        style={{
                            padding: "14px 28px",
                            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                            border: "none",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "white",
                            cursor: "pointer",
                            boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
                        }}
                    >
                        Create Project
                    </button>
                </div>
            </form>
        </Modal>
    );
}
