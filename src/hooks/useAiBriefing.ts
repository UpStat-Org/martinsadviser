import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";

// ---------------------------------------------------------------------------
// Daily briefing — the synthesis layer over MyDesk's ActionItem queue.
//
// The signals travel to the edge function rather than being re-derived there:
// MyDesk builds them from five hooks and that logic would drift immediately if
// it were duplicated server-side. The function caches per (user, day, signals
// hash), so re-mounting MyDesk costs one cheap round-trip and no LLM call.
// ---------------------------------------------------------------------------

export interface BriefingSignal {
  id: string;
  kind: string;
  severity: string;
  title: string;
  subtitle?: string;
  meta?: string;
}

export interface BriefingPriority {
  /** Id of the ActionItem this points at, or null when the model made one up. */
  ref_id: string | null;
  title: string;
  why: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface Briefing {
  headline: string;
  summary: string;
  priorities: BriefingPriority[];
  empty?: boolean;
  cached?: boolean;
  generated_at?: string;
}

/**
 * Fetches (or generates) today's briefing for the signed-in user.
 *
 * `signals` is expected to be memoized by the caller — it is part of the query
 * key, so a fresh array identity on every render would refetch in a loop. The
 * key uses a cheap digest of the ids rather than the whole payload.
 */
export function useAiBriefing(signals: BriefingSignal[] | undefined, enabled = true) {
  const { currentOrg } = useOrg();
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const signalKey = (signals ?? []).map((s) => `${s.id}:${s.severity}`).join("|");

  const query = useQuery({
    queryKey: ["ai_briefing", currentOrg?.id, language, signalKey],
    enabled: Boolean(enabled && currentOrg?.id && signals),
    // The briefing is a daily artifact; nothing about it goes stale within a
    // session, and refetching on window focus would be pure waste.
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Briefing>("ai-briefing", {
        body: { org_id: currentOrg?.id, language, signals: signals ?? [] },
      });
      if (error) throw error;
      // The function returns 4xx with an { error } body for auth/validation
      // failures; invoke() surfaces those as data, not as `error`.
      const asError = data as unknown as { error?: string } | null;
      if (asError?.error) throw new Error(asError.error);
      return data as Briefing;
    },
  });

  // Explicit regeneration: bypasses the server-side cache for the same signals,
  // for when the operator wants a second read rather than a stale one.
  const regenerate = useCallback(async () => {
    if (!currentOrg?.id) return;
    const { data, error } = await supabase.functions.invoke<Briefing>("ai-briefing", {
      body: { org_id: currentOrg.id, language, signals: signals ?? [], force: true },
    });
    if (error) throw error;
    queryClient.setQueryData(["ai_briefing", currentOrg.id, language, signalKey], data);
  }, [currentOrg?.id, language, signals, signalKey, queryClient]);

  return { ...query, regenerate };
}
