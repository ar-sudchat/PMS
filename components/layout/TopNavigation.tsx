// components/layout/TopNavigation.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Briefcase,
    CheckSquare,
    Clock,
    Users,
    BarChart3,
    Settings,
    Bell,
    Search,
    ChevronDown,
    LogOut,
    User,
    Menu,
    X,
} from "lucide-react";

// ============================================
// Types
// ============================================

interface NavItem {
    icon: React.ElementType;
    label: string;
    href: string;
    children?: { label: string; href: string; description?: string }[];
}

// ============================================
// Navigation Config
// ============================================

const navItems: NavItem[] = [
    {
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/dashboard",
    },
    {
        icon: Briefcase,
        label: "Projects",
        href: "/projects",
        children: [
            { label: "All Projects", href: "/projects", description: "View all projects" },
            { label: "Customers", href: "/projects/settings/customers", description: "Manage customers" },
            { label: "Milestones", href: "/projects/settings/milestones", description: "Configure milestones" },
            { label: "Deliverables", href: "/projects/settings/deliverables", description: "Configure deliverables" },
            { label: "Statuses", href: "/projects/settings/statuses", description: "Configure project statuses" },
        ],
    },
    {
        icon: CheckSquare,
        label: "Tasks",
        href: "/tasks",
        children: [
            { label: "My Tasks", href: "/tasks", description: "Your assigned tasks" },
            { label: "Kanban Board", href: "/tasks/board", description: "Visual task board" },
            { label: "Calendar", href: "/tasks/calendar", description: "Task calendar view" },
        ],
    },
    {
        icon: Clock,
        label: "Timesheet",
        href: "/timesheet",
        children: [
            { label: "My Timesheet", href: "/timesheet", description: "Log your hours" },
            { label: "Approvals", href: "/timesheet/approvals", description: "Approve timesheets" },
            { label: "Reports", href: "/timesheet/reports", description: "Time reports" },
        ],
    },
    {
        icon: Users,
        label: "Team",
        href: "/team",
        children: [
            { label: "All Members", href: "/team", description: "View team members" },
            { label: "Departments", href: "/team/departments", description: "Manage departments" },
            { label: "Positions", href: "/team/positions", description: "Job positions" },
        ],
    },
    {
        icon: BarChart3,
        label: "Reports",
        href: "/reports",
        children: [
            { label: "KPI Dashboard", href: "/reports/kpi", description: "Department & Personal KPIs" },
            { label: "Project Reports", href: "/reports/projects", description: "Project analytics" },
            { label: "Resource Reports", href: "/reports/resources", description: "Resource utilization" },
        ],
    },
];

// ============================================
// Dropdown Menu Component
// ============================================

