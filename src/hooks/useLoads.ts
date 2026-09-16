import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";

// loads / load_stops / load_documents são criadas por
// 20260824140000_loads_dispatch.sql e ainda não estão no `Database` gerado —
// os types só são regerados depois que a migration é aplicada. Mesmo builder
// solto que useDrivers e useQuotes usam pelo mesmo motivo.
const db = supabase;

// Ordem do ciclo operacional. A carga NÃO tem estado de cobrança: isso vive em
// invoices, alcançável por invoice_id. Ver o cabeçalho da migration.
export const LOAD_STATUSES = [
  "quoted",
  "booked",
  "dispatched",
  "in_transit",
  "delivered",
  "cancelled",
] as const;
export type LoadStatus = (typeof LOAD_STATUSES)[number];

// Colunas do board. `cancelled` fica de fora: carga cancelada não é uma etapa
// do trajeto, é uma saída dele — mostrá-la como coluna faria o board crescer
// para sempre com o que já não interessa. Ela aparece na lista, com filtro.
export const LOAD_BOARD_STATUSES: LoadStatus[] = [
  "quoted",
  "booked",
  "dispatched",
  "in_transit",
  "delivered",
];

/** Estados em que a carga já saiu para a rua — usados para bloquear exclusão acidental. */
export const LOAD_ACTIVE_STATUSES: LoadStatus[] = ["dispatched", "in_transit"];

export type DistanceUnit = "mi" | "km";
export type WeightUnit = "lb" | "kg";

export interface Load {
  id: string;
  org_id: string;
  user_id: string;
  client_id: string;
  truck_id: string | null;
  driver_id: string | null;
  invoice_id: string | null;
  reference: string | null;
  status: LoadStatus;
  origin_city: string | null;
  origin_region: string | null;
  destination_city: string | null;
  destination_region: string | null;
  pickup_at: string | null;
  delivery_at: string | null;
  rate: number;
  distance: number | null;
  distance_unit: DistanceUnit;
  commodity: string | null;
  weight: number | null;
  weight_unit: WeightUnit;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Relações hidratadas pelo select.
  clients?: { company_name: string } | null;
  trucks?: { plate: string } | null;
  drivers?: { full_name: string } | null;
  invoices?: { id: string; status: string; amount: number } | null;
}

export interface LoadStop {
  id: string;
  org_id: string;
  load_id: string;
  position: number;
  kind: "pickup" | "delivery";
  company_name: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  window_start: string | null;
  window_end: string | null;
  arrived_at: string | null;
  departed_at: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoadDocument {
  id: string;
  org_id: string;
  load_id: string;
  user_id: string | null;
  kind: "rate_con" | "bol" | "pod" | "other";
  document_url: string;
  file_name: string | null;
  notes: string | null;
  created_at: string;
}

export type LoadInsert = {
  client_id: string;
  reference?: string | null;
  status?: LoadStatus;
  truck_id?: string | null;
  driver_id?: string | null;
  origin_city?: string | null;
  origin_region?: string | null;
  destination_city?: string | null;
  destination_region?: string | null;
  pickup_at?: string | null;
  delivery_at?: string | null;
  rate?: number;
  distance?: number | null;
  commodity?: string | null;
  weight?: number | null;
  notes?: string | null;
};

const LOAD_SELECT =
  "*, clients(company_name), trucks(plate), drivers(full_name), invoices(id, status, amount)";

// ── Derivados ──────────────────────────────────────────────────────────────

/** "Chicago, IL → Dallas, TX". Devolve null quando não há trajeto informado. */
export function laneLabel(load: Pick<Load,
  "origin_city" | "origin_region" | "destination_city" | "destination_region">
): string | null {
  const place = (city: string | null, region: string | null) => {
    const parts = [city, region].filter((p): p is string => !!p && p.trim() !== "");
    return parts.length ? parts.join(", ") : null;
  };
  const from = place(load.origin_city, load.origin_region);
  const to = place(load.destination_city, load.destination_region);
  if (!from && !to) return null;
  return `${from ?? "—"} → ${to ?? "—"}`;
}

/**
 * Receita por unidade de distância — a métrica que decide se um frete valeu a
 * pena. Devolve null quando não dá pra calcular, em vez de zero: uma carga sem
 * distância informada não rende "0,00 por km", ela simplesmente não tem essa
 * medida ainda.
 */
export function ratePerDistance(load: Pick<Load, "rate" | "distance">): number | null {
  const rate = Number(load.rate);
  const distance = Number(load.distance);
  if (!Number.isFinite(rate) || !Number.isFinite(distance) || distance <= 0) return null;
  return rate / distance;
}

/** Uma carga entregue e ainda sem fatura é dinheiro parado — o board destaca isso. */
export function isReadyToInvoice(load: Pick<Load, "status" | "invoice_id">): boolean {
  return load.status === "delivered" && !load.invoice_id;
}

// ── Consultas ──────────────────────────────────────────────────────────────

export function useLoads(filters?: { clientId?: string; driverId?: string; truckId?: string }) {
  const { clientId, driverId, truckId } = filters ?? {};
  return useQuery({
    queryKey: ["loads", clientId ?? "all", driverId ?? "all", truckId ?? "all"],
    queryFn: async () => {
      let q = db.from("loads").select(LOAD_SELECT);
      if (clientId) q = q.eq("client_id", clientId);
      if (driverId) q = q.eq("driver_id", driverId);
      if (truckId) q = q.eq("truck_id", truckId);
      // Coleta mais recente primeiro; cargas sem data planejada vão pro fim,
      // que é onde o despachante espera encontrar o que ainda não tem agenda.
      const { data, error } = await q.order("pickup_at", { ascending: false, nullsFirst: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Load[];
    },
  });
}

export function useLoad(id: string | undefined) {
  return useQuery({
    queryKey: ["loads", "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db.from("loads").select(LOAD_SELECT).eq("id", id!).single();
      if (error) throw new Error(error.message);
      return data as Load;
    },
  });
}

export function useLoadStops(loadId: string | undefined) {
  return useQuery({
    queryKey: ["load_stops", loadId],
    enabled: !!loadId,
    queryFn: async () => {
      const { data, error } = await db
        .from("load_stops").select("*").eq("load_id", loadId!)
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as LoadStop[];
    },
  });
}

export function useLoadDocuments(loadId: string | undefined) {
  return useQuery({
    queryKey: ["load_documents", loadId],
    enabled: !!loadId,
    queryFn: async () => {
      const { data, error } = await db
        .from("load_documents").select("*").eq("load_id", loadId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as LoadDocument[];
    },
  });
}

// ── Mutações ───────────────────────────────────────────────────────────────

function invalidateLoads(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ["loads"] });
  if (id) qc.invalidateQueries({ queryKey: ["loads", "detail", id] });
}

export function useCreateLoad() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: LoadInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tNow("toast.authRequired"));
      const { data, error } = await db
        .from("loads").insert({ ...input, user_id: user.id }).select().single();
      if (error) throw new Error(error.message);
      return data as Load;
    },
    onSuccess: () => {
      invalidateLoads(qc);
      toast({ title: tNow("loads.saved") });
    },
    onError: (e: Error) =>
      toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useUpdateLoad() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    // `silent` existe para o arrasto no board: mover um card já dá retorno
    // visual imediato, e um toast a cada arrasto vira ruído.
    mutationFn: async ({ id, silent, ...patch }: Partial<LoadInsert> & { id: string; silent?: boolean }) => {
      const { data, error } = await db.from("loads").update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as Load;
    },
    onSuccess: (load, vars) => {
      invalidateLoads(qc, (load as Load)?.id);
      if (!vars.silent) toast({ title: tNow("loads.saved") });
    },
    onError: (e: Error) =>
      toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteLoad() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("loads").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidateLoads(qc);
      toast({ title: tNow("loads.removed") });
    },
    onError: (e: Error) =>
      toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

