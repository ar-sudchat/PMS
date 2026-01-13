'use client'

import { type ProjectRow, type SalesMetric } from "@/lib/actions/project-onhand-actions"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Download, PieChart, TrendingUp, AlertCircle } from "lucide-react"

interface ExecutiveSummaryPanelProps {
    data: ProjectRow[]
    metrics: SalesMetric[]
}

export function ExecutiveSummaryPanel({ data, metrics }: ExecutiveSummaryPanelProps) {
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const element = document.getElementById('project-roadmap-snapshot')
            if (!element) return

            const canvas = await html2canvas(element, {
                scale: 2, // High resolution
                backgroundColor: '#F8FAFC', // Match background
                ignoreElements: (element) => element.classList.contains('no-export')
            })

            const image = canvas.toDataURL("image/png")
            const link = document.createElement("a")
            link.href = image
            link.download = `Project_Onhand_Roadmap_${new Date().toISOString().split('T')[0]}.png`
            link.click()
        } catch (error) {
            console.error("Export failed:", error)
        } finally {
            setIsExporting(false)
        }
    }
    // Calculate Quarterly Handover
    const quarters = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }

    data.forEach(p => {
        p.milestones.forEach(m => {
            // Count "Handover" or distinct project finishing in quarter?
            // Let's count "Go-Live" or major milestones
            const month = new Date(m.dueDate).getMonth()
            if (month < 3) quarters.Q1++
            else if (month < 6) quarters.Q2++
            else if (month < 9) quarters.Q3++
            else quarters.Q4++
        })
    })

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Executive Summary</h3>
                <p className="text-xs text-slate-500">High-level view of 2026 delivery pipeline.</p>
            </div>

            {/* Quarterly Breakdown */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Quarterly Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg text-center">
                            <div className="text-xs text-slate-400 mb-1">Q1 (Jan-Mar)</div>
                            <div className="text-xl font-bold text-blue-600">{quarters.Q1}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg text-center">
                            <div className="text-xs text-slate-400 mb-1">Q2 (Apr-Jun)</div>
                            <div className="text-xl font-bold text-slate-700">{quarters.Q2}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg text-center">
                            <div className="text-xs text-slate-400 mb-1">Q3 (Jul-Sep)</div>
                            <div className="text-xl font-bold text-slate-700">{quarters.Q3}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg text-center">
                            <div className="text-xs text-slate-400 mb-1">Q4 (Oct-Dec)</div>
                            <div className="text-xl font-bold text-slate-700">{quarters.Q4}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Risks */}
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-2">
                    <AlertCircle className="w-4 h-4" /> Risks & Attention
                </div>
                <div className="space-y-2">
                    {metrics.find(m => m.title === 'High-Priority Dues' && parseInt(m.value) > 0) && (
                        <div className="text-xs text-rose-600 bg-white/50 p-2 rounded">
                            • {metrics.find(m => m.title === 'High-Priority Dues')?.value} milestones due soon.
                        </div>
                    )}
                    <div className="text-xs text-rose-600 bg-white/50 p-2 rounded">
                        • Handover Confidence is {metrics.find(m => m.title === 'Handover Confidence')?.value}.
                    </div>
                </div>
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2"
            >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isExporting ? 'Capturing...' : 'Export Strategy Report'}
            </Button>
        </div>
    )
}

import html2canvas from 'html2canvas'
import { useState } from "react"
import { Loader2 } from "lucide-react"
