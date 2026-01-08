"use client";

import * as React from "react";
import {
    ChevronDown,
    X,
    Check,
    Search,
    Loader2,
    Plus,
    AlertCircle,
} from "lucide-react";

// ============================================
// Types
// ============================================

export interface ComboboxOption {
    value: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    image?: string;
    disabled?: boolean;
    group?: string;
    data?: any; // Additional data
}

export interface ComboboxGroup {
    label: string;
    options: ComboboxOption[];
}

export interface SmartComboboxProps {
    // Basic
    value?: string | string[];
    onChange?: (value: string | string[] | null) => void;
    options?: ComboboxOption[];
    placeholder?: string;

    // Modes
    multiple?: boolean;
    searchable?: boolean;
    clearable?: boolean;
    creatable?: boolean;
    disabled?: boolean;

    // Async
    async?: boolean;
    onSearch?: (query: string) => Promise<ComboboxOption[]>;
    debounceMs?: number;

    // Creatable
    onCreate?: (value: string) => Promise<ComboboxOption> | ComboboxOption;
    createLabel?: (query: string) => string;

    // Appearance
    size?: "sm" | "md" | "lg";
    error?: string;
    helperText?: string;
    label?: string;
    required?: boolean;

    // Custom Render
    renderOption?: (option: ComboboxOption, isSelected: boolean) => React.ReactNode;
    renderValue?: (option: ComboboxOption) => React.ReactNode;
    renderTag?: (option: ComboboxOption, onRemove: () => void) => React.ReactNode;

    // Loading
    isLoading?: boolean;
    loadingText?: string;

    // Empty
    emptyText?: string;

    // Groups
    grouped?: boolean;

    // Virtual Scroll
    virtualScroll?: boolean;
    maxHeight?: number;

    // Others
    name?: string;
    id?: string;
    className?: string;
    menuPlacement?: "top" | "bottom" | "auto";
}

// ============================================
// Styles
// ============================================

const sizes = {
    sm: {
        container: { minHeight: "36px", fontSize: "13px" },
        input: { padding: "6px 12px" },
        tag: { padding: "2px 8px", fontSize: "12px" },
        option: { padding: "8px 12px" },
    },
    md: {
        container: { minHeight: "42px", fontSize: "14px" },
        input: { padding: "10px 14px" },
        tag: { padding: "4px 10px", fontSize: "13px" },
        option: { padding: "10px 14px" },
    },
    lg: {
        container: { minHeight: "50px", fontSize: "15px" },
        input: { padding: "12px 16px" },
        tag: { padding: "6px 12px", fontSize: "14px" },
        option: { padding: "12px 16px" },
    },
};

