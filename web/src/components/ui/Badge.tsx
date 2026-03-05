import { ReactNode } from "react";
import clsx from "clsx";

interface BadgeProps {
    children: ReactNode;
    variant?: 'hot' | 'warm' | 'cold' | 'success' | 'warning' | 'danger' | 'info' | 'default';
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
    const variants = {
        hot: "bg-success-light text-success",
        warm: "bg-warning-light text-warning",
        cold: "bg-bg-surface-2 text-text-tertiary",
        success: "bg-success-light text-success",
        warning: "bg-warning-light text-warning",
        danger: "bg-danger-light text-danger",
        info: "bg-info-light text-info",
        default: "bg-bg-surface-2 text-text-secondary border border-border"
    };

    return (
        <span className={clsx(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium leading-tight whitespace-nowrap",
            variants[variant]
        )}>
            {children}
        </span>
    );
}