// ── Paradas ────────────────────────────────────────────────────────────────

export function useUpsertLoadStop() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<LoadStop> & { load_id: string }) => {
      const query = id
        ? db.from("load_stops").update(input).eq("id", id)
        : db.from("load_stops").insert(input);
      const { data, error } = await query.select().single();
      if (error) throw new Error(error.message);
      return data as LoadStop;
    },
    onSuccess: (stop) => qc.invalidateQueries({ queryKey: ["load_stops", stop.load_id] }),
    onError: (e: Error) =>
      toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteLoadStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; loadId: string }) => {
      const { error } = await db.from("load_stops").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["load_stops", vars.loadId] }),
  });
}

// ── Carga → fatura ─────────────────────────────────────────────────────────

/**
 * Materializa a carga entregue numa fatura pendente e amarra as duas.
 *
 * Reaproveita `invoices` inteiro — aging, dunning e o portal do cliente passam
 * a enxergar o frete sem nenhuma tela nova. Mesma abordagem do
 * `useAcceptQuote`, que já converte proposta em fatura e plano recorrente.
 *
 * Idempotência vem do próprio vínculo: se `invoice_id` já está preenchido, a
 * conversão para em vez de emitir uma segunda cobrança pela mesma carga.
 */
export function useInvoiceLoad() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ load, netDays = 15 }: { load: Load; netDays?: number }) => {
      if (load.invoice_id) throw new Error(tNow("loads.alreadyInvoiced"));
      if (load.status !== "delivered") throw new Error(tNow("loads.notDelivered"));
      const amount = Number(load.rate);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error(tNow("loads.noRate"));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tNow("toast.authRequired"));

      const dueDate = new Date(Date.now() + netDays * 86_400_000).toISOString().slice(0, 10);
      const lane = laneLabel(load);
      const label = [load.reference, lane].filter(Boolean).join(" · ");

      const { data: invoice, error: invErr } = await db.from("invoices").insert({
        org_id: load.org_id,
        user_id: user.id,
        client_id: load.client_id,
        amount,
        status: "pending",
        due_date: dueDate,
        description: label || tNow("loads.title"),
      }).select("id").single();
      if (invErr) throw new Error(invErr.message);

      const { error: linkErr } = await db
        .from("loads").update({ invoice_id: invoice.id }).eq("id", load.id);
      if (linkErr) throw new Error(linkErr.message);

      return invoice.id as string;
    },
    onSuccess: (_id, vars) => {
      invalidateLoads(qc, vars.load.id);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: tNow("loads.invoiced") });
    },
    onError: (e: Error) =>
      toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}
