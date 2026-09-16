import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletion, aiErrorResponse } from "../_shared/ai.ts";
import type { ChatMessage } from "../_shared/ai.ts";
import type { Database } from "../../../src/integrations/supabase/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");
    const { client_id, message, language } = await req.json();
    if (typeof client_id !== "string" || typeof message !== "string" || !message.trim()) {
      throw new Error("client_id and message are required");
    }


    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient<Database>(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await caller.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) throw new Error("Not authenticated");
    const userId = claimsData.claims.sub;

    const supabase = createClient<Database>(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // The service-role client bypasses RLS, so prove membership before reading
    // any client context or private notes from this organization.
    const { data: client } = await supabase.from("clients").select("*").eq("id", client_id).single();
    if (!client) throw new Error("Client not found");
    const { data: membership } = await supabase.from("organization_members")
      .select("user_id")
      .eq("organization_id", client.org_id)
      .eq("user_id", userId)
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!membership) throw new Error("Forbidden: not a member of this client's organization");

    const [{ data: permits }, { data: trucks }, { data: tasks }, { data: invoices }, { data: notes }, { data: history }] = await Promise.all([
      supabase.from("permits").select("*").eq("client_id", client_id).eq("org_id", client.org_id),
      supabase.from("trucks").select("*").eq("client_id", client_id).eq("org_id", client.org_id),
      supabase.from("tasks").select("*").eq("client_id", client_id).eq("org_id", client.org_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("invoices").select("*").eq("client_id", client_id).eq("org_id", client.org_id),
      supabase.from("client_internal_notes").select("body, user_name, created_at").eq("client_id", client_id).eq("org_id", client.org_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("ai_chat_messages").select("role, content").eq("client_id", client_id).eq("org_id", client.org_id).order("created_at", { ascending: true }).limit(20),
    ]);

    const langMap: Record<string, string> = {
      pt: "Responda em Português do Brasil.",
      en: "Respond in English.",
      es: "Responda en Español.",
    };

    const systemPrompt = `Você é um assistente operacional para a equipe da DotPilot, uma consultoria de compliance de transporte (permits IFTA, CT, NY, KYU, NM, BOC-3, MCS-150). ${langMap[language] || langMap.pt}

Você está conversando com um FUNCIONÁRIO interno (não com o cliente final). Seja direto, prático e use markdown. Quando rascunhar emails, use tom profissional. Sempre baseie respostas no contexto fornecido. Se algo não estiver no contexto, diga claramente.

CONTEXTO DO CLIENTE:
Nome: ${client.company_name}
DOT: ${client.dot || "N/A"} | MC: ${client.mc || "N/A"} | EIN: ${client.ein || "N/A"}
Status: ${client.status}
Telefone: ${client.phone || "N/A"} | Email: ${client.email || "N/A"}

Trucks (${trucks?.length || 0}): ${trucks?.map((t) => `${t.plate} (${t.status})`).join(", ") || "nenhum"}

Permits (${permits?.length || 0}):
${permits?.map((p) => `- ${p.permit_type} #${p.permit_number || "N/A"} ${p.state || ""} | vence: ${p.expiration_date || "N/A"} | status: ${p.status}`).join("\n") || "nenhum"}

Tasks recentes:
${tasks?.map((t) => `- [${t.status}] ${t.name}`).join("\n") || "nenhuma"}

Faturas:
${invoices?.map((i) => `- $${i.amount} | due ${i.due_date} | ${i.status}`).join("\n") || "nenhuma"}

Notas internas (privadas da equipe):
${notes?.map((n) => `- ${n.user_name}: ${n.body}`).join("\n") || "nenhuma"}

Data de hoje: ${new Date().toISOString().split("T")[0]}`;

    const conversation: ChatMessage[] = (history ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...conversation,
      { role: "user", content: message },
    ];

    let reply: string;
    try {
      reply = (await chatCompletion(messages)) || "Sem resposta.";
    } catch (aiErr) {
      const mapped = aiErrorResponse(aiErr, corsHeaders);
      if (mapped) return mapped;
      throw aiErr;
    }

    // Persist user msg + assistant reply
    await supabase.from("ai_chat_messages").insert([
      { client_id, org_id: client.org_id, user_id: userId, role: "user", content: message },
      { client_id, org_id: client.org_id, user_id: userId, role: "assistant", content: reply },
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
