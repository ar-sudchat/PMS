import { GanttOverviewBoard } from '@/components/gantt-overview/GanttOverviewBoard'

export const dynamic = 'force-dynamic'

export default function GanttOverviewPage() {
    // MainLayout wraps content in `p-6 pt-20`. Pull up to reclaim the top space
    // (similar to /team-tracking) so the page header sits near the top nav.
    return (
        <div className="-mt-14 -mx-3 h-[calc(100vh-24px)] overflow-hidden flex flex-col">
            <GanttOverviewBoard />
        </div>
    )
}
