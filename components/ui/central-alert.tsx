"use client"

import React, { createContext, useContext, useState, useCallback, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
    AlertTriangle,
    CheckCircle2,
    Info,
    XCircle,
    HelpCircle,
    X,
    Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ==================== Types ====================

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'prompt'

export interface AlertButton {
    text: string
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
    onClick?: () => void | Promise<void>
    autoClose?: boolean
}

export interface AlertOptions {
    type?: AlertType
    title: string
    message?: string | React.ReactNode
    icon?: React.ReactNode
    buttons?: AlertButton[]
    // For confirm dialogs
    confirmText?: string
    cancelText?: string
    onConfirm?: () => void | Promise<void>
    onCancel?: () => void
    // For prompt dialogs
    inputPlaceholder?: string
    inputDefaultValue?: string
    inputType?: 'text' | 'textarea' | 'password' | 'email' | 'number'
    onPromptSubmit?: (value: string) => void | Promise<void>
    // Behavior
    closeOnOverlayClick?: boolean
    closeOnEsc?: boolean
    showCloseButton?: boolean
    size?: 'sm' | 'md' | 'lg'
}

interface AlertState extends AlertOptions {
    isOpen: boolean
    isLoading: boolean
    inputValue: string
}

interface AlertContextType {
    // Basic alerts
    alert: (options: AlertOptions | string) => Promise<boolean>
    success: (title: string, message?: string) => Promise<boolean>
    error: (title: string, message?: string) => Promise<boolean>
    warning: (title: string, message?: string) => Promise<boolean>
    info: (title: string, message?: string) => Promise<boolean>
    // Confirm dialog (replaces window.confirm)
    confirm: (title: string, message?: string, options?: Partial<AlertOptions>) => Promise<boolean>
    // Prompt dialog (replaces window.prompt)
    prompt: (title: string, options?: Partial<AlertOptions>) => Promise<string | null>
    // Close current alert
    close: () => void
}

// ==================== Styles ====================

const typeStyles: Record<AlertType, {
    icon: React.ElementType
    iconColor: string
    bgColor: string
    borderColor: string
}> = {
    success: {
        icon: CheckCircle2,
        iconColor: 'text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800',
    },
    error: {
        icon: XCircle,
        iconColor: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800',
    },
    warning: {
        icon: AlertTriangle,
        iconColor: 'text-amber-500',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
    },
    info: {
        icon: Info,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
    },
    confirm: {
        icon: HelpCircle,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
    },
    prompt: {
        icon: HelpCircle,
        iconColor: 'text-purple-500',
        bgColor: 'bg-purple-50 dark:bg-purple-950/30',
        borderColor: 'border-purple-200 dark:border-purple-800',
    },
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
}

const buttonVariantClasses: Record<NonNullable<AlertButton['variant']>, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
}

// ==================== Context ====================

const AlertContext = createContext<AlertContextType | null>(null)

// ==================== Hook ====================

export function useAlert(): AlertContextType {
    const context = useContext(AlertContext)
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider')
    }
    return context
}

// ==================== Provider ====================

