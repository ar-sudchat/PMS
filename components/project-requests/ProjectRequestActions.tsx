'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
    approveProjectRequest,
    rejectProjectRequest,
    requestRevision,
    convertToProject
} from '@/lib/actions/project-request-actions'
import { Check, X, RotateCcw, FolderPlus, Loader2 } from 'lucide-react'

interface ProjectRequestActionsProps {
    request: any
    currentUserId: string
    canApprove: boolean
}

export function ProjectRequestActions({
    request,
    currentUserId,
    canApprove
}: ProjectRequestActionsProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showApproveDialog, setShowApproveDialog] = useState(false)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [showRevisionDialog, setShowRevisionDialog] = useState(false)
    const [showConvertDialog, setShowConvertDialog] = useState(false)
    const [comments, setComments] = useState('')

    const handleApprove = async () => {
        console.log('[handleApprove] Starting approval for request:', request.id)
        setIsLoading(true)
        const result = await approveProjectRequest(request.id, currentUserId, comments)
        console.log('[handleApprove] Result:', result)

        if (result.success) {
            toast.success('อนุมัติคำขอเรียบร้อย')
            setShowApproveDialog(false)
            router.refresh()
        } else {
            // Show error and keep dialog open
            toast.error(result.error || 'เกิดข้อผิดพลาดในการอนุมัติ', {
                duration: 5000,
                position: 'top-center'
            })
            alert(`ไม่สามารถอนุมัติได้\n\nสาเหตุ: ${result.error}`)
        }
        setIsLoading(false)
    }

    const handleReject = async () => {
        if (!comments.trim()) {
            toast.error('กรุณาระบุเหตุผล')
            return
        }

        setIsLoading(true)
        const result = await rejectProjectRequest(request.id, currentUserId, comments)

        if (result.success) {
            toast.success('ปฏิเสธคำขอเรียบร้อย')
            setShowRejectDialog(false)
            router.refresh()
        } else {
            toast.error(result.error)
        }
        setIsLoading(false)
    }

    const handleRevision = async () => {
        if (!comments.trim()) {
            toast.error('กรุณาระบุเหตุผล')
            return
        }

        setIsLoading(true)
        const result = await requestRevision(request.id, currentUserId, comments)

        if (result.success) {
            toast.success('ส่งกลับแก้ไขเรียบร้อย')
            setShowRevisionDialog(false)
            router.refresh()
        } else {
            toast.error(result.error)
        }
        setIsLoading(false)
    }

    const handleConvert = async () => {
        setIsLoading(true)
        const result = await convertToProject(request.id, currentUserId)

        if (result.success) {
            toast.success(`สร้าง Project เรียบร้อย: ${result.projectCode || ''}`)
            setShowConvertDialog(false)
            router.refresh() // Refresh current page to show updated status
        } else {
            toast.error(result.error)
        }
        setIsLoading(false)
    }

    return (
        <>
            {/* Action Buttons */}
            <div className="flex gap-2">
                {/* Pending - Show Approve/Reject/Revision */}
                {request.status === 'PENDING' && canApprove && (
                    <>
                        <Button onClick={() => setShowApproveDialog(true)} className="bg-green-600 hover:bg-green-700">
                            <Check className="h-4 w-4 mr-2" />
                            อนุมัติ
                        </Button>
                        <Button onClick={() => setShowRevisionDialog(true)} variant="outline" className="border-orange-500 text-orange-500">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            ส่งกลับแก้ไข
                        </Button>
                        <Button onClick={() => setShowRejectDialog(true)} variant="danger">
                            <X className="h-4 w-4 mr-2" />
                            ปฏิเสธ
                        </Button>
                    </>
                )}

                {/* Approved - Show Convert to Project */}
                {request.status === 'APPROVED' && (
                    <Button onClick={() => setShowConvertDialog(true)}>
                        <FolderPlus className="h-4 w-4 mr-2" />
                        สร้าง Project
                    </Button>
                )}
            </div>

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ยืนยันการอนุมัติ</DialogTitle>
                        <DialogDescription>
                            คุณต้องการอนุมัติคำขอ &quot;{request.title}&quot; ใช่หรือไม่?
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="ความคิดเห็น (ถ้ามี)"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleApprove} disabled={isLoading} className="bg-green-600">
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            อนุมัติ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ยืนยันการปฏิเสธ</DialogTitle>
                        <DialogDescription>
                            กรุณาระบุเหตุผลในการปฏิเสธคำขอ
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="เหตุผลในการปฏิเสธ *"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={4}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleReject} disabled={isLoading} variant="danger">
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            ปฏิเสธ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revision Dialog */}
            <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ส่งกลับแก้ไข</DialogTitle>
                        <DialogDescription>
                            กรุณาระบุสิ่งที่ต้องการให้แก้ไข
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="สิ่งที่ต้องแก้ไข *"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={4}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRevisionDialog(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleRevision} disabled={isLoading} className="bg-orange-500 hover:bg-orange-600">
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            ส่งกลับแก้ไข
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Convert Dialog */}
            <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>สร้าง Project</DialogTitle>
                        <DialogDescription>
                            ยืนยันการสร้าง Project จากคำขอ &quot;{request.title}&quot;?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2 text-sm">
                        <p><strong>ลูกค้า:</strong> {request.customer_name || '-'}</p>
                        <p><strong>งบประมาณ:</strong> {request.estimated_budget?.toLocaleString() || '-'} บาท</p>
                        <p><strong>Man-day:</strong> {request.estimated_mandays || '-'}</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleConvert} disabled={isLoading}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            สร้าง Project
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
