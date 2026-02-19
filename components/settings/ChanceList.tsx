'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
    ChanceConfig,
    deleteChanceConfig,
    toggleChanceConfigActive,
    createChanceConfig,
    updateChanceConfig,
} from '@/lib/actions/chance-actions'

interface ChanceListProps {
    chances: ChanceConfig[]
}

export function ChanceList({ chances }: ChanceListProps) {
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [selectedChance, setSelectedChance] = useState<ChanceConfig | null>(null)
    const [loadingAction, setLoadingAction] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        name_th: '',
        description: '',
        percentage: 0,
        color: '#6B7280',
    })

    const handleAdd = () => {
        setModalMode('create')
        setSelectedChance(null)
        setFormData({ code: '', name: '', name_th: '', description: '', percentage: 0, color: '#6B7280' })
        setIsModalOpen(true)
    }

    const handleEdit = (chance: ChanceConfig) => {
        setModalMode('edit')
        setSelectedChance(chance)
        setFormData({
            code: chance.code,
            name: chance.name,
            name_th: chance.name_th || '',
            description: chance.description || '',
            percentage: chance.percentage,
            color: chance.color,
        })
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`คุณต้องการลบ "${name}" ?\n\nหากมีโครงการใช้อยู่ จะไม่สามารถลบได้`)) return

        setLoadingAction(id)
        try {
            const result = await deleteChanceConfig(id)
            if (result.success) {
                toast.success('ลบสำเร็จ')
                router.refresh()
            } else {
                toast.error(result.error || 'ลบไม่สำเร็จ')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleToggleActive = async (id: string) => {
        setLoadingAction(id)
        try {
            const result = await toggleChanceConfigActive(id)
            if (result.success) {
                toast.success('อัพเดทสำเร็จ')
                router.refresh()
            } else {
                toast.error(result.error || 'อัพเดทไม่สำเร็จ')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleSubmit = async () => {
        if (!formData.code || !formData.name) {
            toast.error('กรุณากรอก Code และ Name')
            return
        }

        setLoadingAction('submit')
        try {
            if (modalMode === 'create') {
                const result = await createChanceConfig(formData)
                if (result.success) {
                    toast.success('สร้างสำเร็จ')
                    setIsModalOpen(false)
                    router.refresh()
                } else {
                    toast.error(result.error || 'สร้างไม่สำเร็จ')
                }
            } else if (selectedChance) {
                const result = await updateChanceConfig(selectedChance.id, formData)
                if (result.success) {
                    toast.success('บันทึกสำเร็จ')
                    setIsModalOpen(false)
                    router.refresh()
                } else {
                    toast.error(result.error || 'บันทึกไม่สำเร็จ')
                }
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setLoadingAction(null)
        }
    }

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <p className="text-sm text-slate-500">
                    ทั้งหมด {chances.length} รายการ
                </p>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    เพิ่ม Chance
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">สี</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Code</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ชื่อ</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">คำอธิบาย</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">%</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">โครงการ</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">สถานะ</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chances.map((chance) => (
                            <tr key={chance.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div
                                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                        style={{ backgroundColor: chance.color }}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <span className="font-mono text-sm font-medium text-slate-700">{chance.code}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div>
                                        <span className="font-medium text-slate-800">{chance.name}</span>
                                        {chance.name_th && (
                                            <span className="text-xs text-slate-400 ml-2">({chance.name_th})</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-slate-500 line-clamp-1">{chance.description || '-'}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold"
                                        style={{ backgroundColor: `${chance.color}20`, color: chance.color }}>
                                        {chance.percentage}%
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="text-sm text-slate-600">{chance.project_count || 0}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => handleToggleActive(chance.id)}
                                        disabled={loadingAction === chance.id}
                                        className="inline-flex items-center"
                                        title={chance.is_active ? 'ใช้งานอยู่ - คลิกเพื่อปิด' : 'ปิดใช้งาน - คลิกเพื่อเปิด'}
                                    >
                                        {loadingAction === chance.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                        ) : chance.is_active ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-slate-300" />
                                        )}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => handleEdit(chance)}
                                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                            title="แก้ไข"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(chance.id, chance.name)}
                                            disabled={loadingAction === chance.id}
                                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors disabled:opacity-50"
                                            title="ลบ"
                                        >
                                            {loadingAction === chance.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {chances.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                                    ยังไม่มีข้อมูล Chance กรุณารัน SQL script 58_create_chance_configs.sql
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
                        <h3 className="text-lg font-semibold mb-4">
                            {modalMode === 'create' ? 'เพิ่ม Chance' : 'แก้ไข Chance'}
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Code <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="HOT"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Percentage (%)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={formData.percentage}
                                        onChange={(e) => setFormData({ ...formData, percentage: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Hot"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อแสดง (Thai)</label>
                                    <input
                                        type="text"
                                        value={formData.name_th}
                                        onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                                        placeholder="Hot 50%"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบาย</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="รายละเอียดเพิ่มเติม..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">สี</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300"
                                    />
                                    <input
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                                    />
                                    {/* Preview */}
                                    <span
                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white"
                                        style={{ backgroundColor: formData.color }}
                                    >
                                        {formData.name || 'Preview'} ({formData.percentage}%)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loadingAction === 'submit'}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {loadingAction === 'submit' && <Loader2 className="w-4 h-4 animate-spin" />}
                                {modalMode === 'create' ? 'สร้าง' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
