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

import { getProjectById } from '@/lib/actions/project-actions'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'

export default function MktTrackingPage() {
    const [projects, setProjects] = useState<MktProject[]>([])
    const [summary, setSummary] = useState<MktStageSummary[]>([])
    const [selectedStage, setSelectedStage] = useState<MktStageCode | 'ALL'>('ALL')
    const [isLoading, setIsLoading] = useState(true)

    // Pagination
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const LIMIT = 10
    const totalPages = Math.ceil(total / LIMIT)

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

    // ProjectModal for Editing (Main Project Modal)
    const [editDetailsModal, setEditDetailsModal] = useState<{ open: boolean; project: any | null }>({
        open: false,
        project: null
    })


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
                    page,
                    limit: LIMIT
                }),
                fetchMktStageSummary(),
            ])

            if (projectsResult.success && projectsResult.data) {
                setProjects(projectsResult.data)
                setTotal(projectsResult.total || 0)
            }
            if (summaryResult.success && summaryResult.data) {
                setSummary(summaryResult.data)
            }
        } catch (error) {
            console.error('Failed to load data:', error)
        } finally {
            setIsLoading(false)
        }
    }, [selectedStage, selectedYear, selectedCustomer, selectedProject, selectedOwner, selectedPM, searchTerm, page])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Reset page when filters change
    useEffect(() => {
        setPage(1)
    }, [selectedStage, selectedYear, selectedCustomer, selectedProject, selectedOwner, selectedPM, searchTerm])

    const handleStageChange = (stage: MktStageCode | 'ALL') => {
        setSelectedStage(stage)
    }

    const handleEdit = (project: MktProject) => {
        setEditProject(project)
        setEditDialogOpen(true)
    }

    const handleCodeClick = async (project: MktProject) => {
        setIsLoading(true)
        try {
            const res = await getProjectById(project.id)
            if (res.success && res.data) {
                setEditDetailsModal({ open: true, project: res.data })
            } else {
                alert('Failed to load project details')
            }
        } catch (error) {
            console.error('Error loading project details:', error)
            alert('Failed to load project details')
        } finally {
            setIsLoading(false)
        }
    }

    const handleViewHistory = (project: MktProject) => {
        setHistoryProject(project)
        setHistoryPanelOpen(true)
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

                    {isLoading && projects.length === 0 ? (
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
                                onCodeClick={handleCodeClick}
                            />

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-4 flex justify-end">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                                    className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                                <PaginationItem key={p}>
                                                    <PaginationLink
                                                        isActive={page === p}
                                                        onClick={() => setPage(p)}
                                                        className="cursor-pointer"
                                                    >
                                                        {p}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ))}
                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                    className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog (MKT Specific) */}
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

            {/* Create MKT Project Modal */}
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

            {/* Edit Project Modal (Full Details) */}
            {editDetailsModal.project && (
                <ProjectModal
                    open={editDetailsModal.open}
                    onClose={() => setEditDetailsModal({ open: false, project: null })}
                    mode="edit"
                    project={editDetailsModal.project}
                    onSuccess={() => { // Refresh both lists?
                        loadData()
                        setEditDetailsModal({ open: false, project: null })
                    }}
                />
            )}

        </div>
    )
}
