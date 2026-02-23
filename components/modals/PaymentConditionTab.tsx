'use client'

import type { MilestoneRow } from '@/types/project'

interface PaymentConditionTabProps {
    milestones: MilestoneRow[]
    contractValue: number
    onUpdatePaymentPercent: (index: number, percent: number) => void
}

export function PaymentConditionTab({ milestones, contractValue, onUpdatePaymentPercent }: PaymentConditionTabProps) {
    const totalPaymentPercent = milestones.reduce((sum, m) => sum + (m.payment_percent || 0), 0)
    const totalPaymentAmount = contractValue * totalPaymentPercent / 100
    const isValid = Math.abs(totalPaymentPercent - 100) < 0.01

    const formatMoney = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="space-y-4">
            {/* Contract Value Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">มูลค่าโครงการ (Contract Value)</span>
                    <span className="text-lg font-bold text-blue-700">
                        {formatMoney(contractValue)} บาท
                    </span>
                </div>
                {contractValue === 0 && (
                    <p className="text-xs text-blue-500 mt-1">กรุณาระบุมูลค่าโครงการในแท็บ Project Info ก่อน</p>
                )}
            </div>

            {/* Payment Condition Table */}
            {milestones.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Milestone</th>
                                <th className="px-4 py-3 w-28 text-center text-xs font-semibold text-slate-500 uppercase">Payment %</th>
                                <th className="px-4 py-3 w-44 text-right text-xs font-semibold text-slate-500 uppercase">จำนวนเงิน (บาท)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {milestones.map((m, i) => {
                                const amount = contractValue * (m.payment_percent || 0) / 100
                                return (
                                    <tr key={m.milestone_config_id || i} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: m.milestone_color || '#94A3B8' }}
                                                />
                                                <span className="font-medium text-slate-700">
                                                    {m.milestone_name || 'Milestone'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="w-full text-center border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                value={m.payment_percent || 0}
                                                onChange={(e) => onUpdatePaymentPercent(i, parseFloat(e.target.value) || 0)}
                                                disabled={m.is_locked}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-700 tabular-nums">
                                            {formatMoney(amount)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${isValid ? 'text-green-600' : 'text-orange-600'}`}>
                                รวม: {totalPaymentPercent.toFixed(2)}%
                            </span>
                            {!isValid && totalPaymentPercent > 0 && (
                                <span className="text-xs text-orange-500">
                                    (ควรรวมเป็น 100%)
                                </span>
                            )}
                        </div>
                        <span className="text-sm font-bold text-slate-800 tabular-nums">
                            {formatMoney(totalPaymentAmount)} บาท
                        </span>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-slate-400">
                    <p>ไม่มี Milestone</p>
                    <p className="text-xs mt-1">กรุณาเพิ่ม Milestone ในแท็บ Milestones ก่อน</p>
                </div>
            )}
        </div>
    )
}
