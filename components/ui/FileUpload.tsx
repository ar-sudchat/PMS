'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, File, Image, FileText, Paperclip, Eye, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { uploadFile, deleteFile, getFileDataUrl } from '@/lib/services/file-service'
import { formatFileSize } from '@/lib/utils/file-utils'

interface UploadedFile {
    id: string
    name: string
    path: string
    size: number
    mimeType: string
}

interface FileUploadProps {
    value?: UploadedFile[]
    onChange?: (files: UploadedFile[]) => void
    maxFiles?: number
    maxSizeMB?: number
    accept?: string
    subFolder?: string
    disabled?: boolean
    label?: string
    helperText?: string
}

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image size={20} className="text-blue-500" />
    if (mimeType.includes('pdf')) return <FileText size={20} className="text-red-500" />
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText size={20} className="text-blue-600" />
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileText size={20} className="text-green-600" />
    return <File size={20} className="text-gray-500" />
}

export default function FileUpload({
    value = [],
    onChange,
    maxFiles = 5,
    maxSizeMB = 10,
    accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
    subFolder = 'attachments',
    disabled = false,
    label = 'Attachments',
    helperText
}: FileUploadProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewName, setPreviewName] = useState<string>('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        if (value.length + files.length > maxFiles) {
            toast.error(`Maximum ${maxFiles} files allowed`)
            return
        }

        setIsUploading(true)
        const newFiles: UploadedFile[] = []

        for (const file of Array.from(files)) {
            // Check size
            if (file.size > maxSizeMB * 1024 * 1024) {
                toast.error(`File "${file.name}" exceeds ${maxSizeMB}MB limit`)
                continue
            }

            try {
                // Convert to base64
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => {
                        const result = reader.result as string
                        // Remove data URL prefix
                        const base64Data = result.split(',')[1]
                        resolve(base64Data)
                    }
                    reader.onerror = reject
                    reader.readAsDataURL(file)
                })

                // Upload file
                const result = await uploadFile(base64, file.name, subFolder)
                if (result.success && result.file) {
                    newFiles.push({
                        id: result.file.id,
                        name: result.file.originalName,
                        path: result.file.path,
                        size: result.file.size,
                        mimeType: result.file.mimeType
                    })
                } else {
                    toast.error(`Failed to upload "${file.name}": ${result.error}`)
                }
            } catch (error: any) {
                toast.error(`Failed to upload "${file.name}"`)
                console.error('Upload error:', error)
            }
        }

        if (newFiles.length > 0) {
            onChange?.([...value, ...newFiles])
            toast.success(`${newFiles.length} file(s) uploaded`)
        }

        setIsUploading(false)
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [value, onChange, maxFiles, maxSizeMB, subFolder])

    const handleRemove = useCallback(async (file: UploadedFile) => {
        // Always drop the metadata first so the user can clear phantom rows
        // even if the underlying file is already missing.
        onChange?.(value.filter(f => f.id !== file.id))
        try {
            const result = await deleteFile(file.path)
            if (result.success) {
                toast.success('File removed')
            } else {
                // Soft-fail: metadata is gone but warn that the on-disk file may linger
                toast.warning(result.error || 'ลบไฟล์บนเซิร์ฟเวอร์ไม่สำเร็จ')
            }
        } catch (error) {
            toast.warning('ลบไฟล์บนเซิร์ฟเวอร์ไม่สำเร็จ')
        }
    }, [value, onChange])

    const handlePreview = useCallback(async (file: UploadedFile) => {
        if (file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') {
            try {
                const result = await getFileDataUrl(file.path)
                if (result.success && result.dataUrl) {
                    setPreviewUrl(result.dataUrl)
                    setPreviewName(file.name)
                } else {
                    toast.error('Failed to load preview')
                }
            } catch (error) {
                toast.error('Failed to load preview')
            }
        } else {
            toast.info('Preview not available for this file type')
        }
    }, [])

    const handleDownload = useCallback(async (file: UploadedFile) => {
        try {
            const result = await getFileDataUrl(file.path)
            if (result.success && result.dataUrl) {
                const link = document.createElement('a')
                link.href = result.dataUrl
                link.download = file.name
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            } else {
                toast.error('Failed to download file')
            }
        } catch (error) {
            toast.error('Failed to download file')
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        if (disabled || isUploading) return

        const files = e.dataTransfer.files
        if (files.length > 0) {
            const event = {
                target: { files }
            } as unknown as React.ChangeEvent<HTMLInputElement>
            handleFileSelect(event)
        }
    }, [disabled, isUploading, handleFileSelect])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
    }, [])

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}

            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`
                    relative border-2 border-dashed rounded-lg p-4 text-center transition-colors
                    ${disabled || isUploading ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-gray-300 hover:border-blue-400 cursor-pointer'}
                `}
                onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    multiple={maxFiles > 1}
                    onChange={handleFileSelect}
                    disabled={disabled || isUploading}
                    className="hidden"
                />

                {isUploading ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-500">Uploading...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                        <Upload size={24} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                            Drop files here or click to browse
                        </span>
                        <span className="text-xs text-gray-400">
                            Max {maxFiles} files, {maxSizeMB}MB each
                        </span>
                    </div>
                )}
            </div>

            {helperText && (
                <p className="text-xs text-gray-500">{helperText}</p>
            )}

            {/* File List */}
            {value.length > 0 && (
                <div className="space-y-2 mt-3">
                    {value.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200"
                        >
                            {getFileIcon(file.mimeType)}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700 truncate">
                                    {file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formatFileSize(file.size)}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                {(file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') && (
                                    <button
                                        type="button"
                                        onClick={() => handlePreview(file)}
                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Preview"
                                    >
                                        <Eye size={16} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleDownload(file)}
                                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                    title="Download"
                                >
                                    <Download size={16} />
                                </button>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(file)}
                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Remove"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Preview Modal */}
            {previewUrl && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
                    onClick={() => setPreviewUrl(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 border-b">
                            <span className="text-sm font-medium truncate">{previewName}</span>
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                            {previewUrl.includes('image/') ? (
                                <img src={previewUrl} alt={previewName} className="max-w-full h-auto" />
                            ) : (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-[70vh]"
                                    title={previewName}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
