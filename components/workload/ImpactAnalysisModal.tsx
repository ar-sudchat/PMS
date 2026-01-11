'use client'

import React, { useState } from 'react'
import { Bell, ArrowRight, Shield, AlertTriangle, CheckCircle2, Zap, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DragItem {
    id: string
    title: string
    hours: number
    priority: string
    projectCode: string
    status: string
    // Add other fields as needed for display
}

interface ReassignmentImpact {
    skill_match: {
        required: string[];
        has: string[];
        missing: string[];
        percent: number;
    };
    timeline_risk: boolean;
    overload_risk: boolean;
    warnings: { type: string; message: string; severity: 'info' | 'warning' | 'critical' }[];
    suggestions: string[];
}

interface ImpactAnalysisModalProps {
    dragItem: DragItem | null
    targetEmployee: {
        employee_id: string
        first_name: string
        last_name: string
        role: string // Should map to position_code or similar
        // skills: string[] // Assuming we have this, or we mock it for now
    } | null
    targetDate: string
    onConfirm: (note: string, reason: string) => void
    onCancel: () => void
    isOpen: boolean
}

export function ImpactAnalysisModal({
    dragItem,
    targetEmployee,
    targetDate,
    onConfirm,
    onCancel,
    isOpen
}: ImpactAnalysisModalProps) {
    const [note, setNote] = useState('')
    const [reason, setReason] = useState<string>('load_balancing')

    if (!isOpen || !dragItem || !targetEmployee) return null

    // Mock Impact Logic (Since we might not have full skills data in frontend yet)
    // In a real scenario, we'd pass employee skills and task required skills
    const impact: ReassignmentImpact = {
        skill_match: {
            required: ['Skill A', 'Skill B'],
            has: ['Skill A'],
            missing: ['Skill B'],
            percent: 50
        },
        timeline_risk: false,
        overload_risk: false,
        warnings: [],
        suggestions: []
    }

    // Add some basic logic for demonstration
    if (dragItem.priority === 'High' || dragItem.priority === 'Urgent') {
        impact.warnings.push({
            type: 'priority',
            message: 'High priority task - ensure assignee is available immediately.',
            severity: 'warning'
        })
    }

    const skillMatchPercent = impact.skill_match.percent

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onCancel}>
            <div
                className="bg-white rounded-xl w-[600px] max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-white shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Task Reassignment</h2>
                        <p className="text-sm text-slate-500">Review impact before confirming</p>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {/* Task Info */}
                    <div className="bg-slate-50 p-4 rounded-xl border mb-6">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                            <span className={cn(
                                "w-2 h-2 rounded-full",
                                dragItem.priority === 'High' ? "bg-red-500" : "bg-blue-500"
                            )} />
                            {dragItem.projectCode}
                        </div>
                        <h3 className="font-semibold text-slate-800 text-lg">{dragItem.title}</h3>
                        <div className="text-sm text-slate-500 mt-1">{dragItem.hours}h • {dragItem.priority} Priority</div>
                    </div>

                    {/* From -> To */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 bg-slate-50 p-4 rounded-xl border text-center opacity-70">
                            <div className="text-xs text-slate-500 mb-2">Assign to</div>
                            <div className="w-10 h-10 rounded-full bg-slate-200 mx-auto flex items-center justify-center text-slate-600 font-bold mb-2">
                                ?
                            </div>
                        </div>
                        <ArrowRight className="text-slate-400" />
                        <div className="flex-1 bg-green-50 p-4 rounded-xl border border-green-100 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg">New</div>
                            <div className="text-xs text-green-600 mb-2">To</div>
                            <div className="w-10 h-10 rounded-full bg-green-100 mx-auto flex items-center justify-center text-green-600 font-bold mb-2">
                                {targetEmployee.first_name?.[0]}
                            </div>
                            <div className="font-medium text-slate-800">{targetEmployee.first_name} {targetEmployee.last_name}</div>
                            <div className="text-xs text-slate-500">{targetEmployee.role}</div>
                        </div>
                    </div>

                    {/* Warnings */}
                    {impact.warnings.length > 0 && (
                        <div className="space-y-2 mb-6">
                            {impact.warnings.map((w, i) => (
                                <div key={i} className={cn(
                                    "flex gap-3 p-3 rounded-lg border text-sm",
                                    w.severity === 'warning' ? "bg-amber-50 border-amber-100 text-amber-800" : "bg-blue-50 border-blue-100 text-blue-800"
                                )}>
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <span>{w.message}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Reason & Note */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Reason for change</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                            >
                                <option value="load_balancing">Load Balancing</option>
                                <option value="skill_match">Better Skill Match</option>
                                <option value="availability">Availability</option>
                                <option value="urgent">Urgent Request</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Note (Optional)</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full p-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none h-24"
                                placeholder="Add context for this change..."
                            />
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(note, reason)}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm shadow-indigo-200"
                    >
                        <Bell className="w-4 h-4" />
                        Confirm & Notify
                    </button>
                </div>
            </div>
        </div>
    )
}
