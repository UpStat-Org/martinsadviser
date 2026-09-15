-- ============================================================================
-- Fase 1 — Cargas e despacho
--
-- Até aqui o produto cobria compliance (permits, filings, documentos com
-- validade) e cobrança (invoices, despesas, recorrência, dunning). O frete em
-- si — quem leva o quê, de onde pra onde, por quanto — acontecia fora do
-- sistema. Quem usa mantinha um segundo software, ou uma planilha, pro dia a
-- dia da operação.
--
-- Estas três tabelas fecham esse vazio. São neutras de país por construção:
-- a carga não conhece FMCSA nem ANTT, só cliente, caminhão, motorista, paradas
-- e valor. Por isso a Fase 1 vem antes do núcleo regulatório brasileiro —
-- ela rende para os dois mercados ao mesmo tempo.
--
-- ---------------------------------------------------------------------------
-- Duas decisões de modelagem que valem explicar, porque as duas foram
-- escolhas entre alternativas razoáveis:
--
-- 1. O ciclo de vida da carga PARA em "delivered". Não existe status
--    "invoiced" nem "paid" aqui. Faturamento já é responsabilidade de
--    `invoices`, que tem status próprio, aging e dunning em cima. Duplicar
--    "pago" nos dois lugares criaria duas fontes de verdade que divergem no
--    primeiro estorno. A ligação é `loads.invoice_id`; o estado de cobrança
--    se lê da fatura.
--
-- 2. `load_stops` é OPCIONAL. A carga carrega `pickup_at`/`delivery_at` e os
--    endereços de origem e destino direto nas suas colunas, porque a esmagadora
--    maioria das cargas é uma coleta e uma entrega — exigir duas linhas de
--    parada pra isso seria burocracia sem ganho, e ainda deixaria o board
--    dependendo de um join agregado pra saber a data. `load_stops` existe pra
--    rota multi-parada: quando há linhas, elas são o detalhe autoritativo do
--    trajeto; as colunas da carga seguem sendo o planejado que o board ordena.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Unidades por país.
--
-- Uma org brasileira registrando distância em milhas é um erro silencioso: o
-- número entra, ninguém percebe, e o custo por quilômetro sai errado pra
-- sempre. Em vez de confiar no formulário, o DEFAULT da coluna consulta o país
-- da organização corrente. Assim vale pra qualquer origem de escrita — UI,
-- import futuro, edge function.
--
-- STABLE e não IMMUTABLE: lê tabela. Postgres aceita função STABLE em DEFAULT
-- de coluna, que é avaliado por linha no INSERT.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.org_distance_unit()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE (SELECT country FROM public.organizations WHERE id = public.current_org_id())
           WHEN 'US' THEN 'mi'
           ELSE 'km'
         END;
$$;

CREATE OR REPLACE FUNCTION public.org_weight_unit()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE (SELECT country FROM public.organizations WHERE id = public.current_org_id())
           WHEN 'US' THEN 'lb'
           ELSE 'kg'
         END;
$$;

REVOKE ALL ON FUNCTION public.org_distance_unit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.org_weight_unit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_distance_unit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_weight_unit() TO authenticated;

