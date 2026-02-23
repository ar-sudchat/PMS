'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
    createProjectIssue,
    updateProjectIssue,
    fetchMilestonesForProject,
    type ProjectIssue,
    type SopFilterOptions,
} from '@/lib/actions/sop-actions'
import {
    ISSUE_TYPES,
    ISSUE_SEVERITIES,
    type IssueTypeCode,
    type IssueSeverityCode,
} from '@/lib/constants/sop-constants'

interface IssueFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    issue: ProjectIssue | null // null = create mode
    filterOptions: SopFilterOptions | null
    defaultProjectId?: string
    onSuccess: () => void
}

export function IssueFormDialog({
    open,
    onOpenChange,
    issue,
    filterOptions,
    defaultProjectId,
    onSuccess,
}: IssueFormDialogProps) {
    const isEdit = !!issue

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [selectedProject, setSelectedProject] = useState<Option | null>(null)
    const [selectedMilestone, setSelectedMilestone] = useState<Option | null>(null)
    const [issueType, setIssueType] = useState<IssueTypeCode>('ISSUE')
    const [severity, setSeverity] = useState<IssueSeverityCode>('MEDIUM')
    const [selectedAssignee, setSelectedAssignee] = useState<Option | null>(null)
    const [targetDate, setTargetDate] = useState('')
    const [impact, setImpact] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [milestoneOptions, setMilestoneOptions] = useState<Option[]>([])

    // Pre-fill form
    useEffect(() => {
        if (!open) return
        if (issue) {
            setTitle(issue.title)
            setDescription(issue.description || '')
            setSelectedProject(issue.project_id ? { value: issue.project_id, label: `${issue.project_code} - ${issue.project_name}` } : null)
            setSelectedMilestone(issue.milestone_id ? { value: issue.milestone_id, label: issue.milestone_name || '' } : null)
            setIssueType(issue.issue_type)
            setSeverity(issue.severity)
            setSelectedAssignee(issue.assigned_to ? { value: issue.assigned_to, label: issue.assigned_to_name || '' } : null)
            setTargetDate(issue.target_resolve_date ? new Date(issue.target_resolve_date).toISOString().split('T')[0] : '')
            setImpact(issue.impact_description || '')
            // Load milestones for the project
            if (issue.project_id) loadMilestones(issue.project_id)
        } else {
            setTitle('')
            setDescription('')
            setSelectedProject(defaultProjectId ? filterOptions?.projects.find(p => p.id === defaultProjectId) ? { value: defaultProjectId, label: filterOptions?.projects.find(p => p.id === defaultProjectId)?.project_code || '' } : null : null)
            setSelectedMilestone(null)
            setIssueType('ISSUE')
            setSeverity('MEDIUM')
            setSelectedAssignee(null)
            setTargetDate('')
            setImpact('')
            setMilestoneOptions([])
            if (defaultProjectId) loadMilestones(defaultProjectId)
        }
    }, [open, issue, defaultProjectId])

    const loadMilestones = async (projectId: string) => {
        const result = await fetchMilestonesForProject(projectId)
        if (result.success && result.data) {
            setMilestoneOptions(result.data.map(m => ({ value: m.id, label: m.name })))
        }
    }

    const handleProjectChange = (opt: Option | null) => {
        setSelectedProject(opt)
        setSelectedMilestone(null)
        setMilestoneOptions([])
        if (opt) loadMilestones(String(opt.value))
    }

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error('กรุณากรอกหัวข้อ')
            return
        }
        if (!selectedProject) {
            toast.error('กรุณาเลือกโครงการ')
            return
        }

        setIsSubmitting(true)
        try {
            if (isEdit && issue) {
                const result = await updateProjectIssue(issue.id, {
                    title: title.trim(),
                    description: description.trim() || null,
                    issue_type: issueType,
                    severity,
                    assigned_to: selectedAssignee ? String(selectedAssignee.value) : null,
                    target_resolve_date: targetDate || null,
                    impact_description: impact.trim() || null,
                    milestone_id: selectedMilestone ? String(selectedMilestone.value) : null,
                })
                if (result.success) {
                    toast.success('อัพเดต Issue สำเร็จ')
                    onOpenChange(false)
                    onSuccess()
                } else {
                    toast.error(result.error || 'เกิดข้อผิดพลาด')
                }
            } else {
                const result = await createProjectIssue({
                    project_id: String(selectedProject.value),
                    milestone_id: selectedMilestone ? String(selectedMilestone.value) : null,
                    title: title.trim(),
                    description: description.trim() || undefined,
                    issue_type: issueType,
                    severity,
                    assigned_to: selectedAssignee ? String(selectedAssignee.value) : null,
                    target_resolve_date: targetDate || null,
                    impact_description: impact.trim() || null,
                })
                if (result.success) {
                    toast.success('สร้าง Issue สำเร็จ')
                    onOpenChange(false)
                    onSuccess()
                } else {
                    toast.error(result.error || 'เกิดข้อผิดพลาด')
                }
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsSubmitting(false)
        }
    }

    const projectOptions: Option[] = (filterOptions?.projects || []).map(p => ({
        value: p.id,
        label: `${p.project_code} - ${p.name}`
    }))

    const employeeOptions: Option[] = (filterOptions?.employees || []).map(e => ({
        value: e.id,
        label: e.full_name
    }))

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? 'แก้ไข Issue' : 'สร้าง Issue ใหม่'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 py-1">
                    {/* Row 1: Title */}
                    <div className="space-y-1">
                        <Label>หัวข้อ <span className="text-red-500">*</span></Label>
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="ระบุหัวข้อ Issue/Blocker"
                        />
                    </div>

                    {/* Row 2: Project + Milestone */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>โครงการ <span className="text-red-500">*</span></Label>
                            <SmartCombobox
                                options={projectOptions}
                                value={selectedProject}
                                onChange={handleProjectChange}
                                placeholder="เลือกโครงการ"
                                searchable
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Milestone</Label>
                            <SmartCombobox
                                options={milestoneOptions}
                                value={selectedMilestone}
                                onChange={setSelectedMilestone}
                                placeholder="เลือก Milestone (ถ้ามี)"
                                searchable
                                disabled={!selectedProject}
                            />
                        </div>
                    </div>

                    {/* Row 3: Type + Severity + Target Date */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <Label>ประเภท <span className="text-red-500">*</span></Label>
                            <Select value={issueType} onValueChange={v => setIssueType(v as IssueTypeCode)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ISSUE_TYPES.map(t => (
                                        <SelectItem key={t.code} value={t.code}>
                                            <span className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                                                {t.labelTh}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>ความรุนแรง <span className="text-red-500">*</span></Label>
                            <Select value={severity} onValueChange={v => setSeverity(v as IssueSeverityCode)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ISSUE_SEVERITIES.map(s => (
                                        <SelectItem key={s.code} value={s.code}>
                                            <span className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                {s.labelTh}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>กำหนดแก้ไข</Label>
                            <Input
                                type="date"
                                value={targetDate}
                                onChange={e => setTargetDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Row 4: Assigned to */}
                    <div className="space-y-1">
                        <Label>ผู้รับผิดชอบ</Label>
                        <SmartCombobox
                            options={employeeOptions}
                            value={selectedAssignee}
                            onChange={setSelectedAssignee}
                            placeholder="เลือกผู้รับผิดชอบ"
                            searchable
                        />
                    </div>

                    {/* Row 5: Description + Impact side by side */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>รายละเอียด</Label>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="อธิบายรายละเอียดของ Issue"
                                rows={2}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>ผลกระทบ</Label>
                            <Textarea
                                value={impact}
                                onChange={e => setImpact(e.target.value)}
                                placeholder="เช่น delay 2 สัปดาห์"
                                rows={2}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        ยกเลิก
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {isEdit ? 'บันทึก' : 'สร้าง Issue'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
