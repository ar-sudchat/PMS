import * as React from "react"
import { Switch as HeadlessSwitch } from "@headlessui/react"
import { cn } from "@/lib/utils"

export interface SwitchProps {
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
    label?: string
    className?: string
}

export function Switch({ checked, onChange, disabled, label, className }: SwitchProps) {
    return (
        <HeadlessSwitch.Group as="div" className="flex items-center">
            <HeadlessSwitch
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className={cn(
                    checked ? 'bg-primary' : 'bg-input',
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
            >
                <span className="sr-only">Use setting</span>
                <span
                    aria-hidden="true"
                    className={cn(
                        checked ? 'translate-x-5' : 'translate-x-0',
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out'
                    )}
                />
            </HeadlessSwitch>
            {label && (
                <HeadlessSwitch.Label className="ml-3 text-sm font-medium leading-none cursor-pointer">
                    {label}
                </HeadlessSwitch.Label>
            )}
        </HeadlessSwitch.Group>
    )
}
