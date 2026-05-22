import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RiskBand, RiskFactor } from "@/lib/risk";

// compliance_risk_scores / latest_risk_scores aren't in the generated Supabase
// types yet, so we go through a loose cast like the other recent hooks
// (useCsa, useHos) do.
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
  };
};

export interface RiskScore {
  id: string;
  org_id: string;
  client_id: string;
  scored_date: string;
  score: number;
  band: RiskBand;
  factors: RiskFactor[];
  computed_at: string;
}

export type RiskScoreWithClient = RiskScore & {
  clients?: { company_name: string } | null;
};

/**
 * Latest risk score per client across the org, newest first by score.
 * Reads the latest_risk_scores view (one row per client). Joins the client
 * name for portfolio surfaces.
 */
export function useRiskScores() {
  return useQuery({
    queryKey: ["risk_scores", "latest"],
    queryFn: async () => {
      const { data, error } = await db
        .from("latest_risk_scores")
        .select("*, clients(company_name)")
        .order("score", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as RiskScoreWithClient[];
    },
  });
}

/** Latest risk score for a single client (or null if never scored). */
export function useClientRiskScore(clientId: string | undefined) {
  return useQuery({
    queryKey: ["risk_scores", "client", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await db
        .from("latest_risk_scores")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as RiskScore | null;
    },
  });
}

/** Full dated history for a client, oldest first — feeds the trend sparkline. */
export function useClientRiskHistory(clientId: string | undefined, limit = 30) {
  return useQuery({
    queryKey: ["risk_scores", "history", clientId, limit],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await db
        .from("compliance_risk_scores")
        .select("scored_date, score, band")
        .eq("client_id", clientId!)
        .order("scored_date", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{ scored_date: string; score: number; band: RiskBand }>).reverse();
    },
  });
}
