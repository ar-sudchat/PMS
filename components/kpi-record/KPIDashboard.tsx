"use client"

import { useState } from 'react'
import { Rocket, HardDrive, FileCheck, FileText, CheckSquare, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

// Import all KPI views
import { DeploySuccessView } from './DeploySuccessView'
import { DeployBackupView } from './DeployBackupView'
import { MeetingMinutesView } from './MeetingMinutesView'
import DocsOntimeView from './DocsOntimeView'
import IssueClearingView from './IssueClearingView'
import PostGoliveReworkView from './PostGoliveReworkView'

interface KPIDashboardProps {
    currentUserId: string
    initialTab?: string
}

const tabs = [
    { id: 'deploy-success', label: 'Deploy Success', icon: Rocket },
    { id: 'deploy-backup', label: 'Deploy Backup', icon: HardDrive },
    { id: 'meeting-minutes', label: 'Meeting Minutes', icon: FileCheck },
    { id: 'docs-ontime', label: 'Docs On-time', icon: FileText },
    { id: 'issue-clearing', label: 'Issue Clearing', icon: CheckSquare },
    { id: 'post-golive-rework', label: 'Post Go-Live Rework', icon: Wrench },
]

export function KPIDashboard({ currentUserId, initialTab = 'deploy-success' }: KPIDashboardProps) {
    const [activeTab, setActiveTab] = useState(initialTab)

    const renderContent = () => {
        switch (activeTab) {
            case 'deploy-success':
                return <DeploySuccessView currentUserId={currentUserId} embedded />
            case 'deploy-backup':
                return <DeployBackupView currentUserId={currentUserId} embedded />
            case 'meeting-minutes':
                return <MeetingMinutesView currentUserId={currentUserId} embedded />
            case 'docs-ontime':
                return <DocsOntimeView embedded />
            case 'issue-clearing':
                return <IssueClearingView embedded />
            case 'post-golive-rework':
                return <PostGoliveReworkView embedded />
            default:
                return <DeploySuccessView currentUserId={currentUserId} embedded />
        }
    }

    return (
        <div className="h-full flex flex-col">
            {/* Compact Tab Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-2">
                <div className="flex items-center gap-1 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                                    isActive
                                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-slate-50">
                {renderContent()}
            </div>
        </div>
    )
}
