'use client'

import { LateMeetingRecord } from "@/lib/actions/kpi-records-actions"
import { format } from "date-fns"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LateMeetingTableProps {
    records: LateMeetingRecord[]
    onDelete: (id: string) => void
}

export function LateMeetingTable({ records, onDelete }: LateMeetingTableProps) {
    if (records.length === 0) {
        return (
            <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                <p className="text-slate-500 text-sm">No late meeting minutes recorded yet.</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Project</th>
                            <th className="px-4 py-3 font-medium">Meeting End</th>
                            <th className="px-4 py-3 font-medium">Submitted</th>
                            <th className="px-4 py-3 font-medium text-red-600">Late Time</th>
                            <th className="px-4 py-3 font-medium">Reason</th>
                            <th className="px-4 py-3 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {records.map((record) => (
                            <tr key={record.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-medium text-slate-900">
                                    {format(new Date(record.meeting_date), 'dd MMM yyyy')}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                    {record.project_name || '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                    {format(new Date(record.meeting_date), 'dd MMM')} {record.meeting_end_time.slice(0, 5)}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                    {format(new Date(record.submitted_date), 'dd MMM')} {record.submitted_time.slice(0, 5)}
                                </td>
                                <td className="px-4 py-3 font-medium text-red-600">
                                    {record.hours_late}h
                                </td>
                                <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={record.late_reason}>
                                    {record.late_reason || '-'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (record.id) onDelete(record.id)
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
