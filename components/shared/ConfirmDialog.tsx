import { Modal } from "./Modal"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Info, CheckCircle } from "lucide-react"

export interface ConfirmDialogProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
    isLoading?: boolean
}

const variantStyles = {
    danger: { icon: AlertTriangle, color: "text-red-500", btnVariant: "danger" as const },
    warning: { icon: AlertTriangle, color: "text-amber-500", btnVariant: "primary" as const }, // Button variant generic, but functionality warning
    info: { icon: Info, color: "text-blue-500", btnVariant: "primary" as const },
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger",
    isLoading = false,
}: ConfirmDialogProps) {
    const { icon: Icon, color, btnVariant } = variantStyles[variant]

    const footer = (
        <>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
                {cancelText}
            </Button>
            <Button variant={btnVariant} onClick={onConfirm} isLoading={isLoading}>
                {confirmText}
            </Button>
        </>
    )

    return (
        <Modal open={open} onClose={onClose} size="sm" footer={footer}>
            <div className="flex flex-col items-center text-center">
                <div className={`p-3 rounded-full bg-muted mb-4`}>
                    <Icon className={`h-8 w-8 ${color}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground">{message}</p>
            </div>
        </Modal>
    )
}
