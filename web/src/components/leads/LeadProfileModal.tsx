"use client";

import { useEffect, useState } from "react";
import { X, Briefcase, Building2, Factory, MapPin, Mail, ExternalLink } from "lucide-react";
import Badge from "@/components/ui/Badge";

export interface LeadProfile {
    id: string;
    full_name: string;
    job_title: string;
    company_name: string;
    company_industry: string | null;
    email: string | null;
    score: number | null;
    score_breakdown: Record<string, number> | null;
    linkedin_url: string | null;
    headline: string | null;
    about: string | null;
    photo_url: string | null;
    location?: string | null;
}

const BREAKDOWN_LABELS: Record<string, string> = {
    has_email: "Znaleziony email",
    has_phone: "Znaleziony telefon",
    role_ceo: "Rola: CEO/Founder",
    role_director: "Rola: Director/VP",
    role_manager: "Rola: Manager/Head",
    company_size_51_200: "Wielkość firmy: 51-200",
    company_size_201_500: "Wielkość firmy: 201-500",
    company_size_500_plus: "Wielkość firmy: 500+",
    priority_industry: "Priorytetowa branża",
    public_linkedin: "Publiczny profil LinkedIn",
};

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

function getScoreVariant(score: number): "hot" | "warm" | "cold" {
    if (score >= 70) return "hot";
    if (score >= 40) return "warm";
    return "cold";
}

function getScoreLabel(score: number): string {
    if (score >= 70) return "Hot";
    if (score >= 40) return "Warm";
    return "Cold";
}

export default function LeadProfileModal({
    lead,
    onClose,
}: {
    lead: LeadProfile;
    onClose: () => void;
}) {
    const [aboutExpanded, setAboutExpanded] = useState(false);
    const score = lead.score ?? 0;
    const variant = getScoreVariant(score);
    const breakdown = lead.score_breakdown ?? {};

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal card */}
            <div
                className="relative bg-bg-surface rounded-2xl shadow-modal max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-bg-surface-2 transition-colors text-text-tertiary hover:text-text-primary z-10"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-border-light">
                    <div className="flex items-center gap-4">
                        {lead.photo_url ? (
                            <img
                                src={lead.photo_url}
                                alt={lead.full_name}
                                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                            />
                        ) : (
                            <div
                                className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold text-text-inverse"
                                style={{ background: "var(--gradient-avatar)" }}
                            >
                                {getInitials(lead.full_name)}
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-[20px] font-bold font-display text-text-primary truncate">
                                {lead.full_name}
                            </h2>
                            {lead.headline && (
                                <p className="text-[14px] text-text-secondary mt-0.5 line-clamp-2">
                                    {lead.headline}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info grid */}
                <div className="px-6 py-4 border-b border-border-light grid grid-cols-2 gap-3">
                    {lead.job_title && (
                        <div className="flex items-center gap-2 text-[13px]">
                            <Briefcase size={14} className="text-text-tertiary flex-shrink-0" />
                            <span className="text-text-secondary truncate">{lead.job_title}</span>
                        </div>
                    )}
                    {lead.company_name && (
                        <div className="flex items-center gap-2 text-[13px]">
                            <Building2 size={14} className="text-text-tertiary flex-shrink-0" />
                            <span className="text-text-secondary truncate">{lead.company_name}</span>
                        </div>
                    )}
                    {lead.company_industry && (
                        <div className="flex items-center gap-2 text-[13px]">
                            <Factory size={14} className="text-text-tertiary flex-shrink-0" />
                            <span className="text-text-secondary truncate">{lead.company_industry}</span>
                        </div>
                    )}
                    {lead.location && (
                        <div className="flex items-center gap-2 text-[13px]">
                            <MapPin size={14} className="text-text-tertiary flex-shrink-0" />
                            <span className="text-text-secondary truncate">{lead.location}</span>
                        </div>
                    )}
                </div>

                {/* About */}
                {lead.about && (
                    <div className="px-6 py-4 border-b border-border-light">
                        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                            About
                        </h3>
                        <p
                            className={`text-[14px] text-text-secondary leading-relaxed ${
                                !aboutExpanded ? "line-clamp-4" : ""
                            }`}
                        >
                            {lead.about}
                        </p>
                        {lead.about.length > 200 && (
                            <button
                                onClick={() => setAboutExpanded(!aboutExpanded)}
                                className="text-[13px] text-accent hover:text-accent-hover font-medium mt-1"
                            >
                                {aboutExpanded ? "Pokaż mniej" : "Pokaż więcej"}
                            </button>
                        )}
                    </div>
                )}

                {/* Score */}
                <div className="px-6 py-4 border-b border-border-light">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">
                            Lead Score
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[20px] font-bold text-text-primary">{score}</span>
                            <Badge variant={variant}>{getScoreLabel(score)}</Badge>
                        </div>
                    </div>

                    {Object.keys(breakdown).length > 0 && (
                        <div className="space-y-1.5">
                            {Object.entries(breakdown).map(([key, value]) => (
                                <div
                                    key={key}
                                    className="flex items-center justify-between text-[13px]"
                                >
                                    <span className="text-text-secondary">
                                        {BREAKDOWN_LABELS[key] || key}
                                    </span>
                                    <span className="font-medium text-success">+{value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Links */}
                <div className="px-6 py-4 flex items-center gap-3">
                    {lead.email && (
                        <a
                            href={`mailto:${lead.email}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bg-surface-2 border border-border text-[13px] font-medium text-text-primary hover:bg-border-light transition-colors"
                        >
                            <Mail size={14} className="text-accent" />
                            {lead.email}
                        </a>
                    )}
                    {lead.linkedin_url && (
                        <a
                            href={lead.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-text-inverse text-[13px] font-medium hover:bg-accent-hover transition-colors shadow-button"
                        >
                            <ExternalLink size={14} />
                            LinkedIn
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
