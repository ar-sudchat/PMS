import { BackupTypesView } from "@/components/kpi-record/BackupTypesView"
import { getCurrentUser } from "@/lib/auth"

export default async function BackupTypesPage() {
    const user = await getCurrentUser()

    return <BackupTypesView currentUserId={user?.id || ''} />
}
