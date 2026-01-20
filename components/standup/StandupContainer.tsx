'use client'

import { useState } from 'react'
import { StandupGroup, DailyStandup } from '@/lib/actions/standup-actions'
import { MorningCheckIn } from './MorningCheckIn'
import { EveningCheckout } from './EveningCheckout'
import { TeamDashboard } from './TeamDashboard'
import { CreateGroup } from './CreateGroup'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, Clock, Users } from 'lucide-react'

interface StandupContainerProps {
    user: any
    groups: StandupGroup[]
    activeGroup: StandupGroup | null
    todayStandup: DailyStandup | null
    pendingTasks: any[]
}

export function StandupContainer({ user, groups, activeGroup, todayStandup, pendingTasks }: StandupContainerProps) {
    const [currentStandup, setCurrentStandup] = useState(todayStandup)

    if (!activeGroup) {
        return <CreateGroup />
    }

    const isMorningDone = !!currentStandup // If record exists, morning is technically "started"
    const isEveningDone = !!currentStandup?.eveningNote // If evening note exists, evening is done

    // Determine current phase based on time and completion
    const currentHour = new Date().getHours()
    const isEveningTime = currentHour >= 16 // After 4 PM

    const showMorning = !isMorningDone
    const showEvening = isMorningDone && !isEveningDone

    return (
        <div className="space-y-6">
            <div className="flex gap-4 items-center mb-4">
                <span className="text-muted-foreground">Active Group:</span>
                <span className="font-semibold bg-secondary px-3 py-1 rounded-full">{activeGroup.name}</span>
            </div>

            {isEveningDone ? (
                <Card className="bg-green-50/50 border-green-200">
                    <CardContent className="pt-6 text-center">
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-semibold text-green-700">All caught up!</h2>
                        <p className="text-muted-foreground mt-2">You have completed your stand-up for today. See you tomorrow!</p>
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue={showMorning ? "morning" : "evening"} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="morning" disabled={isMorningDone}>
                            <Clock className="w-4 h-4 mr-2" />
                            Morning Check-in
                        </TabsTrigger>
                        <TabsTrigger value="evening" disabled={!isMorningDone}>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Evening Checkout
                        </TabsTrigger>
                        <TabsTrigger value="team">
                            <Users className="w-4 h-4 mr-2" />
                            Team Status
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="morning">
                        <MorningCheckIn
                            groupId={activeGroup.id}
                            pendingTasks={pendingTasks}
                            onComplete={setCurrentStandup}
                        />
                    </TabsContent>

                    <TabsContent value="evening">
                        <EveningCheckout
                            standup={currentStandup!}
                            onComplete={setCurrentStandup}
                        />
                    </TabsContent>

                    <TabsContent value="team">
                        <TeamDashboard groupId={activeGroup.id} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}
