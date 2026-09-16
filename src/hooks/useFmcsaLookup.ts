import { useState } from "react";
import { toast } from "sonner";
import { tNow } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/utils";

export interface FmcsaResult {
  company_name: string;
  phone: string;
  address: string;
  mc: string;
  ein: string;
  dot: string;
  totalDrivers: number;
  totalPowerUnits: number;
  carrierOperation: string;
  safetyRating: string;
  statusCode: string;
}

/**
 * Bare FMCSA QC lookup — no toasts, no React state. Returns the parsed carrier
 * or null when not found / on error. Used by the single-DOT hook and by the
 * bulk DOT importer (which manages its own progress UI).
 *
 * Goes through the `fmcsa-lookup` edge function rather than calling the FMCSA
 * QC API from the browser: the web key is a server-side secret (a VITE_ var
 * would ship in the bundle) and the function already proxies around the
 * upstream TLS issue. The function returns this exact shape.
 */
export async function lookupCarrier(dotNumber: string): Promise<FmcsaResult | null> {
  const trimmed = dotNumber?.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase.functions.invoke<FmcsaResult>("fmcsa-lookup", {
    body: { dot_number: trimmed },
  });
  // The function answers 400 for "carrier not found" as well as for real
  // failures, so both collapse to null — same contract as before.
  if (error || !data) return null;

  return data;
}

export function useFmcsaLookup() {
  const [loading, setLoading] = useState(false);

  const lookup = async (dotNumber: string): Promise<FmcsaResult | null> => {
    const trimmed = dotNumber?.trim();
    if (!trimmed) {
      toast.error(tNow("toast.enterDotFirst"));
      return null;
    }

    setLoading(true);
    try {
      const result = await lookupCarrier(trimmed);
      if (!result) {
        throw new Error(`${tNow("toast.carrierNotFound")} ${trimmed}`);
      }
      toast.success(tNow("toast.fmcsaImported"), {
        description: `${result.company_name} — ${result.totalPowerUnits} ${tNow("toast.vehicles")}, ${result.totalDrivers} ${tNow("toast.drivers")}`,
      });
      return result;
    } catch (err) {
      toast.error(tNow("toast.dotLookupError"), { description: errorMessage(err) });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { lookup, loading };
}