const styles = {
    wrapper: {
        position: "relative" as const,
        width: "100%",
    },
    label: {
        display: "block",
        marginBottom: "6px",
        fontSize: "14px",
        fontWeight: 500,
        color: "#374151",
    },
    required: {
        color: "#ef4444",
        marginLeft: "4px",
    },
    container: {
        display: "flex",
        flexWrap: "wrap" as const,
        alignItems: "center",
        gap: "6px",
        width: "100%",
        background: "white",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#e2e8f0",
        borderRadius: "10px",
        cursor: "pointer",
        transition: "all 0.2s",
    },
    containerFocused: {
        borderColor: "#6366f1",
        boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.1)",
    },
    containerError: {
        borderColor: "#ef4444",
        boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.1)",
    },
    containerDisabled: {
        background: "#f8fafc",
        cursor: "not-allowed",
        opacity: 0.6,
    },
    input: {
        flex: 1,
        minWidth: "120px",
        border: "none",
        outline: "none",
        background: "transparent",
        fontSize: "inherit",
        color: "#1e293b",
    },
    inputDisabled: {
        cursor: "not-allowed",
    },
    placeholder: {
        color: "#94a3b8",
    },
    tag: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: "#eff6ff",
        color: "#3b82f6",
        borderRadius: "6px",
        fontWeight: 500,
        maxWidth: "200px",
    },
    tagRemove: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px",
        borderRadius: "4px",
        cursor: "pointer",
        transition: "background 0.15s",
    },
    actions: {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "0 8px",
    },
    actionButton: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px",
        background: "transparent",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        color: "#94a3b8",
        transition: "all 0.15s",
    },
    dropdown: {
        position: "absolute" as const,
        left: 0,
        right: 0,
        marginTop: "4px",
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
        zIndex: 50,
        overflow: "hidden",
    },
    dropdownTop: {
        bottom: "100%",
        marginTop: 0,
        marginBottom: "4px",
    },
    searchContainer: {
        padding: "8px",
        borderBottom: "1px solid #f1f5f9",
    },
    searchInput: {
        width: "100%",
        padding: "8px 12px 8px 36px",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        fontSize: "14px",
        outline: "none",
        background: "#f8fafc",
    },
    searchIcon: {
        position: "absolute" as const,
        left: "20px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "#94a3b8",
        pointerEvents: "none" as const,
    },
    optionsList: {
        maxHeight: "280px",
        overflowY: "auto" as const,
        padding: "4px",
    },
    option: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.15s",
        color: "#1e293b",
    },
    optionSelected: {
        background: "#eff6ff",
        color: "#3b82f6",
    },
    optionHighlighted: {
        background: "#f8fafc",
    },
    optionDisabled: {
        opacity: 0.5,
        cursor: "not-allowed",
    },
    optionContent: {
        flex: 1,
        minWidth: 0,
    },
    optionLabel: {
        fontWeight: 500,
        whiteSpace: "nowrap" as const,
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    optionDescription: {
        fontSize: "12px",
        color: "#64748b",
        marginTop: "2px",
        whiteSpace: "nowrap" as const,
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    optionImage: {
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        objectFit: "cover" as const,
    },
    optionIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        background: "#f1f5f9",
        borderRadius: "8px",
        color: "#64748b",
    },
    checkIcon: {
        marginLeft: "auto",
        color: "#3b82f6",
    },
    groupLabel: {
        padding: "8px 12px 4px",
        fontSize: "11px",
        fontWeight: 600,
        color: "#94a3b8",
        textTransform: "uppercase" as const,
        letterSpacing: "0.5px",
    },
    emptyState: {
        padding: "24px",
        textAlign: "center" as const,
        color: "#94a3b8",
    },
    loadingState: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "24px",
        color: "#94a3b8",
    },
    createOption: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 14px",
        margin: "4px",
        borderRadius: "8px",
        cursor: "pointer",
        color: "#6366f1",
        fontWeight: 500,
        background: "#f5f3ff",
        transition: "all 0.15s",
    },
    error: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginTop: "6px",
        fontSize: "13px",
        color: "#ef4444",
    },
    helperText: {
        marginTop: "6px",
        fontSize: "13px",
        color: "#64748b",
    },
};

// ============================================
// Hooks
// ============================================

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState(value);

    React.useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

// Click outside hook
function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
    React.useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) return;
            handler();
        };

        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);

        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler]);
}

// ============================================
// Main Component
// ============================================

