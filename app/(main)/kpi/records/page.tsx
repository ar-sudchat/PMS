
import { getKPIOperationalSummary, getWeeklyKPIRecords, getLateMeetingRecords } from "@/lib/actions/kpi-records-actions"
import { KPIRecordsView } from "@/components/kpi/KPIRecordsView"

export const dynamic = 'force-dynamic'

export default async function KPIRecordsPage() {
    // This is server component initial fetch for SEO/Performance
    const summary = await getKPIOperationalSummary()
    const initialRecords = await getWeeklyKPIRecords()
    const initialLateRecords = await getLateMeetingRecords()

    return (
        <KPIRecordsView
            initialSummary={summary}
            initialRecords={initialRecords}
            initialLateRecords={initialLateRecords}
        />
    )
}
