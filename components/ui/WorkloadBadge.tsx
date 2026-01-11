
import { cn } from "@/lib/utils"

interface WorkloadBadgeProps {
    assigned: number
    max: number
    className?: string
}

export function WorkloadBadge({ assigned, max, className }: WorkloadBadgeProps) {
    const percent = max > 0 ? Math.round((assigned / max) * 100) : 0

    let colorClass = 'bg-green-100 text-green-700'
    let icon = '🟢'

    if (percent > 80) {
        colorClass = 'bg-red-100 text-red-700'
        icon = '🔴'
    } else if (percent > 50) {
        colorClass = 'bg-yellow-100 text-yellow-700'
        icon = '🟡'
    }

    return (
        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs whitespace-nowrap", colorClass, className)}>
            <span className="text-[10px]">{icon}</span>
            <span>{assigned}h/{max}h</span>
        </div>
    )
}
