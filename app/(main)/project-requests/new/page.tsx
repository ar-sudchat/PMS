
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { ProjectRequestForm } from '@/components/project-requests/ProjectRequestForm'
import { getCustomers } from '@/lib/actions/customer-actions'
import {
    getProjectRequestTypes,
    getProjectRequestPriorities
} from '@/lib/actions/project-request-actions'

export default async function NewProjectRequestPage() {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }

    const [customers, requestTypes, priorities] = await Promise.all([
        getCustomers(),
        getProjectRequestTypes(),
        getProjectRequestPriorities()
    ])

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/project-requests">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">สร้างคำขอโครงการใหม่</h1>
                    <p className="text-muted-foreground">
                        กรอกรายละเอียดเบื้องต้นของโครงการเพื่อส่งอนุมัติ
                    </p>
                </div>
            </div>

            <ProjectRequestForm
                customers={customers}
                requestTypes={requestTypes}
                priorities={priorities}
                currentUserId={user.id}
            />
        </div>
    )
}
