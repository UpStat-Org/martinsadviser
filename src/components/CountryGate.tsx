import { type ReactNode } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { type CountryCode } from "@/lib/region";
import NotFound from "@/pages/NotFound";

interface Props {
  /** País (ou países) em que a rota faz sentido. */
  country: CountryCode | CountryCode[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Gate de rota por país regulatório da organização.
 *
 * Irmão do FeatureGate, mas responde a uma pergunta diferente. FeatureGate é
 * comercial — "esta org contratou o módulo financeiro?". CountryGate é factual
 * — "esta org opera num país onde HVUT 2290 existe?". Uma transportadora
 * brasileira não deve poder ligar IFTA nem por engano: não é um módulo que ela
 * deixou de comprar, é um imposto que não existe no país dela.
 *
 * Renderiza NotFound quando não bate, igual ao FeatureGate: um módulo
 * inaplicável fica indescobrível em vez de aparecer desabilitado, o que só
 * geraria dúvida ("por que isso está cinza?").
 */
export function CountryGate({ country, children, fallback }: Props) {
  const { country: orgCountry, loading, currentOrg } = useOrg();
  const allowed = Array.isArray(country) ? country : [country];

  if (loading) return null;
  if (!currentOrg || !allowed.includes(orgCountry)) return <>{fallback ?? <NotFound />}</>;
  return <>{children}</>;
}
