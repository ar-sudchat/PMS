"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface FormattedDateProps {
    date: string | Date
    format?: "date" | "time" | "datetime" | "relative"
    className?: string
    showSkeleton?: boolean
}

export function FormattedDate({
    date,
    format = "datetime",
    className,
    showSkeleton = true,
}: FormattedDateProps) {
    const [formattedDate, setFormattedDate] = useState<string>("")
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)

        const dateObj = new Date(date)

        if (isNaN(dateObj.getTime())) {
            setFormattedDate("Invalid date")
            return
        }

        let formatted = ""

        switch (format) {
            case "date":
                formatted = dateObj.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                })
                break

            case "time":
                formatted = dateObj.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                })
                break

            case "datetime":
                formatted = dateObj.toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                })
                break

            case "relative":
                formatted = getRelativeTime(dateObj)
                break

            default:
                formatted = dateObj.toLocaleString()
        }

        setFormattedDate(formatted)
    }, [date, format])

    // Skeleton while server rendering
    if (!isMounted) {
        if (showSkeleton) {
            return (
                <span
                    className={cn(
                        "inline-block bg-slate-200 dark:bg-slate-700 rounded animate-pulse",
                        className
                    )}
                >
                    <span className="invisible">Jan 1, 2025</span>
                </span>
            )
        }
        return <span className={className}>--</span>
    }

    return <span className={className}>{formattedDate}</span>
}

// Relative time helper
function getRelativeTime(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)
    const diffInWeeks = Math.floor(diffInDays / 7)
    const diffInMonths = Math.floor(diffInDays / 30)

    if (diffInSeconds < 60) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInDays < 7) return `${diffInDays}d ago`
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`
    if (diffInMonths < 12) return `${diffInMonths}mo ago`

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

export default FormattedDate
