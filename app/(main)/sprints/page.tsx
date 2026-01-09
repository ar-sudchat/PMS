import { getSprints } from '@/lib/actions/sprint-actions'
import { SprintsList } from '@/components/sprints/SprintsList'
import { redirect } from 'next/navigation'

export default async function SprintsPage() {
    const result = await getSprints()

    if (!result.success) {
        console.error('Failed to load sprints:', result.error)
    }

    const sprints = result.data || []

    return <SprintsList initialSprints={sprints} />
}
