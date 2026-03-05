import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabaseServer";
import ListsTable, { ListRow } from "@/components/lists/ListsTable";

export default async function ListsPage() {
    const supabase = await createClient();
    const { data: lists } = await supabase
        .from("lists")
        .select(`
            id,
            name,
            created_at,
            status,
            list_leads(count)
        `)
        .order("created_at", { ascending: false });

    // Format lists safely dealing with PostgREST count shapes
    const safeLists: ListRow[] = lists?.map((l: { id: string; name: string; created_at: string; status: string; list_leads: { count: number }[] | { count: number } }) => ({
        id: l.id,
        name: l.name,
        created: new Date(l.created_at).toLocaleDateString("pl-PL"),
        leadsCount: Array.isArray(l.list_leads) ? l.list_leads[0]?.count || 0 : (l.list_leads as any)?.count || 0,
        status: l.status === "active" ? "Aktywna" : "Zakończona",
    })) || [];

    return (
        <div className="max-w-6xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-[28px] leading-tight font-bold font-display text-text-primary">
                        Listy Leadów
                    </h1>
                    <p className="text-text-secondary text-[14px] mt-1">
                        Zarządzaj swoimi kampaniami i zebranymi w grupę kontaktami.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="h-10 px-5 rounded-full bg-[image:var(--gradient-accent)] text-white shadow-button text-[14px] font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
                        <Plus size={16} />
                        Utwórz Listę
                    </button>
                </div>
            </div>

            <div className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden">
                <ListsTable data={safeLists} />
            </div>
        </div>
    );
}
