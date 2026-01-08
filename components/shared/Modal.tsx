import Link from "next/link"
import React, { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ModalProps {
    open: boolean
    onClose: () => void
    title?: string
    subtitle?: string
    children: React.ReactNode
    footer?: React.ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    showExpandButton?: boolean
    closeOnOverlayClick?: boolean
    closeOnEsc?: boolean
}

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-full m-4 h-[calc(100vh-2rem)]',
}

export function Modal({
    open,
    onClose,
    title,
    subtitle,
    children,
    footer,
    size = 'md',
    showExpandButton = false,
    closeOnOverlayClick = true,
    closeOnEsc = true,
}: ModalProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const currentSize = isExpanded ? 'full' : size

    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={closeOnOverlayClick ? onClose : () => { }}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel
                                className={cn(
                                    'w-full transform rounded-2xl bg-background p-6 text-left align-middle shadow-xl transition-all',
                                    sizeClasses[currentSize],
                                    currentSize === 'full' && 'flex flex-col'
                                )}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        {title && (
                                            <Dialog.Title
                                                as="h3"
                                                className="text-lg font-medium leading-6 text-foreground"
                                            >
                                                {title}
                                            </Dialog.Title>
                                        )}
                                        {subtitle && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {subtitle}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {showExpandButton && (
                                            <button
                                                onClick={() => setIsExpanded(!isExpanded)}
                                                className="text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-muted transition-colors"
                                            >
                                                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                            </button>
                                        )}
                                        <button
                                            onClick={onClose}
                                            className="text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-muted transition-colors"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className={cn("flex-1 overflow-auto", currentSize === 'full' && "min-h-0")}>
                                    {children}
                                </div>

                                {footer && (
                                    <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                                        {footer}
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
