'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, FileText, Calendar, User, ShieldCheck, CalendarDays, LayoutDashboard, Target, ChevronDown, ChevronRight, Layers, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tooltip } from "@/components/ui/Tooltip"
import { Separator } from "@/components/ui/separator"
import { type MilestoneHealth, verifyMilestoneAndAdvance } from '@/lib/actions/dashboard-actions'

interface ProjectHealthDetailClientProps {
    project: {
        id: string
        code: string
        name: string
        customer_name: string
        end_date?: string
    }
    overallHealth: {
        overall: number
    }
    milestones: MilestoneHealth[]
    activeTasks: any[]
    currentDeliverables: any[]
}

export function ProjectHealthDetailClient({
    project,
    overallHealth,
    milestones,
    activeTasks,
    currentDeliverables
}: ProjectHealthDetailClientProps) {
    const router = useRouter()
    const [selectedTask, setSelectedTask] = useState<any>(null)
    const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null)
    const [isVerifying, setIsVerifying] = useState(false)
    const [expandedStories, setExpandedStories] = useState<Record<string, boolean>>({})

    const formatStrictDate = (date: string | null | undefined) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const currentMilestoneIndex = milestones.findIndex(m => !m.is_verified)
    const isProjectCompleted = currentMilestoneIndex === -1 && milestones.length > 0
    const activeStep = isProjectCompleted ? milestones.length - 1 : (currentMilestoneIndex === -1 ? 0 : currentMilestoneIndex)
    const currentMilestone = milestones[activeStep]

    // Derived Logic
    const activeDeliverablesCount = currentDeliverables.length
    const verifiedOrSubmittedCount = currentDeliverables.filter(d => d.status === 'verified' || d.verification_status === 'submitted').length
    const billingReadiness = activeDeliverablesCount > 0 ? Math.round((verifiedOrSubmittedCount / activeDeliverablesCount) * 100) : 0

    const handleVerifyAll = async () => {
        if (!currentMilestone) return
        setIsVerifying(true)
        try {
            await verifyMilestoneAndAdvance(project.id, currentMilestone.id)
            router.refresh()
        } catch (error) {
            console.error("Verification failed", error)
        } finally {
            setIsVerifying(false)
        }
    }

    const toggleStory = (storyId: string) => {
        setExpandedStories(prev => ({ ...prev, [storyId]: !prev[storyId] }))
    }

    // --- HIERARCHY PROCESSING ---
    // Group Active Tasks by Milestone -> Story
    const hierarchy = activeTasks.reduce((acc: any, task: any) => {
        const mKey = task.milestone_id || 'no-milestone'
        if (!acc[mKey]) {
            acc[mKey] = {
                id: mKey,
                name: task.milestone_name || 'General Tasks',
                stories: {}
            }
        }

        const sKey = task.story_id || 'no-story'
        if (!acc[mKey].stories[sKey]) {
            acc[mKey].stories[sKey] = {
                id: sKey,
                title: task.story_title || 'General Tasks',
                tasks: []
            }
        }
        acc[mKey].stories[sKey].tasks.push(task)
        return acc
    }, {})

    // Sort Milestones by ID matching milestones prop or custom logic if needed
    // For now, object keys iteration order is not guaranteed, but usually insertion order works for simple reduces.
    // Better to map to array.

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
            {/* 1. Header & Project Identity */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm backdrop-blur-xl bg-white/80">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => router.push('/pm-dashboard')} className="rounded-full hover:bg-slate-100">
                                <ArrowLeft className="w-5 h-5 text-slate-500" />
                            </Button>
                            <div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-mono tracking-wider text-[10px]">
                                        {project.code}
                                    </Badge>
                                    <h1 className="text-lg font-bold text-slate-800 tracking-tight">{project.name}</h1>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 flex gap-2">
                                    <span>Client: {project.customer_name}</span>
                                    <span className="text-slate-300">|</span>
                                    <span>Due: {formatStrictDate(project.end_date)}</span>
                                </p>
                            </div>
                        </div>

                        {/* Quick Health Score */}
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Project Health</p>
                            <div className="flex items-baseline justify-end gap-1">
                                <span className={`text-2xl font-black ${overallHealth.overall >= 80 ? 'text-emerald-500' :
                                    overallHealth.overall >= 60 ? 'text-amber-500' :
                                        'text-rose-500'
                                    }`}>
                                    {overallHealth.overall}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* 2. ROADMAP TRACKING (Stepper) */}
                <Card className="border-0 shadow-sm bg-white overflow-hidden relative rounded-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-50 to-indigo-50" />
                    <CardContent className="pt-10 pb-10 overflow-x-auto">
                        <div className="flex items-center justify-between min-w-max px-8">
                            {milestones.map((m: any, index: number) => {
                                const status = index < activeStep ? 'completed' : index === activeStep ? 'current' : 'upcoming'
                                return (
                                    <div key={m.id} className="flex flex-col items-center relative group flex-1">
                                        {/* Connector Line */}
                                        {index !== 0 && (
                                            <div className="absolute top-5 right-[50%] w-full h-[2px] -z-10">
                                                <div className={`h-full w-full ${index <= activeStep ? 'bg-indigo-100' : 'bg-slate-50'}`} />
                                            </div>
                                        )}

                                        <motion.div
                                            initial={false}
                                            animate={{
                                                scale: status === 'current' ? 1.2 : 1,
                                                borderColor: status === 'completed' ? '#818cf8' : status === 'current' ? '#6366f1' : '#f1f5f9',
                                                backgroundColor: status === 'completed' ? '#e0e7ff' : status === 'current' ? '#ffffff' : '#f8fafc'
                                            }}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center border-4 z-10 transition-colors duration-300 shadow-sm
                                                ${status === 'current' ? 'shadow-indigo-200 shadow-lg' : ''}`}
                                        >
                                            {status === 'completed' ? (
                                                <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                                            ) : status === 'current' ? (
                                                <div className="relative flex items-center justify-center -m-5">
                                                    {/* Outer Ripple */}
                                                    <div className="absolute w-28 h-28 bg-indigo-400/20 rounded-full animate-ping opacity-20" />
                                                    {/* Inner Glow */}
                                                    <div className="absolute w-20 h-20 bg-indigo-100/80 rounded-full animate-pulse blur-xl" />
                                                    {/* Main Pin Container */}
                                                    <div className="relative z-20 bg-white p-3.5 rounded-full shadow-2xl shadow-indigo-300/40 border-[5px] border-indigo-50">
                                                        <MapPin className="w-8 h-8 text-indigo-600 fill-indigo-50 drop-shadow-md" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-slate-200" />
                                            )}
                                        </motion.div>

                                        <div className="text-center mt-4 space-y-1">
                                            <p className={`text-sm font-semibold transition-colors ${status === 'current' ? 'text-indigo-700' : 'text-slate-500'}`}>
                                                {m.milestone_name}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded-full inline-block">
                                                {formatStrictDate(m.due_date)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* 3. MAIN CONTENT SPLIT */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT: HIERARCHICAL ACTIVE TASKS */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-1.5 h-6 bg-rose-400 rounded-full" />
                            <h2 className="text-xl font-bold text-slate-800">Active Issues & Tasks</h2>
                            <Badge variant="secondary" className="bg-rose-50 text-rose-600 border-rose-100 rounded-full px-3">
                                {activeTasks.length} Active
                            </Badge>
                        </div>

                        {activeTasks.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="h-8 w-8 text-slate-300" />
                                </div>
                                <h3 className="text-slate-500 font-medium">All clear! No active tasks found.</h3>
                            </div>
                        ) : (
                            Object.values(hierarchy).map((milestoneGroup: any) => (
                                <div key={milestoneGroup.id} className="space-y-4">
                                    {/* Milestone Header */}
                                    {milestoneGroup.id !== 'no-milestone' && (
                                        <div className="flex items-center gap-2 pt-2 pb-1 border-b border-slate-100">
                                            <Layers className="w-4 h-4 text-slate-400" />
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{milestoneGroup.name}</h3>
                                        </div>
                                    )}

                                    {/* Story Groups */}
                                    {Object.values(milestoneGroup.stories).map((story: any) => {
                                        const isExpanded = expandedStories[story.id] ?? true // Default expanded
                                        const completedTasks = story.tasks.filter((t: any) => t.status === 'done').length
                                        const totalTasksInStory = story.tasks.length
                                        const progress = totalTasksInStory > 0 ? Math.round((completedTasks / totalTasksInStory) * 100) : 0

                                        return (
                                            <div key={story.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                                {/* Story Header (Clickable) */}
                                                <div
                                                    className="p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
                                                    onClick={() => toggleStory(story.id)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-md ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-slate-800 text-sm">{story.title}</h4>
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                                                <span>{totalTasksInStory} tasks</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Task List (Collapse) */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="divide-y divide-slate-50"
                                                        >
                                                            {story.tasks.map((task: any) => (
                                                                <div
                                                                    key={task.id}
                                                                    onClick={() => setSelectedTask(task)}
                                                                    className="p-4 hover:bg-blue-50/30 transition-colors cursor-pointer group flex items-start justify-between gap-4"
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Badge className={`uppercase text-[9px] h-5 px-1.5 rounded-md font-bold tracking-wider border-0 shadow-none ${task.priority === 'critical' ? 'bg-rose-100 text-rose-600' :
                                                                                task.priority === 'high' ? 'bg-amber-100 text-amber-600' :
                                                                                    'bg-blue-100 text-blue-600'
                                                                                }`}>
                                                                                {task.priority}
                                                                            </Badge>
                                                                            <span className="font-mono text-[10px] text-slate-400">{task.task_code}</span>
                                                                        </div>
                                                                        <h5 className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors truncate">
                                                                            {task.title}
                                                                        </h5>
                                                                        <div className="flex items-center gap-3 mt-2">
                                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                                                                                <User className="h-3 w-3 text-slate-400" />
                                                                                {task.assignee_nickname || task.assignee_name || 'Unassigned'}
                                                                            </div>
                                                                            {task.days_overdue > 0 && (
                                                                                <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-2 py-1 rounded-md flex items-center gap-1">
                                                                                    🔥 {task.days_overdue} days
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right shrink-0">
                                                                        <p className="text-xs font-bold text-slate-700">{formatStrictDate(task.due_date)}</p>
                                                                        <p className="text-[10px] text-slate-400">Target</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    {/* RIGHT: PREMIUM CONTROL TOWER CARD */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="sticky top-24">
                            <Card className="bg-white text-slate-800 border border-slate-100 shadow-2xl overflow-hidden relative rounded-2xl">
                                {/* Decorative Blur (Lighter) */}
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-100 rounded-full blur-[80px] opacity-60" />
                                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-100 rounded-full blur-[80px] opacity-60" />

                                <CardHeader className="pb-2 relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 backdrop-blur-md px-3 py-1 rounded-full">
                                            Current Phase
                                        </Badge>
                                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Ready</span>
                                            <span className={`text-xs font-bold ${billingReadiness === 100 ? 'text-emerald-600' : 'text-amber-500'
                                                }`}>
                                                {billingReadiness}%
                                            </span>
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-1">
                                        {currentMilestone?.milestone_name || 'No Active Milestone'}
                                    </h2>
                                    <p className="text-slate-500 text-sm">Required Deliverables & Sign-offs</p>
                                </CardHeader>

                                <CardContent className="space-y-6 relative z-10">
                                    <div className="space-y-3">
                                        {currentDeliverables.map((doc: any) => (
                                            <div
                                                key={doc.id}
                                                className="group flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-white transition-all border border-slate-100 cursor-pointer hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50"
                                                onClick={() => setSelectedDeliverable(doc)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2.5 rounded-lg transition-colors ${doc.status === 'verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 shadow-sm border border-slate-100 group-hover:text-indigo-500 group-hover:border-indigo-100'
                                                        }`}>
                                                        {doc.status === 'verified' ? <ShieldCheck className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">{doc.name}</p>
                                                        {doc.is_required && (
                                                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded ml-0 mt-1 inline-block border border-amber-100">Required</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {currentDeliverables.length === 0 && (
                                            <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                                                No deliverables required for this phase.
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-200 font-bold h-12 rounded-xl transition-all border-0"
                                            onClick={handleVerifyAll}
                                            disabled={isVerifying || !currentMilestone || currentDeliverables.length === 0}
                                        >
                                            {isVerifying ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                    Processing...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <ShieldCheck className="h-5 w-5" />
                                                    Verify All & Proceed
                                                </span>
                                            )}
                                        </Button>
                                        <p className="text-[10px] text-center text-slate-400 mt-4">
                                            This action will stamp current time as verified date by you.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* --- MODALS --- */}

                {/* Task Details Dialog */}
                <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
                    <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
                        <DialogHeader className="border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant={selectedTask?.priority === 'critical' ? 'destructive' : 'default'} className="uppercase px-2 py-0.5 text-[10px]">
                                    {selectedTask?.priority}
                                </Badge>
                                <span className="font-mono text-xs text-slate-400">{selectedTask?.task_code}</span>
                            </div>
                            <DialogTitle className="text-xl text-slate-800">{selectedTask?.title}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 leading-relaxed">
                                {selectedTask?.description || "No description provided."}
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Assignee</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700">{selectedTask?.assignee_name || 'Unassigned'}</p>
                                            <p className="text-xs text-slate-400">Project Member</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Target Due Date</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <CalendarDays className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700">{formatStrictDate(selectedTask?.due_date)}</p>
                                            <p className="text-xs text-slate-400">Deadline</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-4 border-t border-slate-100">
                            <Button variant="outline" onClick={() => setSelectedTask(null)} className="w-full">Close Details</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Deliverable Details Dialog */}
                <Dialog open={!!selectedDeliverable} onOpenChange={(open) => !open && setSelectedDeliverable(null)}>
                    <DialogContent className="bg-white border-0 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-lg text-slate-800">{selectedDeliverable?.name}</DialogTitle>
                            <DialogDescription>
                                Verification & Submission Details
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                {selectedDeliverable?.verification_status === 'submitted' ? (
                                    <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                ) : (
                                    <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 shrink-0">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-slate-900">
                                        Status: <span className="uppercase text-emerald-600 ml-1">{selectedDeliverable?.verification_status}</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {selectedDeliverable?.verification_status === 'submitted' ? 'Verified by Project Manager' : 'Awaiting submission/verification'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setSelectedDeliverable(null)}>Close</Button>
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </div >
    )
}
