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

// Transliterate accented/diacritic characters to ASCII equivalents
// Needed because Hunter indexes LinkedIn handles and emails in ASCII form
function transliterateToAscii(str: string): string {
    const map: Record<string, string> = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
        'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'å': 'a',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'ò': 'o', 'ô': 'o', 'ö': 'o', 'ő': 'o',
        'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ű': 'u',
        'ý': 'y', 'ÿ': 'y',
        'ñ': 'n', 'ç': 'c', 'ß': 'ss',
        'ř': 'r', 'š': 's', 'ž': 'z', 'č': 'c', 'ď': 'd', 'ě': 'e', 'ň': 'n', 'ť': 't', 'ů': 'u',
    };
    return str.split('').map(ch => map[ch] ?? ch).join('');
}

// Construct email from Hunter domain-search pattern + person name
// Mirrors what Hunter dashboard does: it shows you the guessed email based on company pattern
// Common patterns: {first}.{last}, {f}{last}, {first}_{last}, {first}, {f}.{last}
function constructEmailFromPattern(firstName: string, lastName: string, domain: string, pattern: string): string | undefined {
    const f = transliterateToAscii(firstName).toLowerCase().replace(/[^a-z0-9.-]/g, '');
    const l = transliterateToAscii(lastName).toLowerCase().replace(/[^a-z0-9.-]/g, '');
    const fi = f[0] || '';
    const li = l[0] || '';
    if (!f || !l || !fi) return undefined;

    const local = pattern
        .replace('{first}', f)
        .replace('{last}', l)
        .replace('{f}', fi)
        .replace('{l}', li);

    // Bail out if any placeholder is unresolved
    if (local.includes('{') || local.includes('}')) return undefined;

    return `${local}@${domain}`;
}

// Single Hunter email-finder call with given params — returns full response for logging
async function hunterEmailFinderCall(params: Record<string, string>, apiKey: string): Promise<{ email: string | undefined; status: number; confidence?: number; sources?: number; error?: string }> {
    const queryParams = new URLSearchParams({ ...params, api_key: apiKey, max_duration: "20" });
    const response = await fetch(`https://api.hunter.io/v2/email-finder?${queryParams.toString()}`);
    const status = response.status;
    if (!response.ok) {
        let errBody = '';
        try { errBody = await response.text(); } catch (_) {}
        return { email: undefined, status, error: errBody.slice(0, 200) };
    }
    const data = await response.json();
    return {
        email: data?.data?.email || undefined,
        status,
        confidence: data?.data?.score,
        sources: data?.data?.sources?.length,
    };
}

