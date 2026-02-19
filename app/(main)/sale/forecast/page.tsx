'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { RefreshCw, Loader2, Search, LayoutList, FolderTree } from 'lucide-react'
import {
    fetchSalesCashInPlan,
    fetchSopFilterOptions,
    type SalesCashInPlanData,
    type SalesCashInMilestone,
    type SalesCashInProject,
    type PaymentMilestone,
    type SopFilterOptions,
} from '@/lib/actions/sop-actions'
import { ForecastTable } from '@/components/sop-dashboard/ForecastTable'
import { PaymentUpdateDialog } from '@/components/sop-dashboard/PaymentUpdateDialog'

type ViewMode = 'project' | 'group'

export default function SalesForecastDashboardPage() {
    const [data, setData] = useState<SalesCashInPlanData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [filterOptions, setFilterOptions] = useState<SopFilterOptions | null>(null)
    const [activeTab, setActiveTab] = useState('forecast')
    const [viewBy, setViewBy] = useState<ViewMode>('project')

    // Filters
    const [selectedProject, setSelectedProject] = useState<Option | null>(null)
    const [selectedCustomer, setSelectedCustomer] = useState<Option | null>(null)
    const [searchText, setSearchText] = useState('')

    // Payment dialog
    const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; milestone: PaymentMilestone | null }>({ open: false, milestone: null })

    // Load filter options
    useEffect(() => {
        const init = async () => {
            const result = await fetchSopFilterOptions()
            if (result.success && result.data) {
                setFilterOptions(result.data)
            }
        }
        init()
    }, [])

    const projectOptions: Option[] = useMemo(() =>
        (filterOptions?.projects || []).map(p => ({ value: p.id, label: `${p.project_code} - ${p.name}` }))
    , [filterOptions])

    const customerOptions: Option[] = useMemo(() =>
        (filterOptions?.customers || []).map(c => ({ value: c.id, label: c.name }))
    , [filterOptions])

    // Load data
    const loadData = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await fetchSalesCashInPlan(selectedYear, {
                projectId: selectedProject ? String(selectedProject.value) : undefined,
                customerId: selectedCustomer ? String(selectedCustomer.value) : undefined,
                search: searchText || undefined,
                billingStatus: 'ALL',
            })
            if (result.success && result.data) {
                setData(result.data)
            } else {
                console.error('Forecast API error:', result.error)
                setData(null)
            }
        } catch (error) {
            console.error('Failed to load data:', error)
        } finally {
            setIsLoading(false)
        }
    }, [selectedYear, selectedProject, selectedCustomer, searchText])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleMilestoneClick = (milestone: SalesCashInMilestone, project: SalesCashInProject) => {
        setPaymentDialog({
            open: true,
            milestone: {
                milestone_id: milestone.milestone_id,
                project_id: project.project_id,
                project_code: project.project_code,
                project_name: project.project_name,
                customer_name: project.customer_name,
                milestone_name: milestone.milestone_name,
                milestone_due_date: milestone.milestone_due_date,
                milestone_status: milestone.milestone_status,
                billing_status: project.billing_status,
                invoice_no: milestone.invoice_no,
                invoice_date: milestone.invoice_date,
                invoice_amount: milestone.invoice_amount,
                payment_status: milestone.payment_status,
                payment_due_date: milestone.payment_due_date,
                payment_received_date: milestone.payment_received_date,
                payment_amount: milestone.payment_amount,
                payment_notes: milestone.payment_notes,
                is_overdue: false,
                days_overdue: 0,
            } as PaymentMilestone,
        })
    }

    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Sales Forecast Dashboard</h1>
                    <p className="text-sm text-muted-foreground">แผนการเก็บเงิน Forecast vs Actual</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-1">รีเฟรช</span>
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="w-64">
                    <SmartCombobox
                        options={projectOptions}
                        value={selectedProject}
                        onChange={setSelectedProject}
                        placeholder="ทุกโครงการ"
                        searchable
                    />
                </div>
                <div className="w-48">
                    <SmartCombobox
                        options={customerOptions}
                        value={selectedCustomer}
                        onChange={setSelectedCustomer}
                        placeholder="ทุกลูกค้า"
                        searchable
                    />
                </div>
                <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        placeholder="ค้นหา..."
                        className="pl-8 h-9"
                    />
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="forecast" className="gap-1.5">
                            Invoice Forecast
                        </TabsTrigger>
                        <TabsTrigger value="actual" className="gap-1.5">
                            Cash In Forecast
                        </TabsTrigger>
                    </TabsList>

                    {/* View toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewBy('project')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                viewBy === 'project' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <LayoutList className="h-3.5 w-3.5" />
                            By Project
                        </button>
                        <button
                            onClick={() => setViewBy('group')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                viewBy === 'group' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <FolderTree className="h-3.5 w-3.5" />
                            By Group
                        </button>
                    </div>
                </div>

                <TabsContent value="forecast" className="mt-4">
                    <Card>
                        <CardContent className="p-4">
                            <ForecastTable
                                data={data}
                                year={selectedYear}
                                onYearChange={setSelectedYear}
                                mode="forecast"
                                viewBy={viewBy}
                                onMilestoneClick={handleMilestoneClick}
                                isLoading={isLoading}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="actual" className="mt-4">
                    <Card>
                        <CardContent className="p-4">
                            <ForecastTable
                                data={data}
                                year={selectedYear}
                                onYearChange={setSelectedYear}
                                mode="actual"
                                viewBy={viewBy}
                                onMilestoneClick={handleMilestoneClick}
                                isLoading={isLoading}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Payment Update Dialog */}
            <PaymentUpdateDialog
                open={paymentDialog.open}
                onOpenChange={(open) => setPaymentDialog(prev => ({ ...prev, open }))}
                milestone={paymentDialog.milestone}
                onSuccess={loadData}
            />
        </div>
    )
}
