'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { WorkloadConfig, updateWorkloadConfig } from '@/lib/actions/config-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'

interface SettingsFormProps {
    initialConfig: WorkloadConfig
}

export function SettingsForm({ initialConfig }: SettingsFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [config, setConfig] = useState<WorkloadConfig>(initialConfig)
    const [hasChanges, setHasChanges] = useState(false)

    const handleChange = (key: keyof WorkloadConfig, value: string) => {
        let numValue = parseFloat(value)
        if (isNaN(numValue)) numValue = 0

        setConfig(prev => {
            const newConfig = { ...prev, [key]: numValue }
            // Simple check for changes - strict equality might not be enough if initial was different object ref
            // but good enough for enabling the save button
            setHasChanges(true)
            return newConfig
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        startTransition(async () => {
            const result = await updateWorkloadConfig(config)

            if (result.success) {
                alert("System configuration updated successfully")
                setHasChanges(false)
                router.refresh()
            } else {
                alert(result.error || "Failed to update configuration")
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Workload Settings</CardTitle>
                    <CardDescription>
                        Configure global settings for workload calculation and capacity planning.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="space-y-2">
                            <Label htmlFor="workingHoursPerDay">Working Hours Per Day</Label>
                            <Input
                                id="workingHoursPerDay"
                                type="number"
                                min="1"
                                max="24"
                                step="0.5"
                                value={config.workingHoursPerDay}
                                onChange={(e) => handleChange('workingHoursPerDay', e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">Standard working hours for one day (e.g. 7 or 8).</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="workingDaysPerWeek">Working Days Per Week</Label>
                            <Input
                                id="workingDaysPerWeek"
                                type="number"
                                min="1"
                                max="7"
                                value={config.workingDaysPerWeek}
                                onChange={(e) => handleChange('workingDaysPerWeek', e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">Number of working days in a week (usually 5).</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="mandayHours">Manday Hours</Label>
                            <Input
                                id="mandayHours"
                                type="number"
                                min="1"
                                max="24"
                                step="0.5"
                                value={config.mandayHours}
                                onChange={(e) => handleChange('mandayHours', e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">Hours equivalent to 1 Man-Day for estimation.</p>
                        </div>

                    </div>

                    <hr className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="workloadWarningPercent">Warning Threshold (%)</Label>
                            <Input
                                id="workloadWarningPercent"
                                type="number"
                                min="1"
                                max="100"
                                value={config.workloadWarningPercent}
                                onChange={(e) => handleChange('workloadWarningPercent', e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">Workload percentage to trigger a warning (Yellow).</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="workloadFullPercent">Full Capacity Threshold (%)</Label>
                            <Input
                                id="workloadFullPercent"
                                type="number"
                                min="1"
                                max="200"
                                value={config.workloadFullPercent}
                                onChange={(e) => handleChange('workloadFullPercent', e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">Workload percentage considered full capacity (Red).</p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={!hasChanges || isPending}>
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    )
}
