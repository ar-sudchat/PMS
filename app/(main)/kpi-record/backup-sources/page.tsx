import { BackupSourcesView } from "@/components/kpi-record/BackupSourcesView"
import { getCurrentUser } from "@/lib/auth"

export default async function BackupSourcesPage() {
    const user = await getCurrentUser()

    return <BackupSourcesView currentUserId={user?.id || ''} />
}
