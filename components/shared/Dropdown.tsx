import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import { Link } from 'lucide-react' // Wait, I need generic link behavior? Or just onClick. User said onClick.

export interface DropdownItem {
    label: string
    icon?: React.ReactNode
    onClick?: () => void
    danger?: boolean
    disabled?: boolean
    divider?: boolean
    href?: string
}

export interface DropdownProps {
    trigger: React.ReactNode
    items: DropdownItem[]
    align?: 'left' | 'right'
}

export function Dropdown({ trigger, items, align = 'left' }: DropdownProps) {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button as={Fragment}>
                    {trigger}
                </Menu.Button>
            </div>
            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items
                    className={cn(
                        "absolute z-50 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-popover shadow-lg ring-1 ring-black/5 focus:outline-none",
                        align === "right" ? "right-0" : "left-0"
                    )}
                >
                    <div className="px-1 py-1">
                        {items.map((item, index) => (
                            <div key={index}>
                                {item.divider && <div className="h-px bg-muted my-1" />}
                                <Menu.Item disabled={item.disabled}>
                                    {({ active, disabled }) => (
                                        <button
                                            onClick={item.onClick}
                                            disabled={disabled}
                                            className={cn(
                                                "group flex w-full items-center rounded-md px-2 py-2 text-sm",
                                                active ? "bg-accent text-accent-foreground" : "text-popover-foreground",
                                                item.danger && "text-red-500 hover:text-red-600",
                                                disabled && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
                                            {item.label}
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        ))}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    )
}
