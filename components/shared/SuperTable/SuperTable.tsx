"use client";

import * as React from "react";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
    RowSelectionState,
    FilterFn,
    Column,
    Table,
    Header,
} from "@tanstack/react-table";
import {
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Download,
    Search,
    X,
    Filter,
    Columns3,
    Calendar,
    Check,
    FileSpreadsheet,
    FileText,
    MoreHorizontal,
    Eye,
    EyeOff,
    GripVertical,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { format, isWithinInterval, parseISO } from "date-fns";

// ============================================
// Types
// ============================================

export interface ColumnFilter {
    id: string;
    type: "text" | "select" | "date" | "dateRange" | "number" | "boolean";
    options?: { label: string; value: string }[]; // for select type
}

export interface SuperTableProps<TData> {
    data: TData[];
    columns: ColumnDef<TData, any>[];

    // Search
    searchPlaceholder?: string;
    enableGlobalFilter?: boolean;

    // Filtering
    enableColumnFilters?: boolean;
    columnFilters?: ColumnFilter[];

    // Sorting
    enableSorting?: boolean;
    defaultSorting?: SortingState;

    // Pagination
    enablePagination?: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];

    // Selection
    enableRowSelection?: boolean;
    onSelectionChange?: (selectedRows: TData[]) => void;

    // Column Features
    enableColumnVisibility?: boolean;
    enableColumnResizing?: boolean;
    defaultColumnVisibility?: VisibilityState;

    // Export
    enableExport?: boolean;
    exportFileName?: string;

    // Context Menu
    enableContextMenu?: boolean;
    contextMenuItems?: ContextMenuItem<TData>[];

    // Events
    onRowClick?: (row: TData) => void;
    onRowDoubleClick?: (row: TData) => void;

    // States
    isLoading?: boolean;
    emptyMessage?: string;
    emptyIcon?: React.ReactNode;

    // Sizing
    size?: 'sm' | 'md' | 'lg';

    // Custom Toolbar
    renderToolbarAction?: () => React.ReactNode;
}

export interface ContextMenuItem<TData> {
    label: string;
    icon?: React.ReactNode;
    onClick: (row: TData) => void;
    color?: string;
    divider?: boolean;
}

// ============================================
// Styles
// ============================================

