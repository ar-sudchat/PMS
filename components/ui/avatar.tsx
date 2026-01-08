"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Avatar Root
interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, size = "md", ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "relative flex shrink-0 overflow-hidden rounded-xl",
                sizeClasses[size],
                className
            )}
            {...props}
        />
    )
);
Avatar.displayName = "Avatar";

// Avatar Image
interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> { }

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
    ({ className, src, alt, ...props }, ref) => {
        const [hasError, setHasError] = React.useState(false);

        if (!src || hasError) {
            return null;
        }

        return (
            <img
                ref={ref}
                src={src}
                alt={alt}
                className={cn("aspect-square h-full w-full object-cover", className)}
                onError={() => setHasError(true)}
                {...props}
            />
        );
    }
);
AvatarImage.displayName = "AvatarImage";

// Avatar Fallback
interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
    delayMs?: number;
}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
    ({ className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 font-semibold text-slate-600",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
);
AvatarFallback.displayName = "AvatarFallback";

// Export ทั้งหมด
export { Avatar, AvatarImage, AvatarFallback };
