import { Status } from '@/types/employee';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; // Assuming you have a Badge component, or I'll use a div

const statusConfig: Record<Status, { label: string; className: string; dotColor: string }> = {
    active: {
        label: 'Active',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
        dotColor: 'bg-emerald-500'
    },
    inactive: {
        label: 'Inactive',
        className: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700',
        dotColor: 'bg-slate-400'
    },
    suspended: {
        label: 'Suspended',
        className: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
        dotColor: 'bg-red-500'
    },
    resigned: {
        label: 'Resigned',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
        dotColor: 'bg-yellow-500'
    },
};

interface StatusBadgeProps {
    status: Status;
    className?: string;
    showLabel?: boolean;
}

export function StatusBadge({ status, className, showLabel = true }: StatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <div className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", config.className, className)}>
            <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", config.dotColor)} />
            {showLabel && config.label}
        </div>
    );
}
