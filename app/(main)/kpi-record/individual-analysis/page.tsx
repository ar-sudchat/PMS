import { getEmployeesForAnalysis } from '@/lib/actions/kpi-individual-actions'
import IndividualKPIAnalysis from '@/components/kpi-record/IndividualKPIAnalysis'

export default async function IndividualKPIAnalysisPage() {
    const employees = await getEmployeesForAnalysis()

    return <IndividualKPIAnalysis initialEmployees={employees} />
}
