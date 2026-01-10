"use client"

import { Avatar } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Activity } from "lucide-react"
import { FormattedDate } from "@/components/shared/FormattedDate"

interface Activity {
    id: string
    userId: string
    userName: string
    action: string
    target: string
    timestamp: string
}

const activities: Activity[] = [
    { id: "1", userId: "u1", userName: "John Doe", action: "completed", target: "Design Homepage", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: "2", userId: "u2", userName: "Jane Smith", action: "commented on", target: "API Integration", timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    { id: "3", userId: "u3", userName: "Mike Johnson", action: "created", target: "Bug Fix Task", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    { id: "4", userId: "u4", userName: "Sarah Williams", action: "updated", target: "Project Timeline", timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
    { id: "5", userId: "u1", userName: "John Doe", action: "assigned", target: "Code Review to Bob", timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
]

function formatTimeAgo(timestamp: string): string {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}

export function RecentActivities() {
    return (
        <Card className="overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-slate-900/50">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Recent Activity</h2>
                        <p className="text-sm text-slate-500">Latest team updates</p>
                    </div>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-all">
                    View All →
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
                {activities.map((activity, index) => (
                    <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
                    >
                        <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                            {activity.userName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-slate-900 dark:text-white">{activity.userName}</span>{" "}
                                <span className="text-slate-500">{activity.action}</span>{" "}
                                <span className="font-medium text-indigo-600 dark:text-indigo-400">{activity.target}</span>
                            </p>
                            <FormattedDate
                                date={activity.timestamp}
                                format="relative"
                                className="text-xs text-slate-400 mt-0.5"
                            />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}
