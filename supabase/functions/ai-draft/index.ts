// AI communication drafter
//
// Generates a ready-to-send renewal (or custom) message for a client in the
// client's own language, grounded in real permit/client data. Returns
// { subject, body } so the caller can drop it straight into the schedule /
// send-now flow.
//
// Auth mirrors ai-report: the caller must be an approved member of the
// client's org (cross-tenant isolation enforced in the function, since we read
// under the service role).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_INSTRUCTION: Record<string, string> = {
  pt: "Escreva em Português do Brasil.",
  en: "Write in English.",
  es: "Escribe en Español.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");

    const {
      client_id,
      permit_id,
      channel = "email",
      language = "pt",
      instruction = "",
    } = await req.json();
    if (!client_id) throw new Error("client_id is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity.
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) throw new Error("Not authenticated");
    const callerId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, serviceKey);

    const [{ data: client }, { data: permits }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", client_id).single(),
      supabase.from("permits").select("*").eq("client_id", client_id).order("expiration_date", { ascending: true }),
    ]);
    if (!client) throw new Error("Client not found");

    // Authorization: caller must be an approved member of the client's org.
    const { data: membership } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", client.org_id)
      .eq("user_id", callerId)
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!membership) throw new Error("Forbidden");

    const today = new Date();
    const focusPermit = permit_id ? (permits ?? []).find((p: any) => p.id === permit_id) : null;
    const expiringSoon = (permits ?? []).filter((p: any) => {
      if (!p.expiration_date) return false;
      const days = Math.ceil((new Date(p.expiration_date).getTime() - today.getTime()) / 86_400_000);
      return days <= 45;
    });

    const isShort = channel === "sms" || channel === "whatsapp";
    const channelGuidance = isShort
      ? `Canal: ${channel}. Mensagem curta (máx ~320 caracteres), sem assunto, sem markdown, direta e cordial. Deixe "subject" vazio.`
      : `Canal: email. Inclua um "subject" curto e específico e um "body" profissional com saudação e despedida. Sem markdown pesado.`;

    const permitLines = (permits ?? [])
      .map((p: any) => `- ${p.permit_type} ${p.permit_number ? `#${p.permit_number}` : ""} ${p.state || ""} | vence: ${p.expiration_date || "N/A"} | status: ${p.status}`)
      .join("\n");

    const focusLine = focusPermit
      ? `O foco da mensagem é a renovação deste permit: ${focusPermit.permit_type} ${focusPermit.permit_number ? `#${focusPermit.permit_number}` : ""} ${focusPermit.state || ""}, vencimento ${focusPermit.expiration_date || "N/A"}.`
      : expiringSoon.length
      ? `O foco é a renovação dos permits que vencem em breve: ${expiringSoon.map((p: any) => `${p.permit_type} (${p.expiration_date})`).join(", ")}.`
      : `Não há permits vencendo nos próximos 45 dias — escreva uma comunicação de acompanhamento cordial.`;

    const systemPrompt = `Você redige comunicações que a equipe de uma consultoria de compliance de transporte (permits IFTA, IRP, UCR, MCS-150 etc.) envia aos seus CLIENTES (transportadoras). ${LANG_INSTRUCTION[language] || LANG_INSTRUCTION.pt}

Tom profissional, claro e cordial. Use os dados reais abaixo. Nunca invente números de permit, datas ou valores que não estejam no contexto. Enderece o cliente pelo nome da empresa.

${channelGuidance}

CLIENTE: ${client.company_name}
DOT: ${client.dot || "N/A"} | MC: ${client.mc || "N/A"}
Contato: ${client.email || "N/A"} ${client.phone || ""}

PERMITS:
${permitLines || "nenhum permit cadastrado"}

${focusLine}

Data de hoje: ${today.toISOString().split("T")[0]}

${instruction ? `Instrução adicional do operador: ${instruction}` : ""}

Responda SOMENTE com JSON válido, sem cercas de código, no formato exato:
{"subject": "<assunto ou string vazia>", "body": "<corpo da mensagem>"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }],
      }),
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
    const raw = result.choices?.[0]?.message?.content ?? "";

    // The model occasionally wraps JSON in ```json fences — strip and parse
    // defensively. Fall back to using the whole text as the body.
    let subject = "";
    let body = raw.trim();
    const jsonText = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    try {
      const parsed = JSON.parse(jsonText);
      subject = typeof parsed.subject === "string" ? parsed.subject : "";
      body = typeof parsed.body === "string" ? parsed.body : body;
    } catch {
      // keep raw text as body
    }
    if (isShort) subject = "";

    return new Response(JSON.stringify({ subject, body }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-draft error:", e);
    const status = e instanceof Error && e.message === "Forbidden" ? 403 : 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
