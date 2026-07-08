import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";

// expenses isn't in the generated types yet — cast the client (see useInsurance).
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (patch: unknown) => any;
    delete: () => any;
  };
};

export type ExpenseCategory =
  | "state_fee"
  | "filing_fee"
  | "third_party"
  | "software"
  | "labor"
  | "other";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "state_fee",
  "filing_fee",
  "third_party",
  "software",
  "labor",
  "other",
];

export interface Expense {
  id: string;
  org_id: string;
  user_id: string;
  client_id: string | null;
  invoice_id: string | null;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  incurred_on: string;
  billable: boolean;
  created_at: string;
  updated_at: string;
  clients?: { company_name: string } | null;
}

export type ExpenseInsert = {
  client_id?: string | null;
  invoice_id?: string | null;
  category: ExpenseCategory;
  amount: number;
  description?: string | null;
  incurred_on: string;
  billable?: boolean;
};

export function useExpenses(clientId?: string) {
  return useQuery({
    queryKey: ["expenses", clientId ?? "all"],
    queryFn: async () => {
      let q = db
        .from("expenses")
        .select("*, clients(company_name)")
        .order("incurred_on", { ascending: false });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as Expense[];
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: ExpenseInsert) => {
      const { data, error } = await db.from("expenses").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as Expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: tNow("expenses.saved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ExpenseInsert> & { id: string }) => {
      const { data, error } = await db.from("expenses").update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as Expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: tNow("expenses.saved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("expenses").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: tNow("expenses.removed") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}
