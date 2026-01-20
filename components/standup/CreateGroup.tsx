'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createStandupGroup } from '@/lib/actions/standup-actions'
import { useTransition } from 'react'
import { Users } from 'lucide-react'

export function CreateGroup() {
    const [name, setName] = useState('')
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

                <div className="space-y-4 text-left">
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
                </div>
            </CardContent>
        </Card>
    )
}
