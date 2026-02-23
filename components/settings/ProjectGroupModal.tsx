'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
    ProjectGroup,
    createProjectGroup,
    updateProjectGroup,
} from '@/lib/actions/project-group-actions'

interface ProjectGroupModalProps {
    isOpen: boolean
    onClose: () => void
    mode: 'create' | 'edit'
    initialData: ProjectGroup | null
    parentGroups: ProjectGroup[] // top-level groups for dropdown
    defaultParentId?: string | null
    onSuccess: () => void
}

const DEFAULT_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280',
]

export function ProjectGroupModal({
    isOpen, onClose, mode, initialData, parentGroups, defaultParentId, onSuccess
}: ProjectGroupModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        parent_id: '' as string,
        code: '',
        name: '',
        name_th: '',
        description: '',
        color: '#3B82F6',
    })

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setFormData({
                    parent_id: initialData.parent_id || '',
                    code: initialData.code || '',
                    name: initialData.name || '',
                    name_th: initialData.name_th || '',
                    description: initialData.description || '',
                    color: initialData.color || '#3B82F6',
                })
            } else {
                setFormData({
                    parent_id: defaultParentId || '',
                    code: '',
                    name: '',
                    name_th: '',
                    description: '',
                    color: '#3B82F6',
                })
            }
        }
    }, [isOpen, mode, initialData, defaultParentId])

    const isSubGroup = formData.parent_id !== ''

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.code.trim()) {
            toast.error('กรุณากรอกรหัส')
            return
        }
        if (!formData.name.trim()) {
            toast.error('กรุณากรอกชื่อ')
            return
        }

        setIsSubmitting(true)
        try {
            let result
            if (mode === 'create') {
                result = await createProjectGroup({
                    parent_id: formData.parent_id || null,
                    code: formData.code.trim(),
                    name: formData.name.trim(),
                    name_th: formData.name_th.trim() || undefined,
                    description: formData.description.trim() || undefined,
                    color: formData.color,
                })
            } else {
                result = await updateProjectGroup(initialData!.id, {
                    parent_id: formData.parent_id || null,
                    code: formData.code.trim(),
                    name: formData.name.trim(),
                    name_th: formData.name_th.trim() || undefined,
                    description: formData.description.trim() || undefined,
                    color: formData.color,
                })
            }

            if (result.success) {
                toast.success(mode === 'create' ? 'สร้างสำเร็จ' : 'บันทึกสำเร็จ')
                onSuccess()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'create'
                            ? (isSubGroup ? 'เพิ่ม Sub Group' : 'เพิ่ม Group')
                            : (isSubGroup ? 'แก้ไข Sub Group' : 'แก้ไข Group')
                        }
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                    {/* Parent Group Selector */}
                    <div className="space-y-2">
                        <Label>ประเภท</Label>
                        <Select
                            value={formData.parent_id || '__none__'}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, parent_id: v === '__none__' ? '' : v }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกประเภท" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">Group หลัก (ไม่มี Parent)</SelectItem>
                                {parentGroups.map(g => (
                                    <SelectItem key={g.id} value={g.id}>
                                        Sub Group ของ: {g.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Code & Name */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">รหัส *</Label>
                            <Input
                                id="code"
                                placeholder="SOFTWARE"
                                value={formData.code}
                                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                className="font-mono uppercase"
                                maxLength={30}
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="name">ชื่อ (EN) *</Label>
                            <Input
                                id="name"
                                placeholder="Software"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Thai Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name_th">ชื่อ (TH)</Label>
                        <Input
                            id="name_th"
                            placeholder="ซอฟต์แวร์"
                            value={formData.name_th}
                            onChange={(e) => setFormData(prev => ({ ...prev, name_th: e.target.value }))}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">รายละเอียด</Label>
                        <Input
                            id="description"
                            placeholder="รายละเอียดเพิ่มเติม"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-2">
                        <Label>สี</Label>
                        <div className="flex items-center gap-3">
                            <div className="flex gap-2 flex-wrap">
                                {DEFAULT_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                                        className={`w-7 h-7 rounded-full transition-all ${
                                            formData.color === color
                                                ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                                                : 'hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <Input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                    className="w-10 h-8 p-0.5 cursor-pointer"
                                />
                                <span className="text-xs font-mono text-slate-500">{formData.color}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            ยกเลิก
                        </Button>
                        <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {mode === 'create' ? 'กำลังสร้าง...' : 'กำลังบันทึก...'}
                                </>
                            ) : (
                                mode === 'create' ? 'สร้าง' : 'บันทึก'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
