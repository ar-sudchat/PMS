import { KeyboardEvent, useRef, useCallback } from 'react'

/**
 * Hook for Enter key navigation between form fields
 * Usage:
 *   const { formRef, handleKeyDown } = useEnterKeyNavigation()
 *   <form ref={formRef}>
 *     <input data-field="0" onKeyDown={(e) => handleKeyDown(e, 0)} />
 *     <input data-field="1" onKeyDown={(e) => handleKeyDown(e, 1)} />
 *   </form>
 */
export function useEnterKeyNavigation() {
    const formRef = useRef<HTMLFormElement | HTMLDivElement>(null)

    const handleKeyDown = useCallback((
        e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
        currentIndex: number
    ) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()

            // Find next focusable element
            const nextIndex = currentIndex + 1
            const nextInput = formRef.current?.querySelector(
                `[data-field="${nextIndex}"]`
            ) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null

            if (nextInput && !nextInput.disabled) {
                nextInput.focus()
                if ('select' in nextInput && typeof nextInput.select === 'function') {
                    nextInput.select()
                }
            }
        }
    }, [])

    return { formRef, handleKeyDown }
}

/**
 * Simpler version: just finds next sibling input
 */
export function focusNextInput(
    e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    containerRef: React.RefObject<HTMLElement | null>
) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()

        const currentTarget = e.currentTarget
        const container = containerRef.current
        if (!container) return

        // Get all focusable inputs in order
        const inputs = Array.from(container.querySelectorAll(
            'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled]), select:not([disabled])'
        )) as HTMLElement[]

        const currentIdx = inputs.indexOf(currentTarget)
        if (currentIdx !== -1 && currentIdx < inputs.length - 1) {
            const nextInput = inputs[currentIdx + 1]
            nextInput.focus()
            if ('select' in nextInput && typeof (nextInput as HTMLInputElement).select === 'function') {
                (nextInput as HTMLInputElement).select()
            }
        }
    }
}
