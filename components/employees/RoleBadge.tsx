import { Role } from '@/types/employee';
import { cn } from '@/lib/utils';

const roleConfig: Record<Role, { label: string; className: string }> = {
    super_admin: {
        label: 'Super Admin',
        className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
    },
    admin: {
        label: 'Admin',
        className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
    },
    manager: {
        label: 'Manager',
        className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
    },
    member: {
        label: 'Member',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
    },
    viewer: {
        label: 'Viewer',
        className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'
    },
};

interface RoleBadgeProps {
    role: Role;
    className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
    const config = roleConfig[role];

    return (
        <div className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border", config.className, className)}>
            {config.label}
        </div>
    );
}
