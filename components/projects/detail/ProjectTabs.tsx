'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutList, GanttChartSquare } from 'lucide-react'

interface ProjectTabsProps {
    projectId: string
}

export function ProjectTabs({ projectId }: ProjectTabsProps) {
    const searchParams = useSearchParams()
    const currentTab = searchParams.get('tab') || 'gantt'

    return (
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border w-fit">
            <Link
                href={`/projects/${projectId}?tab=detail`}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    currentTab === 'detail'
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                )}
            >
                <LayoutList className="w-4 h-4" />
                Detail
            </Link>
            <Link
                href={`/projects/${projectId}?tab=gantt`}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    currentTab === 'gantt'
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                )}
            >
                <GanttChartSquare className="w-4 h-4" />
                Gantt View
            </Link>
        </div>
    )
}
