import { ReactNode } from 'react'

export default function KPIRecordLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50/50">
            {children}
        </div>
    )
}
