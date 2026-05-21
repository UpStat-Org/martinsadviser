import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";

const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (patch: unknown) => any;
    delete: () => any;
    upsert: (row: unknown, opts?: unknown) => any;
  };
};

export interface IftaTrip {
  id: string;
  org_id: string;
  client_id: string;
  truck_id: string | null;
  user_id: string;
  trip_date: string;
  quarter: string;
  total_miles: number;
  miles_by_jurisdiction: Record<string, number>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type IftaTripInsert = Omit<IftaTrip, "id" | "org_id" | "created_at" | "updated_at">;

export interface IftaFuelPurchase {
  id: string;
  org_id: string;
  client_id: string;
  truck_id: string | null;
  user_id: string;
  purchase_date: string;
  quarter: string;
  jurisdiction: string;
  gallons: number;
  gross_price: number | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type IftaFuelInsert = Omit<IftaFuelPurchase, "id" | "org_id" | "created_at" | "updated_at">;

export interface IftaTaxRate {
  id: string;
  org_id: string;
  quarter: string;
  jurisdiction: string;
  rate_per_gallon: number;
  created_at: string;
}

export interface IftaFiling {
  id: string;
  org_id: string;
  client_id: string;
  user_id: string;
  quarter: string;
  total_miles: number | null;
  total_gallons: number | null;
  fleet_mpg: number | null;
  breakdown_by_jurisdiction: unknown;
  total_tax_due: number | null;
  status: "draft" | "filed" | "paid";
  filed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Trips ----
export function useIftaTrips(filters: { clientId: string; quarter: string }) {
  return useQuery({
    queryKey: ["ifta_trips", filters],
    queryFn: async () => {
      const { data, error } = await db
        .from("ifta_trips")
        .select("*")
        .eq("client_id", filters.clientId)
        .eq("quarter", filters.quarter)
        .order("trip_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as IftaTrip[];
    },
  });
}

export function useCreateIftaTrip() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: IftaTripInsert) => {
      const { data, error } = await db.from("ifta_trips").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as IftaTrip;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ifta_trips"] }),
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteIftaTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("ifta_trips").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ifta_trips"] }),
  });
}

// ---- Fuel ----
export function useIftaFuel(filters: { clientId: string; quarter: string }) {
  return useQuery({
    queryKey: ["ifta_fuel", filters],
    queryFn: async () => {
      const { data, error } = await db
        .from("ifta_fuel_purchases")
        .select("*")
        .eq("client_id", filters.clientId)
        .eq("quarter", filters.quarter)
        .order("purchase_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as IftaFuelPurchase[];
    },
  });
}

export function useCreateIftaFuel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: IftaFuelInsert) => {
      const { data, error } = await db.from("ifta_fuel_purchases").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as IftaFuelPurchase;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ifta_fuel"] }),
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteIftaFuel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("ifta_fuel_purchases").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ifta_fuel"] }),
  });
}

// ---- Rates ----
export function useIftaRates(quarter: string) {
  return useQuery({
    queryKey: ["ifta_rates", quarter],
    queryFn: async () => {
      const { data, error } = await db
        .from("ifta_tax_rates")
        .select("*")
        .eq("quarter", quarter);
      if (error) throw new Error(error.message);
      return (data ?? []) as IftaTaxRate[];
    },
  });
}

// ---- Filings ----
export function useUpsertIftaFiling() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<IftaFiling> & { client_id: string; quarter: string; user_id: string }) => {
      const { data, error } = await db
        .from("ifta_filings")
        .upsert(input, { onConflict: "client_id,quarter" })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as IftaFiling;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ifta_filings"] });
      toast({ title: tNow("ifta.toastFilingSaved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useIftaFilings(quarter?: string) {
  return useQuery({
    queryKey: ["ifta_filings", quarter ?? "all"],
    queryFn: async () => {
      let q = db.from("ifta_filings").select("*");
      if (quarter) q = q.eq("quarter", quarter);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as IftaFiling[];
    },
  });
}
