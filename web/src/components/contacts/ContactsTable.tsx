"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { createClient } from "@/lib/supabaseClient";

export interface LeadRow {
    id: string;
    full_name: string;
    job_title: string;
    company_name: string;
    company_industry: string;
    company_size: string | null;
    email: string | null;
    score: number;
}

interface ContactsTableProps {
    data: LeadRow[];
}

export default function ContactsTable({ data }: ContactsTableProps) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<LeadRow | null>(null);
    const [bulkDelete, setBulkDelete] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSingleDelete = async () => {
        if (!deleteTarget) return;
        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase.from("leads").delete().eq("id", deleteTarget.id);
        setLoading(false);
        if (!error) {
            setDeleteTarget(null);
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(deleteTarget.id);
                return next;
            });
            router.refresh();
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase.from("leads").delete().in("id", [...selectedIds]);
        setLoading(false);
        if (!error) {
            setBulkDelete(false);
            setSelectedIds(new Set());
            router.refresh();
        }
    };

    const columns = [
        {
            header: "Imię i nazwisko",
            accessorKey: "full_name" as const,
            cell: (r: LeadRow) => <span className="font-medium text-text-primary">{r.full_name}</span>
        },
        {
            header: "Stanowisko",
            accessorKey: "job_title" as const,
            cell: (r: LeadRow) => <span className="text-text-secondary">{r.job_title}</span>
        },
        { header: "Firma", accessorKey: "company_name" as const },
        {
            header: "Branża",
            accessorKey: "company_industry" as const,
            cell: (r: LeadRow) => <span className="text-text-secondary">{r.company_industry}</span>
        },
        {
            header: "Wielkość firmy",
            accessorKey: "company_size" as const,
            cell: (r: LeadRow) => <span className="text-text-secondary">{r.company_size || "—"}</span>
        },
        {
            header: "E-mail",
            accessorKey: "email" as const,
            cell: (r: LeadRow) => <span className="font-mono text-[13px]">{r.email || "-"}</span>
        },
        {
            header: "Score",
            accessorKey: "score" as const,
            cell: (r: LeadRow) => {
                let variant: 'hot' | 'warm' | 'cold' = 'cold';
                if (r.score >= 70) variant = 'hot';
                else if (r.score >= 40) variant = 'warm';

                return <Badge variant={variant}>{r.score} pkt</Badge>;
            }
        },
        {
            header: "Akcje",
            accessorKey: "id" as const,
            cell: (r: LeadRow) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(r);
                    }}
                    className="p-1.5 rounded-md text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Usuń kontakt"
                >
                    <Trash2 size={16} />
                </button>
            )
        }
    ];

    return (
        <>
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 mb-2 rounded-lg bg-bg-surface-2 border border-border">
                    <span className="text-[14px] text-text-secondary">
                        Zaznaczono <strong className="text-text-primary">{selectedIds.size}</strong>
                    </span>
                    <button
                        onClick={() => setBulkDelete(true)}
                        className="ml-auto px-3 py-1.5 rounded-lg text-[13px] font-medium bg-danger text-white hover:bg-danger/90 transition-colors"
                    >
                        Usuń zaznaczone
                    </button>
                </div>
            )}

            <DataTable
                data={data}
                columns={columns}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
            />

            {deleteTarget && (
                <ConfirmDeleteModal
                    title="Usuń kontakt"
                    description={`Czy na pewno chcesz usunąć kontakt "${deleteTarget.full_name}"?`}
                    onConfirm={handleSingleDelete}
                    onClose={() => setDeleteTarget(null)}
                    loading={loading}
                />
            )}

            {bulkDelete && (
                <ConfirmDeleteModal
                    title="Usuń zaznaczone kontakty"
                    description={`Czy na pewno chcesz usunąć ${selectedIds.size} kontaktów? Tej operacji nie można cofnąć.`}
                    onConfirm={handleBulkDelete}
                    onClose={() => setBulkDelete(false)}
                    loading={loading}
                />
            )}
        </>
    );
}
