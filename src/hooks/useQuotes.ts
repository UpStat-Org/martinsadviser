import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";
import type { BillingType } from "@/hooks/useServices";

// quotes / quote_items aren't in the generated types yet — cast (see useInsurance).
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (patch: unknown) => any;
    delete: () => any;
  };
};

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface Quote {
  id: string;
  org_id: string;
  user_id: string;
  lead_id: string | null;
  client_id: string | null;
  quote_number: string | null;
  title: string;
  status: QuoteStatus;
  valid_until: string | null;
  notes: string | null;
  discount: number;
  subtotal: number;
  total: number;
  sent_at: string | null;
  accepted_at: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
  leads?: { company_name: string } | null;
  clients?: { company_name: string } | null;
}

export interface QuoteItem {
  id: string;
  org_id: string;
  quote_id: string;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  billing_type: BillingType;
  position: number;
  created_at: string;
}

export type QuoteInsert = {
  lead_id?: string | null;
  client_id?: string | null;
  title: string;
  valid_until?: string | null;
  notes?: string | null;
  discount?: number;
};

export type QuoteItemInsert = {
  quote_id: string;
  service_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  billing_type: BillingType;
  position?: number;
};

export function lineTotal(item: Pick<QuoteItem, "quantity" | "unit_price">): number {
  return Number(item.quantity || 0) * Number(item.unit_price || 0);
}

// subtotal = sum of every line; total = subtotal − discount (never below 0).
export function computeTotals(items: Pick<QuoteItem, "quantity" | "unit_price">[], discount: number) {
  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  return { subtotal, total };
}

export function useQuotes() {
  return useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await db
        .from("quotes")
        .select("*, leads(company_name), clients(company_name)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Quote[];
    },
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ["quotes", "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("quotes")
        .select("*, leads(company_name), clients(company_name)")
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as Quote;
    },
  });
}

export function useQuoteItems(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["quote_items", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await db
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteId!)
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as QuoteItem[];
    },
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: QuoteInsert) => {
      const { data, error } = await db.from("quotes").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as Quote;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: tNow("quotes.saved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, silent, ...patch }: Partial<Quote> & { id: string; silent?: boolean }) => {
      const { data, error } = await db.from("quotes").update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as Quote;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["quotes", "detail", (_d as Quote)?.id] });
      if (!vars.silent) toast({ title: tNow("quotes.saved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("quotes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: tNow("quotes.removed") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useCreateQuoteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuoteItemInsert) => {
      const { data, error } = await db.from("quote_items").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as QuoteItem;
    },
    onSuccess: (item) => qc.invalidateQueries({ queryKey: ["quote_items", item.quote_id] }),
  });
}

export function useUpdateQuoteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<QuoteItemInsert> & { id: string }) => {
      const { data, error } = await db.from("quote_items").update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as QuoteItem;
    },
    onSuccess: (item) => qc.invalidateQueries({ queryKey: ["quote_items", item.quote_id] }),
  });
}

export function useDeleteQuoteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; quoteId: string }) => {
      const { error } = await db.from("quote_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["quote_items", vars.quoteId] }),
  });
}

// ── Accept & convert ───────────────────────────────────────────────────────
// Accepting a quote materializes it into billing:
//   • resolve a target client (existing client_id, or promote the lead → client)
//   • flat line items → one pending invoice (their sum, less the discount)
//   • recurring line items → one recurring_plan each, due today
//   • stamp the quote accepted + converted so it can't be re-run
export function useAcceptQuote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ quote, items }: { quote: Quote; items: QuoteItem[] }) => {
      if (quote.converted_at) throw new Error(tNow("quotes.alreadyConverted"));
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tNow("toast.authRequired"));

      // 1) Resolve the client.
      let clientId = quote.client_id;
      if (!clientId && quote.lead_id) {
        const { data: lead, error: lErr } = await db
          .from("leads").select("*").eq("id", quote.lead_id).single();
        if (lErr) throw new Error(lErr.message);
        if (lead.converted_client_id) {
          clientId = lead.converted_client_id;
        } else {
          const { data: client, error: cErr } = await db
            .from("clients")
            .insert({
              user_id: user.id,
              company_name: lead.company_name,
              dot: lead.dot || null,
              mc: lead.mc || null,
              email: lead.email || null,
              phone: lead.phone || null,
              registration_responsible: lead.contact_name || null,
            })
            .select("id").single();
          if (cErr) throw new Error(cErr.message);
          clientId = client.id;
          await db.from("leads").update({ stage: "won", converted_client_id: client.id }).eq("id", lead.id);
        }
      }
      if (!clientId) throw new Error(tNow("quotes.noClient"));

      const today = new Date().toISOString().slice(0, 10);
      const dueDate = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10);

      // 2) Flat items → a single invoice.
      const flat = items.filter((i) => i.billing_type === "flat");
      const flatSum = flat.reduce((s, i) => s + lineTotal(i), 0);
      const invoiceAmount = Math.max(0, flatSum - Number(quote.discount || 0));
      if (flat.length > 0 && invoiceAmount > 0) {
        const { error: invErr } = await db.from("invoices").insert({
          org_id: quote.org_id,
          user_id: user.id,
          client_id: clientId,
          amount: invoiceAmount,
          status: "pending",
          due_date: dueDate,
          description: `${quote.quote_number ?? tNow("quotes.title")} — ${quote.title}`,
        });
        if (invErr) throw new Error(invErr.message);
      }

      // 3) Recurring items → recurring_plans.
      const recurring = items.filter((i) => i.billing_type !== "flat");
      for (const item of recurring) {
        const { error: pErr } = await db.from("recurring_plans").insert({
          org_id: quote.org_id,
          user_id: user.id,
          client_id: clientId,
          service_id: item.service_id || null,
          name: item.description || quote.title,
          amount: lineTotal(item),
          frequency: item.billing_type,
          next_run_on: today,
          status: "active",
          description: item.description || null,
        });
        if (pErr) throw new Error(pErr.message);
      }

      // 4) Stamp the quote.
      const nowIso = new Date().toISOString();
      const { error: qErr } = await db.from("quotes").update({
        status: "accepted",
        client_id: clientId,
        accepted_at: nowIso,
        converted_at: nowIso,
      }).eq("id", quote.id);
      if (qErr) throw new Error(qErr.message);

      return { clientId, invoices: flat.length && invoiceAmount > 0 ? 1 : 0, plans: recurring.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["recurring_plans"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: tNow("quotes.accepted") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}
