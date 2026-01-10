'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: number
    max?: number
    indicatorClassName?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({ className, value = 0, max = 100, indicatorClassName, ...props }, ref) => {
        const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

        return (
            <div
                ref={ref}
                className={cn(
                    'relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700',
                    className
                )}
                {...props}
            >
                <div
                    className={cn(
                        'h-full transition-all duration-300 ease-in-out rounded-full',
                        percentage >= 100
                            ? 'bg-green-500'
                            : percentage >= 50
                                ? 'bg-blue-500'
                                : 'bg-blue-400',
                        indicatorClassName
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        )
    }
)

Progress.displayName = 'Progress'

export { Progress }
