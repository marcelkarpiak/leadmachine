"use client";

import { useState, useEffect } from "react";
import { KeyRound, Shield, Save, CheckCircle2, Sliders, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

export default function SettingsPage() {
    const supabase = createClient();

    const [apifyKey, setApifyKey] = useState("");
    const [hunterKey, setHunterKey] = useState("");
    const [smtpHost, setSmtpHost] = useState("");
    const [smtpUser, setSmtpUser] = useState("");
    const [smtpPass, setSmtpPass] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [toastError, setToastError] = useState<string | null>(null);

    // Scoring rules state (loaded from DB)
    const [scoringWeights, setScoringWeights] = useState<{ key: string; value: number; description: string }[]>([]);

    // Default scoring rules (fallback if table is empty)
    const defaultRules = [
        { key: "has_email", value: 30, description: "Ma email" },
        { key: "has_phone", value: 15, description: "Ma telefon" },
        { key: "role_ceo", value: 20, description: "Stanowisko CEO / Prezes / Właściciel" },
        { key: "role_director", value: 15, description: "Stanowisko COO / CTO / Dyrektor" },
        { key: "role_manager", value: 10, description: "Head of Sales / Marketing" },
        { key: "company_size_51_200", value: 15, description: "Firma 51–200 pracowników" },
        { key: "company_size_201_500", value: 20, description: "Firma 201–500 pracowników" },
        { key: "company_size_500_plus", value: 10, description: "Firma 500+ pracowników" },
        { key: "priority_industry", value: 20, description: "Branża priorytetowa" },
        { key: "public_linkedin", value: 5, description: "Publiczny profil LinkedIn" },
    ];

    // Load existing keys and scoring weights on mount
    useEffect(() => {
        async function loadSettings() {
            try {
                // Load API keys
                const { data: keys } = await supabase
                    .from("api_keys")
                    .select("key, value");

                if (keys) {
                    for (const k of keys) {
                        switch (k.key) {
                            case "APIFY_API_TOKEN": setApifyKey(k.value); break;
                            case "HUNTER_API_KEY": setHunterKey(k.value); break;
                            case "SMTP_HOST": setSmtpHost(k.value); break;
                            case "SMTP_USER": setSmtpUser(k.value); break;
                            case "SMTP_PASS": setSmtpPass(k.value); break;
                        }
                    }
                }

                // Load scoring weights
                const { data: weights } = await supabase
                    .from("scoring_weights")
                    .select("key, value, description");

                if (weights && weights.length > 0) {
                    setScoringWeights(weights);
                } else {
                    setScoringWeights(defaultRules);
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
                setScoringWeights(defaultRules);
            } finally {
                setIsLoading(false);
            }
        }
        loadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setToastError(null);

        try {
            // Upsert API keys
            const apiKeys = [
                { key: "APIFY_API_TOKEN", value: apifyKey },
                { key: "HUNTER_API_KEY", value: hunterKey },
                { key: "SMTP_HOST", value: smtpHost },
                { key: "SMTP_USER", value: smtpUser },
                { key: "SMTP_PASS", value: smtpPass },
            ].filter(k => k.value.trim().length > 0);

            if (apiKeys.length > 0) {
                const { error: keysError } = await supabase
                    .from("api_keys")
                    .upsert(
                        apiKeys.map(k => ({ ...k, updated_at: new Date().toISOString() })),
                        { onConflict: "key" }
                    );

                if (keysError) throw keysError;
            }

            // Upsert scoring weights
            if (scoringWeights.length > 0) {
                const { error: weightsError } = await supabase
                    .from("scoring_weights")
                    .upsert(scoringWeights, { onConflict: "key" });

                if (weightsError) throw weightsError;
            }

            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("Save error:", msg);
            setToastError(msg);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
        } finally {
            setIsSaving(false);
        }
    };

    const updateWeight = (key: string, newValue: number) => {
        setScoringWeights(prev =>
            prev.map(w => w.key === key ? { ...w, value: newValue } : w)
        );
    };

    if (isLoading) {
        return (
            <div className="max-w-5xl w-full mx-auto py-20 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 relative">

            {/* Toast Notification */}
            <div className={`
        fixed bottom-8 right-8 bg-bg-surface border border-border shadow-popover rounded-lg p-4 flex items-center gap-3 transition-all duration-300 z-50
        ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}
      `}>
                {toastError ? (
                    <>
                        <AlertCircle size={20} className="text-danger" />
                        <div>
                            <p className="text-[14px] font-medium text-text-primary leading-tight">Błąd zapisu</p>
                            <p className="text-[13px] text-text-secondary">{toastError}</p>
                        </div>
                    </>
                ) : (
                    <>
                        <CheckCircle2 size={20} className="text-success" />
                        <div>
                            <p className="text-[14px] font-medium text-text-primary leading-tight">Zapisano pomyślnie</p>
                            <p className="text-[13px] text-text-secondary">Twoje ustawienia zostały zaktualizowane.</p>
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-[28px] leading-tight font-bold font-display text-text-primary">
                        Ustawienia Systemu
                    </h1>
                    <p className="text-text-secondary text-[14px] mt-1">
                        Zarządzaj kluczami API oraz regułami automatycznej wyceny (Scoringu) leadów.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-10 px-6 rounded-full bg-[image:var(--gradient-accent)] text-white shadow-button text-[14px] font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save size={16} />
                    )}
                    Zapisz Zmiany
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Lewa kolumna - Integracje API */}
                <div className="lg:col-span-1 space-y-6">

                    <div className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden">
                        <div className="px-5 py-4 border-b border-border bg-bg-surface flex items-center gap-2">
                            <KeyRound size={18} className="text-text-tertiary" />
                            <h2 className="text-[15px] font-semibold text-text-primary font-display">Klucze API</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-text-primary">Apify API Token</label>
                                <input
                                    type="password"
                                    value={apifyKey}
                                    onChange={(e) => setApifyKey(e.target.value)}
                                    placeholder="apify_api_..."
                                    className="w-full h-10 px-3 bg-bg-surface border border-border rounded-md text-[14px] font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-text-primary">Hunter.io API Key</label>
                                <input
                                    type="password"
                                    value={hunterKey}
                                    onChange={(e) => setHunterKey(e.target.value)}
                                    placeholder="Klucz Hunter.io..."
                                    className="w-full h-10 px-3 bg-bg-surface border border-border rounded-md text-[14px] font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden">
                        <div className="px-5 py-4 border-b border-border bg-bg-surface flex items-center gap-2">
                            <Shield size={18} className="text-text-tertiary" />
                            <h2 className="text-[15px] font-semibold text-text-primary font-display">Powiadomienia SMTP</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-text-primary">SMTP Host</label>
                                <input
                                    type="text"
                                    value={smtpHost}
                                    onChange={(e) => setSmtpHost(e.target.value)}
                                    placeholder="smtp.example.com"
                                    className="w-full h-10 px-3 bg-bg-surface border border-border rounded-md text-[14px] text-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-text-primary">Konto Użytkownika</label>
                                <input
                                    type="email"
                                    value={smtpUser}
                                    onChange={(e) => setSmtpUser(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full h-10 px-3 bg-bg-surface border border-border rounded-md text-[14px] text-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-text-primary">Hasło</label>
                                <input
                                    type="password"
                                    value={smtpPass}
                                    onChange={(e) => setSmtpPass(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-10 px-3 bg-bg-surface border border-border rounded-md text-[14px] font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Prawa kolumna - Wagi Scoringowe */}
                <div className="lg:col-span-2">
                    <div className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden h-full">
                        <div className="px-6 py-4 border-b border-border bg-bg-surface flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sliders size={18} className="text-text-tertiary" />
                                <h2 className="text-[15px] font-semibold text-text-primary font-display">Wagi Scoringowe</h2>
                            </div>
                            <div className="text-[12px] font-medium text-text-secondary">
                                Legenda: <span className="text-success ml-1">Hot (70-100)</span> | <span className="text-warning ml-1">Warm (40-69)</span>
                            </div>
                        </div>

                        <div className="p-0">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-3 border-b border-border bg-bg-surface-2 text-[12px] font-semibold tracking-wider text-text-tertiary">Reguła / Kryterium</th>
                                        <th className="px-6 py-3 border-b border-border bg-bg-surface-2 text-[12px] font-semibold tracking-wider text-text-tertiary w-[120px] text-right">Punkty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scoringWeights.map((rule) => (
                                        <tr key={rule.key} className="border-b border-border-light last:border-0 hover:bg-bg-surface-2 transition-colors">
                                            <td className="px-6 py-3.5 text-[14px] font-medium text-text-primary">{rule.description}</td>
                                            <td className="px-6 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-success font-medium text-[14px]">+</span>
                                                    <input
                                                        type="number"
                                                        value={rule.value}
                                                        onChange={(e) => updateWeight(rule.key, Number(e.target.value))}
                                                        className="w-[60px] h-[34px] px-2 text-center bg-bg-surface border border-border rounded-md text-[14px] font-mono font-medium focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 bg-bg-surface-2 border-t border-border mt-auto">
                            <p className="text-[13px] text-text-secondary leading-relaxed">
                                Powyższe wagi określają, w jaki sposób funkcja Normalization-Service autorytatywnie ocenia atrakcyjność leada. Zmiana tych wartości wpłynie na <strong>każdą nową pobraną osobę</strong> podczas procesu B.L.A.S.T (Acquisition). Punktacja dla starych kontaktów w bazie pozostanie nienaruszona.
                            </p>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}
