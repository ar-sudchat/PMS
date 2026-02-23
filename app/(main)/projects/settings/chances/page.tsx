import { Suspense } from 'react'
import { getChanceConfigs } from '@/lib/actions/chance-actions'
import { ChanceList } from '@/components/settings/ChanceList'
import { Target } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ChanceSettingsPage() {
    const result = await getChanceConfigs(true) // Include inactive

    if (!result.success) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-lg">Error loading chance configs</h3>
                <p>{result.error}</p>
                <p className="mt-2 text-sm">กรุณารัน script: <code>scripts/58_create_chance_configs.sql</code></p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                        <Target className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Chance / Probability</h1>
                </div>
                <p className="text-slate-500 ml-11 max-w-2xl">
                    จัดการระดับโอกาส (Chance) สำหรับโครงการ ใช้ระบุความน่าจะเป็นในการปิดดีล
                </p>
            </div>

            <Suspense fallback={<div>Loading...</div>}>
                <ChanceList chances={result.data || []} />
            </Suspense>
        </div>
    )
}
