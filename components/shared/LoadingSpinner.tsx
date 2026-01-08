import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "sm" | "md" | "lg"
    fullScreen?: boolean
}

const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
}

export function LoadingSpinner({
    size = "md",
    fullScreen = false,
    className,
    ...props
}: LoadingSpinnerProps) {
    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />
            </div>
        )
    }

    return (
        <div className={cn("flex justify-center", className)} {...props}>
            <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />
        </div>
    )
}
