"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: string
    onValueChange?: (value: string) => void
    name?: string
}

const RadioGroupContext = React.createContext<{
    value?: string
    onValueChange?: (value: string) => void
    name?: string
}>({})

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
    ({ className, value, onValueChange, name, children, ...props }, ref) => {
        const generatedName = React.useId()

        return (
            <RadioGroupContext.Provider value={{ value, onValueChange, name: name || generatedName }}>
                <div
                    ref={ref}
                    role="radiogroup"
                    className={cn("grid gap-2", className)}
                    {...props}
                >
                    {children}
                </div>
            </RadioGroupContext.Provider>
        )
    }
)
RadioGroup.displayName = "RadioGroup"

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
    ({ className, value, id, ...props }, ref) => {
        const context = React.useContext(RadioGroupContext)
        const generatedId = React.useId()
        const itemId = id || generatedId

        return (
            <div className="relative flex items-center">
                <input
                    type="radio"
                    id={itemId}
                    ref={ref}
                    name={context.name}
                    value={value}
                    checked={context.value === value}
                    onChange={(e) => {
                        if (e.target.checked && context.onValueChange) {
                            context.onValueChange(value)
                        }
                    }}
                    className={cn(
                        "h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-background checked:bg-primary checked:border-primary cursor-pointer",
                        className
                    )}
                    {...props}
                />
                <div className="absolute h-2 w-2 rounded-full bg-primary-foreground pointer-events-none opacity-0 peer-checked:opacity-100 left-1 top-1"
                    style={{
                        opacity: context.value === value ? 1 : 0
                    }}
                />
            </div>
        )
    }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
