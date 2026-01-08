'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { ProjectStatusConfig } from '@/types/project'
import { createProjectStatusConfig, updateProjectStatusConfig } from '@/lib/actions/project-status-config-actions'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { SmartCombobox } from '@/components/shared/SmartCombobox/SmartCombobox' // Reusing if needed for color? Or just input.

interface ProjectStatusConfigModalProps {
    open: boolean
    onClose: () => void
    config?: ProjectStatusConfig
}

export default function ProjectStatusConfigModal({ open, onClose, config }: ProjectStatusConfigModalProps) {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        name_th: '',
        color: '#64748b',
        is_final: false,
        sort_order: 0
    })
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})

    useEffect(() => {
        if (config) {
            setFormData({
                code: config.code,
                name: config.name,
                name_th: config.name_th || '',
                color: config.color,
                is_final: config.is_final,
                sort_order: config.sort_order
            })
        } else {
            setFormData({
                code: '',
                name: '',
                name_th: '',
                color: '#64748b',
                is_final: false,
                sort_order: 0
            })
        }
        setErrors({})
    }, [config, open])

    const validate = () => {
        const newErrors: { [key: string]: string } = {}
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
            if (config) {
                result = await updateProjectStatusConfig(config.id, formData)
            } else {
                result = await createProjectStatusConfig(formData)
            }

            if (result.success) {
                toast.success(config ? 'Status updated successfully' : 'Status created successfully')
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

    if (!open) return null

    // Predefined colors for easier selection
    const colorMethods = [
        { value: '#64748b', label: 'Slate' },
        { value: '#ef4444', label: 'Red' },
        { value: '#f97316', label: 'Orange' },
        { value: '#f59e0b', label: 'Amber' },
        { value: '#22c55e', label: 'Green' },
        { value: '#3b82f6', label: 'Blue' },
        { value: '#8b5cf6', label: 'Violet' },
        { value: '#d946ef', label: 'Fuchsia' },
    ]

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
                        {config ? 'Edit Status' : 'New Status'}
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
                            placeholder="Optional"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Color
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="h-10 w-12 p-0 border-0 rounded pointer-cursor"
                                />
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_final}
                                    onChange={(e) => setFormData({ ...formData, is_final: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700">Is Final Status?</span>
                            </label>
                        </div>
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
                        {config ? 'Update' : 'Create'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
