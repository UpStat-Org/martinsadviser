import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useOrg } from "@/contexts/OrgContext";
import { tNow } from "@/lib/translations";
import { sanitizeSearchTerm } from "@/lib/utils";
import { uploadServiceOrderDocument } from "@/lib/storage";
import type { ChecklistStatus } from "@/lib/serviceOrders";

export type ServiceOrder = Tables<"service_orders">;
export type ServiceOrderChecklistItem = Tables<"service_order_checklist_items">;
export type ServiceOrderEvent = Tables<"service_order_events">;

export type ServiceOrderListItem = ServiceOrder & {
  clients: { id: string; company_name: string; country: string | null } | null;
  services: { id: string; name: string; default_price: number } | null;
  service_order_checklist_items: Array<{ required: boolean; status: string }>;
};

export type ServiceOrderDetail = ServiceOrder & {
  clients: { id: string; company_name: string; country: string | null } | null;
  services: { id: string; name: string; default_price: number } | null;
};

export type ServiceOrderPermit = Tables<"service_order_permits"> & {
  permits: {
    id: string;
    permit_type: string;
    permit_number: string | null;
    state: string | null;
    status: string;
    expiration_date: string | null;
  } | null;
};

export interface ServiceOrderFilters {
  search?: string;
  status?: string;
  priority?: string;
  clientId?: string;
  assignedTo?: string;
}

export function useServiceOrders(filters: ServiceOrderFilters = {}) {
  return useQuery({
    queryKey: ["service-orders", filters],
    queryFn: async () => {
      let query = supabase
        .from("service_orders")
        .select("*, clients(id, company_name, country), services(id, name, default_price), service_order_checklist_items(required, status)")
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.priority && filters.priority !== "all") query = query.eq("priority", filters.priority);
      if (filters.clientId) query = query.eq("client_id", filters.clientId);
      if (filters.assignedTo) query = query.eq("assigned_to", filters.assignedTo);
      if (filters.search) {
        const safe = sanitizeSearchTerm(filters.search);
        if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ServiceOrderListItem[];
    },
  });
}

export function useServiceOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["service-orders", "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*, clients(id, company_name, country), services(id, name, default_price)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as ServiceOrderDetail;
    },
  });
}

export function useServiceOrderChecklist(orderId: string | undefined) {
  return useQuery({
    queryKey: ["service-orders", orderId, "checklist"],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_order_checklist_items")
        .select("*")
        .eq("service_order_id", orderId!)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useServiceOrderPermits(orderId: string | undefined) {
  return useQuery({
    queryKey: ["service-orders", orderId, "permits"],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_order_permits")
        .select("*, permits(id, permit_type, permit_number, state, status, expiration_date)")
        .eq("service_order_id", orderId!);
      if (error) throw error;
      return (data ?? []) as unknown as ServiceOrderPermit[];
    },
  });
}

export function useServiceOrderEvents(orderId: string | undefined) {
  return useQuery({
    queryKey: ["service-orders", orderId, "events"],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_order_events")
        .select("*")
        .eq("service_order_id", orderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export interface CreateServiceOrderInput {
  order: Omit<TablesInsert<"service_orders">, "created_by" | "org_id">;
  permitIds?: string[];
  checklist?: Array<{ title: string; required?: boolean; due_date?: string | null }>;
}

function invalidateOrderQueries(queryClient: ReturnType<typeof useQueryClient>, orderId?: string) {
  queryClient.invalidateQueries({ queryKey: ["service-orders"] });
  if (orderId) queryClient.invalidateQueries({ queryKey: ["service-orders", orderId] });
}

export function useCreateServiceOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async ({ order, permitIds = [], checklist = [] }: CreateServiceOrderInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) throw new Error(tNow("toast.authRequired"));

      const { data, error } = await supabase
        .from("service_orders")
        .insert({ ...order, org_id: currentOrg.id, created_by: user.id })
        .select()
        .single();
      if (error) throw error;

      try {
        if (permitIds.length) {
          const { error: permitError } = await supabase.from("service_order_permits").insert(
            permitIds.map((permit_id) => ({ service_order_id: data.id, permit_id, org_id: currentOrg.id })),
          );
          if (permitError) throw permitError;
        }
        if (checklist.length) {
          const { error: checklistError } = await supabase.from("service_order_checklist_items").insert(
            checklist.map((item, sort_order) => ({
              ...item,
              service_order_id: data.id,
              org_id: currentOrg.id,
              created_by: user.id,
              sort_order,
            })),
          );
          if (checklistError) throw checklistError;
        }
      } catch (childError) {
        await supabase.from("service_orders").delete().eq("id", data.id);
        throw childError;
      }
      return data;
    },
    onSuccess: () => {
      invalidateOrderQueries(queryClient);
      toast({ title: tNow("serviceOrders.created") });
    },
    onError: (error: Error) => toast({ title: tNow("common.error"), description: error.message, variant: "destructive" }),
  });
}

export function useUpdateServiceOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"service_orders"> & { id: string }) => {
      const { data, error } = await supabase.from("service_orders").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      invalidateOrderQueries(queryClient, data.id);
      toast({ title: tNow("serviceOrders.saved") });
    },
    onError: (error: Error) => toast({ title: tNow("common.error"), description: error.message, variant: "destructive" }),
  });
}