const styles = {
    container: {
        width: "100%",
    },
    toolbar: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: "12px",
        marginBottom: "16px",
        alignItems: "center",
    },
    searchContainer: {
        position: "relative" as const,
        flex: "1 1 300px",
        maxWidth: "400px",
    },
    searchInput: {
        width: "100%",
        padding: "10px 16px 10px 42px",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        fontSize: "14px",
        outline: "none",
        transition: "all 0.2s",
        background: "white",
    },
    searchIcon: {
        position: "absolute" as const,
        left: "14px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "#94a3b8",
        pointerEvents: "none" as const,
    },
    clearButton: {
        position: "absolute" as const,
        right: "10px",
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#94a3b8",
        padding: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "4px",
    },
    toolbarButton: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 16px",
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "14px",
        color: "#64748b",
        fontWeight: 500 as const,
        transition: "all 0.2s",
        whiteSpace: "nowrap" as const,
    },
    toolbarButtonActive: {
        background: "#eff6ff",
        borderColor: "#3b82f6",
        color: "#3b82f6",
    },
    tableWrapper: {
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        background: "white",
        overflow: "hidden",
    },
    tableScroll: {
        overflowX: "auto" as const,
    },
    table: {
        width: "100%",
        borderCollapse: "collapse" as const,
        tableLayout: "fixed" as const,
        fontSize: "14px",
    },
    th: {
        padding: "10px 16px",
        textAlign: "left" as const,
        fontWeight: 600,
        color: "#64748b",
        background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
        whiteSpace: "nowrap" as const,
        userSelect: "none" as const,
        position: "relative" as const,
    },
    thContent: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    thSortable: {
        cursor: "pointer",
    },
    thResizer: {
        position: "absolute" as const,
        right: 0,
        top: 0,
        height: "100%",
        width: "5px",
        background: "transparent",
        cursor: "col-resize",
        userSelect: "none" as const,
        touchAction: "none" as const,
    },
    thResizerActive: {
        background: "#3b82f6",
    },
    td: {
        padding: "10px 16px",
        borderBottom: "1px solid #f1f5f9",
        color: "#1e293b",
    },
    checkbox: {
        width: "18px",
        height: "18px",
        cursor: "pointer",
        accentColor: "#6366f1",
    },
    pagination: {
        display: "flex",
        flexWrap: "wrap" as const,
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "16px",
        borderTop: "1px solid #e2e8f0",
        background: "#f8fafc",
    },
    pageInfo: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        color: "#64748b",
        fontSize: "14px",
    },
    pageControls: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    pageButton: {
        padding: "8px 12px",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        background: "white",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
        color: "#64748b",
    },
    pageButtonDisabled: {
        opacity: 0.5,
        cursor: "not-allowed",
    },
    pageSizeSelect: {
        padding: "8px 12px",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        background: "white",
        fontSize: "14px",
        color: "#64748b",
        cursor: "pointer",
    },
    dropdown: {
        position: "absolute" as const,
        top: "100%",
        right: 0,
        marginTop: "4px",
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
        zIndex: 50,
        minWidth: "200px",
        overflow: "hidden",
    },
    dropdownItem: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 14px",
        background: "transparent",
        border: "none",
        width: "100%",
        textAlign: "left" as const,
        cursor: "pointer",
        fontSize: "13px",
        color: "#475569",
        transition: "background 0.15s",
    },
    filterPanel: {
        padding: "16px",
        background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
    },
    filterRow: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: "12px",
        alignItems: "flex-end",
    },
    filterGroup: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "6px",
        minWidth: "180px",
    },
    filterLabel: {
        fontSize: "12px",
        fontWeight: 500,
        color: "#64748b",
    },
    filterInput: {
        padding: "8px 12px",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        fontSize: "13px",
        outline: "none",
        background: "white",
    },
    filterSelect: {
        padding: "8px 12px",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        fontSize: "13px",
        outline: "none",
        background: "white",
        cursor: "pointer",
    },
    contextMenu: {
        position: "fixed" as const,
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        zIndex: 1000,
        minWidth: "180px",
        overflow: "hidden",
        padding: "4px 0",
    },
    contextMenuItem: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 14px",
        background: "transparent",
        border: "none",
        width: "100%",
        textAlign: "left" as const,
        cursor: "pointer",
        fontSize: "13px",
        color: "#475569",
        transition: "background 0.15s",
    },
    skeleton: {
        height: "20px",
        background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        borderRadius: "4px",
    },
};

// ============================================
// Date Range Filter Function
// ============================================

const dateRangeFilter: FilterFn<any> = (row, columnId, filterValue) => {
    if (!filterValue || (!filterValue.from && !filterValue.to)) return true;

    const cellValue = row.getValue(columnId);
    if (!cellValue) return false;

    const date = typeof cellValue === "string" ? parseISO(cellValue) : (cellValue as Date);

    if (filterValue.from && filterValue.to) {
        return isWithinInterval(date, {
            start: parseISO(filterValue.from),
            end: parseISO(filterValue.to),
        });
    }

    if (filterValue.from) {
        return date >= parseISO(filterValue.from);
    }

    if (filterValue.to) {
        return date <= parseISO(filterValue.to);
    }

    return true;
};

// ============================================
// Sub Components
// ============================================

