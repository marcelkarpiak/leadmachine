"use client";

import { useState } from "react";
import { Folder, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DataTable from "@/components/ui/DataTable";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { createClient } from "@/lib/supabaseClient";

export interface ListRow {
    id: string;
    name: string;
    created: string;
    leadsCount: number;
    status: string;
}

interface ListsTableProps {
    data: ListRow[];
}

export default function ListsTable({ data }: ListsTableProps) {
    const router = useRouter();
    const [deleteTarget, setDeleteTarget] = useState<ListRow | null>(null);
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase.from("lists").delete().eq("id", deleteTarget.id);
        setLoading(false);
        if (!error) {
            setDeleteTarget(null);
            router.refresh();
        }
    };

    const columns = [
        {
            header: "Nazwa Listy",
            accessorKey: "name" as const,
            cell: (r: ListRow) => (
                <Link href={`/lists/${r.id}`} className="flex items-center gap-2 font-medium text-text-primary hover:text-accent transition-colors">
                    <Folder size={16} className="text-text-tertiary" />
                    {r.name}
                </Link>
            )
        },
        {
            header: "Data utworzenia",
            accessorKey: "created" as const,
            cell: (r: ListRow) => <span className="text-text-secondary text-[13px]">{r.created}</span>
        },
        {
            header: "Ilość Leadów",
            accessorKey: "leadsCount" as const,
            cell: (r: ListRow) => <span className="font-mono text-[14px]">{r.leadsCount}</span>
        },
        {
            header: "Status",
            accessorKey: "status" as const,
            cell: (r: ListRow) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-bg-surface-2 text-text-secondary border border-border">
                    {r.status}
                </span>
            )
        },
        {
            header: "Akcje",
            accessorKey: "id" as const,
            cell: (r: ListRow) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDeleteTarget(r);
                    }}
                    className="p-1.5 rounded-md text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Usuń listę"
                >
                    <Trash2 size={16} />
                </button>
            )
        },
    ];

    return (
        <>
            <DataTable data={data} columns={columns} />

            {deleteTarget && (
                <ConfirmDeleteModal
                    title="Usuń listę"
                    description={`Czy na pewno chcesz usunąć listę "${deleteTarget.name}"? Powiązania z leadami zostaną usunięte.`}
                    onConfirm={handleDelete}
                    onClose={() => setDeleteTarget(null)}
                    loading={loading}
                />
            )}
        </>
    );
}
