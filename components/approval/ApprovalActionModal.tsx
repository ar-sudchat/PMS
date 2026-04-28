'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2, XCircle, Loader2, Paperclip, FileText, Image as ImageIcon, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { approveRequest, rejectRequest, fetchDocumentAttachments } from '@/lib/actions/approval-actions'
import { getFileDataUrl } from '@/lib/services/file-service'
import { formatFileSize } from '@/lib/utils/file-utils'

interface UploadedFile {
    id: string
    name: string
    size: number
    type?: string
    mimeType?: string
    path: string
    uploadedAt?: string
}

interface FileWithPreview extends UploadedFile {
    dataUrl?: string
    loading?: boolean
    error?: boolean
}

interface ApprovalActionModalProps {
    open: boolean
    onClose: () => void
    instanceId: string
    documentId?: string
    documentTitle?: string
    documentType?: string
    action: 'approve' | 'reject'
    onSuccess?: () => void
}

export function ApprovalActionModal({
    open,
    onClose,
    instanceId,
    documentId,
    documentTitle,
    documentType,
    action,
    onSuccess
}: ApprovalActionModalProps) {
    const [comments, setComments] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [attachments, setAttachments] = useState<FileWithPreview[]>([])
    const [loadingAttachments, setLoadingAttachments] = useState(false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)

    const isApprove = action === 'approve'

    // Get file type helper
    const getFileType = (file: UploadedFile): string => {
        return file.type || file.mimeType || ''
    }

    // Filter image attachments
    const imageAttachments = attachments.filter(f => getFileType(f).startsWith('image/'))
    const otherAttachments = attachments.filter(f => !getFileType(f).startsWith('image/'))

    // Load attachments and their previews when modal opens
    useEffect(() => {
        if (open && documentId && documentType) {
            loadAttachmentsWithPreviews()
        }
        // Reset state when modal closes
        if (!open) {
            setAttachments([])
            setCurrentImageIndex(0)
            setFullscreenImage(null)
            setZoom(1)
            setRotation(0)
            setComments('')
        }
    }, [open, documentId, documentType])

    const loadAttachmentsWithPreviews = async () => {
        if (!documentId || !documentType) return

        setLoadingAttachments(true)
        try {
            const result = await fetchDocumentAttachments(documentId, documentType)
            if (result.success && result.attachments) {
                // Initialize attachments with loading state for images
                const initialAttachments: FileWithPreview[] = result.attachments.map(file => ({
                    ...file,
                    loading: getFileType(file).startsWith('image/'),
                    dataUrl: undefined,
                    error: false
                }))
                setAttachments(initialAttachments)

                // Load previews for image files with bounded concurrency to avoid
                // hammering the server (and blowing up memory) when a doc has many images.
                const imageFiles = result.attachments.filter((f: UploadedFile) => getFileType(f).startsWith('image/'))
                const CONCURRENCY = 3
                const queue = [...imageFiles]

                const loadOne = async (file: UploadedFile) => {
                    try {
                        const previewResult = await getFileDataUrl(file.path)
                        if (previewResult.success && previewResult.dataUrl) {
                            setAttachments(prev => prev.map(f =>
                                f.id === file.id
                                    ? { ...f, dataUrl: previewResult.dataUrl, loading: false }
                                    : f
                            ))
                        } else {
                            setAttachments(prev => prev.map(f =>
                                f.id === file.id
                                    ? { ...f, loading: false, error: true }
                                    : f
                            ))
                        }
                    } catch {
                        setAttachments(prev => prev.map(f =>
                            f.id === file.id
                                ? { ...f, loading: false, error: true }
                                : f
                        ))
                    }
                }

                const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
                    while (queue.length > 0) {
                        const file = queue.shift()
                        if (file) await loadOne(file)
                    }
                })
                await Promise.all(workers)
            }
        } catch (error) {
            console.error('Failed to load attachments:', error)
        } finally {
            setLoadingAttachments(false)
        }
    }

    const handleDownloadFile = async (file: FileWithPreview) => {
        try {
            let dataUrl = file.dataUrl
            if (!dataUrl) {
                const result = await getFileDataUrl(file.path)
                if (result.success && result.dataUrl) {
                    dataUrl = result.dataUrl
                } else {
                    toast.error('Failed to download file')
                    return
                }
            }
            const link = document.createElement('a')
            link.href = dataUrl
            link.download = file.name
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            toast.error('Failed to download file')
        }
    }

    const handleSubmit = async () => {
        if (!isApprove && !comments.trim()) {
            toast.error('Please provide a reason for rejection')
            return
        }

        setIsLoading(true)
        try {
            const result = isApprove
                ? await approveRequest(instanceId, comments || undefined)
                : await rejectRequest(instanceId, comments)

            if (result.success) {
                toast.success(isApprove ? 'Approved successfully' : 'Rejected successfully')
                setComments('')
                onClose()
                onSuccess?.()
            } else {
                toast.error(result.error || 'Operation failed')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % imageAttachments.length)
    }

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + imageAttachments.length) % imageAttachments.length)
    }

    const openFullscreen = (dataUrl: string) => {
        setFullscreenImage(dataUrl)
        setZoom(1)
        setRotation(0)
    }

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3))
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5))
    const handleRotate = () => setRotation(prev => (prev + 90) % 360)

    if (!open) return null

    const currentImage = imageAttachments[currentImageIndex]

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${isApprove ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex items-center gap-2">
                            {isApprove ? (
                                <CheckCircle2 size={24} className="text-green-600" />
                            ) : (
                                <XCircle size={24} className="text-red-600" />
                            )}
                            <h2 className={`text-lg font-semibold ${isApprove ? 'text-green-800' : 'text-red-800'}`}>
                                {isApprove ? 'Approve Request' : 'Reject Request'}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* Document Info */}
                        {(documentTitle || documentType) && (
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                {documentType && (
                                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                        {documentType}
                                    </div>
                                )}
                                {documentTitle && (
                                    <div className="text-sm font-medium text-slate-700">
                                        {documentTitle}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Loading Attachments */}
                        {loadingAttachments && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 size={24} className="animate-spin text-slate-400" />
                                <span className="ml-2 text-sm text-slate-500">Loading documents...</span>
                            </div>
                        )}

                        {/* Image Gallery */}
                        {!loadingAttachments && imageAttachments.length > 0 && (
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon size={14} className="text-blue-500" />
                                        <span className="text-xs font-medium text-slate-600">
                                            Images ({imageAttachments.length})
                                        </span>
                                    </div>
                                    {imageAttachments.length > 1 && (
                                        <span className="text-xs text-slate-400">
                                            {currentImageIndex + 1} / {imageAttachments.length}
                                        </span>
                                    )}
                                </div>

                                {/* Main Image Display */}
                                <div className="relative bg-slate-100 aspect-video flex items-center justify-center">
                                    {currentImage?.loading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 size={32} className="animate-spin text-slate-400" />
                                            <span className="text-sm text-slate-500">Loading image...</span>
                                        </div>
                                    ) : currentImage?.error ? (
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <ImageIcon size={32} />
                                            <span className="text-sm">Failed to load image</span>
                                        </div>
                                    ) : currentImage?.dataUrl ? (
                                        <>
                                            <img
                                                src={currentImage.dataUrl}
                                                alt={currentImage.name}
                                                className="max-w-full max-h-full object-contain cursor-zoom-in"
                                                onClick={() => openFullscreen(currentImage.dataUrl!)}
                                            />
                                            {/* Navigation Arrows */}
                                            {imageAttachments.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={prevImage}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                                                    >
                                                        <ChevronLeft size={20} />
                                                    </button>
                                                    <button
                                                        onClick={nextImage}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                                                    >
                                                        <ChevronRight size={20} />
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    ) : null}
                                </div>

                                {/* Image Info & Thumbnails */}
                                <div className="p-3 border-t border-slate-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{currentImage?.name}</p>
                                            <p className="text-xs text-slate-400">{currentImage ? formatFileSize(currentImage.size) : ''}</p>
                                        </div>
                                        <button
                                            onClick={() => currentImage && handleDownloadFile(currentImage)}
                                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Download"
                                        >
                                            <Download size={16} />
                                        </button>
                                    </div>

                                    {/* Thumbnails */}
                                    {imageAttachments.length > 1 && (
                                        <div className="flex gap-2 overflow-x-auto pt-2">
                                            {imageAttachments.map((img, index) => (
                                                <button
                                                    key={img.id}
                                                    onClick={() => setCurrentImageIndex(index)}
                                                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                                        index === currentImageIndex
                                                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {img.loading ? (
                                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                                            <Loader2 size={16} className="animate-spin text-slate-400" />
                                                        </div>
                                                    ) : img.dataUrl ? (
                                                        <img
                                                            src={img.dataUrl}
                                                            alt={img.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                                            <ImageIcon size={16} className="text-slate-400" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Other Attachments (non-image) */}
                        {!loadingAttachments && otherAttachments.length > 0 && (
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                    <Paperclip size={14} className="text-slate-500" />
                                    <span className="text-xs font-medium text-slate-600">
                                        Other Files ({otherAttachments.length})
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {otherAttachments.map((file) => (
                                        <div key={file.id} className="px-3 py-2 flex items-center gap-2 hover:bg-slate-50">
                                            <FileText size={16} className="text-slate-500" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-700 truncate">{file.name}</p>
                                                <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDownloadFile(file)}
                                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                                title="Download"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* No Attachments */}
                        {!loadingAttachments && attachments.length === 0 && (
                            <div className="text-center py-4 text-slate-400 text-sm">
                                No attachments
                            </div>
                        )}

                        {/* Confirmation Message */}
                        <p className="text-sm text-slate-600">
                            {isApprove
                                ? 'Are you sure you want to approve this request?'
                                : 'Are you sure you want to reject this request? Please provide a reason.'}
                        </p>

                        {/* Comments */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Comments {!isApprove && <span className="text-red-500">*</span>}
                            </label>
                            <textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg transition-all focus:ring-2 outline-none resize-none ${
                                    isApprove
                                        ? 'border-slate-200 focus:border-green-500 focus:ring-green-500/20'
                                        : 'border-slate-200 focus:border-red-500 focus:ring-red-500/20'
                                }`}
                                rows={3}
                                placeholder={isApprove ? 'Optional comments...' : 'Reason for rejection...'}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
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
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed ${
                                isApprove
                                    ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                            }`}
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : isApprove ? (
                                <CheckCircle2 size={16} />
                            ) : (
                                <XCircle size={16} />
                            )}
                            {isApprove ? 'Approve' : 'Reject'}
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Fullscreen Image Modal */}
            {fullscreenImage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
                    onClick={() => setFullscreenImage(null)}
                >
                    {/* Controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut size={20} />
                        </button>
                        <span className="px-2 text-white text-sm">{Math.round(zoom * 100)}%</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn size={20} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRotate(); }}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                            title="Rotate"
                        >
                            <RotateCw size={20} />
                        </button>
                        <button
                            onClick={() => setFullscreenImage(null)}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors ml-2"
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Image */}
                    <div
                        className="overflow-auto max-w-full max-h-full p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={fullscreenImage}
                            alt="Preview"
                            className="transition-transform duration-200"
                            style={{
                                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                transformOrigin: 'center center'
                            }}
                        />
                    </div>
                </div>
            )}
        </AnimatePresence>
    )
}