// Column Visibility Dropdown
function ColumnVisibilityDropdown<TData>({
    table,
    isOpen,
    onClose,
}: {
    table: Table<TData>;
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!isOpen) return null;

    return (
        <>
            <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={onClose} />
            <div style={styles.dropdown}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                        Toggle Columns
                    </span>
                </div>
                {table.getAllLeafColumns().map((column) => {
                    if (column.id === "select" || column.id === "actions") return null;

                    return (
                        <button
                            key={column.id}
                            onClick={() => column.toggleVisibility()}
                            style={{
                                ...styles.dropdownItem,
                                background: column.getIsVisible() ? "#f0fdf4" : "transparent",
                            }}
                        >
                            {column.getIsVisible() ? (
                                <Eye size={16} style={{ color: "#22c55e" }} />
                            ) : (
                                <EyeOff size={16} style={{ color: "#94a3b8" }} />
                            )}
                            <span style={{ flex: 1 }}>
                                {typeof column.columnDef.header === "string"
                                    ? column.columnDef.header
                                    : column.id}
                            </span>
                            {column.getIsVisible() && <Check size={16} style={{ color: "#22c55e" }} />}
                        </button>
                    );
                })}
            </div>
        </>
    );
}

// Export Dropdown
function ExportDropdown<TData>({
    table,
    isOpen,
    onClose,
    fileName,
}: {
    table: Table<TData>;
    isOpen: boolean;
    onClose: () => void;
    fileName: string;
}) {
    if (!isOpen) return null;

    const exportToExcel = () => {
        const headers = table
            .getAllLeafColumns()
            .filter((col) => col.getIsVisible() && col.id !== "select" && col.id !== "actions")
            .map((col) =>
                typeof col.columnDef.header === "string" ? col.columnDef.header : col.id
            );

        const data = table.getFilteredRowModel().rows.map((row) =>
            table
                .getAllLeafColumns()
                .filter((col) => col.getIsVisible() && col.id !== "select" && col.id !== "actions")
                .map((col) => {
                    const value = row.getValue(col.id);
                    return typeof value === "object" ? JSON.stringify(value) : value ?? "";
                })
        );

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        saveAs(blob, `${fileName}.xlsx`);
        onClose();
    };

    const exportToCSV = () => {
        const headers = table
            .getAllLeafColumns()
            .filter((col) => col.getIsVisible() && col.id !== "select" && col.id !== "actions")
            .map((col) =>
                typeof col.columnDef.header === "string" ? col.columnDef.header : col.id
            );

        const rows = table.getFilteredRowModel().rows.map((row) =>
            table
                .getAllLeafColumns()
                .filter((col) => col.getIsVisible() && col.id !== "select" && col.id !== "actions")
                .map((col) => {
                    const value = row.getValue(col.id);
                    const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
                    // Escape quotes and wrap in quotes if contains comma
                    if (stringValue.includes(",") || stringValue.includes('"')) {
                        return `"${stringValue.replace(/"/g, '""')}"`;
                    }
                    return stringValue;
                })
        );

        const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, `${fileName}.csv`);
        onClose();
    };

    return (
        <>
            <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={onClose} />
            <div style={styles.dropdown}>
                <button onClick={exportToExcel} style={styles.dropdownItem}>
                    <FileSpreadsheet size={16} style={{ color: "#22c55e" }} />
                    Export to Excel (.xlsx)
                </button>
                <button onClick={exportToCSV} style={styles.dropdownItem}>
                    <FileText size={16} style={{ color: "#3b82f6" }} />
                    Export to CSV (.csv)
                </button>
            </div>
        </>
    );
}

