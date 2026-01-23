"use client"

import { useEffect, useState } from "react"
import { getTeamStandupStatus, getPotentialMembers, addMemberToGroup, removeMemberFromGroup, generateTeamSummaryAction, sendSummaryToMSTeams } from "@/lib/actions/standup-actions"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, Users, Sparkles, Trash2, Plus, Loader2, Share } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { SmartCombobox } from "@/components/ui/smart-combobox"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TimesheetLogSummary } from "@/components/timesheet/TimesheetLogSummary"

export function TeamDashboard({ groupId, date }: { groupId: number, date?: string }) {
    const [teamData, setTeamData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [groupName, setGroupName] = useState<string>('')

    // Manage Members State
    const [manageOpen, setManageOpen] = useState(false)
    const [potentialMembers, setPotentialMembers] = useState<any[]>([])
    const [selectedUser, setSelectedUser] = useState<string>('')
    const [loadingMembers, setLoadingMembers] = useState(false)

    // AI Summary State
    const [summaryOpen, setSummaryOpen] = useState(false)
    const [summaryText, setSummaryText] = useState('')
    const [generatingSummary, setGeneratingSummary] = useState(false)
    const [logSummaryOpen, setLogSummaryOpen] = useState(false)

    // MS Teams State
    const [sending, setSending] = useState(false)

    // Fetch Team Data and Group Name
    const fetchTeamData = async () => {
        setLoading(true)
        const result = await getTeamStandupStatus(groupId, date)
        if (result.success) {
            setTeamData(result.data || [])
            if (result.groupName) {
                setGroupName(result.groupName)
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchTeamData()
    }, [groupId, date])

    // Fetch Potential Members when dialog opens
    useEffect(() => {
        if (manageOpen) {
            getPotentialMembers(groupId).then(res => {
                if (res.success) setPotentialMembers(res.data)
            })
        }
    }, [manageOpen, groupId])

    // Handlers
    const handleAddMember = async () => {
        if (!selectedUser) return
        setLoadingMembers(true)
        try {
            const res = await addMemberToGroup(groupId, selectedUser)
            if (res.success) {
                toast.success('Member added')
                fetchTeamData()
                // Refresh potential members
                const pot = await getPotentialMembers(groupId)
                if (pot.success) setPotentialMembers(pot.data)
                setSelectedUser('')
            } else {
                toast.error(res.error || 'Failed to add')
            }
        } finally {
            setLoadingMembers(false)
        }
    }

    const handleRemoveMember = async (userId: string) => {
        if (!confirm('Remove this member?')) return
        try {
            const res = await removeMemberFromGroup(groupId, userId)
            if (res.success) {
                toast.success('Member removed')
                fetchTeamData() // Refresh list
            } else {
                toast.error('Failed to remove')
            }
        } catch (error) {
            toast.error('Error removing member')
        }
    }

    const handleGenerateSummary = async () => {
        setGeneratingSummary(true)
        try {
            const res = await generateTeamSummaryAction(groupId, date)
            if (res.success) {
                setSummaryText(res.summary || '')
                setSummaryOpen(true)
            } else {
                toast.error('Failed to generate summary')
            }
        } catch (error) {
            toast.error('Error generating summary')
        } finally {
            setGeneratingSummary(false)
        }
    }

    const handleSendToTeams = async () => {
        setSending(true)
        const toastId = toast.loading('Sending to MS Teams...')
        try {
            const res = await sendSummaryToMSTeams(groupId, summaryText)
            if (res.success) {
                toast.success('Sent to MS Teams successfully', { id: toastId })
            } else {
                toast.error(res.error || 'Failed to send. Please check Group Settings.', { id: toastId })
            }
        } catch (error) {
            toast.error('An error occurred', { id: toastId })
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Header / Toolbar */}
            <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Manage Members
                </Button>
                <Button variant="primary" size="sm" onClick={handleGenerateSummary} disabled={generatingSummary || teamData.length === 0} className="bg-purple-600 hover:bg-purple-700">
                    {generatingSummary ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    AI Summary
                </Button>
                <Button variant="outline" size="sm" onClick={() => setLogSummaryOpen(true)}>
                    <Clock className="w-4 h-4 mr-2" />
                    Log Summary
                </Button>
            </div>

            {loading ? (
                <div className="p-10 text-center text-muted-foreground flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading status...
                </div>
            ) : teamData.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground border border-dashed rounded-lg bg-slate-50">
                    No members in this group. Add members to see their status.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {teamData.map((member) => {
                        const tasks = member.tasks || []
                        const pendingTasks = tasks.filter((t: any) => t.status === 'PENDING')
                        const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED')

                        return (
                            <Card key={member.user.id} className="overflow-hidden flex flex-col h-full ring-1 ring-slate-200 shadow-sm transition-all hover:shadow-md">
                                <CardContent className="p-0 flex-1 flex flex-col">
                                    {/* Header */}
                                    <div className="p-4 border-b bg-slate-50/50 flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                            <AvatarImage src={member.user.avatarUrl} alt={member.user.name} />
                                            <AvatarFallback className="bg-purple-100 text-purple-700 font-medium">
                                                {member.user.nickname?.[0] || member.user.name[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h4 className="font-semibold text-sm text-slate-900">{member.user.name}</h4>
                                            <p className="text-xs text-slate-500">{member.user.nickname}</p>
                                        </div>
                                        <div className="ml-auto">
                                            {member.standup?.mood && <span className="text-xl select-none" title="Mood">{member.standup.mood}</span>}
                                        </div>
                                    </div>

                                    {/* Standup Notes */}
                                    {(member.standup?.morningNote || member.standup?.eveningNote) && (
                                        <div className="px-4 py-3 bg-amber-50/30 border-b border-amber-100 text-xs space-y-1">
                                            {member.standup.morningNote && (
                                                <p><span className="font-semibold text-amber-700">Morning:</span> {member.standup.morningNote}</p>
                                            )}
                                            {member.standup.eveningNote && (
                                                <p><span className="font-semibold text-indigo-700">Evening:</span> {member.standup.eveningNote}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Tasks Content */}
                                    <div className="flex-1 p-4 space-y-4">
                                        {/* Working On */}
                                        <div>
                                            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Working On
                                            </h5>
                                            {pendingTasks.length > 0 ? (
                                                <div className="space-y-2">
                                                    {pendingTasks.map((task: any) => (
                                                        <div key={task.taskId || task.customTaskName} className="text-sm bg-white border rounded-md p-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <span className="font-medium text-slate-800 line-clamp-2 leading-snug">
                                                                    {task.taskTitle}
                                                                </span>
                                                            </div>
                                                            {task.projectTitle && (
                                                                <div className="mt-1.5 flex items-center gap-2">
                                                                    <Badge variant="secondary" className="text-[10px] h-4 px-1 leading-none font-normal bg-slate-100 text-slate-600 border-slate-200">
                                                                        {task.projectTitle}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                            {task.remark && (
                                                                <p className="text-[10px] text-green-600 mt-1 font-medium bg-green-50 inline-block px-1 rounded">
                                                                    {task.remark}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic pl-1">No active tasks</p>
                                            )}
                                        </div>

                                        {/* Completed */}
                                        {completedTasks.length > 0 && (
                                            <div>
                                                <h5 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Completed
                                                </h5>
                                                <div className="space-y-1">
                                                    {completedTasks.map((task: any) => (
                                                        <div key={task.taskId} className="text-sm flex items-start gap-2 text-slate-500/80">
                                                            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-green-500 shrink-0" />
                                                            <span className="line-through decoration-slate-300">{task.taskTitle}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Manage Members Dialog */}
            <Dialog open={manageOpen} onOpenChange={setManageOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Manage Group Members</DialogTitle>
                        <DialogDescription>Add or remove members from this standup group.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <SmartCombobox
                                    options={potentialMembers}
                                    value={selectedUser}
                                    onChange={setSelectedUser}
                                    placeholder="Select employee..."
                                    searchPlaceholder="Search name..."
                                />
                            </div>
                            <Button onClick={handleAddMember} disabled={!selectedUser || loadingMembers} size="sm">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        <ScrollArea className="h-[200px] border rounded-md p-2">
                            {teamData.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground py-4">No members yet.</p>
                            ) : (
                                <div className="space-y-1">
                                    {teamData.map((m) => (
                                        <div key={m.user.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={m.user.avatarUrl} />
                                                    <AvatarFallback className="text-[10px]">{m.user.nickname?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{m.user.nickname || m.user.name}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleRemoveMember(m.user.id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Summary Dialog */}
            <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            AI Team Summary{groupName && <span className="text-sm font-normal text-slate-500 ml-2">({groupName})</span>}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{summaryText}</div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setSummaryOpen(false)}>Close</Button>
                        <Button onClick={handleSendToTeams} disabled={sending} className="bg-indigo-600 hover:bg-indigo-700">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Share className="w-4 h-4 mr-2" />}
                            Send to MS Teams
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Log Summary Dialog */}
            <Dialog open={logSummaryOpen} onOpenChange={setLogSummaryOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Timesheet Log Summary</DialogTitle>
                    </DialogHeader>
                    <TimesheetLogSummary />
                </DialogContent>
            </Dialog>
        </div>
    )
}
