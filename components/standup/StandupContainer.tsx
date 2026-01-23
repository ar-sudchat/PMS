'use client'

import { useState } from 'react'
import { StandupGroup, createStandupGroup, updateStandupGroup, deleteStandupGroup } from '@/lib/actions/standup-actions'
import { TeamDashboard } from './TeamDashboard'
import { SmartCombobox } from "@/components/ui/smart-combobox"
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { format } from 'date-fns'
import { Plus, Settings, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface StandupContainerProps {
    user: any
    groups: StandupGroup[]
    activeGroup: StandupGroup | null
}

export function StandupContainer({ user, groups, activeGroup }: StandupContainerProps) {
    const initialGroupId = activeGroup?.id.toString() || (groups.length > 0 ? groups[0].id.toString() : '')
    const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId)
    const [date, setDate] = useState<Date>(new Date())

    // Dialog States
    const [createOpen, setCreateOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false) // Was editOpen
    const [groupName, setGroupName] = useState('')
    const [webhookUrl, setWebhookUrl] = useState('')
    const [loading, setLoading] = useState(false)

    const groupOptions = groups.map(g => ({
        value: g.id.toString(),
        label: g.name
    }))

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setDate(new Date(e.target.value))
        }
    }

    const handleCreateGroup = async () => {
        if (!groupName.trim()) return
        setLoading(true)
        const res = await createStandupGroup(groupName)
        if (res.success) {
            toast.success('Group created')
            setCreateOpen(false)
            setGroupName('')
            window.location.reload() // Simple reload to refresh data
        } else {
            toast.error(res.error || 'Failed to create')
        }
        setLoading(false)
    }

    const handleUpdateGroup = async () => {
        if (!selectedGroupId || !groupName.trim()) return
        setLoading(true)
        const res = await updateStandupGroup(parseInt(selectedGroupId), groupName, webhookUrl)
        if (res.success) {
            toast.success('Group updated')
            setSettingsOpen(false)
            setGroupName('')
            setWebhookUrl('')
            window.location.reload()
        } else {
            toast.error(res.error || 'Failed to update')
        }
        setLoading(false)
    }

    const handleDeleteGroup = async () => {
        if (!selectedGroupId || !confirm('Are you sure you want to delete this group? All data will be lost.')) return
        setLoading(true)
        const res = await deleteStandupGroup(parseInt(selectedGroupId))
        if (res.success) {
            toast.success('Group deleted')
            setSettingsOpen(false)
            window.location.reload()
        } else {
            toast.error(res.error || 'Failed to delete')
        }
        setLoading(false)
    }

    const selectedGroup = groups.find(g => g.id.toString() === selectedGroupId)

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
                    <Input
                        type="date"
                        value={format(date, 'yyyy-MM-dd')}
                        onChange={handleDateChange}
                        className="w-full sm:w-40"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="w-[200px]">
                            <SmartCombobox
                                options={groupOptions}
                                value={selectedGroupId}
                                onChange={setSelectedGroupId}
                                placeholder="Select Team..."
                                searchPlaceholder="Search Team..."
                            />
                        </div>

                        {/* Add Group */}
                        <Button size="icon" variant="outline" onClick={() => setCreateOpen(true)} title="Create New Group">
                            <Plus className="w-4 h-4" />
                        </Button>

                        {/* Edit Group Settings */}
                        {selectedGroupId && (
                            <DropdownMenu>
                                <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
                                    <Settings className="w-4 h-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                        setGroupName(selectedGroup?.name || '')
                                        setWebhookUrl(selectedGroup?.webhookUrl || '')
                                        setSettingsOpen(true)
                                    }}>
                                        <Pencil className="w-4 h-4 mr-2" /> Group Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDeleteGroup} className="text-red-600 focus:text-red-600">
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete Group
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </div>

            {selectedGroupId ? (
                <TeamDashboard
                    groupId={parseInt(selectedGroupId)}
                    date={format(date, 'yyyy-MM-dd')}
                />
            ) : (
                <div className="text-center py-20 text-muted-foreground bg-slate-50/50 rounded-lg border border-dashed">
                    <div className="max-w-xs mx-auto space-y-4">
                        <p>No group selected.</p>
                        {groups.length === 0 && (
                            <Button onClick={() => setCreateOpen(true)}>Create your first group</Button>
                        )}
                    </div>
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Group</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Group Name (e.g. Development Team)"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateGroup} disabled={loading || !groupName.trim()}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Settings Dialog */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Group Settings</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Group Name</label>
                            <Input
                                placeholder="Group Name"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">MS Teams Webhook URL</label>
                            <Input
                                placeholder="https://outlook.office.com/webhook/..."
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">Optional: Configure this to enable "Send to Teams" feature.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateGroup} disabled={loading || !groupName.trim()}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
