"use client"

import * as React from "react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Calendar as CalendarIcon,
    Download,
    TrendingUp,
    Users,
    CheckCircle2,
    Clock
} from "lucide-react"
import { tasks, users, projects, sprints } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function ReportsPage() {
    // Calculate stats
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === "done").length
    const inProgressTasks = tasks.filter(t => t.status === "in_progress").length
    const todoTasks = tasks.filter(t => t.status === "todo").length

    // Team performance (mock data)
    const teamPerformance = users.slice(0, 5).map(user => ({
        ...user,
        completed: Math.floor(Math.random() * 15) + 5,
        performance: Math.floor(Math.random() * 30) + 70,
    }))

    // Sprint velocity (mock data)
    const velocityData = [
        { sprint: "Sprint 1", planned: 20, completed: 20 },
        { sprint: "Sprint 2", planned: 25, completed: 22 },
        { sprint: "Sprint 3", planned: 27, completed: 15 },
    ]

    return (
        <MainLayout
            title="Reports"
            breadcrumb={[{ label: "Reports" }]}
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        This Month
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{completedTasks}</p>
                            <p className="text-sm text-slate-500">Completed</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{inProgressTasks}</p>
                            <p className="text-sm text-slate-500">In Progress</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{todoTasks}</p>
                            <p className="text-sm text-slate-500">To Do</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{users.length}</p>
                            <p className="text-sm text-slate-500">Team Members</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Tasks Overview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tasks Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center h-48">
                            {/* Simple pie chart visualization */}
                            <div className="relative w-40 h-40">
                                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="20" />
                                    <circle
                                        cx="50" cy="50" r="40" fill="none"
                                        stroke="#10b981" strokeWidth="20"
                                        strokeDasharray={`${(completedTasks / totalTasks) * 251.2} 251.2`}
                                    />
                                    <circle
                                        cx="50" cy="50" r="40" fill="none"
                                        stroke="#3b82f6" strokeWidth="20"
                                        strokeDasharray={`${(inProgressTasks / totalTasks) * 251.2} 251.2`}
                                        strokeDashoffset={`-${(completedTasks / totalTasks) * 251.2}`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{totalTasks}</p>
                                        <p className="text-xs text-slate-500">Total</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-sm text-slate-600">Done ({completedTasks})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className="text-sm text-slate-600">In Progress ({inProgressTasks})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-slate-300" />
                                <span className="text-sm text-slate-600">To Do ({todoTasks})</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Velocity Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sprint Velocity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {velocityData.map((data, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{data.sprint}</span>
                                        <span className="text-slate-500">{data.completed}/{data.planned}</span>
                                    </div>
                                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                                        <div
                                            className="h-full bg-indigo-500"
                                            style={{ width: `${(data.completed / data.planned) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Team Performance */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {teamPerformance.map((member) => (
                            <div key={member.id} className="flex items-center gap-4">
                                <div className="w-32 truncate">
                                    <p className="font-medium text-sm">{member.name}</p>
                                </div>
                                <div className="flex-1">
                                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full",
                                                member.performance >= 80 ? "bg-emerald-500" :
                                                    member.performance >= 60 ? "bg-amber-500" : "bg-red-500"
                                            )}
                                            style={{ width: `${member.performance}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-sm font-medium w-12 text-right">{member.performance}%</span>
                                <span className="text-sm text-slate-500 w-20">{member.completed} tasks</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </MainLayout>
    )
}
