import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
    content: string
    children: React.ReactNode
    side?: "top" | "bottom" | "left" | "right"
    delay?: number
}

// Simple CSS-only tooltip for lightweight usage standard
export function Tooltip({ children, content, side = "top", delay = 200 }: TooltipProps) {
    return (
        <div className="group relative inline-block">
            {children}
            <div
                className={cn(
                    "invisible absolute z-50 rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-all group-hover:visible group-hover:opacity-100",
                    side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
                    side === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-2",
                    side === "left" && "right-full top-1/2 -translate-y-1/2 mr-2",
                    side === "right" && "left-full top-1/2 -translate-y-1/2 ml-2",
                )}
                style={{ transitionDelay: `${delay}ms` }}
            >
                {content}
            </div>
        </div>
    )
}
