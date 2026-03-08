import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { client_id, language } = await req.json();
    if (!client_id) throw new Error("client_id is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch client data
    const { data: client } = await supabase.from("clients").select("*").eq("id", client_id).single();
    if (!client) throw new Error("Client not found");

    const { data: permits } = await supabase.from("permits").select("*").eq("client_id", client_id);
    const { data: trucks } = await supabase.from("trucks").select("*").eq("client_id", client_id);
    const { data: tasks } = await supabase.from("tasks").select("*").eq("client_id", client_id);
    const { data: invoices } = await supabase.from("invoices").select("*").eq("client_id", client_id);

    const langMap: Record<string, string> = {
      pt: "Responda em Português do Brasil.",
      en: "Respond in English.",
      es: "Responda en Español.",
    };

    const systemPrompt = `You are an expert compliance and operations analyst for a trucking permit management company called MartinsAdviser. ${langMap[language] || langMap.pt}

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Add credits to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const report = result.choices?.[0]?.message?.content || "No report generated.";

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