// Resolve company name → domain + email pattern via Hunter domain-search
async function hunterResolveDomain(companyName: string, apiKey: string): Promise<{ domain: string | undefined; pattern: string | undefined; status: number; emails?: number; error?: string }> {
    const queryParams = new URLSearchParams({ company: companyName, api_key: apiKey });
    const response = await fetch(`https://api.hunter.io/v2/domain-search?${queryParams.toString()}`);
    const status = response.status;
    if (!response.ok) {
        let errBody = '';
        try { errBody = await response.text(); } catch (_) {}
        return { domain: undefined, pattern: undefined, status, error: errBody.slice(0, 200) };
    }
    const data = await response.json();
    return {
        domain: data?.data?.domain || undefined,
        pattern: data?.data?.pattern || undefined,
        status,
        emails: data?.data?.emails?.length,
    };
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
// Detailed per-step logs go to console.log — visible in Supabase Dashboard → Edge Functions → normalization-service → Logs
async function findEmailWithHunter(
    firstName: string,
    lastName: string,
    companyName: string,
    linkedInUrl: string,
    apiKey: string
): Promise<{ email: string | undefined; raw: any; strategy: string }> {
    const cleanedCompany = cleanCompanyName(companyName);
    const nameParams = { first_name: firstName, last_name: lastName };
    const label = `[${firstName} ${lastName} @ ${companyName}]`;

    console.log(`[HUNTER] ${label} companyName="${companyName}" cleaned="${cleanedCompany}" linkedInUrl="${linkedInUrl}"`);

    // Strategy 1: linkedin_handle — most accurate when Hunter has indexed the profile
    const linkedInHandle = extractLinkedInHandle(linkedInUrl);
    if (linkedInHandle) {
        // S1a: try with original handle (may contain diacritics from Apify)
        const r1a = await hunterEmailFinderCall({ ...nameParams, linkedin_handle: linkedInHandle }, apiKey);
        console.log(`[HUNTER] ${label} S1a handle="${linkedInHandle}" → HTTP ${r1a.status}, email=${r1a.email ?? 'none'}, confidence=${r1a.confidence ?? '-'}${r1a.error ? ', err=' + r1a.error : ''}`);
        if (r1a.email) return { email: r1a.email, raw: r1a, strategy: 'linkedin_handle' };

        // S1b: try ASCII-normalized handle (ę→e, ó→o, etc.) — Hunter indexes handles in ASCII
        const asciiHandle = transliterateToAscii(linkedInHandle);
        if (asciiHandle !== linkedInHandle) {
            await new Promise(r => setTimeout(r, 300));
            const r1b = await hunterEmailFinderCall({ ...nameParams, linkedin_handle: asciiHandle }, apiKey);
            console.log(`[HUNTER] ${label} S1b handle_ascii="${asciiHandle}" → HTTP ${r1b.status}, email=${r1b.email ?? 'none'}, confidence=${r1b.confidence ?? '-'}${r1b.error ? ', err=' + r1b.error : ''}`);
            if (r1b.email) return { email: r1b.email, raw: r1b, strategy: 'linkedin_handle_ascii' };
        }
        await new Promise(r => setTimeout(r, 300));
    } else {
        console.log(`[HUNTER] ${label} S1 skipped — no handle in URL: "${linkedInUrl}"`);
    }

    // Strategy 2: email-finder with cleaned company name
    const r2 = await hunterEmailFinderCall({ ...nameParams, company: cleanedCompany }, apiKey);
    console.log(`[HUNTER] ${label} S2 company="${cleanedCompany}" → HTTP ${r2.status}, email=${r2.email ?? 'none'}, confidence=${r2.confidence ?? '-'}${r2.error ? ', err=' + r2.error : ''}`);
    if (r2.email) return { email: r2.email, raw: r2, strategy: 'company_cleaned' };

    // Strategy 3: domain-search → get company domain + email pattern → construct email
    // This mirrors what Hunter dashboard does: it shows a guessed email from the company's email pattern
    // even when the person isn't directly in Hunter's DB
    await new Promise(r => setTimeout(r, 300));
    const rd = await hunterResolveDomain(cleanedCompany, apiKey);
    console.log(`[HUNTER] ${label} S3 domain-search company="${cleanedCompany}" → HTTP ${rd.status}, domain=${rd.domain ?? 'none'}, pattern=${rd.pattern ?? 'none'}, emails_indexed=${rd.emails ?? '-'}${rd.error ? ', err=' + rd.error : ''}`);

    if (rd.domain) {
        // S3a: construct email directly from domain pattern (highest value — same logic as Hunter dashboard)
        if (rd.pattern) {
            const constructed = constructEmailFromPattern(firstName, lastName, rd.domain, rd.pattern);
            if (constructed) {
                console.log(`[HUNTER] ${label} S3a pattern="${rd.pattern}" → constructed: ${constructed}`);
                return { email: constructed, raw: { domain: rd.domain, pattern: rd.pattern }, strategy: 'pattern_constructed' };
            }
        }

        // S3b: fallback — email-finder with domain (for cases without a clear pattern)
        await new Promise(r => setTimeout(r, 300));
        const r3 = await hunterEmailFinderCall({ ...nameParams, domain: rd.domain }, apiKey);
        console.log(`[HUNTER] ${label} S3b email-finder domain="${rd.domain}" → HTTP ${r3.status}, email=${r3.email ?? 'none'}, confidence=${r3.confidence ?? '-'}${r3.error ? ', err=' + r3.error : ''}`);
        if (r3.email) return { email: r3.email, raw: { ...r3, domain: rd.domain }, strategy: 'domain_resolved' };
    }

    console.log(`[HUNTER] ${label} → all strategies failed`);
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
            await log(supabaseClient, sessionId, "[Etap 2/3] Hunter.io — brak klucza API, pomijam enrichment emaili.", "warning");
        } else {
            await log(supabaseClient, sessionId, `[Etap 2/3] Hunter.io — szukanie emaili dla ${profilesWithCompany} profili...`, "working");
        }

        if (weightsCount === 0) {
            await log(supabaseClient, sessionId, "Scoring: brak wag w tabeli, scoring będzie zerowy.", "warning");
        }

        // 4. Process each profile (Enrich, Score, Dedupe)
        console.log(`[NORM-API] Processing ${profiles.length} profiles...`);

        for (const [index, profile] of profiles.entries()) {
            let isDuplicate = existingUrls.has(profile.linkedInUrl);
            let email: string | undefined = undefined;

            // Skip enrichment if last name is a single initial (e.g. "D.", "K.")
            // LinkedIn hides surnames for privacy — Hunter cannot construct an email from one letter
            const lastNameCore = (profile.lastName || '').replace(/[.\s]/g, '');
            const lastNameTooShort = lastNameCore.length <= 1;
            if (lastNameTooShort) {
                console.log(`[HUNTER] [${profile.firstName} ${profile.lastName}] skipping — last name is a single initial (LinkedIn privacy)`);
            }

            // ENRICHMENT (Only if we have Hunter key and it's not a duplicate early on)
            if (!isDuplicate && hunterApiKey && profile.companyName && profile.firstName && !lastNameTooShort) {
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

            const progressStatus = isDuplicate ? 'duplikat' : (email ? '✓ email' : 'brak emaila');
            await log(supabaseClient, sessionId, `Hunter.io: ${index + 1}/${profiles.length} — ${progressStatus}`, 'working');

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
