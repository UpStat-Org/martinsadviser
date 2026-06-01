// Feature 1 — Compliance Calendar → Task Automation Engine
//
// Daily cron walks the fixed-schedule filing deadlines (the same set the app
// renders in src/lib/complianceCalendar.ts) and, for every deadline falling
// inside each org's lead window, opens ONE Kanban task scoped to the right
// entity:
//   * IFTA / KYU / NM quarterly → clients that subscribe to that service
//   * UCR annual               → clients with a USDOT number
//   * HVUT (2290) annual       → one task per truck
//   * MCS-150 biennial         → clients with a USDOT (FMCSA digit schedule)
//
// Idempotency: every (kind, due_date, client[, truck]) maps to a stable
// dedupe_key. We insert into compliance_task_log FIRST; a 23505 unique
// violation means "already handled" and we skip. Mirrors the dedupe-first
// pattern in check-permit-expirations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAY_MS = 86_400_000;

type Kind =
  | "iftaQuarter"
  | "kyuQuarter"
  | "nmQuarter"
  | "hvutAnnual"
  | "ucrAnnual"
  | "mcs150Biennial";

interface Deadline {
  date: string; // YYYY-MM-DD (UTC)
  kind: Kind;
  period: "Q1" | "Q2" | "Q3" | "Q4" | null;
}

function isoDate(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

// Same quarterly due dates as the app: Apr 30, Jul 31, Oct 31, Jan 31 (next yr).
const QUARTER_DUE = [
  { monthIndex: 3, day: 30, period: "Q1" as const, rollYear: false },
  { monthIndex: 6, day: 31, period: "Q2" as const, rollYear: false },
  { monthIndex: 9, day: 31, period: "Q3" as const, rollYear: false },
  { monthIndex: 0, day: 31, period: "Q4" as const, rollYear: true },
];

// Generate every fixed-schedule deadline between [start, end] (inclusive).
function generateFixedDeadlines(startMs: number, endMs: number): Deadline[] {
  const startYear = new Date(startMs).getUTCFullYear();
  const endYear = new Date(endMs).getUTCFullYear();
  const out: Deadline[] = [];

  for (let y = startYear - 1; y <= endYear + 1; y++) {
    for (const q of QUARTER_DUE) {
      const date = isoDate(q.rollYear ? y + 1 : y, q.monthIndex, q.day);
      out.push({ date, kind: "iftaQuarter", period: q.period });
      out.push({ date, kind: "kyuQuarter", period: q.period });
      out.push({ date, kind: "nmQuarter", period: q.period });
    }
    out.push({ date: isoDate(y, 7, 31), kind: "hvutAnnual", period: null }); // Aug 31
    out.push({ date: isoDate(y, 11, 31), kind: "ucrAnnual", period: null }); // Dec 31
  }

  return out.filter((d) => {
    const ms = new Date(d.date).getTime();
    return ms >= startMs && ms <= endMs;
  });
}

// FMCSA derives the MCS-150 biennial month from the USDOT number:
//   last digit  → month (1=Jan ... 9=Sep, 0=Oct)
//   2nd-to-last → odd years (odd digit) or even years (even digit)
// If the carrier already filed, next due = lastFiled + 24 months.
const MONTH_BY_LAST_DIGIT: Record<string, number> = {
  "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6, "8": 7, "9": 8, "0": 9,
};

function nextMcs150Due(dot: string, lastFiledAt: string | null, ref: Date): Date | null {
  if (lastFiledAt) {
    const d = new Date(lastFiledAt);
    return new Date(Date.UTC(d.getUTCFullYear() + 2, d.getUTCMonth(), d.getUTCDate()));
  }
  const digits = dot.replace(/\D/g, "");
  if (digits.length < 2) return null;
  const month = MONTH_BY_LAST_DIGIT[digits[digits.length - 1]];
  if (month === undefined) return null;
  const wantsOdd = parseInt(digits[digits.length - 2], 10) % 2 === 1;
  for (let i = 0; i < 4; i++) {
    const cy = ref.getUTCFullYear() + i;
    if ((cy % 2 === 1) !== wantsOdd) continue;
    const candidate = new Date(Date.UTC(cy, month, 1));
    if (candidate.getTime() >= Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate())) {
      return candidate;
    }
  }
  return null;
}

