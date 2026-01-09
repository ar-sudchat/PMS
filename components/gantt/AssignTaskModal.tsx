'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, User, Calendar, Clock, Search, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { GanttTask, getTeamWorkload, assignTask, TeamMemberWorkload } from '@/lib/actions/gantt-actions'

interface AssignTaskModalProps {
    open: boolean
    onClose: () => void
    task: GanttTask
    onSuccess: () => void
}

export function AssignTaskModal({ open, onClose, task, onSuccess }: AssignTaskModalProps) {
    const [startDate, setStartDate] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [estimatedHours, setEstimatedHours] = useState('8')
    const [selectedEmployee, setSelectedEmployee] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [teamWorkload, setTeamWorkload] = useState<TeamMemberWorkload[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAssigning, setIsAssigning] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (open && task) {
            const today = new Date()
            setStartDate(task.start_date || today.toISOString().split('T')[0])
            setDueDate(task.end_date || new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            setEstimatedHours(String(task.estimated_hours || 8))
            setSelectedEmployee(task.assignee_id || '')
        }
    }, [open, task])

    useEffect(() => {
        if (open && startDate && dueDate) {
            setIsLoading(true)
            getTeamWorkload(startDate, dueDate, parseFloat(estimatedHours) || 0).then(result => {
                if (result.success) setTeamWorkload(result.data)
                setIsLoading(false)
            })
        }
    }, [open, startDate, dueDate, estimatedHours])

    const workingDays = useMemo(() => {
        if (!startDate || !dueDate) return 0
        let days = 0
        const current = new Date(startDate)
        const end = new Date(dueDate)
        while (current <= end) {
            if (current.getDay() !== 0 && current.getDay() !== 6) days++
            current.setDate(current.getDate() + 1)
        }
        return days
    }, [startDate, dueDate])

    const filteredTeam = searchQuery
        ? teamWorkload.filter(m => m.employee_name.toLowerCase().includes(searchQuery.toLowerCase()))
        : teamWorkload

    const recommendedEmployee = teamWorkload.length > 0
        ? teamWorkload.reduce((best, cur) => cur.avg_workload_percent < best.avg_workload_percent ? cur : best)
        : null

    const handleAssign = async () => {
        if (!selectedEmployee || !startDate || !dueDate) {
            setError('กรุณาเลือกพนักงานและระบุวันที่')
            return
        }
        setIsAssigning(true)
        const result = await assignTask({
            task_id: task.entity_id,
            assignee_id: selectedEmployee,
            start_date: startDate,
            due_date: dueDate,
            estimated_hours: parseFloat(estimatedHours) || undefined
        })
        if (result.success) { onSuccess(); onClose() }
        else setError(result.error || 'Failed')
        setIsAssigning(false)
    }

    const getStatusIcon = (status: string) => ({ available: '🟢', moderate: '🔵', warning: '🟡', overload: '🔴' }[status] || '⚪')
    const getStatusLabel = (status: string) => ({ available: 'ว่างมาก', moderate: 'พอดี', warning: 'เกือบเต็ม', overload: 'เกินแล้ว!' }[status] || '')

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold flex items-center gap-2"><User className="w-5 h-5" /> Assign Task</h2>
                            <p className="text-purple-100 text-sm truncate max-w-md">{task.text}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && <div className="px-4 py-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

                    {/* Dates */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-blue-600" /> กำหนดวันที่</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Start</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Due</label>
                                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={startDate} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Duration</label>
                                <div className="px-3 py-2 bg-slate-100 rounded-lg text-center font-semibold">{workingDays} วัน</div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-600 mb-1"><Clock className="w-4 h-4 inline mr-1" /> Hours</label>
                            <input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} min="0" step="0.5" className="w-32 px-3 py-2 border rounded-lg" />
                        </div>
                    </div>

                    {/* Team */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4"><User className="w-5 h-5 text-purple-600" /> เลือกพนักงาน</h3>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหา..." className="w-full pl-10 pr-4 py-2 border rounded-lg" />
                        </div>

                        {recommendedEmployee && (
                            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                                ✨ <span className="font-semibold">แนะนำ: {recommendedEmployee.employee_name}</span> - ว่างมากที่สุด ({Math.round(recommendedEmployee.avg_workload_percent)}%)
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {filteredTeam.map(member => {
                                    const isSelected = selectedEmployee === member.employee_id
                                    const willOverload = member.new_workload_percent > 100
                                    return (
                                        <button key={member.employee_id} onClick={() => setSelectedEmployee(member.employee_id)}
                                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-transparent bg-white hover:border-slate-200'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-slate-300'}`}>
                                                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800">{member.employee_name}</div>
                                                        <div className="text-xs text-slate-500">{member.position_name} • {member.current_task_count} tasks</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{getStatusIcon(member.status)}</span>
                                                        <span className={`text-sm font-semibold ${member.status === 'overload' ? 'text-red-600' : 'text-slate-700'}`}>{Math.round(member.avg_workload_percent)}%</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500">{getStatusLabel(member.status)}</div>
                                                </div>
                                            </div>
                                            <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div className={`h-full ${member.avg_workload_percent >= 100 ? 'bg-red-500' : member.avg_workload_percent >= 80 ? 'bg-amber-500' : member.avg_workload_percent >= 50 ? 'bg-blue-500' : 'bg-green-500'}`}
                                                    style={{ width: `${Math.min(member.avg_workload_percent, 100)}%` }} />
                                            </div>
                                            <div className="mt-2 text-xs">
                                                <span className="text-slate-500">→ ถ้า Assign:</span>
                                                <span className={`ml-1 font-medium ${willOverload ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {Math.round(member.avg_workload_percent)}% → {Math.round(member.new_workload_percent)}%
                                                </span>
                                                {willOverload && <span className="ml-2 text-red-500">⚠️ Overload!</span>}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                        {selectedEmployee ? <span>เลือก: <span className="font-semibold">{teamWorkload.find(m => m.employee_id === selectedEmployee)?.employee_name}</span></span> : <span className="text-slate-400">ยังไม่ได้เลือก</span>}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-slate-100">Cancel</button>
                        <button onClick={handleAssign} disabled={!selectedEmployee || !startDate || !dueDate || isAssigning} className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                            {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Assign
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
