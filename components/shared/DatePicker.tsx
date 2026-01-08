"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { Popover, Transition } from "@headlessui/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import 'react-day-picker/dist/style.css' // We might need to style manually to match shadcn if css module not working perfectly, but this is a start

export interface DatePickerProps {
    value?: Date
    onChange?: (date: Date | undefined) => void
    label?: string
    placeholder?: string
    disabled?: boolean
    error?: string
}

export function DatePicker({ value, onChange, label, placeholder = "Pick a date", disabled, error }: DatePickerProps) {
    return (
        <div className="flex flex-col gap-1.5 ">
            {label && (
                <label className={cn("text-sm font-medium", error && "text-destructive")}>
                    {label}
                </label>
            )}
            <Popover className="relative">
                <Popover.Button as={React.Fragment}>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !value && "text-muted-foreground",
                            error && "border-destructive text-destructive"
                        )}
                        disabled={disabled}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value ? format(value, "PPP") : <span>{placeholder}</span>}
                    </Button>
                </Popover.Button>

                <Transition
                    as={React.Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1"
                >
                    <Popover.Panel className="absolute z-10 mt-1 w-auto rounded-md border bg-popover p-0 text-popover-foreground shadow-md">
                        <DayPicker
                            mode="single"
                            selected={value}
                            onSelect={onChange}
                            initialFocus
                            className="p-3"
                            classNames={{
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                day_today: "bg-accent text-accent-foreground",
                            }}
                        />
                    </Popover.Panel>
                </Transition>
            </Popover>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    )
}
