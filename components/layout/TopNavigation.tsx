'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  Home,
  CheckSquare,
  FolderKanban,
  Zap,
  BarChart3,
  Calendar,
  Clock,
  Users,
  Settings,
  LogOut,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===================================
// Configuration
// ===================================

const navItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Sprints', href: '/sprints', icon: Zap },
  { name: 'Team', href: '/team', icon: Users },
  { 
    name: 'Time', 
    href: '#', 
    icon: Clock,
    children: [
      { name: 'Time Tracking', href: '/time-tracking' },
      { name: 'Timesheet', href: '/timesheet' },
      { name: 'Calendar', href: '/calendar' },
    ]
  },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Files', href: '/files', icon: FolderKanban },
  { 
    name: 'System', 
    href: '#', 
    icon: Settings,
    children: [
      { name: 'Design System', href: '/design-system' },
      { name: 'Settings', href: '/settings' },
      { name: 'Users', href: '/admin/users' },
    ]
  },
];

export function TopNavigation() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/' && pathname !== '/') return false;
    return pathname.startsWith(href);
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-slate-900/90 backdrop-blur-md border-b border-white/10 h-16 shadow-2xl"
            : "bg-slate-900 border-b border-transparent h-20"
        )}
      >
        <div className="max-w-[1920px] mx-auto px-6 h-full flex items-center justify-between gap-8">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                    <Rocket className="w-5 h-5 text-white fill-white/10" />
                </div>
            </div>
            <div>
                <h1 className="font-bold text-white text-lg tracking-tight">ProjectHub</h1>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Enterprise</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center bg-white/5 rounded-full px-2 py-1.5 border border-white/5 backdrop-blur-sm">
            {navItems.map((item) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => item.children && setActiveDropdown(item.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {item.children ? (
                  <button
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                      isActive(item.href) || activeDropdown === item.name
                        ? "text-white bg-white/10 shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", isActive(item.href) ? "text-indigo-400" : "text-slate-500")} />
                    {item.name}
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                      isActive(item.href)
                        ? "text-white bg-white/10 shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", isActive(item.href) ? "text-indigo-400" : "text-slate-500")} />
                    {item.name}
                  </Link>
                )}

                {/* Dropdown Menu */}
                {item.children && activeDropdown === item.name && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        className="block px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden md:flex items-center relative group">
                <Search className="absolute left-3 w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-64 bg-slate-950/50 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-900 transition-all"
                />
                <div className="absolute right-3 flex items-center gap-1">
                    <span className="text-[10px] text-slate-600 border border-white/10 rounded px-1.5 py-0.5">⌘K</span>
                </div>
            </div>

            <div className="h-6 w-px bg-white/10 hidden md:block" />

            {/* Notifications */}
            <button className="relative p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all group">
                <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900" />
            </button>

            {/* User Profile */}
            <div className="relative">
                <button 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 pl-1 pr-3 py-1 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-900 shadow-lg">
                        JD
                    </div>
                    <span className="hidden md:block text-sm font-medium text-slate-200">John Doe</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {userMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <p className="text-sm font-medium text-white">John Doe</p>
                            <p className="text-xs text-slate-500">john@projecthub.com</p>
                        </div>
                        <div className="p-2 space-y-1">
                            <Link href="/profile" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                                <Users className="w-4 h-4" />
                                Profile
                            </Link>
                            <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                                <Settings className="w-4 h-4" />
                                Settings
                            </Link>
                            <div className="h-px bg-white/10 my-1" />
                            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors">
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Menu Toggle */}
            <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-xl lg:hidden pt-24 px-6">
            <nav className="space-y-2">
                {navItems.map((item) => (
                    <div key={item.name}>
                        <Link 
                            href={item.href}
                            className={cn(
                                "flex items-center gap-4 p-4 rounded-xl text-lg font-medium transition-colors",
                                isActive(item.href) ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <item.icon className="w-6 h-6" />
                            {item.name}
                        </Link>
                        {item.children && (
                            <div className="pl-14 space-y-2 mt-2">
                                {item.children.map(child => (
                                    <Link
                                        key={child.name}
                                        href={child.href}
                                        className="block p-2 text-slate-500 hover:text-white"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {child.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>
        </div>
      )}
    </>
  );
}