export function useDeleteServiceOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateOrderQueries(queryClient);
      toast({ title: tNow("serviceOrders.deleted") });
    },
  });
}

export function useAddChecklistItem() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async (input: { service_order_id: string; title: string; required?: boolean; due_date?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) throw new Error(tNow("toast.authRequired"));
      const { data, error } = await supabase.from("service_order_checklist_items").insert({
        ...input, org_id: currentOrg.id, created_by: user.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateOrderQueries(queryClient, data.service_order_id),
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, ...updates }: TablesUpdate<"service_order_checklist_items"> & { id: string; status?: ChecklistStatus }) => {
      const completed = status === "approved" || status === "not_applicable";
      const { data: { user } } = await supabase.auth.getUser();
      const patch: TablesUpdate<"service_order_checklist_items"> = { ...updates };
      if (status) {
        patch.status = status;
        patch.completed_at = completed ? new Date().toISOString() : null;
        patch.completed_by = completed ? user?.id ?? null : null;
      }
      const { data, error } = await supabase.from("service_order_checklist_items").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateOrderQueries(queryClient, data.service_order_id),
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orderId }: { id: string; orderId: string }) => {
      const { error } = await supabase.from("service_order_checklist_items").delete().eq("id", id);
      if (error) throw error;
      return orderId;
    },
    onSuccess: (orderId) => invalidateOrderQueries(queryClient, orderId),
  });
}

export function useUploadChecklistDocument() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async ({ item, file }: { item: ServiceOrderChecklistItem; file: File }) => {
      if (!currentOrg) throw new Error(tNow("toast.authRequired"));
      const path = await uploadServiceOrderDocument(currentOrg.id, item.service_order_id, item.id, file);
      if (!path) throw new Error(tNow("serviceOrders.documentUploadError"));
      const { data, error } = await supabase.from("service_order_checklist_items").update({
        document_path: path,
        file_name: file.name,
        status: item.status === "pending" || item.status === "rejected" ? "received" : item.status,
        rejection_reason: null,
      }).eq("id", item.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateOrderQueries(queryClient, data.service_order_id),
  });
}

export function useLinkServiceOrderPermit() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async ({ orderId, permitId }: { orderId: string; permitId: string }) => {
      if (!currentOrg) throw new Error(tNow("toast.authRequired"));
      const { error } = await supabase.from("service_order_permits").insert({
        service_order_id: orderId, permit_id: permitId, org_id: currentOrg.id,
      });
      if (error) throw error;
      return orderId;
    },
    onSuccess: (orderId) => invalidateOrderQueries(queryClient, orderId),
  });
}

export function useUnlinkServiceOrderPermit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, permitId }: { orderId: string; permitId: string }) => {
      const { error } = await supabase.from("service_order_permits").delete()
        .eq("service_order_id", orderId).eq("permit_id", permitId);
      if (error) throw error;
      return orderId;
    },
    onSuccess: (orderId) => invalidateOrderQueries(queryClient, orderId),
  });
}

export function useAddServiceOrderNote() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) throw new Error(tNow("toast.authRequired"));
      const { error } = await supabase.from("service_order_events").insert({
        service_order_id: orderId,
        org_id: currentOrg.id,
        event_type: "note",
        actor_id: user.id,
        note,
      });
      if (error) throw error;
      return orderId;
    },
    onSuccess: (orderId) => queryClient.invalidateQueries({ queryKey: ["service-orders", orderId, "events"] }),
  });
}

export function useServiceOrderTime(orderId: string | undefined) {
  return useQuery({
    queryKey: ["service-orders", orderId, "time"],
    enabled: !!orderId,
    queryFn: async () => {
      const { data: tasks, error: tasksError } = await supabase.from("tasks").select("id").eq("service_order_id", orderId!);
      if (tasksError) throw tasksError;
      const taskIds = (tasks ?? []).map((task) => task.id);
      if (!taskIds.length) return { minutes: 0, entries: 0 };
      const { data, error } = await supabase.from("task_time_entries").select("minutes").in("task_id", taskIds);
      if (error) throw error;
      return {
        minutes: (data ?? []).reduce((sum, entry) => sum + entry.minutes, 0),
        entries: data?.length ?? 0,
      };
    },
  });
}
