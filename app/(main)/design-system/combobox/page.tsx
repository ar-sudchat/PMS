"use client";

import * as React from "react";
import { SmartCombobox, ComboboxOption } from "@/components/shared/SmartCombobox/SmartCombobox";
import { User, Building, Briefcase, MapPin } from "lucide-react";

// ============================================
// 1. Basic Single Select
// ============================================

const basicOptions: ComboboxOption[] = [
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "member", label: "Member" },
    { value: "viewer", label: "Viewer" },
];

export function BasicSelect() {
    const [value, setValue] = React.useState<string | null>(null);

    return (
        <SmartCombobox
            label="Role (Single Select)"
            placeholder="Select role..."
            options={basicOptions}
            value={value}
            onChange={(v) => setValue(v as string)}
            required
        />
    );
}

// ============================================
// 2. Multiple Select
// ============================================

const skillOptions: ComboboxOption[] = [
    { value: "react", label: "React" },
    { value: "vue", label: "Vue.js" },
    { value: "angular", label: "Angular" },
    { value: "nextjs", label: "Next.js" },
    { value: "typescript", label: "TypeScript" },
    { value: "nodejs", label: "Node.js" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
];

export function MultipleSelect() {
    const [skills, setSkills] = React.useState<string[]>([]);

    return (
        <SmartCombobox
            label="Skills (Multi-select + Creatable)"
            placeholder="Select skills..."
            options={skillOptions}
            value={skills}
            onChange={(v) => setSkills(v as string[])}
            multiple
            creatable
            onCreate={(value) => ({ value: value.toLowerCase(), label: value })}
        />
    );
}

// ============================================
// 3. With Custom Render (Employee Select)
// ============================================

const employeeOptions: ComboboxOption[] = [
    {
        value: "1",
        label: "John Doe",
        description: "Senior Developer",
        image: "https://i.pravatar.cc/100?u=1",
        data: { department: "Development" },
    },
    {
        value: "2",
        label: "Sarah Smith",
        description: "UI Designer",
        image: "https://i.pravatar.cc/100?u=2",
        data: { department: "Design" },
    },
    {
        value: "3",
        label: "Mike Chen",
        description: "Backend Developer",
        image: "https://i.pravatar.cc/100?u=3",
        data: { department: "Development" },
    },
];

export function EmployeeSelect() {
    const [assignee, setAssignee] = React.useState<string | null>(null);

    return (
        <SmartCombobox
            label="Assignee (Custom Render)"
            placeholder="Select team member..."
            options={employeeOptions}
            value={assignee}
            onChange={(v) => setAssignee(v as string)}
            renderOption={(option, isSelected) => (
                <>
                    <img
                        src={option.image}
                        alt=""
                        style={{ width: 40, height: 40, borderRadius: 10 }}
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{option.label}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                            {option.description} • {option.data?.department}
                        </div>
                    </div>
                </>
            )}
            renderValue={(option) => (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img
                        src={option.image}
                        alt=""
                        style={{ width: 24, height: 24, borderRadius: 6 }}
                    />
                    {option.label}
                </div>
            )}
        />
    );
}

// ============================================
// 4. Grouped Options
// ============================================

const departmentOptions: ComboboxOption[] = [
    { value: "dev-1", label: "Frontend Team", group: "Development" },
    { value: "dev-2", label: "Backend Team", group: "Development" },
    { value: "dev-3", label: "Mobile Team", group: "Development" },
    { value: "design-1", label: "UI/UX Team", group: "Design" },
    { value: "design-2", label: "Graphic Team", group: "Design" },
    { value: "mkt-1", label: "Digital Marketing", group: "Marketing" },
    { value: "mkt-2", label: "Content Team", group: "Marketing" },
];

export function GroupedSelect() {
    const [team, setTeam] = React.useState<string | null>(null);

    return (
        <SmartCombobox
            label="Team (Grouped)"
            placeholder="Select team..."
            options={departmentOptions}
            value={team}
            onChange={(v) => setTeam(v as string)}
            grouped
        />
    );
}

// ============================================
// 5. Async Search (API)
// ============================================

// Simulate API call
const searchCustomers = async (query: string): Promise<ComboboxOption[]> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const allCustomers = [
        { value: "cust-1", label: "ABC Company", description: "Bangkok" },
        { value: "cust-2", label: "XYZ Corporation", description: "Chiang Mai" },
        { value: "cust-3", label: "Tech Solutions", description: "Phuket" },
        { value: "cust-4", label: "Digital Agency", description: "Pattaya" },
        { value: "cust-5", label: "Innovation Hub", description: "Bangkok" },
    ];

    if (!query) return allCustomers;

    return allCustomers.filter(
        (c) =>
            c.label.toLowerCase().includes(query.toLowerCase()) ||
            c.description?.toLowerCase().includes(query.toLowerCase())
    );
};

export function AsyncSelect() {
    const [customer, setCustomer] = React.useState<string | null>(null);

    return (
        <SmartCombobox
            label="Customer (Async Search)"
            placeholder="Search customer..."
            async
            onSearch={searchCustomers}
            value={customer}
            onChange={(v) => setCustomer(v as string)}
            creatable
            onCreate={async (value) => {
                // Simulate API create
                await new Promise((resolve) => setTimeout(resolve, 500));
                return { value: `new-${Date.now()}`, label: value };
            }}
        />
    );
}

// ============================================
// 6. Project Select (for Timesheet)
// ============================================

const projectOptions: ComboboxOption[] = [
    {
        value: "prj-001",
        label: "E-Commerce Website",
        description: "ABC Company • In Progress",
        icon: <Briefcase size={18} />,
        data: { customer: "ABC Company", status: "in_progress" },
    },
    {
        value: "prj-002",
        label: "Mobile App",
        description: "XYZ Corp • UAT",
        icon: <Briefcase size={18} />,
        data: { customer: "XYZ Corp", status: "uat" },
    },
    {
        value: "prj-003",
        label: "ERP System",
        description: "Tech Solutions • Development",
        icon: <Briefcase size={18} />,
        data: { customer: "Tech Solutions", status: "development" },
    },
];

export function ProjectSelect() {
    const [project, setProject] = React.useState<string | null>(null);

    return (
        <SmartCombobox
            label="Project (With Icon & Size LG)"
            placeholder="Select project..."
            options={projectOptions}
            value={project}
            onChange={(v) => setProject(v as string)}
            size="lg"
        />
    );
}

// ============================================
// Full Demo Page
// ============================================

export default function ComboboxDemo() {
    return (
        <div className="pt-6">
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    SmartCombobox Component
                </h1>
                <p className="text-slate-500 mb-8">
                    A versatile and powerful combobox component supporting single/multi-select, async search, and custom rendering.
                </p>

                <div className="space-y-8 bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <BasicSelect />
                        <MultipleSelect />
                        <EmployeeSelect />
                        <GroupedSelect />
                        <AsyncSelect />
                        <ProjectSelect />
                    </div>
                </div>
            </div>
        </div>
    );
}