// Filter Panel
function FilterPanel<TData>({
    table,
    columnFilters,
    isOpen,
    onClose,
}: {
    table: Table<TData>;
    columnFilters: ColumnFilter[];
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!isOpen) return null;

    const clearAllFilters = () => {
        table.resetColumnFilters();
    };

    const activeFilterCount = table.getState().columnFilters.length;

    return (
        <div style={styles.filterPanel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                    Filters {activeFilterCount > 0 && `(${activeFilterCount} active)`}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearAllFilters}
                            style={{
                                padding: "6px 12px",
                                background: "#fee2e2",
                                color: "#dc2626",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer",
                            }}
                        >
                            Clear All
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        style={{
                            padding: "6px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "#64748b",
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div style={styles.filterRow}>
                {columnFilters.map((filter) => {
                    const column = table.getColumn(filter.id);
                    if (!column) return null;

                    const currentValue = column.getFilterValue();

                    switch (filter.type) {
                        case "text":
                            return (
                                <div key={filter.id} style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>
                                        {typeof column.columnDef.header === "string"
                                            ? column.columnDef.header
                                            : filter.id}
                                    </label>
                                    <input
                                        type="text"
                                        value={(currentValue as string) ?? ""}
                                        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                                        placeholder={`Filter...`}
                                        style={styles.filterInput}
                                    />
                                </div>
                            );

                        case "select":
                            return (
                                <div key={filter.id} style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>
                                        {typeof column.columnDef.header === "string"
                                            ? column.columnDef.header
                                            : filter.id}
                                    </label>
                                    <select
                                        value={(currentValue as string) ?? ""}
                                        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                                        style={styles.filterSelect}
                                    >
                                        <option value="">All</option>
                                        {filter.options?.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            );

                        case "dateRange":
                            const dateValue = (currentValue as { from?: string; to?: string }) ?? {};
                            return (
                                <div key={filter.id} style={{ display: "flex", gap: "8px" }}>
                                    <div style={styles.filterGroup}>
                                        <label style={styles.filterLabel}>
                                            {typeof column.columnDef.header === "string"
                                                ? column.columnDef.header
                                                : filter.id}{" "}
                                            (From)
                                        </label>
                                        <input
                                            type="date"
                                            value={dateValue.from ?? ""}
                                            onChange={(e) =>
                                                column.setFilterValue({
                                                    ...dateValue,
                                                    from: e.target.value || undefined,
                                                })
                                            }
                                            style={styles.filterInput}
                                        />
                                    </div>
                                    <div style={styles.filterGroup}>
                                        <label style={styles.filterLabel}>To</label>
                                        <input
                                            type="date"
                                            value={dateValue.to ?? ""}
                                            onChange={(e) =>
                                                column.setFilterValue({
                                                    ...dateValue,
                                                    to: e.target.value || undefined,
                                                })
                                            }
                                            style={styles.filterInput}
                                        />
                                    </div>
                                </div>
                            );

                        default:
                            return null;
                    }
                })}
            </div>
        </div>
    );
}

// Context Menu
function ContextMenu<TData>({
    position,
    row,
    items,
    onClose,
}: {
    position: { x: number; y: number } | null;
    row: TData | null;
    items: ContextMenuItem<TData>[];
    onClose: () => void;
}) {
    if (!position || !row) return null;

    return (
        <>
            <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={onClose} />
            <div
                style={{
                    ...styles.contextMenu,
                    left: position.x,
                    top: position.y,
                }}
            >
                {items.map((item, index) => (
                    <React.Fragment key={index}>
                        {item.divider && index > 0 && (
                            <div style={{ height: "1px", background: "#e2e8f0", margin: "4px 0" }} />
                        )}
                        <button
                            onClick={() => {
                                item.onClick(row);
                                onClose();
                            }}
                            style={{
                                ...styles.contextMenuItem,
                                color: item.color ?? "#475569",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    </React.Fragment>
                ))}
            </div>
        </>
    );
}

// Column Resizer
function ColumnResizer<TData>({ header }: { header: Header<TData, unknown> }) {
    return (
        <div
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            style={{
                ...styles.thResizer,
                ...(header.column.getIsResizing() ? styles.thResizerActive : {}),
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#cbd5e1")}
            onMouseLeave={(e) => {
                if (!header.column.getIsResizing()) {
                    e.currentTarget.style.background = "transparent";
                }
            }}
        />
    );
}

// ============================================
// Main Component
// ============================================

export function SuperTable<TData>({
    data,
    columns,
    searchPlaceholder = "Search...",
    enableGlobalFilter = true,
    enableColumnFilters = false,
    columnFilters: columnFilterConfig = [],
    enableSorting = true,
    defaultSorting = [],
    enablePagination = true,
    pageSize = 10,
    pageSizeOptions = [5, 10, 20, 50, 100],
    enableRowSelection = false,
    onSelectionChange,
    enableColumnVisibility = false,
    enableColumnResizing = false,
    defaultColumnVisibility = {},
    enableExport = false,
    exportFileName = "export",
    enableContextMenu = false,
    contextMenuItems = [],
    onRowClick,
    onRowDoubleClick,
    isLoading = false,
    emptyMessage = "No data available",
    emptyIcon,
    size = 'md',
    renderToolbarAction,
}: SuperTableProps<TData>) {
    // State
    const [sorting, setSorting] = React.useState<SortingState>(defaultSorting);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = React.useState("");
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(defaultColumnVisibility);

    // Dropdown states
    const [showColumnVisibility, setShowColumnVisibility] = React.useState(false);
    const [showExport, setShowExport] = React.useState(false);
    const [showFilters, setShowFilters] = React.useState(false);

    // Context menu state
    const [contextMenu, setContextMenu] = React.useState<{
        position: { x: number; y: number } | null;
        row: TData | null;
    }>({ position: null, row: null });

    // Add dateRange filter function to columns that need it
    const enhancedColumns = React.useMemo(() => {
        return columns.map((col) => {
            const filterConfig = columnFilterConfig.find((f) => f.id === (col as any).accessorKey || f.id === col.id);
            if (filterConfig?.type === "dateRange") {
                return {
                    ...col,
                    filterFn: dateRangeFilter,
                };
            }
            return col;
        });
    }, [columns, columnFilterConfig]);

    // Table instance
    const table = useReactTable<TData>({
        data,
        columns: enhancedColumns,
        state: {
            sorting,
            columnFilters,
            globalFilter,
            rowSelection,
            columnVisibility,
        },
        enableRowSelection,
        enableColumnResizing,
        columnResizeMode: "onChange",
        ...({
            autoResetPageIndex: false,
            autoResetGlobalFilter: false,
            autoResetColumnFilters: false,
        } as any),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onRowSelectionChange: setRowSelection,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
        getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
        getFilteredRowModel: getFilteredRowModel(),
        initialState: {
            pagination: {
                pageSize,
            },
        },
    });

    // Selection change callback
    React.useEffect(() => {
        if (onSelectionChange) {
            const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
            onSelectionChange(selectedRows);
        }
    }, [rowSelection, onSelectionChange, table]);

    // Context menu handler
    const handleContextMenu = (e: React.MouseEvent, row: TData) => {
        if (!enableContextMenu || contextMenuItems.length === 0) return;
        e.preventDefault();
        setContextMenu({
            position: { x: e.clientX, y: e.clientY },
            row,
        });
    };

    // Auto-adjust page index if data deletion causes empty page
    React.useEffect(() => {
        const pageCount = table.getPageCount();
        const { pageIndex } = table.getState().pagination;

        if (pageCount > 0 && pageIndex >= pageCount) {
            table.setPageIndex(pageCount - 1);
        }
    }, [data.length, table.getPageCount(), table.getState().pagination.pageIndex, table]);

    // Calculate active filters count
    const activeFiltersCount = columnFilters.length + (globalFilter ? 1 : 0);

    const sizeStyles = {
        sm: { maxWidth: "900px", margin: "0 auto" },
        md: { maxWidth: "1200px", margin: "0 auto" },
        lg: { width: "100%", margin: "0" }, // Full width, no max-width
    };

    return (
        <div style={styles.container}>
            {/* Toolbar */}
            <div style={styles.toolbar}>
                {/* Global Search */}
                {enableGlobalFilter && (
                    <div style={styles.searchContainer}>
                        <Search size={18} style={styles.searchIcon} />
                        <input
                            style={styles.searchInput}
                            placeholder={searchPlaceholder}
                            value={globalFilter ?? ""}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                        {globalFilter && (
                            <button
                                style={styles.clearButton}
                                onClick={() => setGlobalFilter("")}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                )}

                {/* Custom Action */}
                {renderToolbarAction && (
                    <div className="ml-auto">
                        {renderToolbarAction()}
                    </div>
                )}

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Filter Button */}
                {enableColumnFilters && columnFilterConfig.length > 0 && (
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            ...styles.toolbarButton,
                            ...(showFilters || activeFiltersCount > 0 ? styles.toolbarButtonActive : {}),
                        }}
                    >
                        <Filter size={18} />
                        Filters
                        {activeFiltersCount > 0 && (
                            <span
                                style={{
                                    padding: "2px 8px",
                                    background: "#3b82f6",
                                    color: "white",
                                    borderRadius: "10px",
                                    fontSize: "12px",
                                }}
                            >
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>
                )}

                {/* Column Visibility */}
                {enableColumnVisibility && (
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setShowColumnVisibility(!showColumnVisibility)}
                            style={{
                                ...styles.toolbarButton,
                                ...(showColumnVisibility ? styles.toolbarButtonActive : {}),
                            }}
                        >
                            <Columns3 size={18} />
                            Columns
                        </button>
                        <ColumnVisibilityDropdown
                            table={table}
                            isOpen={showColumnVisibility}
                            onClose={() => setShowColumnVisibility(false)}
                        />
                    </div>
                )}

                {/* Export */}
                {enableExport && (
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setShowExport(!showExport)}
                            style={{
                                ...styles.toolbarButton,
                                ...(showExport ? styles.toolbarButtonActive : {}),
                            }}
                        >
                            <Download size={18} />
                            Export
                        </button>
                        <ExportDropdown
                            table={table}
                            isOpen={showExport}
                            onClose={() => setShowExport(false)}
                            fileName={exportFileName}
                        />
                    </div>
                )}
            </div>

            {/* Table Container */}
            <div style={styles.tableWrapper}>
                {/* Filter Panel */}
                {enableColumnFilters && (
                    <FilterPanel
                        table={table}
                        columnFilters={columnFilterConfig}
                        isOpen={showFilters}
                        onClose={() => setShowFilters(false)}
                    />
                )}

                {/* Table */}
                <div style={styles.tableScroll}>
                    <table style={{ ...styles.table, width: size === 'lg' ? '100%' : table.getCenterTotalSize() }}>
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        const canSort = header.column.getCanSort();
                                        const sorted = header.column.getIsSorted();

                                        return (
                                            <th
                                                key={header.id}
                                                style={{
                                                    ...styles.th,
                                                    ...(canSort ? styles.thSortable : {}),
                                                    width: header.getSize(),
                                                    whiteSpace: "nowrap", // Prevent wrapping
                                                }}
                                                onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                            >
                                                <div style={styles.thContent}>
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {canSort && (
                                                        <span style={{ color: sorted ? "#6366f1" : "#cbd5e1" }}>
                                                            {sorted === "asc" ? (
                                                                <ChevronUp size={16} />
                                                            ) : sorted === "desc" ? (
                                                                <ChevronDown size={16} />
                                                            ) : (
                                                                <ChevronsUpDown size={16} />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                                {enableColumnResizing && <ColumnResizer header={header} />}
                                            </th>
                                        );
                                    })}
                                </tr>
                            ))}
                        </thead>

                        <tbody>
                            {isLoading ? (
                                // Loading skeleton
                                Array.from({ length: pageSize }).map((_, i) => (
                                    <tr key={`skeleton-${i}`}>
                                        {enhancedColumns.map((_, j) => (
                                            <td key={`skeleton-${i}-${j}`} style={styles.td}>
                                                <div style={styles.skeleton} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : table.getRowModel().rows.length === 0 ? (
                                // Empty state
                                <tr>
                                    <td
                                        colSpan={enhancedColumns.length}
                                        style={{
                                            ...styles.td,
                                            textAlign: "center",
                                            padding: "64px 16px",
                                        }}
                                    >
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                                            {emptyIcon || (
                                                <div
                                                    style={{
                                                        width: "64px",
                                                        height: "64px",
                                                        background: "#f1f5f9",
                                                        borderRadius: "50%",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <Search size={28} style={{ color: "#94a3b8" }} />
                                                </div>
                                            )}
                                            <p style={{ color: "#64748b", margin: 0 }}>{emptyMessage}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                // Data rows
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => onRowClick?.(row.original)}
                                        onDoubleClick={() => onRowDoubleClick?.(row.original)}
                                        onContextMenu={(e) => handleContextMenu(e, row.original)}
                                        style={{
                                            cursor: onRowClick || enableContextMenu ? "pointer" : "default",
                                            transition: "background 0.15s",
                                            background: row.getIsSelected() ? "#eff6ff" : "transparent",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!row.getIsSelected()) {
                                                e.currentTarget.style.background = "#f8fafc";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!row.getIsSelected()) {
                                                e.currentTarget.style.background = "transparent";
                                            }
                                        }}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} style={{ ...styles.td, width: cell.column.getSize(), whiteSpace: "nowrap" }}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {enablePagination && !isLoading && table.getRowModel().rows.length > 0 && (
                    <div style={styles.pagination}>
                        <div style={styles.pageInfo}>
                            {/* Selected count */}
                            {enableRowSelection && table.getFilteredSelectedRowModel().rows.length > 0 && (
                                <span style={{ color: "#3b82f6", fontWeight: 500 }}>
                                    {table.getFilteredSelectedRowModel().rows.length} selected
                                </span>
                            )}

                            {/* Results info */}
                            <span>
                                Showing{" "}
                                <strong>
                                    {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                                </strong>{" "}
                                to{" "}
                                <strong>
                                    {Math.min(
                                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                                        table.getFilteredRowModel().rows.length
                                    )}
                                </strong>{" "}
                                of <strong>{table.getFilteredRowModel().rows.length}</strong> results
                            </span>

                            {/* Page size selector */}
                            <select
                                value={table.getState().pagination.pageSize}
                                onChange={(e) => table.setPageSize(Number(e.target.value))}
                                style={styles.pageSizeSelect}
                            >
                                {pageSizeOptions.map((size) => (
                                    <option key={size} value={size}>
                                        {size} / page
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.pageControls}>
                            <button
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                                style={{
                                    ...styles.pageButton,
                                    ...(!table.getCanPreviousPage() ? styles.pageButtonDisabled : {}),
                                }}
                            >
                                <ChevronsLeft size={18} />
                            </button>
                            <button
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                style={{
                                    ...styles.pageButton,
                                    ...(!table.getCanPreviousPage() ? styles.pageButtonDisabled : {}),
                                }}
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <span style={{ padding: "0 16px", fontSize: "14px", color: "#64748b" }}>
                                Page <strong>{table.getState().pagination.pageIndex + 1}</strong> of{" "}
                                <strong>{table.getPageCount()}</strong>
                            </span>

                            <button
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                style={{
                                    ...styles.pageButton,
                                    ...(!table.getCanNextPage() ? styles.pageButtonDisabled : {}),
                                }}
                            >
                                <ChevronRight size={18} />
                            </button>
                            <button
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                                style={{
                                    ...styles.pageButton,
                                    ...(!table.getCanNextPage() ? styles.pageButtonDisabled : {}),
                                }}
                            >
                                <ChevronsRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {enableContextMenu && (
                <ContextMenu
                    position={contextMenu.position}
                    row={contextMenu.row}
                    items={contextMenuItems}
                    onClose={() => setContextMenu({ position: null, row: null })}
                />
            )}

            {/* Shimmer animation style */}
            <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
        </div>
    );
}

export default SuperTable;
