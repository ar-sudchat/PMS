"use client"

import { Card } from "@/components/ui/card"
import { Users } from "lucide-react"
import { getAvatarGradient, getInitials } from "@/lib/utils"

interface TeamMember {
    id: string
    name: string
    role: string
    tasksCount: number
    status: "online" | "offline" | "away" | "busy"
}

const teamMembers: TeamMember[] = [
    { id: "1", name: "Alice Johnson", role: "Product Owner", tasksCount: 5, status: "online" },
    { id: "2", name: "Bob Smith", role: "Frontend Dev", tasksCount: 8, status: "away" },
    { id: "3", name: "Charlie Brown", role: "Backend Dev", tasksCount: 6, status: "online" },
    { id: "4", name: "Diana Prince", role: "UI Designer", tasksCount: 4, status: "offline" },
]

const statusColors = {
    online: "bg-emerald-500",
    offline: "bg-slate-400",
    away: "bg-amber-500",
    busy: "bg-red-500",
}

export function TeamWorkload() {
    return (
        <Card className="overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-slate-900/50">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                        <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Team Workload</h2>
                        <p className="text-sm text-slate-500">Current task distribution</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamMembers.map((member) => {
                        const avatarGradient = getAvatarGradient(member.name)
                        const initials = getInitials(member.name)
                        const workloadPercent = Math.min(member.tasksCount * 12, 100)

                        // Determine gradient color based on name for consistency
                        let barGradient = "from-indigo-400 to-indigo-500"
                        if (member.name.includes("Alice")) barGradient = "from-amber-400 to-orange-500"
                        else if (member.name.includes("Bob")) barGradient = "from-cyan-400 to-blue-500"
                        else if (member.name.includes("Charlie")) barGradient = "from-emerald-400 to-teal-500"
                        else if (member.name.includes("Diana")) barGradient = "from-pink-400 to-rose-500"

                        let borderColor = "border-indigo-200 dark:border-indigo-900/20"
                        let shadowColor = "shadow-indigo-500/5"
                        if (member.name.includes("Alice")) {
                            borderColor = "border-amber-200 dark:border-amber-900/20"
                            shadowColor = "shadow-amber-500/5"
                        } else if (member.name.includes("Bob")) {
                            borderColor = "border-cyan-200 dark:border-cyan-900/20"
                            shadowColor = "shadow-cyan-500/5"
                        } else if (member.name.includes("Charlie")) {
                            borderColor = "border-emerald-200 dark:border-emerald-900/20"
                            shadowColor = "shadow-emerald-500/5"
                        } else if (member.name.includes("Diana")) {
                            borderColor = "border-pink-200 dark:border-pink-900/20"
                            shadowColor = "shadow-pink-500/5"
                        }

                        return (
                            <div
                                key={member.id}
                                className={`group p-4 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800 border ${borderColor} hover:shadow-lg hover:${shadowColor} rounded-2xl transition-all duration-300 cursor-pointer`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="relative">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-lg font-bold shadow-lg ${shadowColor}`}>
                                            {initials}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${statusColors[member.status]} border-2 border-white dark:border-slate-900 rounded-full`}></div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-800 dark:text-white">{member.name}</h3>
                                        <p className="text-sm text-slate-500">{member.role}</p>

                                        {/* Task Bar */}
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-slate-500">Workload</span>
                                                <span className={`font-semibold ${member.name.includes("Alice") ? "text-amber-600" : member.name.includes("Bob") ? "text-cyan-600" : member.name.includes("Charlie") ? "text-emerald-600" : "text-pink-600"}`}>
                                                    {member.tasksCount} Tasks
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full bg-gradient-to-r ${barGradient} rounded-full transition-all duration-500`}
                                                    style={{ width: `${workloadPercent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </Card>
    )
}
