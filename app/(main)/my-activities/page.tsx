import { getMyActivities } from '@/lib/actions/activity-actions'
import { ActivityCard } from '@/components/activities/ActivityCard'
import { Bell, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MyActivitiesPage() {
    const activities = await getMyActivities()

    // Group activities
    const urgent = activities.filter(a => a.type === 'urgent')
    const approvals = activities.filter(a => a.type === 'approval')
    const others = activities.filter(a => a.type !== 'urgent' && a.type !== 'approval')

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                            <Bell className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Action Center</h1>
                            <p className="text-sm text-slate-500">
                                You have <span className="font-bold text-indigo-600">{activities.length}</span> active items requiring attention
                            </p>
                        </div>
                    </div>
                </div>

                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="p-4 bg-emerald-50 rounded-full mb-4">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">All Caught Up!</h3>
                        <p className="text-slate-400">You have no pending activities.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {urgent.length > 0 && (
                            <section>
                                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                    Urgent & Overdue
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {urgent.map(activity => (
                                        <ActivityCard key={activity.id} activity={activity} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {approvals.length > 0 && (
                            <section>
                                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                                    Waiting for Approval
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {approvals.map(activity => (
                                        <ActivityCard key={activity.id} activity={activity} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {others.length > 0 && (
                            <section>
                                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                    Assignments & Updates
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {others.map(activity => (
                                        <ActivityCard key={activity.id} activity={activity} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
