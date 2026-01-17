'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { BackupType, createBackupType, updateBackupType } from '@/lib/actions/backup-type-actions'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface BackupTypeModalProps {
    open: boolean
    onClose: () => void
    backupType?: BackupType
    currentUserId?: string
}

export function BackupTypeModal({ open, onClose, backupType, currentUserId }: BackupTypeModalProps) {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        is_kpi_counted: true,
        is_active: true,
        sort_order: 0
    })
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})

    useEffect(() => {
        if (backupType) {
            setFormData({
                code: backupType.code,
                name: backupType.name,
                description: backupType.description || '',
                is_kpi_counted: backupType.is_kpi_counted,
                is_active: backupType.is_active,
                sort_order: backupType.sort_order
            })
        } else {
            setFormData({
                code: '',
                name: '',
                description: '',
                is_kpi_counted: true,
                is_active: true,
                sort_order: 0
            })
        }
        setErrors({})
    }, [backupType, open])

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
            if (backupType) {
                result = await updateBackupType(backupType.id, formData)
            } else {
                result = await createBackupType({
                    ...formData,
                    created_by: currentUserId
                })
            }

            if (result.success) {
                toast.success(backupType ? 'Backup type updated successfully' : 'Backup type created successfully')
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

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e as any)
        }
    }

    if (!open) return null

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
                        {backupType ? 'Edit Backup Type' : 'Add Backup Type'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-6 space-y-4">
                    {/* Code */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${errors.code ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                            placeholder="e.g., DATABASE, SOURCE_CODE"
                        />
                        {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${errors.name ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                            placeholder="e.g., Database Backup"
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                            rows={3}
                            placeholder="Additional details..."
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {/* Sort Order */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Sort Order
                            </label>
                            <input
                                type="number"
                                value={formData.sort_order}
                                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                min={0}
                            />
                        </div>

                        {/* KPI Counted */}
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_kpi_counted}
                                    onChange={(e) => setFormData({ ...formData, is_kpi_counted: e.target.checked })}
                                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                />
                                <span className="text-sm font-medium text-slate-700">Count KPI</span>
                            </label>
                        </div>

                        {/* Active */}
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700">Active</span>
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
                        {backupType ? 'Update' : 'Create'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
