import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Type Definitions ---
interface RawProfile {
    firstName: string;
    lastName: string;
    jobTitle: string;
    industry: string;
    companyName: string;
    linkedInUrl: string;
    location?: string;
    companySize?: string;
    headline?: string;
    about?: string;
    photoUrl?: string;
}

interface NormalizedLead extends RawProfile {
    email?: string;
    score: number;
    scoreBreakdown: Record<string, number>;
    isDuplicate: boolean;
}

// --- Hunter.io Enrichment ---
// Strip legal suffixes that confuse Hunter.io lookups
function cleanCompanyName(name: string): string {
    return name
        .replace(/\b(sp\.?\s*z\s*o\.?\s*o\.?|s\.?a\.?|gmbh|ltd\.?|inc\.?|llc|corp\.?|plc|ag|se|n\.?v\.?|b\.?v\.?|s\.?r\.?l\.?|s\.?l\.?|pty\.?|co\.?)\b\.?/gi, '')
        .replace(/[,.\-–]+\s*$/, '')
        .trim();
}

// Single Hunter email-finder call with given params
async function hunterEmailFinderCall(params: Record<string, string>, apiKey: string): Promise<string | undefined> {
    const queryParams = new URLSearchParams({ ...params, api_key: apiKey, max_duration: "20" });
    const response = await fetch(`https://api.hunter.io/v2/email-finder?${queryParams.toString()}`);
    if (!response.ok) return undefined;
    const data = await response.json();
    return data?.data?.email || undefined;
}

// Resolve company name → domain using Hunter domain-search (mirrors the manual dashboard flow)
async function hunterResolveDomain(companyName: string, apiKey: string): Promise<string | undefined> {
    const queryParams = new URLSearchParams({ company: companyName, api_key: apiKey });
    const response = await fetch(`https://api.hunter.io/v2/domain-search?${queryParams.toString()}`);
    if (!response.ok) return undefined;
    const data = await response.json();
    return data?.data?.domain || undefined;
}

// Extract LinkedIn handle from full LinkedIn URL
// e.g. "https://www.linkedin.com/in/jan-kowalski-123/" → "jan-kowalski-123"
function extractLinkedInHandle(linkedInUrl: string): string | undefined {
    const match = linkedInUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
    return match?.[1] || undefined;
}

// NOTE ON BILLING: Email Finder charges 1 credit per API call (regardless of result).
// Domain Search charges 1 credit only if ≥1 result is returned.
// Strategies are ordered by accuracy; each failed attempt costs 1 credit.
async function findEmailWithHunter(
    firstName: string,
    lastName: string,
    companyName: string,
    linkedInUrl: string,
    apiKey: string
): Promise<{ email: string | undefined; raw: any; strategy: string }> {
    const cleanedCompany = cleanCompanyName(companyName);
    const nameParams = { first_name: firstName, last_name: lastName };

    // Strategy 1: linkedin_handle — most accurate when Hunter has indexed the profile
    // Docs: email-finder accepts linkedin_handle as company identifier (no domain/company needed)
    const linkedInHandle = extractLinkedInHandle(linkedInUrl);
    if (linkedInHandle) {
        const email = await hunterEmailFinderCall({ ...nameParams, linkedin_handle: linkedInHandle }, apiKey);
        if (email) return { email, raw: {}, strategy: 'linkedin_handle' };
        await new Promise(r => setTimeout(r, 300));
    }

    // Strategy 2: cleaned company name
    let email = await hunterEmailFinderCall({ ...nameParams, company: cleanedCompany }, apiKey);
    if (email) return { email, raw: {}, strategy: 'company_cleaned' };

    // Strategy 3: resolve company → domain via domain-search, then use domain in email-finder
    // Mirrors what Hunter dashboard does when showing the "suggested domain" for a company name
    // domain-search costs 1 credit only if it returns ≥1 result
    await new Promise(r => setTimeout(r, 300));
    const domain = await hunterResolveDomain(cleanedCompany, apiKey);
    if (domain) {
        await new Promise(r => setTimeout(r, 300));
        email = await hunterEmailFinderCall({ ...nameParams, domain }, apiKey);
        if (email) return { email, raw: { domain }, strategy: 'domain_resolved' };
    }

    return { email: undefined, raw: {}, strategy: 'not_found' };
}

// --- Scoring ---
function calculateScore(profile: Partial<NormalizedLead>, weights: Record<string, number>) {
    let score = 0;
    const breakdown: Record<string, number> = {};

    const addScore = (key: string, condition: boolean) => {
        if (condition && weights[key]) {
            score += weights[key];
            breakdown[key] = weights[key];
        }
    };

    addScore('has_email', !!profile.email);
    addScore('has_phone', false); // Brakuje nr. telefonów w defaultowym scrape'ie LinkedIn

    const title = (profile.jobTitle || '').toLowerCase();
    addScore('role_ceo', title.includes('ceo') || title.includes('prezes') || title.includes('founder') || title.includes('owner'));
    addScore('role_director', title.includes('director') || title.includes('dyrektor') || title.includes('cto') || title.includes('coo') || title.includes('vp'));
    addScore('role_manager', title.includes('manager') || title.includes('head') || title.includes('kierownik'));

    const size = (profile.companySize || '').toLowerCase();
    addScore('company_size_51_200', size.includes('51') || size.includes('200'));
    addScore('company_size_201_500', size.includes('201') || size.includes('500'));
    addScore('company_size_500_plus', size.includes('500+') || size.includes('1000') || size.includes('10,000'));

    const industry = (profile.industry || '').toLowerCase();
    const priorityIndustries = ['finanse', 'usługi', 'ubezpieczenia', 'call center', 'logistyka', 'healthcare', 'hotelarstwo', 'finance', 'insurance', 'services', 'logistics', 'health'];
    addScore('priority_industry', priorityIndustries.some(i => industry.includes(i)));

    addScore('public_linkedin', !!profile.linkedInUrl);

    // Clamp 0-100
    return {
        score: Math.min(100, Math.max(0, score)),
        scoreBreakdown: breakdown
    };
}

