'use client';

import { Menu, Plus, Sun, Moon, Bell, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
    title?: string;
    breadcrumb?: { label: string; href?: string }[];
}

export function Header({ title, breadcrumb }: HeaderProps) {
    const [darkMode, setDarkMode] = useState(false);

    return (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="flex items-center justify-between h-16 px-4 lg:px-6">
                {/* Left: Menu + Title/Breadcrumb */}
                <div className="flex items-center gap-4">
                    <div>
                        {breadcrumb && breadcrumb.length > 0 ? (
                            <div className="flex items-center gap-2 text-sm">
                                {breadcrumb.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        {item.href ? (
                                            <Link href={item.href} className="text-slate-500 hover:text-slate-700 transition-colors">
                                                {item.label}
                                            </Link>
                                        ) : (
                                            <span className="text-slate-900 font-semibold">{item.label}</span>
                                        )}
                                        {index < breadcrumb.length - 1 && (
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <h1 className="text-xl font-bold text-slate-800">{title || 'Dashboard'}</h1>
                        )}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Quick Add */}
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/25">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New</span>
                        <ChevronDown className="w-4 h-4 hidden sm:block" />
                    </button>

                    {/* Theme Toggle */}
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </header>
    );
}
