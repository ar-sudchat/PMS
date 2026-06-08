'use client'

import * as React from 'react'
import { Plus, Trash2, Printer, ChevronRight, ChevronDown, FileText, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    listScenarios,
    getScenario,
    createScenario,
    updateScenarioHeader,
    setScenarioMilestone,
    deleteScenario,
    type ScenarioSummary,
    type ScenarioDetail,
    type ScenarioMilestone,
} from '@/lib/actions/scenario-actions'
import { thShortDate } from './gantt-grid-utils'

interface Props {
    projectId: string
    projectName: string
}

export function WhatIfView({ projectId, projectName }: Props) {
    const [scenarios, setScenarios] = React.useState<ScenarioSummary[]>([])
    const [activeId, setActiveId] = React.useState<string | null>(null)
    const [detail, setDetail] = React.useState<ScenarioDetail | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [loadingDetail, setLoadingDetail] = React.useState(false)
    const [creating, setCreating] = React.useState(false)
    const [newName, setNewName] = React.useState('')

    const loadList = React.useCallback(async () => {
        setLoading(true)
        const r = await listScenarios(projectId)
        if (r.success) setScenarios(r.data)
        setLoading(false)
    }, [projectId])

    const loadDetail = React.useCallback(async (id: string) => {
        setLoadingDetail(true)
        const r = await getScenario(id)
        if (r.success) setDetail(r.data)
        setLoadingDetail(false)
    }, [])

    React.useEffect(() => { loadList() }, [loadList])
    React.useEffect(() => {
        if (activeId) loadDetail(activeId)
        else setDetail(null)
    }, [activeId, loadDetail])

    const handleCreate = async () => {
        if (!newName.trim() || creating) return
        setCreating(true)
        const r = await createScenario({ project_id: projectId, name: newName.trim() })
        setCreating(false)
        if (r.success) {
            setNewName('')
            await loadList()
            setActiveId(r.id)
        } else {
            alert('สร้างไม่สำเร็จ: ' + (r.error || ''))
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('ลบจำลองแผนนี้?')) return
        const r = await deleteScenario(id)
        if (r.success) {
            if (activeId === id) setActiveId(null)
            loadList()
        } else {
            alert('ลบไม่สำเร็จ: ' + (r.error || ''))
        }
    }

    const handleSaveMilestone = async (msId: string, due: string | null) => {
        if (!activeId) return
        const r = await setScenarioMilestone(activeId, msId, { planned_due_date: due })
        if (r.success) {
            // Optimistic local update
            setDetail(prev => prev ? {
                ...prev,
                milestones: prev.milestones.map(m =>
                    m.project_milestone_id === msId ? { ...m, planned_due_date: due } : m
                ),
            } : prev)
        }
    }

    return (
        <div className="p-4 space-y-3">
            {/* Print-only header */}
            <div className="hidden print:block mb-4">
                <h1 className="text-xl font-bold">{projectName}</h1>
                {detail && <div className="text-sm text-slate-600">จำลองแผน: {detail.name}</div>}
            </div>

            {/* Top action bar */}
            <div className="flex items-center gap-2 flex-wrap print:hidden">
                <div className="flex-1 flex items-center gap-2 min-w-[300px]">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                        placeholder="ชื่อจำลองแผนใหม่... (เช่น Best case / Worst case / เลื่อน Phase 2)"
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:border-indigo-500 outline-none"
                    />
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={!newName.trim() || creating}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        เพิ่มจำลองแผน
                    </button>
                </div>
                {detail && (
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        พิมพ์ / Export PDF
                    </button>
                )}
            </div>

            {/* Scenario tabs */}
            <div className="flex items-center gap-1 flex-wrap print:hidden">
                {loading && scenarios.length === 0 ? (
                    <span className="text-xs text-slate-400">กำลังโหลด...</span>
                ) : scenarios.length === 0 ? (
                    <span className="text-xs text-slate-400">ยังไม่มีจำลองแผน — เพิ่มได้ที่ช่องด้านบน</span>
                ) : scenarios.map(s => (
                    <div key={s.id} className={cn(
                        "inline-flex items-center rounded-lg border",
                        activeId === s.id
                            ? "bg-indigo-50 border-indigo-300"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                    )}>
                        <button
                            type="button"
                            onClick={() => setActiveId(s.id === activeId ? null : s.id)}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5",
                                activeId === s.id ? "text-indigo-700" : "text-slate-700"
                            )}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            {s.name}
                            {s.milestone_count > 0 && (
                                <span className="inline-block px-1.5 py-0 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                                    {s.milestone_count}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDelete(s.id)}
                            className="px-1.5 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-r-lg"
                            title="ลบ"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Selected scenario editor */}
            {detail && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    <ScenarioEditor
                        key={detail.id}
                        detail={detail}
                        loading={loadingDetail}
                        onSaveMilestone={handleSaveMilestone}
                        onRename={async (newName) => {
                            const r = await updateScenarioHeader(detail.id, { name: newName })
                            if (r.success) {
                                setDetail(prev => prev ? { ...prev, name: newName } : prev)
                                loadList()
                            }
                        }}
                        onSaveNotes={async (notes) => {
                            const r = await updateScenarioHeader(detail.id, { notes })
                            if (r.success) {
                                setDetail(prev => prev ? { ...prev, notes } : prev)
                            }
                        }}
                    />
                </div>
            )}
        </div>
    )
}

function ScenarioEditor({
    detail, loading, onSaveMilestone, onRename, onSaveNotes,
}: {
    detail: ScenarioDetail
    loading: boolean
    onSaveMilestone: (msId: string, due: string | null) => Promise<void>
    onRename: (name: string) => Promise<void>
    onSaveNotes: (notes: string) => Promise<void>
}) {
    const [editingName, setEditingName] = React.useState(detail.name)
    const [editingNotes, setEditingNotes] = React.useState(detail.notes || '')

    React.useEffect(() => {
        setEditingName(detail.name)
        setEditingNotes(detail.notes || '')
    }, [detail.id])

    const changesCount = detail.milestones.filter(m => m.planned_due_date && m.planned_due_date !== m.original_due_date).length

    return (
        <div className="p-4 space-y-4">
            {/* Header — editable name + notes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ชื่อจำลองแผน</label>
                    <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => editingName !== detail.name && onRename(editingName)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">หมายเหตุ</label>
                    <input
                        type="text"
                        value={editingNotes}
                        onChange={(e) => setEditingNotes(e.target.value)}
                        onBlur={() => editingNotes !== (detail.notes || '') && onSaveNotes(editingNotes)}
                        placeholder="เพิ่มคำอธิบายของสมมติฐาน..."
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                </div>
            </div>

            <div className="text-xs text-slate-500">
                ปรับวันที่ของ milestone — ช่องว่างหมายถึง "ใช้วันที่จากแผนจริง"
                {changesCount > 0 && (
                    <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                        {changesCount} การเปลี่ยนแปลง
                    </span>
                )}
            </div>

            {/* Milestone list */}
            {loading && detail.milestones.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs inline-flex items-center justify-center gap-2 w-full">
                    <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
                </div>
            ) : detail.milestones.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                    โครงการนี้ยังไม่มี milestone — เพิ่มที่ tab "แผน Gantt" ก่อน
                </div>
            ) : (
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider">
                        <tr>
                            <th className="text-left px-2 py-2 w-[40%]">Milestone</th>
                            <th className="text-left px-2 py-2 w-[20%]">วันจริง (Baseline)</th>
                            <th className="text-left px-2 py-2 w-[25%]">วันจำลอง (Override)</th>
                            <th className="text-left px-2 py-2 w-[15%]">เลื่อน</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {detail.milestones.map((m) => (
                            <MilestoneRow key={m.project_milestone_id} m={m} onSave={onSaveMilestone} />
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

function MilestoneRow({
    m, onSave,
}: {
    m: ScenarioMilestone
    onSave: (msId: string, due: string | null) => Promise<void>
}) {
    const [val, setVal] = React.useState<string>(m.planned_due_date || '')

    React.useEffect(() => { setVal(m.planned_due_date || '') }, [m.planned_due_date])

    const handleBlur = () => {
        const next = val || null
        if (next !== m.planned_due_date) {
            onSave(m.project_milestone_id, next)
        }
    }

    const shift = (() => {
        if (!val || !m.original_due_date) return null
        const orig = new Date(m.original_due_date)
        const newD = new Date(val)
        if (isNaN(orig.getTime()) || isNaN(newD.getTime())) return null
        return Math.round((newD.getTime() - orig.getTime()) / (1000 * 60 * 60 * 24))
    })()

    return (
        <tr className="hover:bg-slate-50/60">
            <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                    {m.milestone_color && (
                        <span className="w-2 h-4 rounded-sm shrink-0" style={{ background: m.milestone_color }} />
                    )}
                    <span className="font-medium text-slate-800">{m.milestone_name || m.milestone_code || '—'}</span>
                </div>
            </td>
            <td className="px-2 py-2 text-slate-600 font-mono text-xs">
                {thShortDate(m.original_due_date)}
            </td>
            <td className="px-2 py-2">
                <div className="flex items-center gap-1">
                    <input
                        type="date"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        onBlur={handleBlur}
                        className="px-2 py-1 border border-slate-200 rounded text-xs bg-white focus:border-indigo-500 outline-none"
                    />
                    {val && (
                        <button
                            type="button"
                            onClick={() => { setVal(''); onSave(m.project_milestone_id, null) }}
                            className="p-1 text-slate-400 hover:text-red-600"
                            title="ล้างค่า (ใช้วันที่จริง)"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </td>
            <td className="px-2 py-2">
                {shift !== null && shift !== 0 ? (
                    <span className={cn(
                        "inline-block px-2 py-0.5 rounded-md text-[10px] font-bold",
                        shift < 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                    )}>
                        {shift > 0 ? `+${shift}` : shift} วัน
                    </span>
                ) : shift === 0 ? (
                    <span className="text-[10px] text-slate-400">เท่าเดิม</span>
                ) : (
                    <span className="text-[10px] text-slate-300">—</span>
                )}
            </td>
        </tr>
    )
}
