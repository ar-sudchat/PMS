'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import FileUpload from '@/components/ui/FileUpload'
import {
    getRequestAttachments,
    addRequestAttachment,
    deleteRequestAttachment
} from '@/lib/actions/project-request-actions'
import { toast } from 'sonner'
import { FileIcon, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface ProjectRequestAttachmentsProps {
    requestId: string
    canEdit: boolean
    currentUserId: string
}

export function ProjectRequestAttachments({
    requestId,
    canEdit,
    currentUserId
}: ProjectRequestAttachmentsProps) {
    const [attachments, setAttachments] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)

    useEffect(() => {
        loadAttachments()
    }, [requestId])

    const loadAttachments = async () => {
        setIsLoading(true)
        try {
            const data = await getRequestAttachments(requestId)
            setAttachments(data)
        } catch (error) {
            console.error('Failed to load attachments', error)
            toast.error('โหลดไฟล์แนบไม่สำเร็จ')
        } finally {
            setIsLoading(false)
        }
    }

    const handleUploadComplete = async (files: any[]) => {
        setIsUploading(true)
        let successCount = 0

        try {
            for (const file of files) {
                // FileUpload returns: { id, name, path, size, mimeType }
                const result = await addRequestAttachment({
                    requestId,
                    fileName: file.name,
                    filePath: file.path,
                    fileSize: file.size,
                    fileType: file.mimeType,
                    uploadedBy: currentUserId
                })

                if (result.success) {
                    successCount++
                }
            }

            if (successCount > 0) {
                toast.success(`อัปโหลดสำเร็จ ${successCount} ไฟล์`)
                loadAttachments()
            }
        } catch (error) {
            toast.error('อัปโหลดล้มเหลว')
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันลบไฟล์นี้?')) return

        try {
            const result = await deleteRequestAttachment(id)
            if (result.success) {
                toast.success('ลบไฟล์เรียบร้อย')
                setAttachments(prev => prev.filter(a => a.id !== id))
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('ลบไฟล์ล้มเหลว')
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">เอกสารแนบ ({attachments.length})</h3>
            </div>

            {canEdit && (
                <div className="p-4 border border-dashed rounded-lg bg-gray-50">
                    <FileUpload
                        value={[]} // Always empty so we capture new files in onChange
                        onChange={handleUploadComplete}
                        label="อัปโหลดไฟล์แนบ"
                        subFolder="project-requests"
                    />
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
            ) : attachments.length === 0 ? (
                <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg">
                    ไม่มีเอกสารแนบ
                </div>
            ) : (
                <div className="grid gap-2">
                    {attachments.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-blue-100 rounded text-blue-600">
                                    <FileIcon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium truncate text-sm">{file.file_name}</p>
                                    <p className="text-xs text-gray-500">
                                        {format(new Date(file.created_at), 'dd/MM/yyyy HH:mm', { locale: th })} • {(file.file_size / 1024).toFixed(0)} KB • โดย {file.uploaded_by_name}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <a
                                    href={`/api/files/${file.file_path.split('/').map(encodeURIComponent).join('/')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="ดูไฟล์"
                                    className="inline-flex items-center justify-center h-9 w-9 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                                {canEdit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDelete(file.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
