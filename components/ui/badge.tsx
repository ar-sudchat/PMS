import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                success:
                    "border-transparent bg-success text-white hover:bg-success/80",
                warning:
                    "border-transparent bg-warning text-white hover:bg-warning/80",
                info:
                    "border-transparent bg-blue-500 text-white hover:bg-blue-600",
                outline: "text-foreground",
            },
            size: {
                sm: "text-[10px] px-2 py-0.5",
                md: "text-xs px-2.5 py-0.5",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "md",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
    dot?: boolean
    removable?: boolean
    onRemove?: () => void
}

function Badge({ className, variant, size, dot, removable, onRemove, children, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
            {dot && <span className={cn("mr-1.5 flex h-2 w-2 rounded-full bg-current")} />}
            {children}
            {removable && onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="ml-1 rounded-full outline-none hover:bg-black/10 focus:ring-1 focus:ring-ring"
                >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove</span>
                </button>
            )}
        </div>
    )
}

export { Badge, badgeVariants }
