'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Rocket, HardDrive, FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    {
        label: 'Deploy Success',
        labelTh: 'ผลการ Deploy',
        href: '/kpi-record/deploy-success',
        icon: Rocket,
        description: 'Track deployment success rate'
    },
    {
        label: 'Deploy Backup',
        labelTh: 'Backup ก่อน Deploy',
        href: '/kpi-record/deploy-backup',
        icon: HardDrive,
        description: 'Track backups before deployment'
    },
    {
        label: 'Meeting Minutes',
        labelTh: 'MoM Tracking',
        href: '/kpi-record/meeting-minutes',
        icon: FileCheck,
        description: 'Track MoM submission timing'
    }
]

export function KPIRecordNav() {
    const pathname = usePathname()

    return (
        <div className="bg-white border-b border-slate-200">
            <div className="max-w-[1400px] mx-auto px-6">
                <nav className="flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                                    isActive
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                )}
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}
