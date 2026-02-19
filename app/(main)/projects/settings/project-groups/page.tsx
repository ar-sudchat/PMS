import { Suspense } from 'react'
import { getProjectGroupTree, getProjectGroups } from '@/lib/actions/project-group-actions'
import { ProjectGroupList } from '@/components/settings/ProjectGroupList'
import { FolderOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProjectGroupsSettingsPage() {
    const [treeResult, allResult] = await Promise.all([
        getProjectGroupTree(true),
        getProjectGroups(true),
    ])

    if (!treeResult.success || !allResult.success) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-lg">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
                <p>{treeResult.error || allResult.error}</p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <FolderOpen className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Project Groups</h1>
                </div>
                <p className="text-slate-500 ml-11 max-w-2xl">
                    จัดการกลุ่มโครงการ (Group) และกลุ่มย่อย (Sub Group) เช่น Software, Trading, Service
                </p>
            </div>

            <Suspense fallback={<div>กำลังโหลด...</div>}>
                <ProjectGroupList
                    tree={treeResult.data || []}
                    allGroups={allResult.data || []}
                />
            </Suspense>
        </div>
    )
}
