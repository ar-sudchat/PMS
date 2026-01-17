'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { WorkloadConfig, FileStorageConfig, updateWorkloadConfig, updateFileStorageConfig, testFileStorageConnection } from '@/lib/actions/config-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Save, HardDrive, FolderOpen, Clock, Plug, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsFormProps {
    initialWorkloadConfig: WorkloadConfig
    initialFileStorageConfig: FileStorageConfig
}

type TabType = 'workload' | 'storage'

interface TestResult {
    path: string
    success: boolean
    message: string
    canRead: boolean
    canWrite: boolean
}

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'workload', label: 'Workload Settings', icon: <Clock className="h-4 w-4" /> },
    { id: 'storage', label: 'File Storage Settings', icon: <HardDrive className="h-4 w-4" /> },
]

export function SettingsForm({ initialWorkloadConfig, initialFileStorageConfig }: SettingsFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isSavingStorage, startStorageTransition] = useTransition()
    const [activeTab, setActiveTab] = useState<TabType>('workload')

    const [config, setConfig] = useState<WorkloadConfig>(initialWorkloadConfig)
    const [hasChanges, setHasChanges] = useState(false)

    const [storageConfig, setStorageConfig] = useState<FileStorageConfig>(initialFileStorageConfig)
    const [hasStorageChanges, setHasStorageChanges] = useState(false)

    // Test connection states
    const [testingProd, setTestingProd] = useState(false)
    const [testingDev, setTestingDev] = useState(false)
    const [prodTestResult, setProdTestResult] = useState<TestResult | null>(null)
    const [devTestResult, setDevTestResult] = useState<TestResult | null>(null)

    const handleChange = (key: keyof WorkloadConfig, value: string) => {
        let numValue = parseFloat(value)
        if (isNaN(numValue)) numValue = 0

        setConfig(prev => {
            const newConfig = { ...prev, [key]: numValue }
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

    const handleStorageChange = (key: 'prodPath' | 'devPath' | 'activePath', value: string) => {
        setStorageConfig(prev => {
            const newConfig = { ...prev, [key]: value }
            if (key === 'activePath') {
                newConfig.currentPath = value === 'PROD' ? newConfig.prodPath : newConfig.devPath
            } else if (key === 'prodPath' && prev.activePath === 'PROD') {
                newConfig.currentPath = value
            } else if (key === 'devPath' && prev.activePath === 'DEV') {
                newConfig.currentPath = value
            }
            setHasStorageChanges(true)
            // Clear test result when path changes
            if (key === 'prodPath') setProdTestResult(null)
            if (key === 'devPath') setDevTestResult(null)
            return newConfig
        })
    }

    const handleStorageSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        startStorageTransition(async () => {
            const result = await updateFileStorageConfig({
                prodPath: storageConfig.prodPath,
                devPath: storageConfig.devPath,
                activePath: storageConfig.activePath
            })

            if (result.success) {
                alert("File storage configuration updated successfully")
                setHasStorageChanges(false)
                router.refresh()
            } else {
                alert(result.error || "Failed to update file storage configuration")
            }
        })
    }

    const handleTestConnection = async (type: 'PROD' | 'DEV') => {
        const path = type === 'PROD' ? storageConfig.prodPath : storageConfig.devPath

        if (type === 'PROD') {
            setTestingProd(true)
            setProdTestResult(null)
        } else {
            setTestingDev(true)
            setDevTestResult(null)
        }

        try {
            const result = await testFileStorageConnection(path)
            const testResult: TestResult = {
                path,
                success: result.success,
                message: result.message,
                canRead: result.canRead,
                canWrite: result.canWrite
            }

            if (type === 'PROD') {
                setProdTestResult(testResult)
            } else {
                setDevTestResult(testResult)
            }
        } catch (error: any) {
            const testResult: TestResult = {
                path,
                success: false,
                message: error.message || 'เกิดข้อผิดพลาด',
                canRead: false,
                canWrite: false
            }
            if (type === 'PROD') {
                setProdTestResult(testResult)
            } else {
                setDevTestResult(testResult)
            }
        } finally {
            if (type === 'PROD') {
                setTestingProd(false)
            } else {
                setTestingDev(false)
            }
        }
    }

    const renderTestResult = (result: TestResult | null) => {
        if (!result) return null

        return (
            <div className={cn(
                "mt-2 p-3 rounded-lg text-sm",
                result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            )}>
                <div className="flex items-center gap-2">
                    {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={result.success ? "text-green-700" : "text-red-700"}>
                        {result.message}
                    </span>
                </div>
                {result.success && (
                    <div className="mt-2 flex gap-4 text-xs">
                        <span className="flex items-center gap-1">
                            {result.canRead ? (
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                            )}
                            อ่านไฟล์
                        </span>
                        <span className="flex items-center gap-1">
                            {result.canWrite ? (
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                            )}
                            เขียนไฟล์
                        </span>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b">
                <nav className="flex" aria-label="Tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                                activeTab === tab.id
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.id === 'workload' && hasChanges && (
                                <span className="ml-1 h-2 w-2 rounded-full bg-orange-500" />
                            )}
                            {tab.id === 'storage' && hasStorageChanges && (
                                <span className="ml-1 h-2 w-2 rounded-full bg-orange-500" />
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'workload' && (
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
            )}

            {activeTab === 'storage' && (
                <form onSubmit={handleStorageSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HardDrive className="h-5 w-5" />
                                File Storage Settings
                            </CardTitle>
                            <CardDescription>
                                Configure file storage paths for production and development environments.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="prodPath">Production Path (PROD)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="prodPath"
                                            type="text"
                                            value={storageConfig.prodPath}
                                            onChange={(e) => handleStorageChange('prodPath', e.target.value)}
                                            placeholder="\\\\server\\share\\folder"
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleTestConnection('PROD')}
                                            disabled={testingProd || !storageConfig.prodPath}
                                        >
                                            {testingProd ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Plug className="h-4 w-4" />
                                            )}
                                            <span className="ml-2">ทดสอบ</span>
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground">UNC path for production file storage.</p>
                                    {renderTestResult(prodTestResult)}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="devPath">Development Path (DEV)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="devPath"
                                            type="text"
                                            value={storageConfig.devPath}
                                            onChange={(e) => handleStorageChange('devPath', e.target.value)}
                                            placeholder="\\\\server\\share\\folder-dev"
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleTestConnection('DEV')}
                                            disabled={testingDev || !storageConfig.devPath}
                                        >
                                            {testingDev ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Plug className="h-4 w-4" />
                                            )}
                                            <span className="ml-2">ทดสอบ</span>
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground">UNC path for development/test file storage.</p>
                                    {renderTestResult(devTestResult)}
                                </div>
                            </div>

                            <hr className="my-4" />

                            <div className="space-y-4">
                                <Label>Active Storage Environment</Label>
                                <RadioGroup
                                    value={storageConfig.activePath}
                                    onValueChange={(value) => handleStorageChange('activePath', value)}
                                    className="flex flex-col space-y-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="PROD" id="storage-prod" />
                                        <Label htmlFor="storage-prod" className="font-normal cursor-pointer">
                                            Production (PROD)
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="DEV" id="storage-dev" />
                                        <Label htmlFor="storage-dev" className="font-normal cursor-pointer">
                                            Development (DEV)
                                        </Label>
                                    </div>
                                </RadioGroup>
                                <p className="text-sm text-muted-foreground">
                                    Select which storage environment is currently active.
                                </p>
                            </div>

                            <hr className="my-4" />

                            <div className="p-4 bg-muted rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <FolderOpen className="h-4 w-4" />
                                    <span className="font-medium">Current Active Path:</span>
                                </div>
                                <code className="text-sm break-all">{storageConfig.currentPath}</code>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={!hasStorageChanges || isSavingStorage}>
                                    {isSavingStorage ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Storage Settings
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            )}
        </div>
    )
}
