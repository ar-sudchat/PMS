"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SimpleTooltipProps {
    content: React.ReactNode
    children: React.ReactNode
    side?: "top" | "bottom" | "left" | "right"
    delay?: number
}

// Simple CSS-only tooltip for lightweight usage standard
function SimpleTooltip({ children, content, side = "top", delay = 200 }: SimpleTooltipProps) {
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

// ============================================
// Radix UI Tooltip Components (shadcn/ui style)
// ============================================

interface TooltipContextValue {
    open: boolean
    setOpen: (open: boolean) => void
}

const TooltipContext = React.createContext<TooltipContextValue | undefined>(undefined)

interface TooltipProviderProps {
    children: React.ReactNode
    delayDuration?: number
    skipDelayDuration?: number
}

function TooltipProvider({ children, delayDuration = 200 }: TooltipProviderProps) {
    return <>{children}</>
}

interface TooltipProps {
    children: React.ReactNode
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    delayDuration?: number
}

function Tooltip({ children, open: controlledOpen, defaultOpen = false, onOpenChange, delayDuration = 200 }: TooltipProps) {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const setOpen = React.useCallback((value: boolean) => {
        if (controlledOpen === undefined) {
            setInternalOpen(value)
        }
        onOpenChange?.(value)
    }, [controlledOpen, onOpenChange])

    const handleOpen = React.useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => setOpen(true), delayDuration)
    }, [delayDuration, setOpen])

    const handleClose = React.useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setOpen(false)
    }, [setOpen])

    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    return (
        <TooltipContext.Provider value={{ open, setOpen }}>
            <div
                className="relative inline-flex"
                onMouseEnter={handleOpen}
                onMouseLeave={handleClose}
                onFocus={handleOpen}
                onBlur={handleClose}
            >
                {children}
            </div>
        </TooltipContext.Provider>
    )
}

interface TooltipTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
    asChild?: boolean
}

const TooltipTrigger = React.forwardRef<HTMLDivElement, TooltipTriggerProps>(
    ({ children, asChild, ...props }, ref) => {
        if (asChild && React.isValidElement(children)) {
            return React.cloneElement(children as React.ReactElement<any>, { ref, ...props })
        }
        return (
            <div ref={ref} {...props}>
                {children}
            </div>
        )
    }
)
TooltipTrigger.displayName = "TooltipTrigger"

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
    side?: "top" | "bottom" | "left" | "right"
    sideOffset?: number
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
    ({ className, children, side = "top", sideOffset = 4, ...props }, ref) => {
        const context = React.useContext(TooltipContext)

        if (!context?.open) return null

        return (
            <div
                ref={ref}
                className={cn(
                    "absolute z-50 overflow-hidden rounded-md bg-slate-900 px-3 py-1.5 text-xs text-slate-50 shadow-md",
                    "animate-in fade-in-0 zoom-in-95",
                    side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
                    side === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-2",
                    side === "left" && "right-full top-1/2 -translate-y-1/2 mr-2",
                    side === "right" && "left-full top-1/2 -translate-y-1/2 ml-2",
                    className
                )}
                style={{ marginTop: side === "bottom" ? sideOffset : undefined, marginBottom: side === "top" ? sideOffset : undefined }}
                {...props}
            >
                {children}
            </div>
        )
    }
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, SimpleTooltip }
