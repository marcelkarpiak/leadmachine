import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Type Definitions ---
interface NormalizedLead {
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    industry?: string;
    companyName?: string;
    linkedInUrl?: string;
    location?: string;
    companySize?: string;
    headline?: string;
    about?: string;
    photoUrl?: string;
    email?: string;
    score: number;
    scoreBreakdown: Record<string, number>;
    isDuplicate: boolean;
}

async function log(client: any, sessionId: string | undefined, message: string, type = 'info') {
    if (!sessionId) return;
    await client.from('scraping_logs').insert({ session_id: sessionId, message, type });
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { sessionId, userId, listIds, normalizedProfiles } = await req.json() as {
            sessionId?: string;
            userId?: string;
            listIds?: string[];
            normalizedProfiles: NormalizedLead[]
        };

        if (!normalizedProfiles || !Array.isArray(normalizedProfiles)) {
            throw new Error("Missing or invalid 'normalizedProfiles' payload");
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        await log(supabaseClient, sessionId, `Zapisywanie ${normalizedProfiles.filter(p => !p.isDuplicate).length} leadów do bazy...`, "working");

        // 1. Wyodrębnienie tylko NIE ZDUPLIKOWANYCH leadów do zapisania
        const validLeadsToInsert = normalizedProfiles.filter(p => !p.isDuplicate).map(p => ({
            first_name: p.firstName,
            last_name: p.lastName,
            full_name: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
            job_title: p.jobTitle,
            company_name: p.companyName,
            company_size: p.companySize,
            company_industry: p.industry,
            email: p.email,
            linkedin_url: p.linkedInUrl,
            score: p.score,
            score_breakdown: p.scoreBreakdown,
            headline: p.headline,
            about: p.about,
            photo_url: p.photoUrl,
            session_id: sessionId,
            source: 'scraping',
            user_id: userId
        }));

        let insertedLeadsData: any[] = [];

        // 2. Transakcyjny masowy insert bazy danych
        if (validLeadsToInsert.length > 0) {
            console.log(`[TRANS-API] Wrzucam ${validLeadsToInsert.length} nowych leadów bazy!`);
            const { data, error: insertError } = await supabaseClient
                .from('leads')
                .insert(validLeadsToInsert)
                .select('id');

            if (insertError) {
                throw new Error(`Failed inserting leads: ${insertError.message}`);
            }
            if (data) insertedLeadsData = data;
        } else {
            console.log(`[TRANS-API] Brak nowych leadów do zapisania (wszystkie 0 lub zduplikowane).`);
        }

        // 3. Połączenie zapisanych leadów z wybranymi listami
        if (insertedLeadsData.length > 0 && listIds && listIds.length > 0) {
            const listLeadsMappings: any[] = [];
            insertedLeadsData.forEach((lead, i) => {
                listIds.forEach(listId => {
                    listLeadsMappings.push({
                        list_id: listId,
                        lead_id: lead.id
                    });
                });
            });

            const { error: mappingError } = await supabaseClient
                .from('list_leads')
                .insert(listLeadsMappings);

            if (mappingError) {
                throw new Error(`Failed mapping lists: ${mappingError.message}`);
            }
        }

        // 4. Finalizowanie statystyk w Scraping Sessions
        if (sessionId) {
            const { error: statusError } = await supabaseClient
                .from('scraping_sessions')
                .update({
                    status: 'completed',
                    collected_count: validLeadsToInsert.length,
                    emails_found: validLeadsToInsert.filter(l => l.email).length,
                    finished_at: new Date().toISOString()
                })
                .eq('id', sessionId);

            if (statusError) console.error("[TRANS-API] Failed updating session status:", statusError);
        }

        const duplicatesSkipped = normalizedProfiles.length - validLeadsToInsert.length;
        await log(supabaseClient, sessionId, `Zakończono. Zapisano ${validLeadsToInsert.length} leadów, pominięto ${duplicatesSkipped} duplikatów.`, "success");

        // 5. Wysłanie powiadomienia e-mail (SMTP) — odczyt konfiguracji z api_keys
        const { data: smtpKeys } = await supabaseClient
            .from("api_keys")
            .select("key, value")
            .in("key", ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]);

        const smtpConfig: Record<string, string> = {};
        smtpKeys?.forEach(k => { smtpConfig[k.key] = k.value; });

        const smtpUser = smtpConfig["SMTP_USER"] || Deno.env.get("SMTP_USER");
        const smtpPassword = smtpConfig["SMTP_PASS"] || Deno.env.get("SMTP_PASSWORD");
        const smtpHost = smtpConfig["SMTP_HOST"] || Deno.env.get("SMTP_HOST") || "s84.cyber-folks.pl";
        const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465", 10);

        if (smtpUser && smtpPassword) {
            try {
                const client = new SmtpClient();
                console.log(`[TRANS-API] Connecting to SMTP Server ${smtpHost}:${smtpPort}`);

                await client.connectTLS({
                    hostname: smtpHost,
                    port: smtpPort,
                    username: smtpUser,
                    password: smtpPassword,
                });

                await client.send({
                    from: smtpUser, // 'marcel@ivorylab.pl'
                    to: smtpUser, // Wyślij testowo do admina
                    subject: `Scraping: Sukces! Zebrano ${validLeadsToInsert.length} leadów.`,
                    content: `Sesja scrapingu zakończona. \nLeady zaimportowane do bazy: ${validLeadsToInsert.length}.\nW tym znalezione e-maile: ${validLeadsToInsert.filter(l => l.email).length}\nZduplikowane (odrzucone) z dostarczonej paczki: ${normalizedProfiles.length - validLeadsToInsert.length}`,
                });

                await client.close();
                console.log("[TRANS-API] E-mail alert sent.");
            } catch (e: any) {
                console.error("[TRANS-API] WARNING: Could not send email via SMTP:", e?.message);
            }
        } else {
            console.warn("[TRANS-API] Brak zmiennych środowiskowych SMTP (SMTP_USER / SMTP_PASSWORD). Pomijam wysyłanie e-maila.");
        }

        return new Response(JSON.stringify({
            success: true,
            insertedCount: validLeadsToInsert.length,
            duplicatesSkipped: normalizedProfiles.length - validLeadsToInsert.length
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
            errorMessage = error.message;
        } else {
            errorMessage = String(error);
        }
        console.error("[TRANS-API] Error:", errorMessage);

        // Fallback save error to session if provided
        try {
            const bodyObj = await req.clone().json();
            if (bodyObj?.sessionId) {
                const tempClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
                await log(tempClient, bodyObj.sessionId, `Błąd Transport: ${errorMessage}`, "error");
                await tempClient.from('scraping_sessions').update({ status: 'failed', error_message: errorMessage }).eq('id', bodyObj.sessionId);
            }
        } catch (e) {
            // Silently ignore if we can't update session
        }

        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
