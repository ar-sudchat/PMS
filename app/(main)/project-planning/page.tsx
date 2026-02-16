'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { Loader2, Target, Calendar, Banknote, Users } from 'lucide-react'
import {
    getProjectsForPlanning,
    getProjectPlanningData,
    PlanningDashboardData,
} from '@/lib/actions/project-planning-actions'
import { PlanningDashboard } from '@/components/project-planning/PlanningDashboard'

export default function ProjectPlanningPage() {
    const [projectOptions, setProjectOptions] = useState<{ id: string; project_code: string; name: string }[]>([])
    const [selectedProject, setSelectedProject] = useState<Option | null>(null)
    const [isLoadingProjects, setIsLoadingProjects] = useState(true)

    const [dashboardData, setDashboardData] = useState<PlanningDashboardData | null>(null)
    const [isLoadingData, setIsLoadingData] = useState(false)

    // Load projects
    useEffect(() => {
        const load = async () => {
            setIsLoadingProjects(true)
            const result = await getProjectsForPlanning()
            if (result.success && result.data) {
                setProjectOptions(result.data)
            }
            setIsLoadingProjects(false)
        }
        load()
    }, [])

    // Load dashboard data when project changes
    const loadData = useCallback(async (projectId: string) => {
        setIsLoadingData(true)
        setDashboardData(null)
        try {
            const result = await getProjectPlanningData(projectId)
            if (result.success && result.data) {
                setDashboardData(result.data)
            }
        } catch (error) {
            console.error('Failed to load planning data:', error)
        } finally {
            setIsLoadingData(false)
        }
    }, [])

    useEffect(() => {
        if (selectedProject?.value) {
            loadData(selectedProject.value as string)
        } else {
            setDashboardData(null)
        }
    }, [selectedProject, loadData])

    const comboboxOptions: Option[] = projectOptions.map((p) => ({
        value: p.id,
        label: `${p.project_code} - ${p.name}`,
    }))

    return (
        <div className="container mx-auto py-4 space-y-4">
            {/* Project Selector */}
            <Card>
                <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                            <Target className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold">เลือกโครงการ:</span>
                        </div>
                        <div className="flex-1 max-w-[600px]">
                            {isLoadingProjects ? (
                                <div className="flex items-center gap-2 text-muted-foreground text-sm h-10">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    กำลังโหลดรายการโครงการ...
                                </div>
                            ) : (
                                <SmartCombobox
                                    options={comboboxOptions}
                                    value={selectedProject}
                                    onChange={setSelectedProject}
                                    placeholder="พิมพ์ค้นหาหรือเลือกโครงการ..."
                                />
                            )}
                        </div>
                        {selectedProject && (
                            <span className="text-sm text-muted-foreground">
                                {projectOptions.length} โครงการ
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Empty state */}
            {!selectedProject && !isLoadingProjects && (
                <Card>
                    <CardContent className="py-16">
                        <div className="text-center space-y-4">
                            <Target className="h-16 w-16 text-muted-foreground/30 mx-auto" />
                            <div>
                                <h3 className="text-lg font-semibold text-muted-foreground">เลือกโครงการเพื่อดูภาพรวมการวางแผน</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    เลือกโครงการ DEV จากด้านบน เพื่อดู Timeline, งบประมาณ, และทีมงาน
                                </p>
                            </div>
                            <div className="flex justify-center gap-8 mt-6">
                                <div className="text-center">
                                    <div className="rounded-lg bg-blue-50 p-3 mx-auto w-fit">
                                        <Calendar className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">Timeline</p>
                                </div>
                                <div className="text-center">
                                    <div className="rounded-lg bg-green-50 p-3 mx-auto w-fit">
                                        <Banknote className="h-6 w-6 text-green-600" />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">Cost</p>
                                </div>
                                <div className="text-center">
                                    <div className="rounded-lg bg-orange-50 p-3 mx-auto w-fit">
                                        <Users className="h-6 w-6 text-orange-600" />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">People</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Loading */}
            {selectedProject && isLoadingData && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Dashboard */}
            {selectedProject && !isLoadingData && dashboardData && (
                <PlanningDashboard
                    data={dashboardData}
                    onRefresh={() => loadData(selectedProject.value as string)}
                />
            )}
        </div>
    )
}
