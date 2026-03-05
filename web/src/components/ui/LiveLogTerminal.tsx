"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal, CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabaseClient";

interface LogEntry {
    id: string;
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'working' | 'error' | 'warning';
}

interface LiveLogTerminalProps {
    status: 'idle' | 'running' | 'completed' | 'error';
    sessionId?: string | null;
    onComplete?: () => void;
}

export default function LiveLogTerminal({ status, sessionId, onComplete }: LiveLogTerminalProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        if (status !== 'running' || !sessionId) return;

        // Initial log entry
        setLogs([{
            id: 'start',
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            message: `Sesja ${sessionId.slice(0, 8)}... uruchomiona. Pipeline A.N.T. startuje.`,
            type: 'info'
        }]);

        // Subscribe to realtime inserts on scraping_logs filtered by session_id
        const channel = supabase
            .channel(`logs-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'scraping_logs',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload) => {
                    const row = payload.new as {
                        id: string;
                        message: string;
                        type: string;
                        created_at: string;
                    };

                    setLogs(prev => [...prev, {
                        id: row.id,
                        timestamp: new Date(row.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        message: row.message,
                        type: (row.type || 'info') as LogEntry['type'],
                    }]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [status, sessionId, supabase]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    if (status === 'idle') {
        return (
            <div className="w-full h-[320px] bg-[#0F1117] rounded-xl border border-border flex flex-col items-center justify-center text-text-tertiary">
                <Terminal size={32} className="mb-3 opacity-50" />
                <p className="font-mono text-[13px]">Oczekiwanie na uruchomienie sesji scrapingu.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[320px] bg-[#0F1117] rounded-xl border border-border shadow-card flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Terminal Header */}
            <div className="h-10 bg-[#1A1D24] border-b border-[#2A2E39] flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-text-tertiary" />
                    <span className="text-[12px] font-mono text-text-secondary font-medium">scraping-session-log</span>
                </div>
                <div className="flex items-center gap-2">
                    {status === 'running' && <CircleDashed size={14} className="text-accent animate-spin" />}
                    {status === 'completed' && <CheckCircle2 size={14} className="text-success" />}
                    {status === 'error' && <XCircle size={14} className="text-danger" />}
                    <span className="text-[11px] font-mono text-text-tertiary uppercase tracking-wider">{status}</span>
                </div>
            </div>

            {/* Logs Area */}
            <div ref={scrollRef} className="flex-1 p-4 font-mono text-[13px] overflow-y-auto scroll-smooth">
                <div className="flex flex-col gap-2">
                    {logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-4">
                            <span className="text-[#6B7280] shrink-0">[{log.timestamp}]</span>
                            <span className={clsx(
                                "whitespace-pre-wrap leading-relaxed",
                                log.type === 'info' && "text-[#E5E7EB]",
                                log.type === 'success' && "text-[#10B981]",
                                log.type === 'working' && "text-[#3B82F6]",
                                log.type === 'error' && "text-[#EF4444]",
                                log.type === 'warning' && "text-[#F59E0B]"
                            )}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                    {status === 'running' && (
                        <div className="flex items-start gap-4 animate-pulse">
                            <span className="text-[#6B7280]">[{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                            <span className="text-text-tertiary">_</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