const NavDropdown = ({
    item,
    isActive,
}: {
    item: NavItem;
    isActive: boolean;
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!item.children) {
        return (
            <Link
                href={item.href}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: isActive ? "#4f46e5" : "#64748b",
                    background: isActive ? "rgba(238, 242, 255, 0.8)" : "transparent",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? "0 1px 2px 0 rgba(79, 70, 229, 0.05)" : "none",
                }}
            >
                <item.icon size={18} strokeWidth={2} />
                {item.label}
            </Link>
        );
    }

    return (
        <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: isActive ? "#4f46e5" : "#64748b",
                    background: isActive ? "rgba(238, 242, 255, 0.8)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? "0 1px 2px 0 rgba(79, 70, 229, 0.05)" : "none",
                }}
            >
                <item.icon size={18} />
                {item.label}
                <ChevronDown
                    size={16}
                    style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                        transition: "transform 0.2s",
                    }}
                />
            </button>

            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        minWidth: "240px",
                        background: "white",
                        borderRadius: "12px",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
                        border: "1px solid #e2e8f0",
                        padding: "8px",
                        zIndex: 100,
                    }}
                >
                    {item.children.map((child, index) => (
                        <Link
                            key={index}
                            href={child.href}
                            onClick={() => setIsOpen(false)}
                            style={{
                                display: "block",
                                padding: "12px 16px",
                                borderRadius: "8px",
                                textDecoration: "none",
                                transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                            <div style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}>
                                {child.label}
                            </div>
                            {child.description && (
                                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                    {child.description}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================
// User Menu Component
// ============================================

const UserMenu = () => {
    const [isOpen, setIsOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={menuRef} style={{ position: "relative" }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "6px 12px 6px 6px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "40px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                }}
            >
                <div
                    style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: 600,
                    }}
                >
                    JD
                </div>
                <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}>John Doe</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Admin</div>
                </div>
                <ChevronDown size={16} color="#64748b" />
            </button>

            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        right: 0,
                        minWidth: "200px",
                        background: "white",
                        borderRadius: "12px",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
                        border: "1px solid #e2e8f0",
                        padding: "8px",
                        zIndex: 100,
                    }}
                >
                    <Link
                        href="/profile"
                        onClick={() => setIsOpen(false)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "12px 16px",
                            borderRadius: "8px",
                            textDecoration: "none",
                            color: "#1e293b",
                            fontSize: "14px",
                        }}
                    >
                        <User size={18} />
                        Profile
                    </Link>
                    <Link
                        href="/settings"
                        onClick={() => setIsOpen(false)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "12px 16px",
                            borderRadius: "8px",
                            textDecoration: "none",
                            color: "#1e293b",
                            fontSize: "14px",
                        }}
                    >
                        <Settings size={18} />
                        Settings
                    </Link>
                    <div style={{ height: "1px", background: "#e2e8f0", margin: "8px 0" }} />
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            width: "100%",
                            padding: "12px 16px",
                            borderRadius: "8px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "#ef4444",
                            fontSize: "14px",
                            textAlign: "left",
                        }}
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
};

// ============================================
// Main Top Navigation Component
// ============================================

export function TopNavigation() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === href || pathname === "/";
        return pathname.startsWith(href);
    };

    return (
        <header
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: "70px",
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid rgba(226, 232, 240, 0.6)",
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                padding: "0 32px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)",
            }}
        >
            {/* Logo */}
            <Link
                href="/dashboard"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    textDecoration: "none",
                    marginRight: "40px",
                }}
            >
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "20px",
                        fontWeight: 700,
                        boxShadow: "0 4px 6px -1px rgba(99, 102, 241, 0.3)",
                    }}
                >
                    P
                </div>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>ProjectHub</span>
            </Link>

            {/* Desktop Navigation */}
            <nav
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    flex: 1,
                }}
            >
                {navItems.map((item, index) => (
                    <NavDropdown key={index} item={item} isActive={isActive(item.href)} />
                ))}
            </nav>

            {/* Right Side */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Search */}
                <button
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        background: "transparent",
                        border: "1px solid transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                        transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.border = "1px solid #e2e8f0";
                        e.currentTarget.style.color = "#1e293b";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.border = "1px solid transparent";
                        e.currentTarget.style.color = "#64748b";
                    }}
                >
                    <Search size={20} />
                </button>

                {/* Notifications */}
                <button
                    style={{
                        position: "relative",
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        background: "transparent",
                        border: "1px solid transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                        transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.border = "1px solid #e2e8f0";
                        e.currentTarget.style.color = "#1e293b";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.border = "1px solid transparent";
                        e.currentTarget.style.color = "#64748b";
                    }}
                >
                    <Bell size={20} />
                    <span
                        style={{
                            position: "absolute",
                            top: "10px",
                            right: "10px",
                            width: "8px",
                            height: "8px",
                            background: "#ef4444",
                            borderRadius: "50%",
                            border: "2px solid white",
                        }}
                    />
                </button>

                {/* User Menu */}
                <UserMenu />
            </div>

            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                    display: "none", // Show on mobile with media query
                    padding: "8px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                }}
            >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </header>
    );
}

export default TopNavigation;