const defaultState: AlertState = {
    isOpen: false,
    isLoading: false,
    inputValue: '',
    type: 'info',
    title: '',
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AlertState>(defaultState)
    const [resolveRef, setResolveRef] = useState<{
        resolve: (value: boolean | string | null) => void
    } | null>(null)

    const close = useCallback(() => {
        setState(prev => ({ ...prev, isOpen: false }))
        setTimeout(() => {
            setState(defaultState)
            setResolveRef(null)
        }, 200)
    }, [])

    const showAlert = useCallback((options: AlertOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({
                ...defaultState,
                ...options,
                isOpen: true,
                inputValue: options.inputDefaultValue || '',
            })
            setResolveRef({ resolve: resolve as (value: boolean | string | null) => void })
        })
    }, [])

    const alert = useCallback((options: AlertOptions | string): Promise<boolean> => {
        if (typeof options === 'string') {
            return showAlert({ title: options, type: 'info' })
        }
        return showAlert(options)
    }, [showAlert])

    const success = useCallback((title: string, message?: string): Promise<boolean> => {
        return showAlert({ type: 'success', title, message })
    }, [showAlert])

    const error = useCallback((title: string, message?: string): Promise<boolean> => {
        return showAlert({ type: 'error', title, message })
    }, [showAlert])

    const warning = useCallback((title: string, message?: string): Promise<boolean> => {
        return showAlert({ type: 'warning', title, message })
    }, [showAlert])

    const info = useCallback((title: string, message?: string): Promise<boolean> => {
        return showAlert({ type: 'info', title, message })
    }, [showAlert])

    const confirm = useCallback((
        title: string,
        message?: string,
        options?: Partial<AlertOptions>
    ): Promise<boolean> => {
        return showAlert({
            type: 'confirm',
            title,
            message,
            confirmText: options?.confirmText || 'ยืนยัน',
            cancelText: options?.cancelText || 'ยกเลิก',
            ...options,
        })
    }, [showAlert])

    const prompt = useCallback((
        title: string,
        options?: Partial<AlertOptions>
    ): Promise<string | null> => {
        return new Promise((resolve) => {
            setState({
                ...defaultState,
                type: 'prompt',
                title,
                inputPlaceholder: options?.inputPlaceholder || '',
                inputDefaultValue: options?.inputDefaultValue || '',
                inputType: options?.inputType || 'text',
                confirmText: options?.confirmText || 'ตกลง',
                cancelText: options?.cancelText || 'ยกเลิก',
                ...options,
                isOpen: true,
                inputValue: options?.inputDefaultValue || '',
            })
            setResolveRef({ resolve: resolve as (value: boolean | string | null) => void })
        })
    }, [])

    const handleConfirm = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }))

        try {
            if (state.type === 'prompt') {
                if (state.onPromptSubmit) {
                    await state.onPromptSubmit(state.inputValue)
                }
                resolveRef?.resolve(state.inputValue)
            } else if (state.type === 'confirm') {
                if (state.onConfirm) {
                    await state.onConfirm()
                }
                resolveRef?.resolve(true)
            } else {
                resolveRef?.resolve(true)
            }
        } catch (err) {
            console.error('Alert action error:', err)
        } finally {
            close()
        }
    }, [state, resolveRef, close])

    const handleCancel = useCallback(() => {
        if (state.onCancel) {
            state.onCancel()
        }
        if (state.type === 'prompt') {
            resolveRef?.resolve(null)
        } else {
            resolveRef?.resolve(false)
        }
        close()
    }, [state, resolveRef, close])

    const handleButtonClick = useCallback(async (button: AlertButton) => {
        setState(prev => ({ ...prev, isLoading: true }))
        try {
            if (button.onClick) {
                await button.onClick()
            }
            if (button.autoClose !== false) {
                resolveRef?.resolve(true)
                close()
            } else {
                setState(prev => ({ ...prev, isLoading: false }))
            }
        } catch (err) {
            console.error('Button action error:', err)
            setState(prev => ({ ...prev, isLoading: false }))
        }
    }, [resolveRef, close])

    const contextValue: AlertContextType = {
        alert,
        success,
        error,
        warning,
        info,
        confirm,
        prompt,
        close,
    }

    const style = typeStyles[state.type || 'info']
    const Icon = state.icon ? null : style.icon

    return (
        <AlertContext.Provider value={contextValue}>
            {children}

            <Transition appear show={state.isOpen} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-[100]"
                    onClose={() => {
                        if (state.closeOnOverlayClick === false) return
                        // สำหรับ confirm/prompt ให้ใช้ handleCancel
                        // สำหรับ alert ปกติให้ใช้ handleConfirm
                        if (state.type === 'confirm' || state.type === 'prompt') {
                            handleCancel()
                        } else {
                            handleConfirm()
                        }
                    }}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel
                                    className={cn(
                                        'w-full transform rounded-xl bg-background shadow-2xl transition-all border',
                                        sizeClasses[state.size || 'sm']
                                    )}
                                >
                                    {/* Close button */}
                                    {state.showCloseButton !== false && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                // สำหรับ confirm/prompt ให้ใช้ handleCancel เพื่อ resolve false/null
                                                // สำหรับ alert ปกติให้ใช้ handleConfirm เพื่อ resolve true
                                                if (state.type === 'confirm' || state.type === 'prompt') {
                                                    handleCancel()
                                                } else {
                                                    handleConfirm()
                                                }
                                            }}
                                            className="absolute right-3 top-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-50 cursor-pointer"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}

                                    <div className="p-6">
                                        {/* Icon */}
                                        <div className="flex justify-center mb-4">
                                            <div className={cn(
                                                'p-3 rounded-full',
                                                style.bgColor
                                            )}>
                                                {state.icon || (Icon && <Icon className={cn('h-8 w-8', style.iconColor)} />)}
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <Dialog.Title className="text-lg font-semibold text-center text-foreground mb-2">
                                            {state.title}
                                        </Dialog.Title>

                                        {/* Message */}
                                        {state.message && (
                                            <div className="text-sm text-muted-foreground text-center mb-4">
                                                {state.message}
                                            </div>
                                        )}

                                        {/* Prompt Input */}
                                        {state.type === 'prompt' && (
                                            <div className="mb-4">
                                                {state.inputType === 'textarea' ? (
                                                    <textarea
                                                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                                        rows={3}
                                                        placeholder={state.inputPlaceholder}
                                                        value={state.inputValue}
                                                        onChange={(e) => setState(prev => ({ ...prev, inputValue: e.target.value }))}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <input
                                                        type={state.inputType || 'text'}
                                                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                        placeholder={state.inputPlaceholder}
                                                        value={state.inputValue}
                                                        onChange={(e) => setState(prev => ({ ...prev, inputValue: e.target.value }))}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleConfirm()
                                                            }
                                                        }}
                                                        autoFocus
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {/* Buttons */}
                                        <div className="flex gap-3 justify-center relative z-50">
                                            {state.buttons ? (
                                                // Custom buttons
                                                state.buttons.map((button, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleButtonClick(button)
                                                        }}
                                                        disabled={state.isLoading}
                                                        className={cn(
                                                            'px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer',
                                                            buttonVariantClasses[button.variant || 'primary']
                                                        )}
                                                    >
                                                        {state.isLoading ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            button.text
                                                        )}
                                                    </button>
                                                ))
                                            ) : state.type === 'confirm' || state.type === 'prompt' ? (
                                                // Confirm/Prompt buttons
                                                <>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleCancel()
                                                        }}
                                                        disabled={state.isLoading}
                                                        className="min-w-[80px]"
                                                    >
                                                        {state.cancelText || 'ยกเลิก'}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleConfirm()
                                                        }}
                                                        disabled={state.isLoading}
                                                        className="min-w-[80px]"
                                                    >
                                                        {state.isLoading ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            state.confirmText || 'ยืนยัน'
                                                        )}
                                                    </Button>
                                                </>
                                            ) : (
                                                // Default OK button
                                                <Button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleConfirm()
                                                    }}
                                                    disabled={state.isLoading}
                                                    className="min-w-[100px]"
                                                >
                                                    {state.isLoading ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        'ตกลง'
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </AlertContext.Provider>
    )
}

// ==================== Standalone Alert Component (for inline use) ====================

export interface InlineAlertProps {
    type?: 'success' | 'error' | 'warning' | 'info'
    title?: string
    children?: React.ReactNode
    className?: string
    dismissible?: boolean
    onDismiss?: () => void
}

export function InlineAlert({
    type = 'info',
    title,
    children,
    className,
    dismissible = false,
    onDismiss,
}: InlineAlertProps) {
    const style = typeStyles[type]
    const Icon = style.icon

    return (
        <div
            role="alert"
            className={cn(
                'relative flex gap-3 rounded-lg border p-4',
                style.bgColor,
                style.borderColor,
                className
            )}
        >
            <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', style.iconColor)} />
            <div className="flex-1">
                {title && (
                    <h5 className="font-medium text-foreground mb-1">{title}</h5>
                )}
                {children && (
                    <div className="text-sm text-muted-foreground">{children}</div>
                )}
            </div>
            {dismissible && (
                <button
                    onClick={onDismiss}
                    className="flex-shrink-0 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}

export default AlertProvider
