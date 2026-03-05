"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Lock, User, AlertCircle } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            if (data.session) {
                router.push("/");
                router.refresh(); // Force refresh to apply middleware state
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Wystąpił błąd podczas logowania.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 w-full bg-bg-base flex flex-col items-center justify-center p-4 min-h-screen">
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">

                {/* Logo */}
                <div className="flex flex-col items-center gap-4 mb-10">
                    <div className="w-16 h-16 rounded-full bg-text-primary flex items-center justify-center shadow-card shrink-0">
                        <Database size={32} className="text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="font-display font-bold text-[28px] text-text-primary leading-tight">
                            IvoryLab Machine
                        </h1>
                        <p className="text-[14px] text-text-secondary mt-1">
                            Zaloguj się, aby uzyskać dostęp do panelu dowodzenia.
                        </p>
                    </div>
                </div>

                {/* Login Form */}
                <div className="bg-bg-surface border border-border rounded-xl shadow-card p-8">
                    <form onSubmit={handleLogin} className="space-y-5">

                        {error && (
                            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-2 text-danger">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <p className="text-[13px] font-medium leading-tight">{error}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-text-primary">
                                Adres E-mail
                            </label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="marcel@ivorylab.pl"
                                    className="w-full h-11 pl-9 pr-3 bg-bg-surface border border-border rounded-md text-[14px] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[13px] font-medium text-text-primary">
                                    Hasło dostępu
                                </label>
                            </div>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full h-11 pl-9 pr-3 bg-bg-surface border border-border rounded-md text-[14px] font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 mt-4 rounded-md bg-[image:var(--gradient-accent)] text-white shadow-button text-[14px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Zaloguj się do systemu"
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[12px] text-text-tertiary mt-8">
                    IvoryLab Lead Machine © {new Date().getFullYear()}
                </p>

            </div>
        </div>
    );
}
