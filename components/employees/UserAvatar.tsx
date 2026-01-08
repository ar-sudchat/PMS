"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const avatarColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500',
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
    'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
    'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500',
];

function getInitials(name: string) {
    if (!name) return "??";
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorByName(name: string) {
    if (!name) return avatarColors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % avatarColors.length;
    return avatarColors[index];
}

interface UserAvatarProps {
    src?: string;
    name: string;
    className?: string;
    placeholderClassName?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function UserAvatar({ src, name, className, placeholderClassName, size = 'md' }: UserAvatarProps) {
    const initials = getInitials(name);
    // Use gradient if provided in previous prompts, or stick to solid colors for consistency with existing design
    // The prompt used inline styles for gradients, but our project uses Tailwind classes in avatar.tsx.
    // I will use the existing solid colors logic but apply it to the AvatarFallback style or class.

    // Actually, adapting the prompt's `UserAvatar` Example more closely:
    // It suggests using `style={{ background: bgColor }}`.
    // I'll stick to the class based approach which matches the existing file structure better unless forced otherwise.
    const colorClass = getColorByName(name);

    return (
        <Avatar size={size} className={cn("border-2 border-white dark:border-slate-900 shadow-sm", className)}>
            <AvatarImage src={src} alt={name} className="object-cover" />
            <AvatarFallback
                className={cn(
                    "text-white font-medium",
                    colorClass,
                    placeholderClassName
                )}
            >
                {initials}
            </AvatarFallback>
        </Avatar>
    );
}

export default UserAvatar;
