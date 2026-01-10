'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
    createEmployee,
    updateEmployee,
    getEmployeeFormOptions
} from '@/lib/actions/employee-actions'
import { SmartCombobox } from '@/components/shared/SmartCombobox'

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
                                <SmartCombobox
                                    label="แผนก"
                                    placeholder="-- ไม่ระบุ --"
                                    options={[
                                        { value: '', label: '-- ไม่ระบุ --' },
                                        ...options.departments.map(d => ({ value: d.id, label: d.name_th || d.name }))
                                    ]}
                                    value={formData.department_id ? options.departments.find(d => d.id === formData.department_id) ? { value: formData.department_id, label: options.departments.find(d => d.id === formData.department_id)!.name_th || options.departments.find(d => d.id === formData.department_id)!.name } : null : { value: '', label: '-- ไม่ระบุ --' }}
                                    onChange={(option) => handleChange('department_id', option?.value === '' ? '' : option?.value as string || '')}
                                    maxDisplayItems={10}
                                />
                                <SmartCombobox
                                    label="ตำแหน่ง"
                                    placeholder="-- ไม่ระบุ --"
                                    options={[
                                        { value: '', label: '-- ไม่ระบุ --' },
                                        ...filteredPositions.map(p => ({ value: p.id, label: p.name_th || p.name }))
                                    ]}
                                    value={formData.position_id ? filteredPositions.find(p => p.id === formData.position_id) ? { value: formData.position_id, label: filteredPositions.find(p => p.id === formData.position_id)!.name_th || filteredPositions.find(p => p.id === formData.position_id)!.name } : null : { value: '', label: '-- ไม่ระบุ --' }}
                                    onChange={(option) => handleChange('position_id', option?.value === '' ? '' : option?.value as string || '')}
                                    maxDisplayItems={10}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <SmartCombobox
                                    label="หัวหน้า"
                                    placeholder="-- ไม่มี --"
                                    options={[
                                        { value: '', label: '-- ไม่มี --' },
                                        ...options.managers
                                            .filter(m => m.id !== employee?.id)
                                            .map(m => ({ value: m.id, label: m.name_th || m.name }))
                                    ]}
                                    value={formData.manager_id ? options.managers.find(m => m.id === formData.manager_id) ? { value: formData.manager_id, label: options.managers.find(m => m.id === formData.manager_id)!.name_th || options.managers.find(m => m.id === formData.manager_id)!.name } : null : { value: '', label: '-- ไม่มี --' }}
                                    onChange={(option) => handleChange('manager_id', option?.value === '' ? '' : option?.value as string || '')}
                                    maxDisplayItems={10}
                                />
                                <SmartCombobox
                                    label="Role"
                                    required
                                    placeholder="Select role"
                                    options={[
                                        { value: 'member', label: 'Member' },
                                        { value: 'manager', label: 'Manager' },
                                        { value: 'admin', label: 'Admin' }
                                    ]}
                                    value={{ value: formData.role, label: formData.role === 'member' ? 'Member' : formData.role === 'manager' ? 'Manager' : 'Admin' }}
                                    onChange={(option) => handleChange('role', option?.value as string || 'member')}
                                    maxDisplayItems={3}
                                />
                            </div>
                        </div>

                        {/* Employment */}
                        <div className="border-t pt-4">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">การจ้างงาน</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <SmartCombobox
                                    label="ประเภท"
                                    placeholder="Select type"
                                    options={[
                                        { value: 'full_time', label: 'Full Time' },
                                        { value: 'part_time', label: 'Part Time' },
                                        { value: 'contract', label: 'Contract' },
                                        { value: 'intern', label: 'Intern' }
                                    ]}
                                    value={{ value: formData.employment_type, label: formData.employment_type === 'full_time' ? 'Full Time' : formData.employment_type === 'part_time' ? 'Part Time' : formData.employment_type === 'contract' ? 'Contract' : 'Intern' }}
                                    onChange={(option) => handleChange('employment_type', option?.value as string || 'full_time')}
                                    maxDisplayItems={4}
                                />
                                <SmartCombobox
                                    label="สถานะ"
                                    placeholder="Select status"
                                    options={[
                                        { value: 'active', label: 'Active' },
                                        { value: 'inactive', label: 'Inactive' },
                                        { value: 'suspended', label: 'Suspended' },
                                        { value: 'resigned', label: 'Resigned' },
                                        { value: 'terminated', label: 'Terminated' }
                                    ]}
                                    value={{ value: formData.employment_status, label: formData.employment_status === 'active' ? 'Active' : formData.employment_status === 'inactive' ? 'Inactive' : formData.employment_status === 'suspended' ? 'Suspended' : formData.employment_status === 'resigned' ? 'Resigned' : 'Terminated' }}
                                    onChange={(option) => handleChange('employment_status', option?.value as string || 'active')}
                                    maxDisplayItems={5}
                                />
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
