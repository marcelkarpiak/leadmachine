import Link from "next/link";
import { Database, Filter, Plus, FileText, Search, Activity, CheckCircle2, Loader2, XCircle, BarChart3, Trophy } from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import Badge from "@/components/ui/Badge";
import TopLeads from "@/components/dashboard/TopLeads";
import ScoreDistribution from "@/components/dashboard/ScoreDistribution";
import { createClient } from "@/lib/supabaseServer";
import { LeadProfile } from "@/components/leads/LeadProfileModal";

function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "przed chwilą";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min temu`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} godz. temu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "wczoraj";
  return `${diffDays} dni temu`;
}

interface ScrapingSession {
  id: string;
  status: string;
  filters: { jobTitle?: string; [key: string]: unknown } | null;
  target_count: number | null;
  collected_count: number | null;
  emails_found: number | null;
  started_at: string | null;
  finished_at: string | null;
  session_lists: { lists: { name: string }[] | { name: string } | null }[];
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString();

  const [
    { count: totalLeads },
    { count: totalLists },
    { count: emailsFound },
    { count: leadsThisWeek },
    { count: emailsThisWeek },
    { count: activeSessions },
    { count: hotCount },
    { count: warmCount },
    { count: coldCount },
    { data: recentSessions },
    { data: topLeadsData },
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("lists").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).not("email", "is", null),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", weekAgoISO),
    supabase.from("leads").select("*", { count: "exact", head: true }).not("email", "is", null).gte("created_at", weekAgoISO),
    supabase.from("scraping_sessions").select("*", { count: "exact", head: true }).in("status", ["pending", "running"]),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("score", 70),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("score", 40).lt("score", 70),
    supabase.from("leads").select("*", { count: "exact", head: true }).lt("score", 40),
    supabase
      .from("scraping_sessions")
      .select("id, status, filters, target_count, collected_count, emails_found, started_at, finished_at, session_lists(lists(name))")
      .order("started_at", { ascending: false })
      .limit(5),
    supabase
      .from("leads")
      .select("id, full_name, job_title, company_name, company_industry, score, photo_url, email, score_breakdown, linkedin_url, headline, about")
      .order("score", { ascending: false })
      .limit(5),
  ]);

  const stats = {
    totalLeads: totalLeads || 0,
    totalLists: totalLists || 0,
    emailsFound: emailsFound || 0,
    conversionRate: totalLeads ? Math.round((emailsFound || 0) / totalLeads * 100) + "%" : "0%",
    leadsThisWeek: leadsThisWeek || 0,
    emailsThisWeek: emailsThisWeek || 0,
    activeSessions: activeSessions || 0,
  };

  const leadsWeekTrend = stats.leadsThisWeek > 0 ? `+${stats.leadsThisWeek} w tym tyg.` : undefined;
  const emailsWeekTrend = stats.emailsThisWeek > 0 ? `+${stats.emailsThisWeek} w tym tyg.` : stats.conversionRate;
  const sessions = (recentSessions || []) as ScrapingSession[];
  const topLeads = (topLeadsData || []) as LeadProfile[];

  return (
    <div className="max-w-6xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] leading-tight font-bold font-display text-text-primary">
            Dashboard
          </h1>
          <p className="text-text-secondary text-[14px] mt-1">
            Przegląd stanu bazy, najnowsze leady i statystyki.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-full bg-bg-surface border border-border text-[14px] font-medium text-text-primary hover:bg-bg-surface-2 transition-colors flex items-center gap-2">
            <Filter size={16} className="text-text-secondary" />
            Filtruj Zakres
          </button>
          <Link href="/scraping" className="h-10 px-5 rounded-full bg-[image:var(--gradient-accent)] text-white shadow-button text-[14px] font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus size={16} />
            Nowy Scraping
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Rekordy w Bazie" value={stats.totalLeads} icon={Database} trend={leadsWeekTrend} />
        <StatsCard label="Odnalezione E-maile" value={stats.emailsFound} icon={Search} trend={emailsWeekTrend} />
        <StatsCard label="Zbudowane Listy" value={stats.totalLists} icon={FileText} />
        <StatsCard label="Aktywne Sesje" value={stats.activeSessions} icon={Activity} />
      </div>

      {/* Recent Activity + Top Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 mb-4">

        {/* Recent Activity */}
        <div className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h3 className="text-[15px] font-semibold text-text-primary font-display flex items-center gap-2">
              <Activity size={16} className="text-text-tertiary" />
              Ostatnie Aktywności
            </h3>
          </div>

          {sessions.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-bg-surface-2">
              <div className="w-12 h-12 bg-bg-surface border border-border rounded-full flex items-center justify-center text-text-tertiary mb-3">
                <Activity size={20} />
              </div>
              <h4 className="text-[14px] text-text-primary font-medium">Brak niedawnych akcji</h4>
              <p className="text-[13px] text-text-secondary mt-1">Nie przeprowadzono ostatnio żadnego scrapingu.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sessions.map((session) => {
                const statusIcon = session.status === "completed" ? (
                  <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                ) : session.status === "running" || session.status === "pending" ? (
                  <Loader2 size={16} className="text-warning animate-spin flex-shrink-0" />
                ) : (
                  <XCircle size={16} className="text-danger flex-shrink-0" />
                );

                const statusVariant = session.status === "completed" ? "success" as const
                  : session.status === "running" || session.status === "pending" ? "warning" as const
                  : "danger" as const;

                const listNames = session.session_lists
                  ?.flatMap((sl) => {
                    if (!sl.lists) return [];
                    if (Array.isArray(sl.lists)) return sl.lists.map((l) => l.name);
                    return [sl.lists.name];
                  })
                  .filter(Boolean);
                const description = listNames.length > 0
                  ? listNames.join(", ")
                  : "Sesja scrapingu";

                return (
                  <div key={session.id} className="flex items-center gap-3 px-5 py-3">
                    {statusIcon}
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-text-primary truncate">
                        {description}
                      </p>
                      <p className="text-[12px] text-text-tertiary">
                        {session.collected_count ?? 0}/{session.target_count ?? 0} zebranych
                        {session.emails_found ? ` · ${session.emails_found} emaili` : ""}
                      </p>
                    </div>
                    <Badge variant={statusVariant}>{session.status}</Badge>
                    {session.started_at && (
                      <span className="text-[12px] text-text-tertiary whitespace-nowrap">
                        {timeAgo(session.started_at)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Leads */}
        <div className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h3 className="text-[15px] font-semibold text-text-primary font-display flex items-center gap-2">
              <Trophy size={16} className="text-text-tertiary" />
              Top Leady
            </h3>
          </div>
          <TopLeads leads={topLeads} />
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-[15px] font-semibold text-text-primary font-display flex items-center gap-2">
            <BarChart3 size={16} className="text-text-tertiary" />
            Rozkład Score'ów
          </h3>
        </div>
        <ScoreDistribution
          hotCount={hotCount || 0}
          warmCount={warmCount || 0}
          coldCount={coldCount || 0}
        />
      </div>

    </div>
  );
}
