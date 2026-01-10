"use client";

import * as React from "react";
import { SmartCombobox, Option as ComboboxOption } from "@/components/shared/SmartCombobox";
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
    const [value, setValue] = React.useState<ComboboxOption | null>(null);

    return (
        <SmartCombobox
            label="Role (Single Select)"
            placeholder="Select role..."
            options={basicOptions}
            value={value}
            onChange={(v) => setValue(v as ComboboxOption)}
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
    const [skill, setSkill] = React.useState<ComboboxOption | null>(null);

    return (
        <SmartCombobox
            label="Skills (Single select only - multi not yet supported)"
            placeholder="Select skill..."
            options={skillOptions}
            value={skill}
            onChange={(v) => setSkill(v)}
        />
    );
}

// ============================================
// 3. With Custom Render (Employee Select)
// ============================================

const employeeOptions: ComboboxOption[] = [
    { value: "1", label: "John Doe - Senior Developer" },
    { value: "2", label: "Sarah Smith - UI Designer" },
    { value: "3", label: "Mike Chen - Backend Developer" },
];

export function EmployeeSelect() {
    const [assignee, setAssignee] = React.useState<ComboboxOption | null>(null);

    return (
        <SmartCombobox
            label="Assignee (Custom render not yet supported)"
            placeholder="Select team member..."
            options={employeeOptions}
            value={assignee}
            onChange={(v) => setAssignee(v)}
        />
    );
}

// ============================================
// 4. Grouped Options
// ============================================

const departmentOptions: ComboboxOption[] = [
    { value: "dev-1", label: "Development - Frontend Team" },
    { value: "dev-2", label: "Development - Backend Team" },
    { value: "dev-3", label: "Development - Mobile Team" },
    { value: "design-1", label: "Design - UI/UX Team" },
    { value: "design-2", label: "Design - Graphic Team" },
    { value: "mkt-1", label: "Marketing - Digital Marketing" },
    { value: "mkt-2", label: "Marketing - Content Team" },
];

export function GroupedSelect() {
    const [team, setTeam] = React.useState<ComboboxOption | null>(null);

    return (
        <SmartCombobox
            label="Team (Grouped not yet supported)"
            placeholder="Select team..."
            options={departmentOptions}
            value={team}
            onChange={(v) => setTeam(v)}
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
        { value: "cust-1", label: "ABC Company - Bangkok" },
        { value: "cust-2", label: "XYZ Corporation - Chiang Mai" },
        { value: "cust-3", label: "Tech Solutions - Phuket" },
        { value: "cust-4", label: "Digital Agency - Pattaya" },
        { value: "cust-5", label: "Innovation Hub - Bangkok" },
    ];

    if (!query) return allCustomers;

    return allCustomers.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase())
    );
};

export function AsyncSelect() {
    const [customer, setCustomer] = React.useState<ComboboxOption | null>(null);
    const [asyncOptions, setAsyncOptions] = React.useState<ComboboxOption[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);

    React.useEffect(() => {
        setIsSearching(true);
        searchCustomers('').then(options => {
            setAsyncOptions(options);
            setIsSearching(false);
        });
    }, []);

    return (
        <SmartCombobox
            label="Customer (Async/Creatable not yet supported)"
            placeholder="Search customer..."
            options={asyncOptions}
            value={customer}
            onChange={(v) => setCustomer(v)}
            isLoading={isSearching}
        />
    );
}

// ============================================
// 6. Project Select (for Timesheet)
// ============================================

const projectOptions: ComboboxOption[] = [
    { value: "prj-001", label: "E-Commerce Website - ABC Company" },
    { value: "prj-002", label: "Mobile App - XYZ Corp" },
    { value: "prj-003", label: "ERP System - Tech Solutions" },
];

export function ProjectSelect() {
    const [project, setProject] = React.useState<ComboboxOption | null>(null);

    return (
        <SmartCombobox
            label="Project"
            placeholder="Select project..."
            options={projectOptions}
            value={project}
            onChange={(v) => setProject(v)}
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
