import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, id, ...props }, ref) => {
        // Generate random ID if not provided for accessibility
        const generatedId = React.useId()
        const checkboxId = id || generatedId

        return (
            <div className="flex items-center space-x-2">
                <div className="relative flex items-center">
                    <input
                        type="checkbox"
                        id={checkboxId}
                        className={cn(
                            "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-background checked:bg-primary checked:text-primary-foreground",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                    <Check className="h-3 w-3 absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-primary-foreground left-0.5" />
                </div>
                {label && (
                    <label
                        htmlFor={checkboxId}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none cursor-pointer"
                    >
                        {label}
                    </label>
                )}
            </div>
        )
    }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
