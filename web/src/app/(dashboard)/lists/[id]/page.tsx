import { ArrowLeft, Download, Filter, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/ui/Badge";
import ListLeadsTable, { ListLead } from "@/components/lists/ListLeadsTable";
import { createClient } from "@/lib/supabaseServer";

export default async function ListDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch list details
    const { data: list, error: listError } = await supabase
        .from("lists")
        .select("id, name, created_at")
        .eq("id", id)
        .single();

    if (listError || !list) {
        notFound();
    }

    // 2. Fetch leads through list_leads junction
    const { data: listLeadsRows } = await supabase
        .from("list_leads")
        .select("leads:lead_id(id, full_name, job_title, company_name, email, score, linkedin_url, company_industry, company_size, score_breakdown, headline, about, photo_url)")
        .eq("list_id", id);

    const leads: ListLead[] = (listLeadsRows || [])
        .map((row: any) => row.leads)
        .filter(Boolean);

    const createdDate = new Date(list.created_at).toLocaleDateString("pl-PL");

    return (
        <div className="max-w-6xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

            <Link href="/lists" className="inline-flex items-center gap-2 text-[13px] font-medium text-text-secondary hover:text-text-primary mb-6 transition-colors">
                <ArrowLeft size={14} /> Wróć do wszystkich list
            </Link>

            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-[28px] leading-tight font-bold font-display text-text-primary">
                            {list.name}
                        </h1>
                        <Badge variant="info">Aktywna</Badge>
                    </div>
                    <p className="text-text-secondary text-[14px]">
                        Utworzona {createdDate} &middot; {leads.length} leadów
                    </p>
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                        <input
                            type="text"
                            placeholder="Szukaj w tej liście..."
                            className="h-10 pl-9 pr-4 rounded-full bg-bg-surface border border-border text-[14px] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent w-[200px] transition-all"
                        />
                    </div>
                    <button className="h-10 px-4 rounded-full bg-bg-surface border border-border text-[14px] font-medium text-text-primary hover:bg-bg-surface-2 transition-colors flex items-center gap-2">
                        <Filter size={16} className="text-text-secondary" />
                        Filtruj
                    </button>
                    <button className="h-10 px-4 rounded-full bg-bg-surface border border-border text-[14px] font-medium text-text-primary hover:bg-bg-surface-2 transition-colors flex items-center gap-2">
                        <Download size={16} className="text-accent" />
                        Eksportuj Listę
                    </button>
                </div>
            </div>

            <div className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden">
                <ListLeadsTable data={leads} />

                <div className="px-6 py-4 border-t border-border bg-bg-surface flex items-center justify-between">
                    <span className="text-[13px] text-text-secondary">Wszystkich na liście: {leads.length}</span>
                </div>
            </div>

        </div>
    );
}
