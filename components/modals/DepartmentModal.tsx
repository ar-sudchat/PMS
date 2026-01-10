"use client";

import { useState, useEffect } from "react";
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
import { createDepartment, updateDepartment, DepartmentFormData } from "@/lib/actions/department-actions";
import { getDepartments } from "@/lib/actions/department-actions";
import { getEmployees } from "@/lib/actions/employee-actions";

interface DepartmentModalProps {
    open: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    department: any | null;
    onSuccess: () => void;
}

export function DepartmentModal({ open, onClose, mode, department, onSuccess }: DepartmentModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Dropdown Data
    const [departments, setDepartments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    const [formData, setFormData] = useState<DepartmentFormData>({
        code: "",
        name: "",
        name_th: "",
        description: "",
        head_id: "",
        parent_id: "",
        color: "#6366f1", // Default Indigo
    });

    useEffect(() => {
        if (open) {
            const loadDropdowns = async () => {
                try {
                    const [depts, empsResult] = await Promise.all([
                        getDepartments(),
                        getEmployees(),
                    ]);
                    setDepartments(depts || []);

                    if (empsResult && 'success' in (empsResult as any)) {
                        setEmployees((empsResult as any).data || []);
                    } else {
                        setEmployees(empsResult as any || []);
                    }
                } catch (err) {
                    console.error("Failed to load dropdown data", err);
                }
            };
            loadDropdowns();
        }
    }, [open]);

    useEffect(() => {
        if (mode === 'edit' && department) {
            setFormData({
                code: department.code || "",
                name: department.name || "",
                name_th: department.name_th || "",
                description: department.description || "",
                head_id: department.head_id || "",
                parent_id: department.parent_id || "",
                color: department.color || "#6366f1",
            });
        } else {
            setFormData({
                code: "",
                name: "",
                name_th: "",
                description: "",
                head_id: "",
                parent_id: "",
                color: "#6366f1",
            });
        }
    }, [mode, department, open]);

    const handleSubmit = async () => {
        setIsLoading(true);
        setErrors({});
        try {
            if (mode === 'create') {
                await createDepartment(formData);
            } else {
                await updateDepartment(department.id, formData);
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
            title={mode === 'create' ? 'เพิ่มแผนก' : 'แก้ไขแผนก'}
            size="md"
        >
            <div className="space-y-4">
                {errors.submit && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {errors.submit}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>รหัสแผนก <span className="text-red-500">*</span></Label>
                        <Input
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
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
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>ชื่อแผนก (EN) <span className="text-red-500">*</span></Label>
                        <Input
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <Label>ชื่อแผนก (TH)</Label>
                        <Input
                            value={formData.name_th}
                            onChange={e => setFormData({ ...formData, name_th: e.target.value })}
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
                        <Label>แผนกแม่</Label>
                        <Select
                            value={formData.parent_id}
                            onValueChange={val => setFormData({ ...formData, parent_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกแผนกแม่" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0" disabled>Select Parent</SelectItem>
                                {departments
                                    .filter(d => d.id !== department?.id) // Prevent self-parenting
                                    .map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>หัวหน้าแผนก</Label>
                        <Select
                            value={formData.head_id}
                            onValueChange={val => setFormData({ ...formData, head_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกหัวหน้า" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
