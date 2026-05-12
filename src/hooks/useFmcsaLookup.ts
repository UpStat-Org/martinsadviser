import { useState } from "react";
import { toast } from "sonner";
import { tNow } from "@/lib/translations";

const FMCSA_WEB_KEY = import.meta.env.VITE_FMCSA_WEB_KEY || "";

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
      const apiUrl = `https://mobile.fmcsa.dot.gov/qc/services/carriers/${trimmed}?webKey=${FMCSA_WEB_KEY}`;
      const response = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`FMCSA API error [${response.status}]: ${text}`);
      }

      const data = await response.json();
      const carrier = data?.content?.carrier;

      if (!carrier) {
        throw new Error(`${tNow("toast.carrierNotFound")} ${trimmed}`);
      }

      const result: FmcsaResult = {
        company_name: carrier.legalName || carrier.dbaName || "",
        phone: carrier.phyPhone || "",
        address: [
          carrier.phyStreet,
          carrier.phyCity,
          carrier.phyState,
          carrier.phyZipcode,
        ]
          .filter(Boolean)
          .join(", "),
        mc: carrier.mcNumber || "",
        ein: carrier.ein || "",
        dot: String(carrier.dotNumber || trimmed),
        totalDrivers: carrier.totalDrivers || 0,
        totalPowerUnits: carrier.totalPowerUnits || 0,
        carrierOperation: carrier.carrierOperation?.carrierOperationDesc || "",
        safetyRating: carrier.safetyRating || "",
        statusCode: carrier.statusCode || "",
      };

      toast.success(tNow("toast.fmcsaImported"), {
        description: `${result.company_name} — ${result.totalPowerUnits} ${tNow("toast.vehicles")}, ${result.totalDrivers} ${tNow("toast.drivers")}`,
      });

      return result;
    } catch (err: any) {
      toast.error(tNow("toast.dotLookupError"), { description: err.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { lookup, loading };
}
