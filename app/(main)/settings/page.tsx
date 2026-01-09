import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getWorkloadConfig } from '@/lib/actions/config-actions'
import { SettingsForm } from '@/components/settings/SettingsForm'

export default async function SettingsPage() {
    const user = await getCurrentUser()

    // Protect the route - only admins should access settings
    if (!user) {
        redirect('/auth/login')
    }
    // Ideally, add role check here e.g. if (user.role !== 'admin') redirect('/')

    const configResult = await getWorkloadConfig()

    // Use defaults if fetch fails or returns partial data
    const initialConfig = configResult.success ? configResult.data : {
        workingHoursPerDay: 7,
        workingDaysPerWeek: 5,
        workloadWarningPercent: 70,
        workloadFullPercent: 100,
        mandayHours: 7
    }

    return (
        <div className="container py-6 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Manage system configurations and preferences.
                </p>
            </div>

            <hr className="my-6" />

            <SettingsForm initialConfig={initialConfig} />
        </div>
    )
}
