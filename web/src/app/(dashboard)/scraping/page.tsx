"use client";

import { useState } from "react";
import { Play, Database, FileText, X } from "lucide-react";
import ChipInput from "@/components/ui/ChipInput";
import LiveLogTerminal from "@/components/ui/LiveLogTerminal";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabaseClient";
import { LINKEDIN_INDUSTRIES, getIndustryGroups } from "@/lib/linkedin-industries";

export default function ScrapingPage() {
    const supabase = createClient();
    const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Form State
    const [jobTitles, setJobTitles] = useState<string[]>(["CEO", "CTO"]);
    const [industryIds, setIndustryIds] = useState<string[]>([]);
    const [locations, setLocations] = useState<string[]>(["Poland"]);
    const [targetCount, setTargetCount] = useState<number>(50);
    const [targetList, setTargetList] = useState<string>("");

    const handleStartScraping = async () => {
        try {
            setStatus('running');

            // 1. Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error("Musisz być zalogowany, aby rozpocząć.");

            // 2. Prepare filters 
            const filters = {
                jobTitle: jobTitles.join(", "),
                industryIds: industryIds,
                location: locations.join(", "),
            };

            // 3. Insert specific List if targetList present
            let mappedListId = null;
            if (targetList.trim().length > 0) {
                const { data: newList, error: listError } = await supabase
                    .from("lists")
                    .insert({ name: targetList, created_by: user.id })
                    .select("id")
                    .single();
                if (!listError && newList) {
                    mappedListId = newList.id;
                }
            }

            // 4. Create session definition
            const { data: sessionData, error: sessionError } = await supabase
                .from("scraping_sessions")
                .insert({
                    user_id: user.id,
                    status: 'pending',
                    target_count: targetCount,
                    filters: filters
                })
                .select("id")
                .single();

            if (sessionError || !sessionData) throw sessionError;

            setSessionId(sessionData.id);

            if (mappedListId) {
                await supabase.from("session_lists").insert({
                    session_id: sessionData.id,
                    list_id: mappedListId
                });
            }

            // 5. Invoke Edge Functions — A.N.T. chain
            // Helper to call edge functions with error handling using Supabase Client
            const callEdgeFunction = async (name: string, body: Record<string, unknown>) => {
                const { data, error } = await supabase.functions.invoke(name, {
                    body: body,
                });

                if (error) {
                    throw new Error(`Edge Function ${name} failed: ${error.message}`);
                }

                return data;
            };

            // A — Acquisition
            const acqResult = await callEdgeFunction('acquisition-apify', {
                sessionId: sessionData.id,
            });

            if (!acqResult.profiles || acqResult.profiles.length === 0) {
                throw new Error("Acquisition nie zwróciła żadnych profili.");
            }

            // N — Normalization
            const normResult = await callEdgeFunction('normalization-service', {
                profiles: acqResult.profiles,
                sessionId: sessionData.id,
            });

            if (!normResult.normalizedProfiles) {
                throw new Error("Normalization nie zwróciła znormalizowanych profili.");
            }

            // T — Transport
            await callEdgeFunction('transport-service', {
                sessionId: sessionData.id,
                userId: user.id,
                listIds: mappedListId ? [mappedListId] : [],
                normalizedProfiles: normResult.normalizedProfiles,
            });

            // Pipeline completed
            setStatus('completed');

        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("Scraping error:", msg);
            setErrorMessage(msg);
            setStatus('error');
        }
    };

    const isRunning = status === 'running';

    return (
        <div className="max-w-4xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-[28px] leading-tight font-bold font-display text-text-primary">
                            Panel Scrapingu
                        </h1>
                        {isRunning && <Badge variant="warning">Sesja w toku</Badge>}
                        {status === 'completed' && <Badge variant="success">Zakończono</Badge>}
                        {status === 'error' && <Badge variant="danger">Błąd B.L.A.S.T</Badge>}
                    </div>
                    <p className="text-text-secondary text-[14px]">
                        Skonfiguruj filtry i uruchom potok A.N.T (Acquisition, Normalization, Transport).
                    </p>
                </div>
            </div>

            {status === 'error' && errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[14px] text-red-700">
                    <span className="font-semibold">Szczegóły błędu:</span> {errorMessage}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">

                {/* Formularz Konfiguracyjny */}
                <div className="bg-bg-surface border border-border rounded-xl shadow-card p-6">
                    <h2 className="text-[16px] font-semibold text-text-primary font-display flex items-center gap-2 mb-6">
                        <Database size={18} className="text-text-tertiary" />
                        Parametry Wyszukiwania
                    </h2>

                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <ChipInput
                                label="Docelowe Stanowiska"
                                placeholder="Np. CEO, Founder..."
                                value={jobTitles}
                                onChange={setJobTitles}
                                disabled={isRunning}
                            />
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-text-primary">
                                    Branże (Industries)
                                </label>
                                <select
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val && !industryIds.includes(val)) {
                                            setIndustryIds(prev => [...prev, val]);
                                        }
                                        e.target.value = "";
                                    }}
                                    disabled={isRunning}
                                    className="h-[42px] px-3 bg-bg-surface border border-border rounded-md text-[14px] focus:outline-none focus:border-accent disabled:opacity-70 disabled:bg-bg-surface-2 transition-colors"
                                >
                                    <option value="">Wybierz branżę...</option>
                                    {getIndustryGroups().map(({ group, options }) => (
                                        <optgroup key={group} label={group}>
                                            {options.map(opt => (
                                                <option key={opt.id} value={opt.id} disabled={industryIds.includes(opt.id)}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                {industryIds.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {industryIds.map(id => {
                                            const ind = LINKEDIN_INDUSTRIES.find(i => i.id === id);
                                            return (
                                                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent text-[12px] rounded-full font-medium">
                                                    {ind?.label ?? id}
                                                    <button
                                                        type="button"
                                                        onClick={() => setIndustryIds(prev => prev.filter(x => x !== id))}
                                                        disabled={isRunning}
                                                        className="hover:text-danger transition-colors disabled:opacity-50"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <ChipInput
                            label="Lokalizacje (Keywords)"
                            placeholder="Np. Poland, Berlin..."
                            value={locations}
                            onChange={setLocations}
                            disabled={isRunning}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-border-light">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-text-primary">
                                    Limit Leadów (Target Count)
                                </label>
                                <input
                                    type="number"
                                    value={targetCount}
                                    onChange={(e) => setTargetCount(Number(e.target.value))}
                                    disabled={isRunning}
                                    className="h-[42px] px-3 bg-bg-surface border border-border rounded-md text-[14px] focus:outline-none focus:border-accent disabled:opacity-70 disabled:bg-bg-surface-2 transition-colors"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-text-primary">
                                    Nazwa nowej lub istniejącej Listy
                                </label>
                                <div className="relative">
                                    <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                                    <input
                                        type="text"
                                        placeholder="Np. Kampania IT Q2"
                                        value={targetList}
                                        onChange={(e) => setTargetList(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full h-[42px] pl-9 pr-3 bg-bg-surface border border-border rounded-md text-[14px] focus:outline-none focus:border-accent disabled:opacity-70 disabled:bg-bg-surface-2 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleStartScraping}
                            disabled={isRunning || status === 'completed'}
                            className={`
                h-10 px-8 rounded-full text-[14px] font-medium flex items-center gap-2 transition-all
                ${isRunning || status === 'completed'
                                    ? 'bg-border text-text-tertiary cursor-not-allowed'
                                    : 'bg-[image:var(--gradient-accent)] text-white shadow-button hover:opacity-90'}
              `}
                        >
                            {isRunning ? (
                                <>Uruchamianie...</>
                            ) : status === 'completed' ? (
                                <>Sesja Zakończona</>
                            ) : (
                                <>
                                    <Play size={16} />
                                    Uruchom Scraping
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Live Log Terminal */}
                {(status !== 'idle') && (
                    <div className="space-y-2">
                        <h2 className="text-[15px] pl-2 font-semibold text-text-primary font-display flex items-center gap-2 mb-2">
                            Monitoring Procesu A.N.T.
                        </h2>
                        <LiveLogTerminal sessionId={sessionId} status={status} />
                    </div>
                )}

            </div>

        </div>
    );
}
