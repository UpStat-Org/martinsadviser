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
  };
};

export interface TaskTemplateItem {
  name: string;
  task_type: string;
  days_offset: number;
  priority: "low" | "medium" | "high";
  notes?: string;
}

export interface TaskTemplate {
  id: string;
  org_id: string;
  user_id: string;
  name: string;
  description: string | null;
  items: TaskTemplateItem[];
  created_at: string;
  updated_at: string;
}

export type TaskTemplateInsert = Omit<TaskTemplate, "id" | "org_id" | "created_at" | "updated_at">;

export function useTaskTemplates() {
  return useQuery({
    queryKey: ["task_templates"],
    queryFn: async () => {
      const { data, error } = await db.from("task_templates").select("*").order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as TaskTemplate[];
    },
  });
}

export function useUpsertTaskTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: TaskTemplateInsert & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await db.from("task_templates").update(rest).eq("id", id).select().single();
        if (error) throw new Error(error.message);
        return data as TaskTemplate;
      }
      const { data, error } = await db.from("task_templates").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as TaskTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_templates"] });
      toast({ title: tNow("taskTemplates.toastSaved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("task_templates").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task_templates"] }),
  });
}

/**
 * Materialises a template into concrete tasks for a client. `applyDate` is
 * the anchor for the days_offset calculation — usually today. Returns the
 * number of tasks created.
 */
export function useApplyTaskTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      template,
      clientId,
      orgId,
      userId,
      applyDate = new Date(),
    }: {
      template: TaskTemplate;
      clientId: string;
      orgId: string;
      userId: string;
      applyDate?: Date;
    }) => {
      const rows = template.items.map((item) => {
        const due = new Date(applyDate);
        due.setUTCDate(due.getUTCDate() + item.days_offset);
        return {
          org_id: orgId,
          user_id: userId,
          client_id: clientId,
          name: item.name,
          task_type: item.task_type,
          status: "not_started",
          priority: item.priority,
          due_date: due.toISOString().slice(0, 10),
          notes: item.notes ?? null,
        };
      });
      const { error } = await db.from("tasks").insert(rows);
      if (error) throw new Error(error.message);
      return rows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: tNow("taskTemplates.toastApplied").replace("{count}", String(count)) });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}
