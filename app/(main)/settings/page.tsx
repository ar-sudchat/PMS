import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getWorkloadConfig, getFileStorageConfig } from '@/lib/actions/config-actions'
import { SettingsForm } from '@/components/settings/SettingsForm'

export default async function SettingsPage() {
    const user = await getCurrentUser()

    // Protect the route - only admins should access settings
    if (!user) {
        redirect('/auth/login')
    }
    // Ideally, add role check here e.g. if (user.role !== 'admin') redirect('/')

    const [configResult, fileStorageResult] = await Promise.all([
        getWorkloadConfig(),
        getFileStorageConfig()
    ])

    // Use defaults if fetch fails or returns partial data
    const initialWorkloadConfig = configResult.success ? configResult.data : {
        workingHoursPerDay: 7,
        workingDaysPerWeek: 5,
        workloadWarningPercent: 70,
        workloadFullPercent: 100,
        mandayHours: 7
    }

    const initialFileStorageConfig = fileStorageResult.success ? fileStorageResult.data : {
        prodPath: '\\\\10.8.8.88\\ftp\\pms',
        devPath: '\\\\10.8.8.88\\ftp\\pms-non',
        activePath: 'PROD' as const,
        currentPath: '\\\\10.8.8.88\\ftp\\pms'
    }

    return (
        <div className="container py-4 max-w-4xl mx-auto">
            <SettingsForm
                initialWorkloadConfig={initialWorkloadConfig}
                initialFileStorageConfig={initialFileStorageConfig}
            />
        </div>
    )
}
