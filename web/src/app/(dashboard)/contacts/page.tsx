import { Search, Filter, Download } from "lucide-react";
import { createClient } from "@/lib/supabaseServer";
import ContactsTable, { LeadRow } from "@/components/contacts/ContactsTable";

export default async function ContactsPage() {
    const supabase = await createClient();
    const { data: contacts } = await supabase
        .from("leads")
        .select("id, full_name, job_title, company_name, company_industry, company_size, email, score")
        .order("created_at", { ascending: false })
        .limit(100);

    const safeContacts: LeadRow[] = contacts || [];

    return (
        <div className="max-w-6xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-[28px] leading-tight font-bold font-display text-text-primary">
                        Wszystkie Kontakty
                    </h1>
                    <p className="text-text-secondary text-[14px] mt-1">
                        Globalna baza pozyskanych leadów.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                        <input
                            type="text"
                            placeholder="Szukaj kontaktu..."
                            className="h-10 pl-9 pr-4 rounded-full bg-bg-surface border border-border text-[14px] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent w-[240px] transition-all"
                        />
                    </div>
                    <button className="h-10 px-4 rounded-full bg-bg-surface border border-border text-[14px] font-medium text-text-primary hover:bg-bg-surface-2 transition-colors flex items-center gap-2">
                        <Filter size={16} className="text-text-secondary" />
                        Filtruj
                    </button>
                    <button className="h-10 px-4 rounded-full bg-bg-surface border border-border text-[14px] font-medium text-text-primary hover:bg-bg-surface-2 transition-colors flex items-center gap-2">
                        <Download size={16} className="text-text-secondary" />
                        Eksport
                    </button>
                </div>
            </div>

            <div className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden">
                <ContactsTable data={safeContacts} />

                <div className="px-6 py-4 border-t border-border bg-bg-surface flex items-center justify-between">
                    <span className="text-[13px] text-text-secondary">Wyświetlanie 1-3 z 3 rekordów</span>
                    <div className="flex gap-1">
                        <button disabled className="px-3 py-1.5 text-[13px] font-medium border border-border rounded-md text-text-tertiary">Poprzednia</button>
                        <button disabled className="px-3 py-1.5 text-[13px] font-medium border border-border rounded-md text-text-tertiary">Następna</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
