'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createStandupGroup, joinGroup } from '@/lib/actions/standup-actions'
import { useTransition } from 'react'
import { Users } from 'lucide-react'

export function CreateGroup() {
    const [name, setName] = useState('')
    const [inviteCode, setInviteCode] = useState('')
    const [isPending, startTransition] = useTransition()

    const handleCreate = () => {
        if (!name.trim()) return
        startTransition(async () => {
            const res = await createStandupGroup(name)
            if (res.success) {
                window.location.reload()
            } else {
                alert('Failed to create group')
            }
        })
    }

    const handleJoin = () => {
        if (!inviteCode.trim()) return
        startTransition(async () => {
            const res = await joinGroup(inviteCode)
            if (res.success) {
                window.location.reload()
            } else {
                alert(res.error || 'Failed to join group')
            }
        })
    }

    return (
        <Card className="max-w-md mx-auto mt-10">
            <CardContent className="pt-8 text-center space-y-6">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-primary">
                    <Users className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Join a Stand-up Group</h2>
                    <p className="text-muted-foreground mt-2">You need to belong to a group to use the stand-up feature.</p>
                </div>

                <div className="space-y-6 text-left">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Create New Group</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="E.g. Development Team"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            <Button onClick={handleCreate} disabled={isPending || !name.trim()}>Create</Button>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Join Existing Group</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter Group ID"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                            />
                            <Button variant="secondary" onClick={handleJoin} disabled={isPending || !inviteCode.trim()}>Join</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Ask a team member for the Group ID.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
