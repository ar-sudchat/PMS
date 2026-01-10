"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ConfirmDeleteModalProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    isLoading?: boolean
}

export function ConfirmDeleteModal({ open, onClose, onConfirm, title, message, isLoading }: ConfirmDeleteModalProps) {
    return (
        <Modal open={open} onClose={onClose} title={title} size="sm">
            <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-slate-600">{message}</p>
            </div>

            <div className="flex justify-center gap-3 mt-4">
                <Button variant="outline" onClick={onClose} disabled={isLoading}>ยกเลิก</Button>
                <Button variant="danger" onClick={onConfirm} disabled={isLoading}>ลบ</Button>
            </div>
        </Modal>
    )
}
