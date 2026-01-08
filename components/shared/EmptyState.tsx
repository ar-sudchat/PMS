import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    description: string
    icon?: React.ReactNode
    action?: {
        label: string
        onClick: () => void
    }
}

export function EmptyState({
    title,
    description,
    icon,
    action,
    className,
    ...props
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50",
                className
            )}
            {...props}
        >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                {icon || <FileQuestion className="h-6 w-6 text-muted-foreground" />}
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                {description}
            </p>
            {action && (
                <Button onClick={action.onClick} variant="outline">
                    {action.label}
                </Button>
            )}
        </div>
    )
}
