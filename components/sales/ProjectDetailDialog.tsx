'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { ActionLogTab } from './ActionLogTab'
import { SalesTaskTab } from './SalesTaskTab'
import {
    ActionLog, SalesTask, ActionTypeConfig,
    getProjectActionLogs, getProjectTasks, getActionTypes, getEmployees
} from '@/lib/actions/sales-action-log-actions'

interface ProjectDetailDialogProps {
    open: boolean
    onClose: () => void
    projectId: string
    projectCode: string
    projectName: string
    currentUserId: string
}

export function ProjectDetailDialog({ open, onClose, projectId, projectCode, projectName, currentUserId }: ProjectDetailDialogProps) {
    const [activeTab, setActiveTab] = useState<'logs' | 'tasks'>('logs')
    const [logs, setLogs] = useState<ActionLog[]>([])
    const [tasks, setTasks] = useState<SalesTask[]>([])
    const [actionTypes, setActionTypes] = useState<ActionTypeConfig[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const loadData = async () => {
        try {
            const [logsData, tasksData, typesData, empsData] = await Promise.all([
                getProjectActionLogs(projectId),
                getProjectTasks(projectId),
                getActionTypes(),
                getEmployees()
            ])
            setLogs(logsData)
            setTasks(tasksData)
            setActionTypes(typesData)
            setEmployees(empsData)
        } catch (error) {
            console.error('Failed to load project data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open && projectId) {
            setLoading(true)
            loadData()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, projectId])

    const handleRefresh = async () => {
        const [logsData, tasksData] = await Promise.all([
            getProjectActionLogs(projectId),
            getProjectTasks(projectId)
        ])
        setLogs(logsData)
        setTasks(tasksData)
    }

    return (
        <Modal open={open} onClose={onClose} title={`${projectCode}: ${projectName}`} size="xl">
            {/* Tab Switcher */}
            <div className="flex gap-1 mb-4 border-b">
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logs'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Timeline / Action Log ({logs.length})
                </button>
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tasks'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Next Steps & Tasks ({tasks.length})
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400">กำลังโหลดข้อมูล...</div>
            ) : (
                <div className="min-h-[300px]">
                    {activeTab === 'logs' && (
                        <ActionLogTab
                            projectId={projectId}
                            logs={logs}
                            actionTypes={actionTypes}
                            onRefresh={handleRefresh}
                        />
                    )}
                    {activeTab === 'tasks' && (
                        <SalesTaskTab
                            projectId={projectId}
                            tasks={tasks}
                            actionTypes={actionTypes}
                            employees={employees}
                            currentUserId={currentUserId}
                            onRefresh={handleRefresh}
                        />
                    )}
                </div>
            )}
        </Modal>
    )
}
