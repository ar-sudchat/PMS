import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, onCheckedChange, onChange, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange?.(e)
            onCheckedChange?.(e.target.checked)
        }

        return (
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    ref={ref}
                    onChange={handleChange}
                    {...props}
                />
                <div
                    className={cn(
                        "w-11 h-6 bg-muted rounded-full peer",
                        "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                        "peer-checked:bg-primary",
                        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                        "after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
                        "after:bg-background after:border after:border-muted after:rounded-full",
                        "after:h-5 after:w-5 after:transition-all",
                        "peer-checked:after:translate-x-5 peer-checked:after:border-primary",
                        className
                    )}
                />
            </label>
        )
    }
)
Switch.displayName = "Switch"

export { Switch }
