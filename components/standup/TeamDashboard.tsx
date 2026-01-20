/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { getTeamStandupStatus } from "@/lib/actions/standup-actions"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function TeamDashboard({ groupId }: { groupId: number }) {
    const [teamData, setTeamData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchTeamData() {
            setLoading(true)
            const result = await getTeamStandupStatus(groupId)
            if (result.success) {
                setTeamData(result.data || [])
            }
            setLoading(false)
        }
        fetchTeamData()
    }, [groupId])

    if (loading) return <div className="p-4 text-center">Loading team status...</div>

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {teamData.map((member) => (
                <Card key={member.user.id} className="overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Avatar>
                                <AvatarImage src={member.user.avatarUrl} alt={member.user.name} />
                                <AvatarFallback>{member.user.nickname?.[0] || member.user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h4 className="font-semibold text-sm">{member.user.name}</h4>
                                <p className="text-xs text-muted-foreground">{member.user.nickname}</p>
                            </div>
                            <div className="ml-auto">
                                {member.standup?.hasMorning ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Checked In</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-gray-400">Pending</Badge>
                                )}
                            </div>
                        </div>

                        {member.standup ? (
                            <div className="text-sm space-y-2">
                                {member.standup.morningNote && (
                                    <div className="bg-slate-50 p-2 rounded">
                                        <p className="font-medium text-xs text-slate-500 mb-1">🌤️ Morning Plan</p>
                                        <p className="whitespace-pre-line">{member.standup.morningNote}</p>
                                    </div>
                                )}
                                {member.standup.eveningNote && (
                                    <div className="bg-indigo-50 p-2 rounded">
                                        <p className="font-medium text-xs text-indigo-500 mb-1">🌙 Evening Report</p>
                                        <p className="whitespace-pre-line">{member.standup.eveningNote}</p>
                                        {member.standup.mood && <p className="text-xs mt-1 opacity-70">Mood: {member.standup.mood}</p>}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No updates for today yet.</p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
