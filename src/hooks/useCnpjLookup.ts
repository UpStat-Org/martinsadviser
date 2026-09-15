import { useState } from "react";
import { toast } from "sonner";
import { tNow } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { cnpjDigits, isValidCnpj } from "@/lib/brCompliance";

export interface CnpjResult {
  cnpj: string;
  company_name: string;
  trade_name: string;
  status: string;
  opened_on: string;
  legal_nature: string;
  main_activity: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
}

/**
 * Consulta crua, sem toast e sem estado. Espelha `lookupCarrier` de
 * useFmcsaLookup para que um importador em lote possa reusar sem herdar a UI.
 */
export async function lookupCnpj(cnpj: string): Promise<CnpjResult | null> {
  const digits = cnpjDigits(cnpj);
  if (!isValidCnpj(digits)) return null;

  const { data, error } = await supabase.functions.invoke<CnpjResult>("cnpj-lookup", {
    body: { cnpj: digits },
  });
  if (error || !data) return null;
  return data;
}

/**
 * Versão com feedback, para o formulário de cliente.
 *
 * Valida os dígitos verificadores ANTES de chamar a função: assim um dígito
 * trocado devolve "CNPJ inválido" na hora, em vez de esperar a ida à rede para
 * receber "não encontrado" — que faria pensar em empresa inexistente.
 */
export function useCnpjLookup() {
  const [loading, setLoading] = useState(false);

  const lookup = async (cnpj: string): Promise<CnpjResult | null> => {
    const digits = cnpjDigits(cnpj);
    if (!digits) {
      toast.error(tNow("br.cnpj.enterFirst"));
      return null;
    }
    if (!isValidCnpj(digits)) {
      toast.error(tNow("br.cnpj.invalid"));
      return null;
    }

    setLoading(true);
    try {
      const result = await lookupCnpj(digits);
      if (!result) throw new Error(tNow("br.cnpj.notFound"));
      toast.success(tNow("br.cnpj.imported"), {
        description: [result.company_name, result.city && `${result.city}/${result.state}`]
          .filter(Boolean).join(" — "),
      });
      return result;
    } catch (err) {
      toast.error(tNow("br.cnpj.error"), {
        description: err instanceof Error ? err.message : String(err),
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { lookup, loading };
}
