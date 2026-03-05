"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Settings, Database, Activity, LogOut } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabaseClient";

const mainNavItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/scraping", label: "Nowy Scraping", icon: Activity },
    { href: "/lists", label: "Listy Leadów", icon: Database },
    { href: "/contacts", label: "Kontakty", icon: Users },
    { href: "/settings", label: "Ustawienia", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <div className="w-[220px] bg-bg-surface h-screen border-r border-border flex flex-col p-4 shrink-0 shadow-card">
            <div className="flex items-center gap-3 mb-8 px-2">
                <div className="w-9 h-9 rounded-full bg-text-primary flex items-center justify-center shrink-0">
                    <Database size={20} className="text-white" />
                </div>
                <span className="font-display font-bold text-text-primary text-[15px] leading-tight mt-1">
                    IvoryLab<br />Machine
                </span>
            </div>

            <nav className="flex flex-col gap-1">
                <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-2 px-2">Main Menu</div>
                {mainNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "flex items-center gap-3 px-3 py-2.5 transition-all text-[14px] font-medium leading-none",
                                isActive
                                    ? "bg-[image:var(--gradient-accent)] text-white shadow-button rounded-full"
                                    : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary rounded-full"
                            )}
                        >
                            <Icon size={18} className={clsx("shrink-0", isActive ? "text-white" : "text-text-tertiary group-hover:text-text-primary")} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto px-2 space-y-2">
                <div className="bg-bg-surface-2 rounded-xl p-3 border border-border">
                    <div className="text-[12px] font-semibold text-text-primary mb-1">Potrzebujesz pomocy?</div>
                    <div className="text-[11px] text-text-secondary leading-snug">Skontaktuj się z administracją poprzez system zgłoszeń.</div>
                </div>

                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-text-secondary hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                >
                    <LogOut size={16} />
                    Wyloguj się
                </button>
            </div>
        </div>
    );
}
