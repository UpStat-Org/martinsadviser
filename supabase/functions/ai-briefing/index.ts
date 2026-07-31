import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletion, aiErrorResponse } from "../_shared/ai.ts";

// ---------------------------------------------------------------------------
// Daily briefing: turns MyDesk's flat ActionItem list into "do this first, and
// here's why".
//
// The signals are sent BY the caller rather than re-queried here. MyDesk
// already builds them from five hooks (assigned permits, assigned tasks,
// scheduled messages, invoices, risk scores) and that aggregation is a couple
// hundred lines of business logic — duplicating it server-side would guarantee
// the two drift apart. The trade-off is that a caller could POST fabricated
// signals; that is acceptable because the output is returned only to that same
// caller and is never persisted anywhere another user can read it. Nothing here
// grants access to data the caller could not already fetch directly.
//
// What IS enforced server-side: the caller must be an approved member of the
// org they claim, and the cached row is keyed to their own user_id.
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_INSTRUCTION: Record<string, string> = {
  pt: "Escreva em português do Brasil.",
  en: "Write in English.",
  es: "Escribe en español.",
};

// Bounds the prompt. MyDesk sorts by severity, so the tail it drops is the
// least urgent — but we tell the model how many were omitted so it can say so
// instead of implying the list is exhaustive.
const MAX_SIGNALS = 60;

interface Signal {
  id: string;
  kind: string;
  severity: string;
  title: string;
  subtitle?: string;
  meta?: string;
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");

    const { org_id, language, signals, force } = await req.json();
    if (!org_id) throw new Error("org_id is required");
    if (!Array.isArray(signals)) throw new Error("signals must be an array");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) throw new Error("Not authenticated");
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: membership } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", org_id)
      .eq("user_id", callerId)
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!membership) throw new Error("Forbidden: not a member of this organization");

    const today = new Date().toISOString().slice(0, 10);
    const trimmed: Signal[] = (signals as Signal[]).slice(0, MAX_SIGNALS);
    const omitted = signals.length - trimmed.length;

    // Hash only the fields that change the meaning of the briefing, so cosmetic
    // re-renders don't force a regeneration.
    const hashInput = JSON.stringify(
      trimmed.map((s) => [s.id, s.kind, s.severity, s.title, s.subtitle ?? "", s.meta ?? ""]),
    );
    const signalsHash = await sha256(`${language ?? "pt"}|${hashInput}`);

    if (!force) {
      const { data: cached } = await admin
        .from("ai_briefings")
        .select("payload, signals_hash, created_at")
        .eq("user_id", callerId)
        .eq("briefing_date", today)
        .maybeSingle();

      if (cached && cached.signals_hash === signalsHash) {
        return new Response(
          JSON.stringify({ ...cached.payload, cached: true, generated_at: cached.created_at }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Nothing to brief on — skip the model entirely rather than paying for it
    // to say "you're all clear".
    if (trimmed.length === 0) {
      const payload = { headline: "", summary: "", priorities: [], empty: true };
      return new Response(JSON.stringify({ ...payload, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é o chefe de operações de uma consultoria de compliance de transporte rodoviário nos EUA (permits IFTA, IRP, UCR, MCS-150, HVUT, drug testing, DQF). ${LANG_INSTRUCTION[language] || LANG_INSTRUCTION.pt}

Recebe a fila de pendências de UM operador e devolve um briefing curto do dia.

Regras:
- Escolha no máximo 4 prioridades. Menos é melhor se só há 1 ou 2 coisas que realmente importam.
- Agrupe quando fizer sentido: vários itens do mesmo cliente, ou do mesmo tipo, viram UMA prioridade.
- O campo "why" explica a CONSEQUÊNCIA de não agir (multa, cliente fora de operação, perda de receita), não repete o título.
- Severidade "critical" só para o que já venceu ou já está em falta.
- Não invente dado que não está na lista. Não prometa que você executou nada.
- headline: uma linha, no máximo 90 caracteres.
- summary: 1 a 2 frases sobre o estado geral do dia.

Responda SOMENTE com JSON válido no formato:
{"headline":"...","summary":"...","priorities":[{"ref_id":"<id do sinal principal>","title":"...","why":"...","severity":"critical|high|medium|low"}]}`;

    const userPrompt = `Data de hoje: ${today}

Fila do operador (${trimmed.length} itens${omitted > 0 ? `, outros ${omitted} de menor severidade omitidos` : ""}):
${trimmed
  .map(
    (s) =>
      `- [id=${s.id}] [${s.kind}/${s.severity}] ${s.title}${s.subtitle ? ` — ${s.subtitle}` : ""}${s.meta ? ` (${s.meta})` : ""}`,
  )
  .join("\n")}`;

    let raw: string;
    try {
      raw = await chatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { responseFormatJson: true, temperature: 0.3 },
      );
    } catch (aiErr) {
      const mapped = aiErrorResponse(aiErr, corsHeaders);
      if (mapped) return mapped;
      throw aiErr;
    }

    // JSON mode makes fences unlikely, but ai-draft learned the hard way that
    // "unlikely" isn't "never".
    const jsonText = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error("Model returned malformed JSON");
    }

    const validIds = new Set(trimmed.map((s) => s.id));
    const payload = {
      headline: String(parsed.headline ?? "").slice(0, 200),
      summary: String(parsed.summary ?? "").slice(0, 600),
      priorities: (Array.isArray(parsed.priorities) ? parsed.priorities : [])
        .slice(0, 4)
        .map((p: any) => ({
          // Drop hallucinated ids so the UI never renders a dead link.
          ref_id: validIds.has(p?.ref_id) ? p.ref_id : null,
          title: String(p?.title ?? "").slice(0, 160),
          why: String(p?.why ?? "").slice(0, 400),
          severity: ["critical", "high", "medium", "low"].includes(p?.severity)
            ? p.severity
            : "medium",
        }))
        .filter((p: { title: string }) => p.title),
    };

    const { error: upsertErr } = await admin
      .from("ai_briefings")
      .upsert(
        {
          org_id,
          user_id: callerId,
          briefing_date: today,
          signals_hash: signalsHash,
          payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,briefing_date" },
      );
    if (upsertErr) console.error("ai-briefing cache write failed:", upsertErr.message);

    return new Response(JSON.stringify({ ...payload, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-briefing error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
