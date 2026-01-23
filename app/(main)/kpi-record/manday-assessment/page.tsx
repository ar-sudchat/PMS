import { MandayAssessmentView } from '@/components/kpi-record/MandayAssessmentView'
import { getMandayAssessmentRecords } from '@/lib/actions/presale-kpi-actions'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function MandayAssessmentPage({
    searchParams
}: {
    searchParams: Promise<{ year?: string }>
}) {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const params = await searchParams
    const currentYear = params.year ? parseInt(params.year) : new Date().getFullYear()

    // Fetch only my records for Personal KPI
    const data = await getMandayAssessmentRecords(currentYear, user.id)

    return (
        <div className="p-6">
            <MandayAssessmentView initialData={data} currentYear={currentYear} />
        </div>
    )
}
