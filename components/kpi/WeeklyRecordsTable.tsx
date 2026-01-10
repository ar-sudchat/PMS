'use client'

import { WeeklyKPIRecord } from "@/lib/actions/kpi-records-actions"
import { format } from "date-fns"
import { CheckCircle2, AlertTriangle, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface WeeklyRecordsTableProps {
    records: WeeklyKPIRecord[]
    onEdit: (record: WeeklyKPIRecord) => void
}

export function WeeklyRecordsTable({ records, onEdit }: WeeklyRecordsTableProps) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 font-medium">Week</th>
                            <th className="px-4 py-3 font-medium text-center">Deploy</th>
                            <th className="px-4 py-3 font-medium text-center">Rollback</th>
                            <th className="px-4 py-3 font-medium text-center">Success Rate</th>
                            <th className="px-4 py-3 font-medium text-center">Backup</th>
                            <th className="px-4 py-3 font-medium">Notes</th>
                            <th className="px-4 py-3 font-medium text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {records.map((record) => (
                            <tr
                                key={`${record.year}-${record.week_number}`}
                                className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                onClick={() => onEdit(record)}
                            >
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-900">
                                        W{record.week_number}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {format(new Date(record.week_start_date), 'd MMM')} - {format(new Date(record.week_end_date), 'd MMM')}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {record.is_recorded ? record.total_deploys : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {record.is_recorded ? (
                                        <span className={cn(record.total_rollbacks > 0 ? "text-red-600 font-medium" : "text-slate-600")}>
                                            {record.total_rollbacks}
                                        </span>
                                    ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {record.is_recorded && record.deploy_success_rate !== undefined ? (
                                        <div className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                            record.deploy_success_rate >= 95 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                        )}>
                                            {record.deploy_success_rate}%
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {record.is_recorded ? (
                                        record.backup_completed ? (
                                            <div className="flex flex-col items-center">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                {record.backup_date && (
                                                    <span className="text-[10px] text-slate-400 mt-0.5">
                                                        {format(new Date(record.backup_date), 'd MMM')}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-red-500 mx-auto" />
                                        )
                                    ) : '-'}
                                </td>
                                <td className="px-4 py-3 max-w-[200px] truncate text-slate-500" title={record.notes || record.rollback_notes || ''}>
                                    {record.rollback_notes || record.notes || '-'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {record.is_recorded ? (
                                        <span className="inline-flex items-center text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                            Recorded
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 font-medium hover:bg-indigo-100">
                                            <Edit2 className="w-3 h-3 mr-1" />
                                            Record
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div >
    )
}
