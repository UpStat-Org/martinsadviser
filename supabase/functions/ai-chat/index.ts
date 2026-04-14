import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { client_id, message, language } = await req.json();
    if (!client_id || !message) throw new Error("client_id and message are required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identify the user calling
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(jwt);
    const userId = userData?.user?.id ?? null;

    // Fetch client context
    const [{ data: client }, { data: permits }, { data: trucks }, { data: tasks }, { data: invoices }, { data: notes }, { data: history }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", client_id).single(),
      supabase.from("permits").select("*").eq("client_id", client_id),
      supabase.from("trucks").select("*").eq("client_id", client_id),
      supabase.from("tasks").select("*").eq("client_id", client_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("invoices").select("*").eq("client_id", client_id),
      supabase.from("client_internal_notes").select("body, user_name, created_at").eq("client_id", client_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("ai_chat_messages").select("role, content").eq("client_id", client_id).order("created_at", { ascending: true }).limit(20),
    ]);

    if (!client) throw new Error("Client not found");

    const langMap: Record<string, string> = {
      pt: "Responda em Português do Brasil.",
      en: "Respond in English.",
      es: "Responda en Español.",
    };

    const systemPrompt = `Você é um assistente operacional para a equipe da MartinsAdviser, uma consultoria de compliance de transporte (permits IFTA, CT, NY, KYU, NM, BOC-3, MCS-150). ${langMap[language] || langMap.pt}

Você está conversando com um FUNCIONÁRIO interno (não com o cliente final). Seja direto, prático e use markdown. Quando rascunhar emails, use tom profissional. Sempre baseie respostas no contexto fornecido. Se algo não estiver no contexto, diga claramente.

CONTEXTO DO CLIENTE:
Nome: ${client.company_name}
DOT: ${client.dot || "N/A"} | MC: ${client.mc || "N/A"} | EIN: ${client.ein || "N/A"}
Status: ${client.status}
Telefone: ${client.phone || "N/A"} | Email: ${client.email || "N/A"}

Trucks (${trucks?.length || 0}): ${trucks?.map((t: any) => `${t.plate} (${t.status})`).join(", ") || "nenhum"}

Permits (${permits?.length || 0}):
${permits?.map((p: any) => `- ${p.permit_type} #${p.permit_number || "N/A"} ${p.state || ""} | vence: ${p.expiration_date || "N/A"} | status: ${p.status}`).join("\n") || "nenhum"}

Tasks recentes:
${tasks?.map((t: any) => `- [${t.status}] ${t.name}`).join("\n") || "nenhuma"}

Faturas:
${invoices?.map((i: any) => `- $${i.amount} | due ${i.due_date} | ${i.status}`).join("\n") || "nenhuma"}

Notas internas (privadas da equipe):
${notes?.map((n: any) => `- ${n.user_name}: ${n.body}`).join("\n") || "nenhuma"}

Data de hoje: ${new Date().toISOString().split("T")[0]}`;

    const conversation = (history ?? []).map((m: any) => ({ role: m.role, content: m.content }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversation,
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Add credits to your workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const reply = result.choices?.[0]?.message?.content || "Sem resposta.";

    // Persist user msg + assistant reply
    await supabase.from("ai_chat_messages").insert([
      { client_id, user_id: userId, role: "user", content: message },
      { client_id, user_id: userId, role: "assistant", content: reply },
    ]);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
