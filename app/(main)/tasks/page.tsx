'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Plus, Search, Filter, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
    { name: 'All', count: 24 },
    { name: 'Today', count: 5 },
    { name: 'Upcoming', count: 12 },
    { name: 'Overdue', count: 3 },
    { name: 'Completed', count: 4 },
];

const tasks = [
    { id: 1, title: 'Design homepage mockups', project: 'E-Commerce Website', priority: 'high', dueDate: 'Today', status: 'inProgress' },
    { id: 2, title: 'Implement user authentication', project: 'Mobile App', priority: 'urgent', dueDate: 'Today', status: 'todo' },
    { id: 3, title: 'Write API documentation', project: 'API Development', priority: 'medium', dueDate: 'Tomorrow', status: 'todo' },
    { id: 4, title: 'Review pull requests', project: 'E-Commerce Website', priority: 'low', dueDate: 'Jan 12', status: 'completed' },
    { id: 5, title: 'Update dependencies', project: 'Mobile App', priority: 'medium', dueDate: 'Jan 15', status: 'todo' },
];

const priorityStyles = {
    urgent: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function MyTasksPage() {
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <MainLayout>
            <div className="max-w-5xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">My Tasks</h1>
                    <p className="text-slate-500 mt-1">Manage and track your assigned tasks</p>
                </div>

                {/* Action Bar */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* New Task Button */}
                        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25">
                            <Plus className="w-5 h-5" />
                            New Task
                        </button>

                        {/* Tabs */}
                        <div className="flex-1 flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.name}
                                    onClick={() => setActiveTab(tab.name)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all",
                                        activeTab === tab.name
                                            ? "bg-white text-slate-800 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {tab.name}
                                    <span className={cn(
                                        "px-1.5 py-0.5 text-xs rounded-md",
                                        activeTab === tab.name
                                            ? "bg-indigo-100 text-indigo-600"
                                            : "bg-slate-200 text-slate-500"
                                    )}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="flex gap-3 mt-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all">
                            <Filter className="w-5 h-5" />
                            <span className="hidden sm:inline font-medium">Filter</span>
                        </button>
                    </div>
                </div>

                {/* Task List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                            >
                                {/* Checkbox */}
                                <button className="flex-shrink-0">
                                    {task.status === 'completed' ? (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                    ) : (
                                        <Circle className="w-6 h-6 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                    )}
                                </button>

                                {/* Task Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className={cn(
                                        "font-medium",
                                        task.status === 'completed' ? "text-slate-400 line-through" : "text-slate-800"
                                    )}>
                                        {task.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 truncate">{task.project}</p>
                                </div>

                                {/* Priority Badge */}
                                <span className={cn(
                                    "hidden sm:block px-3 py-1 text-xs font-medium rounded-full border",
                                    priorityStyles[task.priority as keyof typeof priorityStyles]
                                )}>
                                    {task.priority}
                                </span>

                                {/* Due Date */}
                                <div className={cn(
                                    "flex items-center gap-1.5 text-sm whitespace-nowrap",
                                    task.dueDate === 'Today' ? "text-red-500" : "text-slate-500"
                                )}>
                                    {task.dueDate === 'Today' ? (
                                        <AlertCircle className="w-4 h-4" />
                                    ) : (
                                        <Clock className="w-4 h-4" />
                                    )}
                                    <span className="hidden sm:inline">{task.dueDate}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {tasks.length === 0 && (
                        <div className="py-16 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-700">No tasks found</h3>
                            <p className="text-slate-500 mt-1">Create a new task to get started</p>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
