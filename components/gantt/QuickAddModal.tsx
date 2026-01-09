'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, FolderPlus, Wrench, Check, Loader2 } from 'lucide-react'
import { createStory, createTask, getProjectInfo } from '@/lib/actions/gantt-actions'

interface QuickAddModalProps {
    open: boolean
    onClose: () => void
    projectId: string
    onSuccess: () => void
}

interface CreatedItem {
    id: string
    code: string
    title: string
    type: 'story' | 'task'
    milestone?: string
    taskType?: string
    hours?: number
}

export function QuickAddModal({ open, onClose, projectId, onSuccess, projects = [] }: QuickAddModalProps & { projects?: { id: string; name: string }[] }) {
    const [selectedProjectId, setSelectedProjectId] = useState(projectId)
    const [projectInfo, setProjectInfo] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Story form
    const [storyTitle, setStoryTitle] = useState('')
    const [storyMilestone, setStoryMilestone] = useState('')
    const [isCreatingStory, setIsCreatingStory] = useState(false)

    // Task form
    const [selectedStory, setSelectedStory] = useState('')
    const [taskTitle, setTaskTitle] = useState('')
    const [taskType, setTaskType] = useState('dev')
    const [taskHours, setTaskHours] = useState('8')
    const [isCreatingTask, setIsCreatingTask] = useState(false)

    // Created items
    const [createdItems, setCreatedItems] = useState<CreatedItem[]>([])

    const storyInputRef = useRef<HTMLInputElement>(null)
    const taskInputRef = useRef<HTMLInputElement>(null)

    // Update selectedProjectId when prop changes
    useEffect(() => {
        if (open) {
            setSelectedProjectId(projectId || (projects.length > 0 ? projects[0].id : ''))
        }
    }, [open, projectId, projects])

    useEffect(() => {
        if (open && selectedProjectId) {
            setIsLoading(true)
            getProjectInfo(selectedProjectId).then(result => {
                if (result.success && result.data) {
                    setProjectInfo(result.data)
                    // Reset selections on project change
                    setStoryMilestone('')
                    setSelectedStory('')
                    if (result.data.stories.length > 0) setSelectedStory(result.data.stories[0].id)
                }
                setIsLoading(false)
                setTimeout(() => storyInputRef.current?.focus(), 100)
            })
        }
    }, [open, selectedProjectId])

    const handleCreateStory = useCallback(async () => {
        if (!storyTitle.trim() || !projectInfo || !storyMilestone) return
        setIsCreatingStory(true)

        const result = await createStory({
            project_id: projectInfo.id,
            milestone_id: storyMilestone,
            title: storyTitle.trim()
        })

        if (result.success && result.data) {
            const milestoneName = projectInfo.milestones.find((m: any) => m.id === storyMilestone)
            setCreatedItems(prev => [{ id: result.data.id, code: result.data.story_code, title: result.data.title, type: 'story', milestone: milestoneName?.code }, ...prev])
            setProjectInfo((prev: any) => ({ ...prev, stories: [{ id: result.data.id, code: result.data.story_code, title: result.data.title }, ...prev.stories] }))
            setSelectedStory(result.data.id)
            setStoryTitle('')
            storyInputRef.current?.focus()
        } else {
            alert(result.error || 'Failed')
        }
        setIsCreatingStory(false)
    }, [storyTitle, storyMilestone, projectInfo])

    const handleCreateTask = useCallback(async () => {
        if (!taskTitle.trim() || !selectedStory) return
        setIsCreatingTask(true)

        const result = await createTask({
            story_id: selectedStory,
            title: taskTitle.trim(),
            task_type: taskType,
            estimated_hours: taskHours ? parseFloat(taskHours) : undefined
        })

        if (result.success && result.data) {
            setCreatedItems(prev => [{ id: result.data.id, code: result.data.task_code, title: result.data.title, type: 'task', taskType, hours: parseFloat(taskHours) || undefined }, ...prev])
            setTaskTitle('')
            taskInputRef.current?.focus()
        } else {
            alert(result.error || 'Failed')
        }
        setIsCreatingTask(false)
    }, [taskTitle, selectedStory, taskType, taskHours])

    const handleClose = () => {
        if (createdItems.length > 0) onSuccess()
        setCreatedItems([])
        setStoryTitle('')
        setTaskTitle('')
        onClose()
    }

    if (!open) return null

    const taskTypes = [
        { value: 'dev', label: '🔧 Development' },
        { value: 'bug', label: '🐛 Bug Fix' },
        { value: 'rework', label: '🔄 Rework' },
        { value: 'test', label: '🧪 Testing' }
    ]

    const storiesCreated = createdItems.filter(i => i.type === 'story').length
    const tasksCreated = createdItems.filter(i => i.type === 'task').length

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">⚡ Quick Add</h2>
                            <p className="text-blue-100 text-sm">เพิ่ม Story และ Task ได้อย่างรวดเร็ว</p>
                        </div>
                        <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Project Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Project</label>
                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                        >
                            <option value="" disabled>-- เลือกโครงการ --</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                    ) : (
                        <>
                            {/* ADD STORY */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                                    <FolderPlus className="w-5 h-5 text-blue-600" /> Add Story
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Title <span className="text-red-500">*</span></label>
                                        <input
                                            ref={storyInputRef}
                                            type="text"
                                            value={storyTitle}
                                            onChange={(e) => setStoryTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && storyTitle.trim() && storyMilestone && handleCreateStory()}
                                            placeholder="พิมพ์ชื่อ Story แล้วกด Enter"
                                            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            disabled={isCreatingStory}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Milestone <span className="text-red-500">*</span></label>
                                        <select
                                            value={storyMilestone}
                                            onChange={(e) => setStoryMilestone(e.target.value)}
                                            className={`w-full px-4 py-2.5 border rounded-lg ${!storyMilestone ? 'border-amber-300 bg-amber-50' : ''}`}
                                            disabled={isCreatingStory}
                                        >
                                            <option value="">-- เลือก Milestone (จำเป็น) --</option>
                                            {projectInfo?.milestones.map((m: any) => <option key={m.id} value={m.id}>{m.code}: {m.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                        <p className="text-xs text-slate-500">💡 ต้องเลือก Milestone ก่อนจึงจะสร้างได้</p>
                                        <button onClick={handleCreateStory} disabled={!storyTitle.trim() || !storyMilestone || isCreatingStory} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                            {isCreatingStory ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />} Create
                                        </button>
                                    </div>
                                </div>
                                {storiesCreated > 0 && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-sm font-medium text-green-600 mb-2">✅ สร้างแล้ว ({storiesCreated}):</p>
                                        <div className="space-y-1 max-h-24 overflow-y-auto">
                                            {createdItems.filter(i => i.type === 'story').slice(0, 5).map(item => (
                                                <div key={item.id} className="flex items-center gap-2 text-sm bg-white px-3 py-1.5 rounded shadow-sm border border-slate-100">
                                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                                    <span className="font-mono text-xs text-slate-400">{item.code}</span>
                                                    <span className="truncate flex-1">{item.title}</span>
                                                    {item.milestone && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">{item.milestone}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ADD TASK */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                                    <Wrench className="w-5 h-5 text-amber-600" /> Add Task
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Story <span className="text-red-500">*</span></label>
                                        <select value={selectedStory} onChange={(e) => setSelectedStory(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg" disabled={isCreatingTask}>
                                            <option value="">-- เลือก Story --</option>
                                            {projectInfo?.stories.map((s: any) => <option key={s.id} value={s.id}>{s.code}: {s.title}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Title <span className="text-red-500">*</span></label>
                                        <input
                                            ref={taskInputRef}
                                            type="text"
                                            value={taskTitle}
                                            onChange={(e) => setTaskTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && taskTitle.trim() && selectedStory && handleCreateTask()}
                                            placeholder="พิมพ์ชื่อ Task แล้วกด Enter"
                                            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            disabled={isCreatingTask || !selectedStory}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-1">Type</label>
                                            <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg">
                                                {taskTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-1">Hours</label>
                                            <input type="number" value={taskHours} onChange={(e) => setTaskHours(e.target.value)} min="0.5" step="0.5" className="w-full px-4 py-2.5 border rounded-lg" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                        <p className="text-xs text-slate-500">💡 เลือก Story ก่อนสร้าง Task</p>
                                        <button onClick={handleCreateTask} disabled={!taskTitle.trim() || !selectedStory || isCreatingTask} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                            {isCreatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />} Create
                                        </button>
                                    </div>
                                </div>
                                {tasksCreated > 0 && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-sm font-medium text-green-600 mb-2">✅ สร้างแล้ว ({tasksCreated}):</p>
                                        <div className="space-y-1 max-h-24 overflow-y-auto">
                                            {createdItems.filter(i => i.type === 'task').slice(0, 5).map(item => (
                                                <div key={item.id} className="flex items-center gap-2 text-sm bg-white px-3 py-1.5 rounded shadow-sm border border-slate-100">
                                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                                    <span className="font-mono text-xs text-slate-400">{item.code}</span>
                                                    <span className="truncate flex-1">{item.title}</span>
                                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{item.hours}h</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
                    <div className="text-sm text-slate-600">📊 Session: <span className="font-semibold">{storiesCreated} Stories, {tasksCreated} Tasks</span></div>
                    <button onClick={handleClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-sm">✓ Done & Close</button>
                </div>
            </div>
        </div>
    )
}