function priorityFor(daysUntil: number): string {
  if (daysUntil <= 15) return "high";
  if (daysUntil <= 30) return "medium";
  return "low";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const runId = crypto.randomUUID();
  const log = (level: "info" | "warn" | "error", msg: string, extra?: unknown) =>
    console.log(JSON.stringify({ runId, level, msg, extra, ts: new Date().toISOString() }));

  try {
    const { data: settingsRows, error: settingsErr } = await supabase
      .from("compliance_automation_settings")
      .select("*")
      .eq("enabled", true);
    if (settingsErr) throw settingsErr;
    if (!settingsRows?.length) {
      return new Response(JSON.stringify({ runId, message: "No orgs with automation enabled", created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const s of settingsRows) {
      const leadDays = Math.min(Math.max(Number(s.lead_days) || 30, 1), 180);
      const windowEndMs = todayMs + leadDays * DAY_MS;

      const enabledByKind: Record<Kind, boolean> = {
        iftaQuarter: s.ifta_enabled,
        kyuQuarter: s.kyu_enabled,
        nmQuarter: s.nm_enabled,
        hvutAnnual: s.hvut_enabled,
        ucrAnnual: s.ucr_enabled,
        mcs150Biennial: s.mcs150_enabled,
      };

      // Fetch this org's clients (with service flags) and trucks once.
      const { data: clients, error: clientsErr } = await supabase
        .from("clients")
        .select("id, user_id, org_id, company_name, dot, mcs_150_last_filed_at, service_ifta, service_kyu, service_nm")
        .eq("org_id", s.org_id);
      if (clientsErr) {
        log("error", "fetch_clients_failed", { orgId: s.org_id, error: clientsErr.message });
        totalErrors++;
        continue;
      }
      const clientList = clients ?? [];

      const { data: trucks } = await supabase
        .from("trucks")
        .select("id, user_id, org_id, client_id, plate, clients(company_name)")
        .eq("org_id", s.org_id);

      // ── Build the work list: { kind, date, period, client, truck? } ──────────
      const fixed = generateFixedDeadlines(todayMs, windowEndMs);
      type Job = { kind: Kind; date: string; period: Deadline["period"]; client: any; truck?: any };
      const jobs: Job[] = [];

      for (const d of fixed) {
        if (!enabledByKind[d.kind]) continue;
        if (d.kind === "iftaQuarter") {
          for (const c of clientList) if (c.service_ifta) jobs.push({ ...d, client: c });
        } else if (d.kind === "kyuQuarter") {
          for (const c of clientList) if (c.service_kyu) jobs.push({ ...d, client: c });
        } else if (d.kind === "nmQuarter") {
          for (const c of clientList) if (c.service_nm) jobs.push({ ...d, client: c });
        } else if (d.kind === "ucrAnnual") {
          for (const c of clientList) if (String(c.dot ?? "").trim()) jobs.push({ ...d, client: c });
        } else if (d.kind === "hvutAnnual") {
          for (const tr of trucks ?? []) {
            const client = clientList.find((c) => c.id === tr.client_id);
            jobs.push({ ...d, client: client ?? null, truck: tr });
          }
        }
      }

      // ── MCS-150 biennial (per client, FMCSA digit schedule) ──────────────────
      if (enabledByKind.mcs150Biennial) {
        for (const c of clientList) {
          const dot = String(c.dot ?? "").trim();
          if (!dot) continue;
          const due = nextMcs150Due(dot, c.mcs_150_last_filed_at, now);
          if (!due) continue;
          const dueMs = due.getTime();
          if (dueMs < todayMs || dueMs > windowEndMs) continue;
          jobs.push({ kind: "mcs150Biennial", date: due.toISOString().slice(0, 10), period: null, client: c });
        }
      }

      // ── Materialise each job (dedupe-first) ──────────────────────────────────
      for (const job of jobs) {
        const ownerId = job.truck?.user_id ?? job.client?.user_id;
        const clientId = job.client?.id ?? null;
        if (!ownerId) continue; // can't attribute the task; skip safely

        const dedupeKey = `${job.kind}:${job.date}:${clientId ?? "-"}:${job.truck?.id ?? "-"}`;

        const { error: logErr } = await supabase
          .from("compliance_task_log")
          .insert({
            org_id: s.org_id,
            client_id: clientId,
            truck_id: job.truck?.id ?? null,
            kind: job.kind,
            due_date: job.date,
            dedupe_key: dedupeKey,
          });

        if (logErr) {
          if ((logErr as { code?: string }).code === "23505") {
            totalSkipped++;
            continue;
          }
          log("error", "compliance_log_insert_failed", { dedupeKey, error: logErr.message });
          totalErrors++;
          continue;
        }

        const company = job.client?.company_name ?? "—";
        const daysUntil = Math.ceil((new Date(job.date).getTime() - todayMs) / DAY_MS);
        const year = job.date.slice(0, 4);
        let name: string;
        switch (job.kind) {
          case "iftaQuarter": name = `IFTA ${job.period} - ${company}`; break;
          case "kyuQuarter": name = `KYU ${job.period} - ${company}`; break;
          case "nmQuarter": name = `NM Weight Distance ${job.period} - ${company}`; break;
          case "ucrAnnual": name = `UCR ${year} - ${company}`; break;
          case "hvutAnnual": name = `HVUT 2290 ${year} - ${company}${job.truck?.plate ? ` (${job.truck.plate})` : ""}`; break;
          case "mcs150Biennial": name = `MCS-150 - ${company} (DOT ${String(job.client?.dot ?? "").trim()})`; break;
        }

        const { data: task, error: taskErr } = await supabase
          .from("tasks")
          .insert({
            user_id: ownerId,
            org_id: s.org_id,
            client_id: clientId,
            name,
            task_type: job.kind,
            status: "not_started",
            priority: priorityFor(daysUntil),
            due_date: job.date,
            notes: `[Auto] Prazo de compliance gerado automaticamente. Vence em ${job.date} (${daysUntil} dias).`,
          })
          .select("id")
          .single();

        if (taskErr) {
          // Roll back the ledger row so the next run can retry.
          await supabase.from("compliance_task_log").delete().eq("dedupe_key", dedupeKey);
          log("error", "task_insert_failed", { dedupeKey, error: taskErr.message });
          totalErrors++;
          continue;
        }

        // Link the task back into the ledger (best-effort).
        await supabase.from("compliance_task_log").update({ task_id: task.id }).eq("dedupe_key", dedupeKey);

        if (s.notify && clientId) {
          await supabase.from("notifications").insert({
            user_id: ownerId,
            org_id: s.org_id,
            type: "compliance_due",
            title: name,
            body: `Vence em ${job.date} — ${daysUntil} dia(s).`,
            entity_id: clientId,
          });
        }

        totalCreated++;
      }
    }

    log("info", "run_complete", { created: totalCreated, skipped: totalSkipped, errors: totalErrors });
    return new Response(
      JSON.stringify({ runId, message: "Done", created: totalCreated, skipped: totalSkipped, errors: totalErrors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    log("error", "run_failed", { error: (error as Error).message });
    return new Response(JSON.stringify({ runId, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
