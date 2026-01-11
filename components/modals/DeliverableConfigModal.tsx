'use client'

import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { DeliverableConfig } from '@/types/project'
import { createDeliverableConfig, updateDeliverableConfig } from '@/lib/actions/deliverable-config-actions'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface DeliverableConfigModalProps {
    isOpen: boolean
    onClose: () => void
    mode?: 'create' | 'edit'
    milestoneConfigId?: string
    milestoneName?: string
    initialData?: DeliverableConfig | null
    onSuccess?: () => void
}

export default function DeliverableConfigModal({
    isOpen,
    onClose,
    mode,
    milestoneConfigId,
    milestoneName,
    initialData,
    onSuccess
}: DeliverableConfigModalProps) {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        name_th: '',
        sort_order: 0,
        is_required: true
    })
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})

    useEffect(() => {
        if (initialData) {
            setFormData({
                code: initialData.code || '',
                name: initialData.name,
                name_th: initialData.name_th || '',
                sort_order: initialData.sort_order,
                is_required: initialData.is_required ?? true
            })
        } else {
            setFormData({
                code: '',
                name: '',
                name_th: '',
                sort_order: 0,
                is_required: true
            })
        }
        setErrors({})
    }, [initialData, isOpen])

    const validate = () => {
        const newErrors: { [key: string]: string } = {}
        // Code might not be used by action but UI has it? Action didn't show code usage.
        // But let's keep validation if UI has it. 
        if (!formData.code.trim()) newErrors.code = 'Code is required'
        if (!formData.name.trim()) newErrors.name = 'Name is required'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        setIsLoading(true)
        try {
            let result
            if (initialData) {
                result = await updateDeliverableConfig(initialData.id, formData)
            } else {
                if (!milestoneConfigId) {
                    toast.error('Milestone context missing')
                    return
                }
                result = await createDeliverableConfig({
                    ...formData,
                    milestone_config_id: milestoneConfigId
                })
            }

            if (result.success) {
                toast.success(initialData ? 'Deliverable updated successfully' : 'Deliverable created successfully')
                if (onSuccess) onSuccess()
                onClose()
            } else {
                toast.error(result.error || 'Operation failed')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-lg font-semibold text-slate-800">
                        {initialData ? 'Edit Deliverable' : `New Deliverable: ${milestoneName || ''}`}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${errors.code ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                                    }`}
                                placeholder="e.g. DEL-01"
                            />
                            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                        </div>

                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Sort Order
                            </label>
                            <input
                                type="number"
                                value={formData.sort_order}
                                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                                }`}
                            placeholder="Deliverable Name"
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Name (Thai)
                        </label>
                        <input
                            type="text"
                            value={formData.name_th}
                            onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            placeholder="ชื่อสิ่งที่ส่งมอบ (Optional)"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_required"
                            checked={formData.is_required}
                            onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <label htmlFor="is_required" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                            Required by default
                        </label>
                    </div>

                </form>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        {initialData ? 'Update' : 'Create'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
