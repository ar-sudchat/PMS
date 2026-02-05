'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Search, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MktStageFilter } from '@/components/mkt-tracking/MktStageFilter'
import { MktProjectTable } from '@/components/mkt-tracking/MktProjectTable'
import { MktDetailDialog } from '@/components/mkt-tracking/MktDetailDialog'
import { MktHistoryPanel } from '@/components/mkt-tracking/MktHistoryPanel'
import { ProjectModal } from '@/components/modals/ProjectModal'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { MktStageCode } from '@/lib/constants/mkt-stages'
import {
    fetchMktProjects,
    fetchMktStageSummary,
    fetchMktFilterOptions,
    MktProject,
    MktStageSummary,
    MktFilterOptions,
} from '@/lib/actions/mkt-tracking-actions'

export default function MktTrackingPage() {
    const [projects, setProjects] = useState<MktProject[]>([])
    const [summary, setSummary] = useState<MktStageSummary[]>([])
    const [selectedStage, setSelectedStage] = useState<MktStageCode | 'ALL'>('ALL')
    const [isLoading, setIsLoading] = useState(true)

    // Filter states
    const [filterOptions, setFilterOptions] = useState<MktFilterOptions | null>(null)
    const currentYear = new Date().getFullYear()
    const [selectedYear, setSelectedYear] = useState<Option | null>({
        value: currentYear,
        label: String(currentYear)
    })
    const [selectedCustomer, setSelectedCustomer] = useState<Option | null>(null)
    const [selectedProject, setSelectedProject] = useState<Option | null>(null)
    const [selectedOwner, setSelectedOwner] = useState<Option | null>(null)
    const [selectedPM, setSelectedPM] = useState<Option | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Dialog states
    const [editProject, setEditProject] = useState<MktProject | null>(null)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [historyProject, setHistoryProject] = useState<MktProject | null>(null)
    const [historyPanelOpen, setHistoryPanelOpen] = useState(false)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editProjectModalOpen, setEditProjectModalOpen] = useState(false)
    const [projectToEdit, setProjectToEdit] = useState<MktProject | null>(null)

    // Load filter options on mount
    useEffect(() => {
        const loadFilterOptions = async () => {
            const result = await fetchMktFilterOptions()
            if (result.success && result.data) {
                setFilterOptions(result.data)
            }
        }
        loadFilterOptions()
    }, [])

    const loadData = useCallback(async () => {
        setIsLoading(true)
        try {
            const [projectsResult, summaryResult] = await Promise.all([
                fetchMktProjects({
                    stage: selectedStage,
                    year: selectedYear?.value as number | undefined,
                    customerId: selectedCustomer?.value as string | undefined,
                    projectId: selectedProject?.value as string | undefined,
                    ownerId: selectedOwner?.value as string | undefined,
                    projectManagerId: selectedPM?.value as string | undefined,
                    search: searchTerm || undefined,
                }),
                fetchMktStageSummary(),
            ])

            if (projectsResult.success && projectsResult.data) {
                setProjects(projectsResult.data)
            }
            if (summaryResult.success && summaryResult.data) {
                setSummary(summaryResult.data)
            }
        } catch (error) {
            console.error('Failed to load data:', error)
        } finally {
            setIsLoading(false)
        }
    }, [selectedStage, selectedYear, selectedCustomer, selectedProject, selectedOwner, selectedPM, searchTerm])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleStageChange = (stage: MktStageCode | 'ALL') => {
        setSelectedStage(stage)
    }

    const handleEdit = (project: MktProject) => {
        setEditProject(project)
        setEditDialogOpen(true)
    }

    const handleViewHistory = (project: MktProject) => {
        setHistoryProject(project)
        setHistoryPanelOpen(true)
    }

    const handleEditProject = (project: MktProject) => {
        setProjectToEdit(project)
        setEditProjectModalOpen(true)
    }

    const handleClearFilters = () => {
        setSelectedYear({ value: currentYear, label: String(currentYear) })
        setSelectedCustomer(null)
        setSelectedProject(null)
        setSelectedOwner(null)
        setSelectedPM(null)
        setSearchTerm('')
        setSelectedStage('ALL')
    }

    return (
        <div className="container mx-auto py-4 space-y-4">
            {/* Main Content */}
            <Card>
                <CardContent className="pt-4">
                    {/* Header with Button */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">MKT Tracking</h2>
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Project
                        </Button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div className="relative flex-1 min-w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ค้นหา รหัส, ชื่อ, ลูกค้า..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="w-[120px]">
                            <SmartCombobox
                                placeholder="ปี..."
                                options={filterOptions?.years.map(year => ({
                                    value: year,
                                    label: String(year)
                                })) || []}
                                value={selectedYear}
                                onChange={setSelectedYear}
                                searchable={false}
                            />
                        </div>
                        <div className="w-[260px]">
                            <SmartCombobox
                                placeholder="ลูกค้า..."
                                options={filterOptions?.customers.map(c => ({
                                    value: c.id,
                                    label: c.name
                                })) || []}
                                value={selectedCustomer}
                                onChange={setSelectedCustomer}
                            />
                        </div>
                        <div className="w-[320px]">
                            <SmartCombobox
                                placeholder="โครงการ..."
                                options={filterOptions?.projects.map(p => ({
                                    value: p.id,
                                    label: `${p.project_code} - ${p.name}`
                                })) || []}
                                value={selectedProject}
                                onChange={setSelectedProject}
                            />
                        </div>
                        <div className="w-[180px]">
                            <SmartCombobox
                                placeholder="Owner..."
                                options={filterOptions?.owners.map(o => ({
                                    value: o.id,
                                    label: o.full_name
                                })) || []}
                                value={selectedOwner}
                                onChange={setSelectedOwner}
                            />
                        </div>
                        <div className="w-[180px]">
                            <SmartCombobox
                                placeholder="PM..."
                                options={filterOptions?.pms?.map(pm => ({
                                    value: pm.id,
                                    label: pm.full_name
                                })) || []}
                                value={selectedPM}
                                onChange={setSelectedPM}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleClearFilters}
                            title="ล้างตัวกรอง"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {/* Stage Filter */}
                            <MktStageFilter
                                selectedStage={selectedStage}
                                onStageChange={handleStageChange}
                                summary={summary}
                            />

                            {/* Project Table */}
                            <MktProjectTable
                                projects={projects}
                                onEdit={handleEdit}
                                onEditProject={handleEditProject}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <MktDetailDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                project={editProject}
                onSuccess={loadData}
                onViewHistory={handleViewHistory}
            />

            {/* History Panel */}
            <MktHistoryPanel
                open={historyPanelOpen}
                onOpenChange={setHistoryPanelOpen}
                projectId={historyProject?.id || null}
                projectTitle={historyProject ? `${historyProject.project_code} - ${historyProject.title}` : ''}
            />

            {/* Create MKT Project Modal - Same as /projects page but with MKT pre-selected */}
            <ProjectModal
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                mode="create"
                project={null}
                onSuccess={() => {
                    loadData()
                    setCreateDialogOpen(false)
                }}
                defaultProjectTypeCode="MKT"
            />

            {/* Edit Project Modal */}
            <ProjectModal
                open={editProjectModalOpen}
                onClose={() => {
                    setEditProjectModalOpen(false)
                    setProjectToEdit(null)
                }}
                mode="edit"
                project={projectToEdit ? {
                    id: projectToEdit.id,
                    project_code: projectToEdit.project_code,
                    project_year: parseInt(projectToEdit.project_code.substring(0, 2)) + 2000 || new Date().getFullYear(),
                    name: projectToEdit.title,
                    customer_id: projectToEdit.customer_id || '',
                    project_manager_id: projectToEdit.project_manager_id || '',
                    sold_mandays: 0,
                    manday_rate: 0,
                    total_value: 0,
                    is_active: true,
                    created_at: projectToEdit.created_at,
                    updated_at: projectToEdit.created_at,
                } : null}
                onSuccess={() => {
                    loadData()
                    setEditProjectModalOpen(false)
                    setProjectToEdit(null)
                }}
            />
        </div>
    )
}
