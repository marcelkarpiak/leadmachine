"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import LeadProfileModal, { LeadProfile } from "@/components/leads/LeadProfileModal";

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

export default function TopLeads({ leads }: { leads: LeadProfile[] }) {
  const [selectedLead, setSelectedLead] = useState<LeadProfile | null>(null);

  if (leads.length === 0) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center bg-bg-surface-2 rounded-b-xl">
        <p className="text-[13px] text-text-secondary">Brak leadów w bazie.</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border">
        {leads.map((lead) => {
          const score = lead.score ?? 0;
          return (
            <button
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-bg-surface-2 transition-colors text-left"
            >
              {lead.photo_url ? (
                <img
                  src={lead.photo_url}
                  alt={lead.full_name}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold text-text-inverse"
                  style={{ background: "var(--gradient-avatar)" }}
                >
                  {getInitials(lead.full_name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-text-primary truncate">
                  {lead.full_name}
                </p>
                <p className="text-[12px] text-text-secondary truncate">
                  {[lead.job_title, lead.company_name].filter(Boolean).join(" @ ")}
                </p>
              </div>
              <Badge variant={getScoreVariant(score)}>{score}</Badge>
            </button>
          );
        })}
      </div>

      {selectedLead && (
        <LeadProfileModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </>
  );
}
