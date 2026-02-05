"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/Switch";
import { TaskTypeConfig, TaskTypeConfigFormData } from "@/types/task-type-config";
import { createTaskTypeConfig, updateTaskTypeConfig } from "@/lib/actions/task-type-config-actions";

interface TaskTypeConfigModalProps {
    open: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    data: TaskTypeConfig | null;
    onSuccess: () => void;
}

export function TaskTypeConfigModal({ open, onClose, mode, data, onSuccess }: TaskTypeConfigModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState<TaskTypeConfigFormData>({
        code: "",
        name: "",
        is_countable_for_kpi: true,
        kpi_category: "",
        is_defect: false,
        sort_order: 0,
        is_active: true,
    });

    useEffect(() => {
        if (mode === 'edit' && data) {
            setFormData({
                code: data.code,
                name: data.name,
                is_countable_for_kpi: data.is_countable_for_kpi,
                kpi_category: data.kpi_category || "",
                is_defect: data.is_defect,
                sort_order: data.sort_order,
                is_active: data.is_active,
            });
        } else {
            setFormData({
                code: "",
                name: "",
                is_countable_for_kpi: true,
                kpi_category: "",
                is_defect: false,
                sort_order: 0,
                is_active: true,
            });
        }
    }, [mode, data, open]);

    const handleSubmit = async () => {
        setIsLoading(true);
        setErrors({});

        try {
            if (mode === 'create') {
                await createTaskTypeConfig(formData);
            } else {
                if (data) {
                    await updateTaskTypeConfig(data.id, formData);
                }
            }
            onSuccess();
        } catch (error: any) {
            console.error("Submit Error:", error);
            setErrors({ submit: error.message || "An error occurred." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={mode === 'create' ? 'เพิ่มประเภทงาน' : 'แก้ไขประเภทงาน'}
            size="md"
        >
            <div className="space-y-4">
                {errors.submit && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {errors.submit}
                    </div>
                )}

                {/* Row 1: Code & Sort Order */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">รหัส <span className="text-red-500">*</span></label>
                        <Input
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            placeholder="e.g. DEV"
                            required
                            disabled={mode === 'edit'}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block">ลำดับ</label>
                        <Input
                            type="number"
                            value={formData.sort_order}
                            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>

                {/* Row 2: Name */}
                <div>
                    <label className="text-sm font-medium mb-2 block">ชื่อประเภกงาน <span className="text-red-500">*</span></label>
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Development"
                        required
                    />
                </div>

                {/* Row 3: KPI Category */}
                <div>
                    <label className="text-sm font-medium mb-2 block">หมวดหมู่ KPI</label>
                    <Input
                        value={formData.kpi_category || ""}
                        onChange={(e) => setFormData({ ...formData, kpi_category: e.target.value })}
                        placeholder="Optional"
                    />
                </div>

                {/* Row 4: Toggles */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Defect (งานแก้ไขบั๊ก?)</span>
                        <Switch
                            checked={formData.is_defect}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_defect: checked })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">นับใน KPI?</span>
                        <Switch
                            checked={formData.is_countable_for_kpi}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_countable_for_kpi: checked })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status (ใช้งาน)</span>
                        <Switch
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={onClose} disabled={isLoading}>ยกเลิก</Button>
                <Button onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? 'กำลังบันทึก...' : (mode === 'create' ? 'บันทึก' : 'อัพเดท')}
                </Button>
            </div>
        </Modal>
    );
}