async function log(client: any, sessionId: string | undefined, message: string, type = 'info') {
    if (!sessionId) return;
    await client.from('scraping_logs').insert({ session_id: sessionId, message, type });
}

// --- Main Handler ---
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { profiles, sessionId } = await req.json() as { profiles: RawProfile[]; sessionId?: string };

        if (!profiles || !Array.isArray(profiles)) {
            throw new Error("Missing or invalid 'profiles' payload");
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Fetch Scoring Weights
        const { data: weightsData, error: weightsError } = await supabaseClient
            .from('scoring_weights')
            .select('key, value');

        if (weightsError) throw new Error(`Scoring weights error: ${weightsError.message}`);

        const weights: Record<string, number> = {};
        weightsData.forEach(w => weights[w.key] = w.value);

        // 2. Fetch existing LinkedIn URLs and Emails for deduplication
        // Doing it mapped for speed, but could hit API limits if huge. We assume 50-100 batch.
        const linkedInUrls = profiles.map(p => p.linkedInUrl).filter(Boolean);
        const { data: existingLeads, error: dupError } = await supabaseClient
            .from('leads')
            .select('linkedin_url, email')
            .in('linkedin_url', linkedInUrls);

        if (dupError) throw new Error(`Deduplication fetch error: ${dupError.message}`);

        const existingUrls = new Set(existingLeads.map(l => l.linkedin_url));
        const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));

        // Fetch Hunter.io key from api_keys table
        const { data: hunterKeyRow } = await supabaseClient
            .from("api_keys")
            .select("value")
            .eq("key", "HUNTER_API_KEY")
            .single();
        const hunterApiKey = hunterKeyRow?.value || undefined;
        const normalizedProfiles: NormalizedLead[] = [];

        // 3. Diagnostic logs
        const profilesWithCompany = profiles.filter(p => !!p.companyName).length;
        const weightsCount = Object.keys(weights).length;

        if (!hunterApiKey) {
            await log(supabaseClient, sessionId, "Brak HUNTER_API_KEY w api_keys — pomijam enrichment emaili.", "warning");
        } else {
            await log(supabaseClient, sessionId, `Hunter.io: klucz znaleziony. ${profilesWithCompany}/${profiles.length} profili ma companyName.`, "info");
        }

        if (weightsCount === 0) {
            await log(supabaseClient, sessionId, "Tabela scoring_weights jest pusta — scoring będzie zerowy.", "warning");
        } else {
            await log(supabaseClient, sessionId, `Scoring: załadowano ${weightsCount} wag.`, "info");
        }

        // 4. Process each profile (Enrich, Score, Dedupe)
        console.log(`[NORM-API] Processing ${profiles.length} profiles...`);
        await log(supabaseClient, sessionId, `Enrichment Hunter.io dla ${profilesWithCompany} profili...`, "working");

        for (const [index, profile] of profiles.entries()) {
            let isDuplicate = existingUrls.has(profile.linkedInUrl);
            let email: string | undefined = undefined;

            // ENRICHMENT (Only if we have Hunter key and it's not a duplicate early on)
            if (!isDuplicate && hunterApiKey && profile.companyName && profile.firstName) {
                const hunterResult = await findEmailWithHunter(profile.firstName, profile.lastName || '', profile.companyName, profile.linkedInUrl || '', hunterApiKey);
                email = hunterResult.email;

                console.log(`[HUNTER] ${profile.firstName} ${profile.lastName} @ ${profile.companyName} → ${email || 'not found'} (strategy: ${hunterResult.strategy})`);

                // Secondary deduplication after finding email:
                if (email && existingEmails.has(email)) {
                    isDuplicate = true;
                }

                // Base throttle between profiles (individual strategy calls already throttle internally)
                await new Promise(r => setTimeout(r, 200));
            }

            // SCORING
            const { score, scoreBreakdown } = calculateScore({ ...profile, email }, weights);

            normalizedProfiles.push({
                ...profile,
                email,
                score,
                scoreBreakdown,
                isDuplicate
            });

            console.log(`[NORM-API] Profile ${index + 1}/${profiles.length} - ${profile.firstName} ${profile.lastName} | Email: ${email || 'None'} | Score: ${score} | Dup: ${isDuplicate}`);
        }

        const emailsFound = normalizedProfiles.filter(p => !!p.email).length;
        const duplicatesFound = normalizedProfiles.filter(p => p.isDuplicate).length;
        await log(supabaseClient, sessionId, `Enrichment zakończony. Znaleziono ${emailsFound} emaili, ${duplicatesFound} duplikatów.`, "success");

        return new Response(JSON.stringify({
            success: true,
            normalizedProfiles
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("[NORM-API] Error:", error.message);

        try {
            const bodyObj = await req.clone().json();
            if (bodyObj?.sessionId) {
                const tempClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
                await log(tempClient, bodyObj.sessionId, `Błąd Normalization: ${error.message}`, "error");
            }
        } catch (_) { /* ignore */ }

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