-- ---------------------------------------------------------------------------
-- loads — a carga
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loads (
  id             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id         uuid NOT NULL DEFAULT public.current_org_id()
                   REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL DEFAULT auth.uid(),

  -- A carga é sempre de um cliente da carteira: é dele que ela é cobrada e é
  -- no portal dele que ela aparece.
  client_id      uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Caminhão e motorista só existem a partir do despacho — uma carga cotada
  -- ainda não tem ninguém alocado.
  truck_id       uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  driver_id      uuid REFERENCES public.drivers(id) ON DELETE SET NULL,

  -- Fatura gerada a partir desta carga. SET NULL para que apagar uma fatura
  -- não leve o histórico operacional junto.
  invoice_id     uuid REFERENCES public.invoices(id) ON DELETE SET NULL,

  -- Número interno ou o PO do embarcador. Livre de propósito: cada operação
  -- tem a sua convenção, e impor uma sequência nossa só geraria dois números
  -- pra mesma carga.
  reference      text,

  -- Ciclo operacional. Ver nota 1 no cabeçalho: termina em delivered.
  status         text NOT NULL DEFAULT 'quoted'
                   CHECK (status IN ('quoted','booked','dispatched','in_transit','delivered','cancelled')),

  -- Origem e destino do trajeto simples. Multi-parada usa load_stops.
  origin_city         text,
  origin_region       text,
  destination_city    text,
  destination_region  text,

  -- Janela planejada. É por estas colunas que o board ordena e filtra.
  pickup_at      timestamptz,
  delivery_at    timestamptz,

  rate           numeric(12,2) NOT NULL DEFAULT 0,
  distance       numeric(10,2),
  distance_unit  text NOT NULL DEFAULT public.org_distance_unit()
                   CHECK (distance_unit IN ('mi','km')),
  commodity      text,
  weight         numeric(12,2),
  weight_unit    text NOT NULL DEFAULT public.org_weight_unit()
                   CHECK (weight_unit IN ('lb','kg')),

  notes          text,
  -- Ponto de extensão sem migration: no Brasil guarda chave do CT-e e número
  -- do CIOT; nos EUA, dados do rate confirmation do broker.
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loads_org ON public.loads(org_id);
CREATE INDEX IF NOT EXISTS idx_loads_client ON public.loads(client_id);
CREATE INDEX IF NOT EXISTS idx_loads_driver ON public.loads(driver_id);
CREATE INDEX IF NOT EXISTS idx_loads_truck ON public.loads(truck_id);
-- O board agrupa por status dentro da org e ordena por coleta; este índice
-- cobre a consulta que a tela faz o tempo todo.
CREATE INDEX IF NOT EXISTS idx_loads_org_status_pickup ON public.loads(org_id, status, pickup_at);

ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read loads" ON public.loads;
CREATE POLICY "org members read loads" ON public.loads FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert loads" ON public.loads;
CREATE POLICY "org members insert loads" ON public.loads FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update loads" ON public.loads;
CREATE POLICY "org members update loads" ON public.loads FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete loads" ON public.loads;
CREATE POLICY "org members delete loads" ON public.loads FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_loads_updated_at ON public.loads;
CREATE TRIGGER update_loads_updated_at BEFORE UPDATE ON public.loads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- load_stops — paradas de uma rota multi-parada (opcional)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.load_stops (
  id             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id         uuid NOT NULL DEFAULT public.current_org_id()
                   REFERENCES public.organizations(id) ON DELETE CASCADE,
  load_id        uuid NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,

  -- Ordem no trajeto. Não é único por carga de propósito: reordenar uma rota
  -- passaria por um estado momentâneo de posições repetidas, e uma constraint
  -- aqui obrigaria a dança de posições negativas pra contorná-la.
  position       integer NOT NULL DEFAULT 0,
  kind           text NOT NULL DEFAULT 'pickup'
                   CHECK (kind IN ('pickup','delivery')),

  company_name   text,
  address        text,
  city           text,
  region         text,
  postal_code    text,
  country        text,

  -- Janela combinada com o local.
  window_start   timestamptz,
  window_end     timestamptz,
  -- Realizado. A diferença entre window_end e arrived_at é o atraso.
  arrived_at     timestamptz,
  departed_at    timestamptz,

  contact_name   text,
  contact_phone  text,
  -- Número de coleta/entrega que o local exige na portaria.
  reference      text,
  notes          text,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_load_stops_org ON public.load_stops(org_id);
CREATE INDEX IF NOT EXISTS idx_load_stops_load ON public.load_stops(load_id, position);

ALTER TABLE public.load_stops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read load_stops" ON public.load_stops;
CREATE POLICY "org members read load_stops" ON public.load_stops FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert load_stops" ON public.load_stops;
CREATE POLICY "org members insert load_stops" ON public.load_stops FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members update load_stops" ON public.load_stops;
CREATE POLICY "org members update load_stops" ON public.load_stops FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete load_stops" ON public.load_stops;
CREATE POLICY "org members delete load_stops" ON public.load_stops FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_load_stops_updated_at ON public.load_stops;
CREATE TRIGGER update_load_stops_updated_at BEFORE UPDATE ON public.load_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- load_documents — rate confirmation, BOL, POD
--
-- Guarda o CAMINHO no storage, não URL absoluta: o bucket permit-documents é
-- privado e servido por signed URL de 1h (src/lib/storage.ts). Guardar a URL
-- assinada deixaria o registro apontando pra um link morto em uma hora.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.load_documents (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL DEFAULT public.current_org_id()
                  REFERENCES public.organizations(id) ON DELETE CASCADE,
  load_id       uuid NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  kind          text NOT NULL DEFAULT 'other'
                  CHECK (kind IN ('rate_con','bol','pod','other')),
  document_url  text NOT NULL,
  file_name     text,
  notes         text,

  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_load_documents_org ON public.load_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_load_documents_load ON public.load_documents(load_id);

ALTER TABLE public.load_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read load_documents" ON public.load_documents;
CREATE POLICY "org members read load_documents" ON public.load_documents FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert load_documents" ON public.load_documents;
CREATE POLICY "org members insert load_documents" ON public.load_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members update load_documents" ON public.load_documents;
CREATE POLICY "org members update load_documents" ON public.load_documents FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete load_documents" ON public.load_documents;
CREATE POLICY "org members delete load_documents" ON public.load_documents FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

COMMENT ON TABLE public.loads IS
  'Carga/frete. Ciclo operacional termina em delivered — cobrança fica em invoices via invoice_id.';
COMMENT ON TABLE public.load_stops IS
  'Paradas de rota multi-parada. Opcional: trajeto simples usa as colunas origin_*/destination_* da carga.';
COMMENT ON COLUMN public.loads.metadata IS
  'Extensão por país sem migration: CT-e/CIOT no Brasil, rate confirmation nos EUA.';
