import { ReactNode } from 'react'
import { KPIRecordNav } from '@/components/kpi-record/KPIRecordNav'

export default function KPIRecordLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50/50">
            <KPIRecordNav />
            {children}
        </div>
    )
}
