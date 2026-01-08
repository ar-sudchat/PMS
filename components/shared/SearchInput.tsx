import * as React from "react"
import { Search, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/use-debounce" // We will need to create this hook or implement logic inline

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onSearch: (value: string) => void
    isLoading?: boolean
    shortcut?: string
}

export function SearchInput({
    value: propValue,
    onChange,
    onSearch,
    isLoading,
    shortcut,
    className,
    placeholder = "Search...",
    ...props
}: SearchInputProps) {
    // If controlled/uncontrolled hybrid complexity is high, simplify to controlled for this demo
    const [value, setValue] = React.useState(propValue ? String(propValue) : "")

    // Update local state if prop changes
    React.useEffect(() => {
        if (propValue !== undefined) setValue(String(propValue))
    }, [propValue])

    // Debounce logic
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (propValue === undefined) {
                // Only fire if uncontrolled or if we want to bubble up the debounced value behavior
                onSearch(value)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [value, onSearch, propValue])

    const handleClear = () => {
        setValue("")
        onSearch("")
        if (onChange) {
            // @ts-ignore - quick fix to simulate event
            onChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setValue(newValue)
        if (onChange) onChange(e)
    }

    return (
        <div className="relative w-full">
            <Input
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className={cn("pr-20", className)} // Space for right actions
                leftIcon={<Search className="h-4 w-4" />}
                {...props}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : value ? (
                    <button onClick={handleClear} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                ) : null}

                {shortcut && !value && (
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        {shortcut}
                    </kbd>
                )}
            </div>
        </div>
    )
}
