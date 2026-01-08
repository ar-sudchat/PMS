"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

interface Project {
    id: string
    name: string
    progress: number
    color: string
    tasksCompleted: number
    tasksTotal: number
    dueDate: string
}

const projects: Project[] = [
    { id: "1", name: "E-Commerce Website", progress: 72, color: "#6366F1", tasksCompleted: 18, tasksTotal: 25, dueDate: "Jan 15" },
    { id: "2", name: "Mobile App", progress: 45, color: "#8B5CF6", tasksCompleted: 12, tasksTotal: 27, dueDate: "Jan 22" },
    { id: "3", name: "API Development", progress: 88, color: "#06B6D4", tasksCompleted: 23, tasksTotal: 26, dueDate: "Jan 10" },
    { id: "4", name: "Dashboard Redesign", progress: 34, color: "#EC4899", tasksCompleted: 8, tasksTotal: 24, dueDate: "Feb 5" },
]

export function ProjectProgress() {
    return (
        <Card className="overflow-hidden shadow-sm card-hover bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                        <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Project Progress</h2>
                        <p className="text-sm text-slate-500">Track your project milestones</p>
                    </div>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-all">
                    View All →
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className="group p-5 bg-white hover:bg-gradient-to-r hover:from-white hover:to-slate-50 dark:bg-slate-800 dark:hover:from-slate-800 dark:hover:to-slate-800/80 border-2 border-slate-100 hover:border-slate-200 dark:border-slate-700 dark:hover:border-slate-600 rounded-2xl transition-all duration-300 cursor-pointer hover:shadow-lg"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-4 h-4 rounded-full shadow-md ring-2 ring-white dark:ring-slate-800"
                                    style={{ backgroundColor: project.color }}
                                ></div>
                                <span className="font-semibold text-base text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    {project.name}
                                </span>
                            </div>
                            <span className="text-lg font-bold transition-all duration-300" style={{ color: project.color }}>
                                {project.progress}%
                            </span>
                        </div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full rounded-full transition-all duration-700 shadow-sm relative overflow-hidden"
                                style={{
                                    width: `${project.progress}%`,
                                    background: `linear-gradient(90deg, ${project.color}, ${project.color}dd)`,
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-xs">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                                {project.tasksCompleted} of {project.tasksTotal} tasks
                            </span>
                            <span className="text-slate-500 dark:text-slate-500">
                                Due: <span className="font-semibold text-slate-700 dark:text-slate-300">{project.dueDate}</span>
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}
