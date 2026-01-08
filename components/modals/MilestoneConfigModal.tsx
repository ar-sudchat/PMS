"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/Switch";
import { MilestoneConfig, MilestoneConfigFormData } from "@/types/milestone-config";
import { createMilestoneConfig, updateMilestoneConfig } from "@/lib/actions/milestone-config-actions";

interface MilestoneConfigModalProps {
    open: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    data: MilestoneConfig | null;
    onSuccess: () => void;
}

const Textarea = ({
    label,
    value,
    onChange,
    placeholder,
    rows = 3,
}: {
    label: string,
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
}) => (
    <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
    </div>
);

export function MilestoneConfigModal({ open, onClose, mode, data, onSuccess }: MilestoneConfigModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState<MilestoneConfigFormData>({
        code: "",
        name: "",
        name_th: "",
        description: "",
        color: "#6366f1",
        icon: "",
        sort_order: 0,
        is_active: true,
    });

    useEffect(() => {
        if (mode === 'edit' && data) {
            setFormData({
                code: data.code,
                name: data.name,
                name_th: data.name_th || "",
                description: data.description || "",
                color: data.color,
                icon: data.icon || "",
                sort_order: data.sort_order,
                is_active: data.is_active,
            });
        } else {
            setFormData({
                code: "",
                name: "",
                name_th: "",
                description: "",
                color: "#6366f1",
                icon: "",
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
                await createMilestoneConfig(formData);
            } else {
                if (data) {
                    await updateMilestoneConfig(data.id, formData);
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
            title={mode === 'create' ? 'เพิ่ม Milestone' : 'แก้ไข Milestone'}
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
                        <label className="text-sm font-medium mb-2 block">รหัส Milestone <span className="text-red-500">*</span></label>
                        <Input
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            placeholder="e.g. INITIATE"
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

                {/* Row 2: Name EN & TH */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">ชื่อ (EN) <span className="text-red-500">*</span></label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Project Initiation"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block">ชื่อ (TH)</label>
                        <Input
                            value={formData.name_th}
                            onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                            placeholder="e.g. เริ่มต้นโครงการ"
                        />
                    </div>
                </div>

                {/* Row 3: Color & Status */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">สี</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="w-10 h-10 rounded cursor-pointer border border-slate-200 p-1"
                            />
                            <Input
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                placeholder="#6366f1"
                                className="flex-1"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">สถานะ</label>
                        <div className="flex items-center gap-2 h-10">
                            <Switch
                                checked={formData.is_active}
                                onChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                            <span className="text-sm text-slate-600">{formData.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                    </div>
                </div>

                {/* Row 4: Description */}
                <Textarea
                    label="รายละเอียด"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="อธิบายรายละเอียดของ Milestone นี้..."
                    rows={3}
                />
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