export function SmartCombobox({
    value,
    onChange,
    options = [],
    placeholder = "Select...",
    multiple = false,
    searchable = true,
    clearable = true,
    creatable = false,
    disabled = false,
    async = false,
    onSearch,
    debounceMs = 300,
    onCreate,
    createLabel = (query) => `Create "${query}"`,
    size = "md",
    error,
    helperText,
    label,
    required = false,
    renderOption,
    renderValue,
    renderTag,
    isLoading = false,
    loadingText = "Loading...",
    emptyText = "No options found",
    grouped = false,
    virtualScroll = false,
    maxHeight = 280,
    name,
    id,
    className,
    menuPlacement = "auto",
}: SmartComboboxProps) {
    // Refs
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // State
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const [asyncOptions, setAsyncOptions] = React.useState<ComboboxOption[]>([]);
    const [asyncLoading, setAsyncLoading] = React.useState(false);
    const [creating, setCreating] = React.useState(false);
    const [dropdownPosition, setDropdownPosition] = React.useState<"top" | "bottom">("bottom");

    // Debounced search
    const debouncedSearch = useDebounce(searchQuery, debounceMs);

    // Close on click outside
    useClickOutside(containerRef, () => setIsOpen(false));

    // Get current options
    const currentOptions = async ? asyncOptions : options;

    // Get selected values as array
    const selectedValues = React.useMemo(() => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
    }, [value]);

    // Get selected options
    const selectedOptions = React.useMemo(() => {
        return selectedValues
            .map((v) => currentOptions.find((opt) => opt.value === v))
            .filter(Boolean) as ComboboxOption[];
    }, [selectedValues, currentOptions]);

    // Filter options
    const filteredOptions = React.useMemo(() => {
        if (!searchQuery || async) return currentOptions;

        const query = searchQuery.toLowerCase();
        return currentOptions.filter(
            (opt) =>
                opt.label.toLowerCase().includes(query) ||
                opt.description?.toLowerCase().includes(query)
        );
    }, [currentOptions, searchQuery, async]);

    // Group options
    const groupedOptions = React.useMemo(() => {
        if (!grouped) return null;

        const groups: Record<string, ComboboxOption[]> = {};
        filteredOptions.forEach((opt) => {
            const group = opt.group || "Other";
            if (!groups[group]) groups[group] = [];
            groups[group].push(opt);
        });

        return Object.entries(groups).map(([label, options]) => ({ label, options }));
    }, [filteredOptions, grouped]);

    // Flat list for keyboard navigation
    const flatOptions = React.useMemo(() => {
        return filteredOptions.filter((opt) => !opt.disabled);
    }, [filteredOptions]);

    // Check if can create
    const canCreate = React.useMemo(() => {
        if (!creatable || !searchQuery.trim()) return false;
        return !currentOptions.some(
            (opt) => opt.label.toLowerCase() === searchQuery.toLowerCase()
        );
    }, [creatable, searchQuery, currentOptions]);

    // Async search effect
    React.useEffect(() => {
        if (!async || !onSearch || !isOpen) return;

        const search = async () => {
            setAsyncLoading(true);
            try {
                const results = await onSearch(debouncedSearch);
                setAsyncOptions(results);
            } catch (err) {
                console.error("Search error:", err);
                setAsyncOptions([]);
            } finally {
                setAsyncLoading(false);
            }
        };

        search();
    }, [async, onSearch, debouncedSearch, isOpen]);

    // Calculate dropdown position
    React.useEffect(() => {
        if (!isOpen || !containerRef.current || menuPlacement !== "auto") return;

        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        setDropdownPosition(spaceBelow < 300 && spaceAbove > spaceBelow ? "top" : "bottom");
    }, [isOpen, menuPlacement]);

    // Handlers
    const handleOpen = () => {
        if (disabled) return;
        setIsOpen(true);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
    };

    const handleClose = () => {
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
    };

    const handleSelect = (option: ComboboxOption) => {
        if (option.disabled) return;

        if (multiple) {
            const newValues = selectedValues.includes(option.value)
                ? selectedValues.filter((v) => v !== option.value)
                : [...selectedValues, option.value];
            onChange?.(newValues);
        } else {
            onChange?.(option.value);
            handleClose();
        }

        setSearchQuery("");
    };

    const handleRemove = (optionValue: string) => {
        if (multiple) {
            onChange?.(selectedValues.filter((v) => v !== optionValue));
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange?.(multiple ? [] : null);
        setSearchQuery("");
    };

    const handleCreate = async () => {
        if (!onCreate || !searchQuery.trim() || creating) return;

        setCreating(true);
        try {
            const newOption = await onCreate(searchQuery.trim());
            if (async) {
                setAsyncOptions((prev) => [...prev, newOption]);
            }
            handleSelect(newOption);
        } catch (err) {
            console.error("Create error:", err);
        } finally {
            setCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                if (!isOpen) {
                    handleOpen();
                } else {
                    setHighlightedIndex((prev) =>
                        prev < flatOptions.length - 1 ? prev + 1 : 0
                    );
                }
                break;

            case "ArrowUp":
                e.preventDefault();
                if (isOpen) {
                    setHighlightedIndex((prev) =>
                        prev > 0 ? prev - 1 : flatOptions.length - 1
                    );
                }
                break;

            case "Enter":
                e.preventDefault();
                if (isOpen && highlightedIndex >= 0) {
                    handleSelect(flatOptions[highlightedIndex]);
                } else if (canCreate) {
                    handleCreate();
                } else if (!isOpen) {
                    handleOpen();
                }
                break;

            case "Escape":
                handleClose();
                break;

            case "Backspace":
                if (!searchQuery && multiple && selectedValues.length > 0) {
                    handleRemove(selectedValues[selectedValues.length - 1]);
                }
                break;
        }
    };

    // Size styles
    const sizeStyles = sizes[size];

    // Render option content
    const renderOptionContent = (option: ComboboxOption, isSelected: boolean) => {
        if (renderOption) {
            return renderOption(option, isSelected);
        }

        return (
            <>
                {option.image && (
                    <img src={option.image} alt="" style={styles.optionImage} />
                )}
                {option.icon && !option.image && (
                    <div style={styles.optionIcon}>{option.icon}</div>
                )}
                <div style={styles.optionContent}>
                    <div style={styles.optionLabel}>{option.label}</div>
                    {option.description && (
                        <div style={styles.optionDescription}>{option.description}</div>
                    )}
                </div>
                {isSelected && <Check size={18} style={styles.checkIcon} />}
            </>
        );
    };

    // Render tag
    const renderTagContent = (option: ComboboxOption, onRemove: () => void) => {
        if (renderTag) {
            return renderTag(option, onRemove);
        }

        return (
            <span style={{ ...styles.tag, ...sizeStyles.tag }}>
                {option.image && (
                    <img
                        src={option.image}
                        alt=""
                        style={{ width: "18px", height: "18px", borderRadius: "4px" }}
                    />
                )}
                <span
                    style={{
                        maxWidth: "150px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {renderValue ? renderValue(option) : option.label}
                </span>
                <span
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    style={styles.tagRemove}
                >
                    <X size={14} />
                </span>
            </span>
        );
    };

    return (
        <div style={styles.wrapper} className={className}>
            {/* Label */}
            {label && (
                <label style={styles.label} htmlFor={id}>
                    {label}
                    {required && <span style={styles.required}>*</span>}
                </label>
            )}

            {/* Container */}
            <div
                ref={containerRef}
                style={{
                    ...styles.container,
                    ...sizeStyles.container,
                    ...(isOpen ? styles.containerFocused : {}),
                    ...(error ? styles.containerError : {}),
                    ...(disabled ? styles.containerDisabled : {}),
                }}
                onClick={handleOpen}
                onKeyDown={handleKeyDown}
                tabIndex={disabled ? -1 : 0}
            >
                {/* Tags (multiple) */}
                {multiple && selectedOptions.length > 0 && (
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                            padding: "6px 0 6px 12px",
                        }}
                    >
                        {selectedOptions.map((opt) => (
                            <React.Fragment key={opt.value}>
                                {renderTagContent(opt, () => handleRemove(opt.value))}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    id={id}
                    name={name}
                    value={searchable && isOpen ? searchQuery : ""}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                        multiple && selectedOptions.length > 0
                            ? ""
                            : !multiple && selectedOptions.length > 0
                                ? renderValue
                                    ? ""
                                    : selectedOptions[0].label
                                : placeholder
                    }
                    disabled={disabled}
                    readOnly={!searchable}
                    style={{
                        ...styles.input,
                        ...sizeStyles.input,
                        ...(disabled ? styles.inputDisabled : {}),
                        ...(!multiple &&
                            selectedOptions.length > 0 &&
                            !isOpen && { color: "#1e293b" }),
                    }}
                    autoComplete="off"
                />

                {/* Single value display */}
                {!multiple && selectedOptions.length > 0 && !isOpen && renderValue && (
                    <div style={{ ...sizeStyles.input, pointerEvents: "none" }}>
                        {renderValue(selectedOptions[0])}
                    </div>
                )}

                {/* Actions */}
                <div style={styles.actions}>
                    {/* Loading */}
                    {(isLoading || asyncLoading || creating) && (
                        <Loader2
                            size={18}
                            style={{ color: "#94a3b8", animation: "spin 1s linear infinite" }}
                        />
                    )}

                    {/* Clear */}
                    {clearable && selectedValues.length > 0 && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            style={styles.actionButton}
                        >
                            <X size={18} />
                        </button>
                    )}

                    {/* Chevron */}
                    <ChevronDown
                        size={18}
                        style={{
                            color: "#94a3b8",
                            transition: "transform 0.2s",
                            transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                        }}
                    />
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    style={{
                        ...styles.dropdown,
                        ...(dropdownPosition === "top" || menuPlacement === "top"
                            ? styles.dropdownTop
                            : {}),
                    }}
                >
                    {/* Search (if not inline) */}
                    {async && (
                        <div style={{ ...styles.searchContainer, position: "relative" }}>
                            <Search size={16} style={styles.searchIcon} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                style={styles.searchInput}
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Options */}
                    <div style={{ ...styles.optionsList, maxHeight }}>
                        {/* Loading */}
                        {asyncLoading && (
                            <div style={styles.loadingState}>
                                <Loader2
                                    size={20}
                                    style={{ animation: "spin 1s linear infinite" }}
                                />
                                <span>{loadingText}</span>
                            </div>
                        )}

                        {/* Empty */}
                        {!asyncLoading && filteredOptions.length === 0 && !canCreate && (
                            <div style={styles.emptyState}>{emptyText}</div>
                        )}

                        {/* Grouped */}
                        {!asyncLoading && grouped && groupedOptions && (
                            <>
                                {groupedOptions.map((group) => (
                                    <div key={group.label}>
                                        <div style={styles.groupLabel}>{group.label}</div>
                                        {group.options.map((option, index) => {
                                            const isSelected = selectedValues.includes(option.value);
                                            const isHighlighted =
                                                flatOptions[highlightedIndex]?.value === option.value;

                                            return (
                                                <div
                                                    key={option.value}
                                                    onClick={() => handleSelect(option)}
                                                    style={{
                                                        ...styles.option,
                                                        ...sizeStyles.option,
                                                        ...(isSelected ? styles.optionSelected : {}),
                                                        ...(isHighlighted ? styles.optionHighlighted : {}),
                                                        ...(option.disabled ? styles.optionDisabled : {}),
                                                    }}
                                                    onMouseEnter={() => {
                                                        const idx = flatOptions.findIndex(
                                                            (o) => o.value === option.value
                                                        );
                                                        setHighlightedIndex(idx);
                                                    }}
                                                >
                                                    {renderOptionContent(option, isSelected)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Flat list */}
                        {!asyncLoading && !grouped && (
                            <>
                                {filteredOptions.map((option, index) => {
                                    const isSelected = selectedValues.includes(option.value);
                                    const isHighlighted = highlightedIndex === index;

                                    return (
                                        <div
                                            key={option.value}
                                            onClick={() => handleSelect(option)}
                                            style={{
                                                ...styles.option,
                                                ...sizeStyles.option,
                                                ...(isSelected ? styles.optionSelected : {}),
                                                ...(isHighlighted ? styles.optionHighlighted : {}),
                                                ...(option.disabled ? styles.optionDisabled : {}),
                                            }}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                        >
                                            {renderOptionContent(option, isSelected)}
                                        </div>
                                    );
                                })}
                            </>
                        )}

                        {/* Create option */}
                        {canCreate && (
                            <div
                                onClick={handleCreate}
                                style={styles.createOption}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.background = "#ede9fe")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "#f5f3ff")
                                }
                            >
                                <Plus size={18} />
                                {createLabel(searchQuery)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={styles.error}>
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            {/* Helper text */}
            {helperText && !error && <div style={styles.helperText}>{helperText}</div>}

            {/* Spin animation */}
            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

export default SmartCombobox;
