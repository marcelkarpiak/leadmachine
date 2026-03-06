import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function log(client: any, sessionId: string, message: string, type = 'info') {
    await client.from('scraping_logs').insert({ session_id: sessionId, message, type });
}

serve(async (req) => {
    // Handle CORS preflight options
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { sessionId } = await req.json();

        if (!sessionId) {
            return new Response(JSON.stringify({ error: "Missing sessionId" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Fetch Session Details
        const { data: sessionData, error: sessionError } = await supabaseClient
            .from("scraping_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

        if (sessionError || !sessionData) {
            throw new Error(`Session not found: ${sessionError?.message}`);
        }

        // 2. Set Session Status to "running"
        await supabaseClient
            .from("scraping_sessions")
            .update({ status: "running" })
            .eq("id", sessionId);

        // 3. Fetch Apify token from api_keys table
        const { data: apifyKeyRow, error: apifyKeyError } = await supabaseClient
            .from("api_keys")
            .select("value")
            .eq("key", "APIFY_API_TOKEN")
            .single();

        if (apifyKeyError || !apifyKeyRow?.value) {
            throw new Error("Brak tokenu APIFY_API_TOKEN w tabeli api_keys. Ustaw go w Ustawieniach aplikacji.");
        }
        const apifyToken = apifyKeyRow.value;

        const filters = sessionData.filters || {};
        const input: Record<string, unknown> = {
            maxItems: sessionData.target_count || 50,
        };

        // Map filters to HarvestAPI linkedin-profile-search input fields
        // jobTitle goes to searchQuery (Boolean OR string) — works best with Apify for "CEO, CTO, Founder" etc.
        if (filters.jobTitle) {
            // Convert "CEO, Head of Sales" -> '"CEO" OR "Head of Sales"' for LinkedIn boolean search
            input.searchQuery = filters.jobTitle
                .split(",")
                .map((s: string) => `"${s.trim()}"`)
                .join(" OR ");
        }
        if (filters.location) {
            input.locations = filters.location.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
        if (filters.industryIds && Array.isArray(filters.industryIds) && filters.industryIds.length > 0) {
            input.industryIds = filters.industryIds;
        }

        console.log(`[ACQ-API] Starting Apify run for session ${sessionId}`, input);
        await log(supabaseClient, sessionId, `[Etap 1/3] Apify — szukanie profili LinkedIn (cel: ${sessionData.target_count || '?'})...`, "working");

        // 4. Start Apify Actor
        const apifyResponse = await fetch(`https://api.apify.com/v2/acts/harvestapi~linkedin-profile-search/runs?token=${apifyToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });

        const apifyRunData = await apifyResponse.json();

        if (!apifyResponse.ok) {
            throw new Error(`Apify start failed: ${JSON.stringify(apifyRunData)}`);
        }

        // (A) Polling Apify Status co 2 sekundy
        let runDetails = apifyRunData.data;
        let isTaskFinished = false;
        let lastLoggedCount = -1;
        const targetCount = sessionData.target_count || 0;

        while (!isTaskFinished) {
            await new Promise(r => setTimeout(r, 2000));

            const statusRes = await fetch(`https://api.apify.com/v2/acts/harvestapi~linkedin-profile-search/runs/${runDetails.id}?token=${apifyToken}`);
            const statusData = await statusRes.json();
            runDetails = statusData.data;

            const currentCount: number = runDetails.stats?.itemCount ?? 0;
            if (currentCount > lastLoggedCount && currentCount > 0) {
                const target = targetCount > 0 ? `/${targetCount}` : '';
                await log(supabaseClient, sessionId, `Apify: ${currentCount}${target} profili znalezionych...`, "working");
                lastLoggedCount = currentCount;
            }

            if (runDetails.status === "SUCCEEDED" || runDetails.status === "FAILED" || runDetails.status === "ABORTED" || runDetails.status === "TIMED-OUT") {
                isTaskFinished = true;
            }
        }

        if (runDetails.status !== "SUCCEEDED") {
            throw new Error(`Apify run did not succeed. Status: ${runDetails.status}`);
        }

        // 5. Fetch Dataset Items from Apify
        const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${runDetails.defaultDatasetId}/items?token=${apifyToken}`);
        const apifyProfiles = await datasetRes.json();

        console.log(`[ACQ-API] Gathered ${apifyProfiles.length} raw profiles from Apify.`);
        await log(supabaseClient, sessionId, `[Etap 1/3] Apify — zebrano ${apifyProfiles.length} profili. Przekazuję do enrichmentu...`, "success");

        // 6. Map Apify output to unified RawProfile format for normalization
        // NOTE: HarvestAPI LinkedIn Profile Search does NOT return companyIndustry or companySize.
        // currentPosition[0] has companyName but no position field.
        // experience[0] has position (job title) and companyName.
        const profiles = apifyProfiles.map((p: any) => {
            const currentPosition = p.currentPosition?.[0];
            const currentExperience = p.experience?.[0];
            return {
                firstName: p.firstName || "",
                lastName: p.lastName || "",
                jobTitle: currentExperience?.position || p.headline || "",
                companyName: currentPosition?.companyName || currentExperience?.companyName || "",
                linkedInUrl: p.linkedinUrl || "",
                location: p.location?.parsed?.text || p.location?.linkedinText || "",
                industry: "",
                companySize: "",
                headline: p.headline || "",
                about: p.about || "",
                photoUrl: p.photo || p.profilePicture || "",
            };
        });

        return new Response(JSON.stringify({
            success: true,
            runId: runDetails.id,
            profiles
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("[ACQ-API] Error:", error.message);

        // Log error to scraping_logs if we have a sessionId
        try {
            const bodyObj = await req.clone().json();
            if (bodyObj?.sessionId) {
                const tempClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
                await log(tempClient, bodyObj.sessionId, `Błąd Acquisition: ${error.message}`, "error");
                await tempClient.from('scraping_sessions').update({ status: 'failed', error_message: error.message }).eq('id', bodyObj.sessionId);
            }
        } catch (_) { /* ignore */ }

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
