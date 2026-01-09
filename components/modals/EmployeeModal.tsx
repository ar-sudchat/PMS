'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
    createEmployee,
    updateEmployee,
    getEmployeeFormOptions
} from '@/lib/actions/employee-actions'

interface EmployeeModalProps {
    open: boolean
    onClose: () => void
    mode: 'create' | 'edit'
    employee: any | null
    onSuccess: () => void
}

interface FormData {
    employee_code: string
    email: string
    first_name: string
    last_name: string
    first_name_th: string
    last_name_th: string
    nickname: string
    phone: string
    department_id: string
    position_id: string
    manager_id: string
    role: string
    employment_type: string
    employment_status: string
    start_date: string
}

const initialFormData: FormData = {
    employee_code: '',
    email: '',
    first_name: '',
    last_name: '',
    first_name_th: '',
    last_name_th: '',
    nickname: '',
    phone: '',
    department_id: '',
    position_id: '',
    manager_id: '',
    role: 'member',
    employment_type: 'full_time',
    employment_status: 'active',
    start_date: ''
}

export function EmployeeModal({ open, onClose, mode, employee, onSuccess }: EmployeeModalProps) {
    const [formData, setFormData] = useState<FormData>(initialFormData)
    const [options, setOptions] = useState<{
        departments: any[]
        positions: any[]
        managers: any[]
    }>({
        departments: [],
        positions: [],
        managers: []
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load options on mount
    useEffect(() => {
        if (open) {
            loadOptions()
        }
    }, [open])

    // Set form data when editing
    useEffect(() => {
        if (mode === 'edit' && employee) {
            setFormData({
                employee_code: employee.employee_code || '',
                email: employee.email || '',
                first_name: employee.first_name || '',
                last_name: employee.last_name || '',
                first_name_th: employee.first_name_th || '',
                last_name_th: employee.last_name_th || '',
                nickname: employee.nickname || '',
                phone: employee.phone || '',
                department_id: employee.department_id || '',  // อาจเป็น null
                position_id: employee.position_id || '',      // อาจเป็น null
                manager_id: employee.manager_id || '',        // อาจเป็น null
                role: employee.role || 'member',
                employment_type: employee.employment_type || 'full_time',
                employment_status: employee.employment_status || 'active',
                start_date: employee.start_date
                    ? new Date(employee.start_date).toISOString().split('T')[0]
                    : ''
            })
        } else {
            setFormData(initialFormData)
        }
        setError(null)
    }, [mode, employee, open])

    const loadOptions = async () => {
        const result = await getEmployeeFormOptions()
        if (result.success && result.data) {
            setOptions(result.data)
        }
    }

    const handleChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setError(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            // Validate required fields
            if (!formData.employee_code || !formData.email || !formData.first_name_th || !formData.last_name_th) {
                setError('กรุณากรอกข้อมูลที่จำเป็น')
                setIsLoading(false)
                return
            }

            // เตรียมข้อมูล - แปลงค่าว่างเป็น undefined (จะถูกแปลงเป็น null ใน Server Action)
            const submitData = {
                ...formData,
                department_id: formData.department_id || undefined,
                position_id: formData.position_id || undefined,
                manager_id: formData.manager_id || undefined,
                start_date: formData.start_date || undefined,
                // ถ้าไม่มีชื่อ EN ให้ใช้ชื่อ TH
                first_name: formData.first_name || formData.first_name_th,
                last_name: formData.last_name || formData.last_name_th
            }

            let result
            if (mode === 'create') {
                result = await createEmployee(submitData)
            } else {
                result = await updateEmployee(employee.id, submitData)
            }

            if (result.success) {
                onSuccess()
                onClose()
            } else {
                setError(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาด')
        } finally {
            setIsLoading(false)
        }
    }

    // Filter positions by department
    const filteredPositions = formData.department_id
        ? options.positions.filter(p =>
            !p.department_id || p.department_id === formData.department_id
        )
        : options.positions

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                    <h2 className="text-lg font-semibold">
                        {mode === 'create' ? 'เพิ่มพนักงาน' : 'แก้ไขพนักงาน'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    รหัสพนักงาน <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.employee_code}
                                    onChange={(e) => handleChange('employee_code', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Thai Name */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    ชื่อ (TH) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.first_name_th}
                                    onChange={(e) => handleChange('first_name_th', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    นามสกุล (TH) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.last_name_th}
                                    onChange={(e) => handleChange('last_name_th', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* English Name (Optional) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    First Name (EN)
                                </label>
                                <input
                                    type="text"
                                    value={formData.first_name}
                                    onChange={(e) => handleChange('first_name', e.target.value)}
                                    placeholder={formData.first_name_th || 'Optional'}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Last Name (EN)
                                </label>
                                <input
                                    type="text"
                                    value={formData.last_name}
                                    onChange={(e) => handleChange('last_name', e.target.value)}
                                    placeholder={formData.last_name_th || 'Optional'}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Organization */}
                        <div className="border-t pt-4">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">องค์กร</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        แผนก
                                    </label>
                                    <select
                                        value={formData.department_id}
                                        onChange={(e) => handleChange('department_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">-- ไม่ระบุ --</option>
                                        {options.departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name_th || d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        ตำแหน่ง
                                    </label>
                                    <select
                                        value={formData.position_id}
                                        onChange={(e) => handleChange('position_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">-- ไม่ระบุ --</option>
                                        {filteredPositions.map(p => (
                                            <option key={p.id} value={p.id}>{p.name_th || p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        หัวหน้า
                                    </label>
                                    <select
                                        value={formData.manager_id}
                                        onChange={(e) => handleChange('manager_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">-- ไม่มี --</option>
                                        {options.managers
                                            .filter(m => m.id !== employee?.id) // ไม่แสดงตัวเอง
                                            .map(m => (
                                                <option key={m.id} value={m.id}>{m.name_th || m.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Role <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => handleChange('role', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    >
                                        <option value="member">Member</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Employment */}
                        <div className="border-t pt-4">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">การจ้างงาน</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        ประเภท
                                    </label>
                                    <select
                                        value={formData.employment_type}
                                        onChange={(e) => handleChange('employment_type', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="full_time">Full Time</option>
                                        <option value="part_time">Part Time</option>
                                        <option value="contract">Contract</option>
                                        <option value="intern">Intern</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        สถานะ
                                    </label>
                                    <select
                                        value={formData.employment_status}
                                        onChange={(e) => handleChange('employment_status', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="suspended">Suspended</option>
                                        <option value="resigned">Resigned</option>
                                        <option value="terminated">Terminated</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isLoading ? 'กำลังบันทึก...' : mode === 'create' ? 'เพิ่มพนักงาน' : 'อัพเดท'}
                    </button>
                </div>
            </div>
        </div>
    )
}
