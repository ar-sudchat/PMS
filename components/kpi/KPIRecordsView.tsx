"use client"

import { getKPIOperationalSummary, getWeeklyKPIRecords, getLateMeetingRecords, WeeklyKPIRecord, deleteLateMeetingRecord } from "@/lib/actions/kpi-records-actions"
import { KPIOperationalCards } from "@/components/kpi/KPIOperationalCards"
import { WeeklyRecordsTable } from "@/components/kpi/WeeklyRecordsTable"
import { LateMeetingTable } from "@/components/kpi/LateMeetingTable"
import { WeeklyRecordModal } from "@/components/kpi/WeeklyRecordModal"
import { LateMeetingModal } from "@/components/kpi/LateMeetingModal"
import { Button } from "@/components/ui/button"
import { Plus, BarChart3, Clock } from "lucide-react"
import { useState } from "react"
import { format } from "date-fns"

interface KPIRecordsViewProps {
    initialSummary: any
    initialRecords: any
    initialLateRecords: any
}

export function KPIRecordsView({ initialSummary, initialRecords, initialLateRecords }: KPIRecordsViewProps) {
    const [summary, setSummary] = useState(initialSummary)
    const [records, setRecords] = useState(initialRecords)
    const [lateRecords, setLateRecords] = useState(initialLateRecords)

    const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false)
    const [isLateModalOpen, setIsLateModalOpen] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState<WeeklyKPIRecord | null>(null)

    const refreshData = async () => {
        try {
            const { getKPIOperationalSummary, getWeeklyKPIRecords, getLateMeetingRecords } = await import("@/lib/actions/kpi-records-actions")
            setSummary(await getKPIOperationalSummary())
            setRecords(await getWeeklyKPIRecords())
            setLateRecords(await getLateMeetingRecords())
        } catch (e) {
            console.error(e)
        }
    }

    const handleEditWeekly = (record: WeeklyKPIRecord) => {
        setSelectedRecord(record)
        setIsWeeklyModalOpen(true)
    }

    const handleNewWeekly = () => {
        const firstUnrecorded = records.find((r: any) => !r.is_recorded) || records[0]
        setSelectedRecord(firstUnrecorded)
        setIsWeeklyModalOpen(true)
    }

    const handleDeleteLate = async (id: string) => {
        if (!confirm("Are you sure you want to delete this record?")) return
        const { deleteLateMeetingRecord } = await import("@/lib/actions/kpi-records-actions")
        await deleteLateMeetingRecord(id)
        refreshData()
    }

    return (
        <div className="space-y-6 h-full p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        KPI Weekly Records {new Date().getFullYear()}
                    </h1>
                    <p className="text-slate-500">
                        Monitor operational excellence: Deployments, Backups, and Meeting Efficiency.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleNewWeekly} className="shadow-sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Weekly Record
                    </Button>
                    <Button variant="outline" onClick={() => setIsLateModalOpen(true)} className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                        <Plus className="w-4 h-4 mr-2" />
                        Record Late MoM
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && <KPIOperationalCards summary={summary} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Records (Main Table) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center">
                            <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
                            Weekly Deployment & Backup
                        </h2>
                    </div>

                    <WeeklyRecordsTable
                        records={records}
                        onEdit={handleEditWeekly}
                    />
                </div>

                {/* Late MoM (Side List) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-amber-600" />
                            Late Meeting Minutes
                        </h2>
                        <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                            {lateRecords.length} Records
                        </span>
                    </div>

                    <LateMeetingTable
                        records={lateRecords}
                        onDelete={handleDeleteLate}
                    />
                </div>
            </div>

            {/* Modals */}
            <WeeklyRecordModal
                record={selectedRecord}
                isOpen={isWeeklyModalOpen}
                onClose={() => setIsWeeklyModalOpen(false)}
                onSaved={refreshData}
            />

            <LateMeetingModal
                isOpen={isLateModalOpen}
                onClose={() => setIsLateModalOpen(false)}
                onSaved={refreshData}
            />
        </div>
    )
}

function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}
