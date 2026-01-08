'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    CheckSquare,
    FolderKanban,
    Zap,
    BarChart3,
    Calendar,
    Clock,
    Users,
    Settings,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Plus,
    Search,
    Rocket,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
    onClose?: () => void;
}

const menuItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'My Tasks', href: '/tasks', icon: CheckSquare, badge: 12 },
    {
        name: 'Projects',
        href: '/projects',
        icon: FolderKanban,
        badge: 125 // Example total count
    },
    { name: 'Sprints', href: '/sprints', icon: Zap },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Time Tracking', href: '/time-tracking', icon: Clock },
];

const workspaceItems = [
    { name: 'Team', href: '/team', icon: Users, badge: 8 },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ collapsed, onToggleCollapse, onClose }: SidebarProps) {
    const pathname = usePathname();
    const [projectsOpen, setProjectsOpen] = useState(true);

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">

            {/* Logo Section */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Rocket className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                        <div>
                            <h1 className="font-bold text-white">ProjectHub</h1>
                            <p className="text-[10px] text-slate-500">Project Management</p>
                        </div>
                    )}
                </div>

                {/* Close button (Mobile) */}
                <button
                    onClick={onClose}
                    className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Collapse button (Desktop) */}
                <button
                    onClick={onToggleCollapse}
                    className="hidden lg:flex p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            {/* Search */}
            {!collapsed && (
                <div className="p-4">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:bg-white/10 hover:border-white/20 transition-all">
                        <Search className="w-4 h-4" />
                        <span className="text-sm">Search...</span>
                        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 bg-white/10 rounded">⌘K</kbd>
                    </button>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-2">
                {/* Main Menu Label */}
                {!collapsed && (
                    <p className="px-4 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Main Menu
                    </p>
                )}

                {/* Menu Items */}
                <ul className="space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        const Icon = item.icon;
                        // Cast to any to access children if they exist, though we removed them from data
                        const hasChildren = (item as any).children && (item as any).children.length > 0;

                        return (
                            <li key={item.name}>
                                {hasChildren ? (
                                    <>
                                        <button
                                            onClick={() => setProjectsOpen(!projectsOpen)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                                                isActive
                                                    ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white border border-indigo-500/30"
                                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-indigo-400")} />
                                            {!collapsed && (
                                                <>
                                                    <span className="flex-1 text-left font-medium">{item.name}</span>
                                                    {projectsOpen ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </>
                                            )}
                                        </button>

                                        {/* Submenu */}
                                        {!collapsed && projectsOpen && (
                                            <ul className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1">
                                                {(item as any).children.map((child: any) => (
                                                    <li key={child.name}>
                                                        <Link
                                                            href={child.href}
                                                            className={cn(
                                                                "block px-4 py-2 rounded-lg text-sm transition-all",
                                                                pathname === child.href
                                                                    ? "text-indigo-400 bg-indigo-500/10"
                                                                    : "text-slate-500 hover:text-white hover:bg-white/5"
                                                            )}
                                                        >
                                                            {child.name}
                                                        </Link>
                                                    </li>
                                                ))}
                                                <li>
                                                    <button className="flex items-center gap-2 px-4 py-2 w-full text-sm text-slate-500 hover:text-indigo-400 transition-colors">
                                                        <Plus className="w-4 h-4" />
                                                        Add Project
                                                    </button>
                                                </li>
                                            </ul>
                                        )}
                                    </>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                                            isActive
                                                ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white border border-indigo-500/30"
                                                : "text-slate-400 hover:text-white hover:bg-white/5",
                                            collapsed && "justify-center"
                                        )}
                                    >
                                        <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-indigo-400")} />
                                        {!collapsed && (
                                            <>
                                                <span className="flex-1 font-medium">{item.name}</span>
                                                {item.badge && (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-indigo-500 text-white rounded-full">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ul>

                {/* Workspace Section */}
                {!collapsed && (
                    <p className="px-4 py-2 mt-6 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Workspace
                    </p>
                )}

                <ul className="space-y-1">
                    {workspaceItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                                        isActive
                                            ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white border border-indigo-500/30"
                                            : "text-slate-400 hover:text-white hover:bg-white/5",
                                        collapsed && "justify-center"
                                    )}
                                >
                                    <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-indigo-400")} />
                                    {!collapsed && (
                                        <>
                                            <span className="flex-1 font-medium">{item.name}</span>
                                            {item.badge && (
                                                <span className="px-2 py-0.5 text-xs text-slate-400">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-white/10">
                <div className={cn(
                    "flex items-center gap-3 p-3 bg-white/5 rounded-xl",
                    collapsed && "justify-center p-2"
                )}>
                    <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/30">
                            JD
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">John Doe</p>
                            <p className="text-xs text-slate-500 truncate">john@projecthub.com</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
