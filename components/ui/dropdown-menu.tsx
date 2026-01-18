"use client"

import * as React from "react"
import { Menu, Transition } from "@headlessui/react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const DropdownMenu = Menu

const DropdownMenuTrigger = Menu.Button

const DropdownMenuContent = ({
    className,
    align = "center",
    children,
    ...props
}: {
    className?: string
    align?: "start" | "center" | "end"
    children: React.ReactNode
}) => {
    const alignmentClasses = {
        start: "left-0 origin-top-left",
        center: "left-1/2 -translate-x-1/2 origin-top",
        end: "right-0 origin-top-right",
    }

    return (
        <Transition
            as={React.Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
        >
            <Menu.Items
                className={cn(
                    "absolute z-50 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
                    alignmentClasses[align],
                    className
                )}
                {...props}
            >
                <div className="py-1">{children}</div>
            </Menu.Items>
        </Transition>
    )
}

const DropdownMenuItem = ({
    className,
    children,
    onClick,
    ...props
}: {
    className?: string
    children: React.ReactNode
    onClick?: () => void
}) => {
    return (
        <Menu.Item>
            {({ active }) => (
                <button
                    type="button"
                    onClick={onClick}
                    className={cn(
                        active ? "bg-slate-100 text-slate-900" : "text-slate-700",
                        "group flex w-full items-center px-4 py-2 text-sm",
                        className
                    )}
                    {...props}
                >
                    {children}
                </button>
            )}
        </Menu.Item>
    )
}

const DropdownMenuSeparator = ({ className, ...props }: { className?: string }) => (
    <div className={cn("-mx-1 my-1 h-px bg-slate-100", className)} {...props} />
)

const DropdownMenuLabel = ({ className, ...props }: { className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("px-2 py-1.5 text-sm font-semibold text-slate-900", className)} {...props} />
)

const DropdownMenuCheckboxItem = ({
    className,
    children,
    checked,
    onCheckedChange,
    ...props
}: {
    className?: string
    children: React.ReactNode
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
}) => {
    return (
        <Menu.Item>
            {({ active }) => (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault()
                        onCheckedChange?.(!checked)
                    }}
                    className={cn(
                        active ? "bg-slate-100 text-slate-900" : "text-slate-700",
                        "group flex w-full items-center px-2 py-1.5 text-sm outline-none relative pl-8 select-none",
                        className
                    )}
                    {...props}
                >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        {checked && <Check className="h-4 w-4" />}
                    </span>
                    {children}
                </button>
            )}
        </Menu.Item>
    )
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuCheckboxItem,
}
