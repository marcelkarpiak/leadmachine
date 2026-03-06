"use client";

import { useState } from "react";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import LeadProfileModal, { LeadProfile } from "@/components/leads/LeadProfileModal";

export interface ListLead {
    id: string;
    full_name: string;
    job_title: string;
    company_name: string;
    email: string | null;
    score: number | null;
    linkedin_url: string | null;
    company_industry: string | null;
    company_size: string | null;
    score_breakdown: Record<string, number> | null;
    headline: string | null;
    about: string | null;
    photo_url: string | null;
}

const columns = [
    { header: "Imię i nazwisko", accessorKey: "full_name" as const, cell: (r: ListLead) => <span className="font-medium text-text-primary">{r.full_name}</span> },
    { header: "Stanowisko", accessorKey: "job_title" as const, cell: (r: ListLead) => <span className="text-text-secondary">{r.job_title}</span> },
    { header: "Firma", accessorKey: "company_name" as const },
    { header: "Email", accessorKey: "email" as const, cell: (r: ListLead) => <span className="text-text-secondary">{r.email || "—"}</span> },
    {
        header: "Score", accessorKey: "score" as const, cell: (r: ListLead) => {
            const score = r.score ?? 0;
            let variant: 'hot' | 'warm' | 'cold' = 'cold';
            if (score >= 70) variant = 'hot';
            else if (score >= 40) variant = 'warm';
            return <Badge variant={variant}>{score} pkt</Badge>;
        }
    },
];

export default function ListLeadsTable({ data }: { data: ListLead[] }) {
    const [selectedLead, setSelectedLead] = useState<ListLead | null>(null);

    return (
        <>
            <DataTable
                data={data}
                columns={columns}
                onRowClick={(lead) => setSelectedLead(lead)}
            />
            {selectedLead && (
                <LeadProfileModal
                    lead={selectedLead as LeadProfile}
                    onClose={() => setSelectedLead(null)}
                />
            )}
        </>
    );
}
