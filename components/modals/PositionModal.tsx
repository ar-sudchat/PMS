"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createPosition, updatePosition, PositionFormData } from "@/lib/actions/position-actions";
import { getDepartments } from "@/lib/actions/department-actions";

interface PositionModalProps {
    open: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    position: any | null;
    onSuccess: () => void;
}

export function PositionModal({ open, onClose, mode, position, onSuccess }: PositionModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const formRef = useRef<HTMLDivElement>(null);

    // Handle Enter key to move to next field
    const handleEnterKey = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const inputs = Array.from(formRef.current?.querySelectorAll(
                'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]):not([type="color"]), textarea:not([disabled])'
            ) || []) as HTMLElement[];
            const currentIdx = inputs.indexOf(e.currentTarget);
            if (currentIdx !== -1 && currentIdx < inputs.length - 1) {
                inputs[currentIdx + 1].focus();
            }
        }
    };

    // Dropdown Data
    const [departments, setDepartments] = useState<any[]>([]);

    const [formData, setFormData] = useState<PositionFormData>({
        code: "",
        name: "",
        name_th: "",
        description: "",
        level: 1,
        hourly_rate: 0,
        daily_rate: 0,
        department_id: "",
        color: "#6366f1",
        is_active: true,
    });

    useEffect(() => {
        if (open) {
            const loadDropdowns = async () => {
                try {
                    const depts = await getDepartments();
                    setDepartments(depts || []);
                } catch (err) {
                    console.error("Failed to load departments", err);
                }
            };
            loadDropdowns();
        }
    }, [open]);

    useEffect(() => {
        if (mode === 'edit' && position) {
            setFormData({
                code: position.code || "",
                name: position.name || "",
                name_th: position.name_th || "",
                description: position.description || "",
                level: position.level || 1,
                hourly_rate: position.hourly_rate || 0,
                daily_rate: position.daily_rate || 0,
                department_id: position.department_id || "",
                color: position.color || "#6366f1",
                is_active: position.is_active ?? true,
            });
        } else {
            setFormData({
                code: "",
                name: "",
                name_th: "",
                description: "",
                level: 1,
                hourly_rate: 0,
                daily_rate: 0,
                department_id: "",
                color: "#6366f1",
                is_active: true,
            });
        }
    }, [mode, position, open]);

    const handleSubmit = async () => {
        setIsLoading(true);
        setErrors({});
        try {
            if (mode === 'create') {
                await createPosition(formData);
            } else {
                await updatePosition(position.id, formData);
            }
            onSuccess();
        } catch (error: any) {
            console.error("Submit Error:", error);
            setErrors({ submit: error.message || "An error occurred during submission." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={mode === 'create' ? 'เพิ่มตำแหน่ง' : 'แก้ไขตำแหน่ง'}
            size="md"
        >
            <div ref={formRef} className="space-y-4">
                {errors.submit && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {errors.submit}
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>รหัสตำแหน่ง <span className="text-red-500">*</span></Label>
                        <Input
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                            onKeyDown={handleEnterKey}
                            required
                        />
                    </div>
                    <div>
                        <Label>สี</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="color"
                                value={formData.color}
                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                className="h-9 w-9 p-1 rounded border cursor-pointer"
                            />
                            <Input
                                value={formData.color}
                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                onKeyDown={handleEnterKey}
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>ชื่อตำแหน่ง (EN) <span className="text-red-500">*</span></Label>
                        <Input
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            onKeyDown={handleEnterKey}
                            required
                        />
                    </div>
                    <div>
                        <Label>ชื่อตำแหน่ง (TH)</Label>
                        <Input
                            value={formData.name_th}
                            onChange={e => setFormData({ ...formData, name_th: e.target.value })}
                            onKeyDown={handleEnterKey}
                        />
                    </div>
                </div>

                <div>
                    <Label>รายละเอียด</Label>
                    <Textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>ระดับ (Level)</Label>
                        <Input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.level}
                            onChange={e => setFormData({ ...formData, level: Number(e.target.value) })}
                            onKeyDown={handleEnterKey}
                        />
                    </div>
                    <div>
                        <Label>แผนกสังกัด</Label>
                        <Select
                            value={formData.department_id}
                            onValueChange={val => setFormData({ ...formData, department_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกแผนก" />
                            </SelectTrigger>
                            <SelectContent>
                                {departments.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>อัตรา/ชั่วโมง</Label>
                        <Input
                            type="number"
                            value={formData.hourly_rate}
                            onChange={e => setFormData({ ...formData, hourly_rate: Number(e.target.value) })}
                            onKeyDown={handleEnterKey}
                        />
                    </div>
                    <div>
                        <Label>อัตรา/วัน</Label>
                        <Input
                            type="number"
                            value={formData.daily_rate}
                            onChange={e => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
                            onKeyDown={handleEnterKey}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>ยกเลิก</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {mode === 'create' ? 'บันทึก' : 'อัพเดท'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
