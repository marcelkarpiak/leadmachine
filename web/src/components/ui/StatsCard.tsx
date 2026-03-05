import { LucideIcon, ArrowUpRight } from "lucide-react";

interface StatsCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
}

export default function StatsCard({ label, value, icon: Icon, trend }: StatsCardProps) {
    return (
        <div className="bg-bg-surface border border-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow relative group flex flex-col justify-between h-[140px]">
            <div className="absolute top-4 right-4 text-text-tertiary group-hover:text-text-primary transition-colors cursor-pointer">
                <ArrowUpRight size={16} />
            </div>

            <div className="w-9 h-9 border-[1.5px] border-border rounded-full flex items-center justify-center bg-bg-surface-2 text-text-secondary">
                <Icon size={16} />
            </div>

            <div className="mt-4 flex flex-col">
                <div className="text-[12px] uppercase tracking-wider font-semibold text-text-secondary mb-1">
                    {label}
                </div>
                <div className="flex items-baseline gap-2">
                    <div className="font-mono font-bold text-[32px] leading-none text-text-primary">
                        {value}
                    </div>
                    {trend && (
                        <div className="text-[12px] font-medium text-success bg-success-light px-1.5 py-0.5 rounded-sm">
                            {trend}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
