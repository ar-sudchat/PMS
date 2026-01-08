import { Fragment, useState, useEffect } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Option {
    value: string | number
    label: string
}

export interface SmartComboboxProps {
    options?: Option[]
    value?: Option | null
    onChange: (value: Option | null) => void
    placeholder?: string
    label?: string
    error?: string
    required?: boolean
    disabled?: boolean
    isLoading?: boolean

    // Dynamic props (simulated for now)
    tableName?: string
    onLookupClick?: () => void
}

export function SmartCombobox({
    options = [],
    value,
    onChange,
    placeholder = "Select option...",
    label,
    error,
    required,
    disabled,
    isLoading,
}: SmartComboboxProps) {
    const [query, setQuery] = useState('')

    const filteredOptions =
        query === ''
            ? options
            : options.filter((option) =>
                option.label
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .includes(query.toLowerCase().replace(/\s+/g, ''))
            )

    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && (
                <label
                    className={cn(
                        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                        error && "text-destructive",
                        required && "after:content-['*'] after:ml-0.5 after:text-destructive"
                    )}
                >
                    {label}
                </label>
            )}
            <Combobox value={value} onChange={onChange} disabled={disabled} nullable>
                <div className="relative mt-1">
                    <div className="relative w-full cursor-default overflow-hidden rounded-md border border-input bg-background text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm">
                        <Combobox.Input
                            className={cn(
                                "w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-foreground bg-transparent focus:ring-0 focus:outline-none",
                                error && "text-destructive placeholder:text-destructive/60"
                            )}
                            displayValue={(option: Option) => option?.label ?? ''}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={placeholder}
                        />
                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                                <ChevronsUpDown
                                    className="h-4 w-4 text-muted-foreground"
                                    aria-hidden="true"
                                />
                            )}
                        </Combobox.Button>
                    </div>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setQuery('')}
                    >
                        <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-popover py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                            {filteredOptions.length === 0 && query !== '' ? (
                                <div className="relative cursor-default select-none py-2 px-4 text-muted-foreground">
                                    Nothing found.
                                </div>
                            ) : (
                                filteredOptions.map((option) => (
                                    <Combobox.Option
                                        key={option.value}
                                        className={({ active }) =>
                                            cn(
                                                "relative cursor-default select-none py-2 pl-10 pr-4",
                                                active ? "bg-accent text-accent-foreground" : "text-popover-foreground"
                                            )
                                        }
                                        value={option}
                                    >
                                        {({ selected, active }) => (
                                            <>
                                                <span
                                                    className={cn(
                                                        "block truncate",
                                                        selected ? "font-medium" : "font-normal"
                                                    )}
                                                >
                                                    {option.label}
                                                </span>
                                                {selected ? (
                                                    <span
                                                        className={cn(
                                                            "absolute inset-y-0 left-0 flex items-center pl-3",
                                                            active ? "text-accent-foreground" : "text-primary"
                                                        )}
                                                    >
                                                        <Check className="h-4 w-4" aria-hidden="true" />
                                                    </span>
                                                ) : null}
                                            </>
                                        )}
                                    </Combobox.Option>
                                ))
                            )}
                        </Combobox.Options>
                    </Transition>
                </div>
            </Combobox>
            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}
        </div>
    )
}
