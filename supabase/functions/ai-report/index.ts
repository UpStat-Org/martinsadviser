import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletion, aiErrorResponse } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");

    const { client_id, language } = await req.json();
    if (!client_id) throw new Error("client_id is required");


    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) throw new Error("Not authenticated");
    const callerId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch client data (includes org_id for isolation check)
    const { data: client } = await supabase.from("clients").select("*").eq("id", client_id).single();
    if (!client) throw new Error("Client not found");

    // Authorization: caller must be an approved member of the client's org
    const { data: membership } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", client.org_id)
      .eq("user_id", callerId)
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!membership) throw new Error("Forbidden: not a member of this client's organization");

    const { data: permits } = await supabase.from("permits").select("*").eq("client_id", client_id).eq("org_id", client.org_id);
    const { data: trucks } = await supabase.from("trucks").select("*").eq("client_id", client_id).eq("org_id", client.org_id);
    const { data: tasks } = await supabase.from("tasks").select("*").eq("client_id", client_id).eq("org_id", client.org_id);
    const { data: invoices } = await supabase.from("invoices").select("*").eq("client_id", client_id).eq("org_id", client.org_id);

    const langMap: Record<string, string> = {
      pt: "Responda em Português do Brasil.",
      en: "Respond in English.",
      es: "Responda en Español.",
    };

    const systemPrompt = `You are an expert compliance and operations analyst for a trucking permit management company called DotPilot. ${langMap[language] || langMap.pt}

Analyze the client data provided and generate a comprehensive report with:
1. **General Status Summary** - Overall health of the client's compliance
2. **Risk Analysis** - Expired or soon-to-expire permits, missing documentation
3. **Financial Summary** - Invoice status overview (if any)
4. **Pending Tasks** - Tasks that need attention
5. **Recommended Actions** - Concrete next steps prioritized by urgency

Use emojis for visual clarity. Be specific with dates and numbers. Format with markdown headers and bullet points.`;

    const userPrompt = `Client: ${client.company_name}
DOT: ${client.dot || "N/A"} | MC: ${client.mc || "N/A"} | EIN: ${client.ein || "N/A"}
Status: ${client.status}
Services: ${["IFTA", "CT", "NY", "KYU", "NM", "Auto"].filter((_, i) => [client.service_ifta, client.service_ct, client.service_ny, client.service_kyu, client.service_nm, client.service_automatic][i]).join(", ") || "None"}

Trucks (${trucks?.length || 0}):
${trucks?.map((t: any) => `- ${t.plate} | ${t.make || ""} ${t.model || ""} ${t.year || ""} | Status: ${t.status}`).join("\n") || "None"}

Permits (${permits?.length || 0}):
${permits?.map((p: any) => `- ${p.permit_type} #${p.permit_number || "N/A"} | State: ${p.state || "N/A"} | Expires: ${p.expiration_date || "N/A"} | Status: ${p.status}`).join("\n") || "None"}

Tasks (${tasks?.length || 0}):
${tasks?.map((t: any) => `- ${t.name} | Type: ${t.task_type || "N/A"} | Status: ${t.status}`).join("\n") || "None"}

Invoices (${invoices?.length || 0}):
${invoices?.map((i: any) => `- $${i.amount} | Due: ${i.due_date} | Status: ${i.status}`).join("\n") || "None"}

Today's date: ${new Date().toISOString().split("T")[0]}`;

    let report: string;
    try {
      report =
        (await chatCompletion([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ])) || "No report generated.";
    } catch (aiErr) {
      const mapped = aiErrorResponse(aiErr, corsHeaders);
      if (mapped) return mapped;
      throw aiErr;
    }

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
