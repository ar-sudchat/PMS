"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createEmployee, updateEmployee, EmployeeFormData } from "@/lib/actions/employee-actions";
import { getDepartments } from "@/lib/actions/department-actions";
import { getPositions } from "@/lib/actions/position-actions";
import { getEmployees } from "@/lib/actions/employee-actions";

interface EmployeeModalProps {
    open: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    employee: any | null;
    onSuccess: () => void;
}

export function EmployeeModal({ open, onClose, mode, employee, onSuccess }: EmployeeModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Dropdown Data
    const [departments, setDepartments] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);

    const [formData, setFormData] = useState<EmployeeFormData>({
        employee_code: "",
        first_name: "",
        last_name: "",
        first_name_th: "",
        last_name_th: "",
        nickname: "",
        email: "",
        phone: "",
        department_id: "",
        position_id: "",
        manager_id: "0",
        role: "member",
        employment_type: "full-time",
        employment_status: "active",
        start_date: new Date().toISOString().split('T')[0],
        probation_end_date: "",
        working_hours_per_day: 8,
        working_days_per_week: 5,
    });

    useEffect(() => {
        if (open) {
            // Load dropdowns when modal opens
            const loadDropdowns = async () => {
                try {
                    const [depts, pos, emps] = await Promise.all([
                        getDepartments(),
                        getPositions(),
                        getEmployees(),
                    ]);
                    setDepartments(depts || []);
                    setPositions(pos || []);
                    setManagers(emps || []);
                } catch (err) {
                    console.error("Failed to load dropdown data", err);
                }
            };
            loadDropdowns();
        }
    }, [open]);

    useEffect(() => {
        if (mode === 'edit' && employee) {
            setFormData({
                employee_code: employee.employee_code || "",
                first_name: employee.first_name || "",
                last_name: employee.last_name || "",
                first_name_th: employee.first_name_th || "",
                last_name_th: employee.last_name_th || "",
                nickname: employee.nickname || "",
                email: employee.email || "",
                phone: employee.phone || "",
                department_id: employee.department_id || "",
                position_id: employee.position_id || "",
                manager_id: employee.manager_id || "0",
                role: employee.role || "member",
                employment_type: employee.employment_type || "full-time",
                employment_status: employee.employment_status || "active",
                start_date: employee.start_date ? new Date(employee.start_date).toISOString().split('T')[0] : "",
                probation_end_date: employee.probation_end_date ? new Date(employee.probation_end_date).toISOString().split('T')[0] : "",
                working_hours_per_day: employee.working_hours_per_day || 8,
                working_days_per_week: employee.working_days_per_week || 5,
            });
        } else {
            setFormData({
                employee_code: "",
                first_name: "",
                last_name: "",
                first_name_th: "",
                last_name_th: "",
                nickname: "",
                email: "",
                phone: "",
                department_id: "",
                position_id: "",
                manager_id: "0",
                role: "member",
                employment_type: "full-time",
                employment_status: "active",
                start_date: new Date().toISOString().split('T')[0],
                probation_end_date: "",
                working_hours_per_day: 8,
                working_days_per_week: 5,
            });
        }
    }, [mode, employee, open]);

    const filteredPositions = departments.length > 0 && formData.department_id
        ? positions.filter(p => p.department_id === formData.department_id)
        : positions;

    const handleSubmit = async () => {
        setIsLoading(true);
        setErrors({});

        // Fallback for hidden EN names
        const submitData = { ...formData };
        if (!submitData.first_name) submitData.first_name = submitData.first_name_th || "-";
        if (!submitData.last_name) submitData.last_name = submitData.last_name_th || "-";

        try {
            if (mode === 'create') {
                await createEmployee(submitData);
            } else {
                await updateEmployee(employee.id, submitData);
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
            title={mode === 'create' ? 'เพิ่มพนักงาน' : 'แก้ไขพนักงาน'}
            size="lg"
        >
            <div className="space-y-6">
                {errors.submit && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {errors.submit}
                    </div>
                )}

                {/* Section: ข้อมูลพื้นฐาน */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>รหัสพนักงาน <span className="text-red-500">*</span></Label>
                        <Input
                            value={formData.employee_code}
                            onChange={e => setFormData({ ...formData, employee_code: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <Label>Email <span className="text-red-500">*</span></Label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <Label>ชื่อ (TH) <span className="text-red-500">*</span></Label>
                        <Input
                            value={formData.first_name_th}
                            onChange={e => setFormData({ ...formData, first_name_th: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <Label>นามสกุล (TH) <span className="text-red-500">*</span></Label>
                        <Input
                            value={formData.last_name_th}
                            onChange={e => setFormData({ ...formData, last_name_th: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h3 className="font-semibold text-slate-900 mb-3">องค์กร</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>แผนก <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.department_id}
                                onValueChange={val => setFormData({ ...formData, department_id: val, position_id: "" })}
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
                        <div>
                            <Label>ตำแหน่ง <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.position_id}
                                onValueChange={val => setFormData({ ...formData, position_id: val })}
                                disabled={!formData.department_id}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="เลือกตำแหน่ง" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredPositions.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>หัวหน้า</Label>
                            <Select
                                value={formData.manager_id}
                                onValueChange={val => setFormData({ ...formData, manager_id: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="เลือกหัวหน้า" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">No Manager</SelectItem>
                                    {managers.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Role <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.role}
                                onValueChange={val => setFormData({ ...formData, role: val as any })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>สถานะ</Label>
                            <Select
                                value={formData.employment_status}
                                onValueChange={val => setFormData({ ...formData, employment_status: val as any })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>


                {/* Footer */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>ยกเลิก</Button>
                    <Button onClick={handleSubmit} loading={isLoading}>
                        {mode === 'create' ? 'บันทึก' : 'อัพเดท'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
