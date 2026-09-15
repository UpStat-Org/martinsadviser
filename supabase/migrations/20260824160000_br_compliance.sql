-- ============================================================================
-- Fase 2 — Núcleo regulatório brasileiro
--
-- O lado americano cresceu como uma tabela por obrigação: hvut_filings,
-- ifta_filings, irp_registrations, driver_documents, insurance_certificates,
-- drug_test_events. Fez sentido lá, porque cada uma dessas obrigações tem
-- campos e cálculos próprios — o HVUT calcula imposto por faixa de peso, o
-- IFTA apura por jurisdição.
--
-- As obrigações brasileiras que este produto precisa acompanhar NÃO têm essa
-- variedade. CNH, MOPP, toxicológico, ASO, CRLV, tacógrafo, ANTT do veículo e
-- RNTRC são todas a mesma coisa: um documento, de um titular, com um número,
-- uma emissão, uma validade e um arquivo. O que muda entre elas é o rótulo, o
-- prazo típico e de quem o documento é. Oito tabelas idênticas seriam oito
-- vezes o mesmo CRUD, oito telas e oito caminhos de alerta.
--
-- Por isso aqui é UMA tabela com `kind` + `scope`, mais `metadata jsonb` para
-- os poucos campos específicos de tipo (categoria da CNH, RENAVAM do CRLV).
-- Mesmo recurso que `permits.metadata` já usa no lado americano.
--
-- Multas ficam de fora dessa unificação: auto de infração tem órgão autuador,
-- gravidade, pontuação na carteira, prazo de defesa e prazo de pagamento —
-- forma genuinamente diferente, tabela própria.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Identificação brasileira no cliente.
--
-- Espelha `dot` e `mc`, que são os identificadores do lado americano. Ficam
-- nulos para org US e vice-versa: uma coluna vazia é mais barata que uma
-- tabela de atributos, e o cliente é a única entidade onde isso aparece.
-- ---------------------------------------------------------------------------

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text;

-- Só dígitos, 14 posições — a formatação com pontos e barra é da interface.
-- Guardar formatado quebraria a busca e permitiria o mesmo CNPJ duas vezes com
-- máscaras diferentes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.clients'::regclass
       AND conname = 'clients_cnpj_digits_check'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_cnpj_digits_check
      CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON public.clients(cnpj) WHERE cnpj IS NOT NULL;

COMMENT ON COLUMN public.clients.cnpj IS
  'Somente dígitos (14). A máscara XX.XXX.XXX/XXXX-XX é responsabilidade da UI.';

-- ---------------------------------------------------------------------------
-- 2) br_compliance_items — documento com validade, de qualquer titular
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.br_compliance_items (
  id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       uuid NOT NULL DEFAULT public.current_org_id()
                 REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL DEFAULT auth.uid(),

  -- De quem é o documento. Exatamente UM dos três está preenchido — a
  -- constraint abaixo garante isso, para que não exista item órfão nem item
  -- ambíguo (um CRLV que aponta para motorista E caminhão).
  scope        text NOT NULL CHECK (scope IN ('driver','truck','client')),
  driver_id    uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  truck_id     uuid REFERENCES public.trucks(id) ON DELETE CASCADE,
  client_id    uuid REFERENCES public.clients(id) ON DELETE CASCADE,

  kind         text NOT NULL CHECK (kind IN (
                 -- Motorista
                 'cnh','mopp','toxicologico','aso',
                 -- Veículo
                 'crlv','tacografo','antt_veiculo',
                 -- Transportadora
                 'rntrc',
                 'outro'
               )),

  document_number text,
  issued_on       date,
  -- A validade é sempre o dado gravado, nunca derivada em consulta. O catálogo
  -- em src/lib/brCompliance.ts só SUGERE o prazo típico ao preencher o
  -- formulário; se a lei ou o documento disser outra coisa, o que vale é o que
  -- está aqui. Assim um prazo errado no catálogo nunca vira alerta errado.
  expires_on      date,

  -- Caminho no bucket permit-documents (privado, servido por signed URL).
  document_url text,
  notes        text,
  -- Campos específicos do tipo sem migration nova: categoria e EAR da CNH,
  -- RENAVAM e ano de exercício do CRLV, órgão emissor.
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT br_compliance_owner_matches_scope CHECK (
    (scope = 'driver' AND driver_id IS NOT NULL AND truck_id IS NULL AND client_id IS NULL) OR
    (scope = 'truck'  AND truck_id  IS NOT NULL AND driver_id IS NULL AND client_id IS NULL) OR
    (scope = 'client' AND client_id IS NOT NULL AND driver_id IS NULL AND truck_id  IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_br_compliance_org ON public.br_compliance_items(org_id);
CREATE INDEX IF NOT EXISTS idx_br_compliance_driver ON public.br_compliance_items(driver_id);
CREATE INDEX IF NOT EXISTS idx_br_compliance_truck ON public.br_compliance_items(truck_id);
CREATE INDEX IF NOT EXISTS idx_br_compliance_client ON public.br_compliance_items(client_id);
-- O painel pergunta sempre "o que vence primeiro nesta org"; nulos por último
-- porque item sem validade não é urgência, é cadastro incompleto.
CREATE INDEX IF NOT EXISTS idx_br_compliance_org_expiry
  ON public.br_compliance_items(org_id, expires_on NULLS LAST);

ALTER TABLE public.br_compliance_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read br_compliance" ON public.br_compliance_items;
CREATE POLICY "org members read br_compliance" ON public.br_compliance_items FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert br_compliance" ON public.br_compliance_items;
CREATE POLICY "org members insert br_compliance" ON public.br_compliance_items FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update br_compliance" ON public.br_compliance_items;
CREATE POLICY "org members update br_compliance" ON public.br_compliance_items FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete br_compliance" ON public.br_compliance_items;
CREATE POLICY "org members delete br_compliance" ON public.br_compliance_items FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_br_compliance_updated_at ON public.br_compliance_items;
CREATE TRIGGER update_br_compliance_updated_at BEFORE UPDATE ON public.br_compliance_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3) br_fines — multas de trânsito
--
-- O alerta que importa aqui não é o vencimento do pagamento: é o PRAZO DE
-- DEFESA. Passado ele, a multa está consolidada e a pontuação vai para a
-- carteira do motorista — perder esse prazo é o dano que o sistema existe
-- para evitar. Por isso `defense_due_on` é coluna própria, e não um detalhe
-- dentro de notes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.br_fines (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL DEFAULT public.current_org_id()
                  REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL DEFAULT auth.uid(),

  client_id     uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Quem dirigia e o que dirigia. Ambos nulos enquanto a indicação de condutor
  -- não foi feita — situação real e comum na chegada da notificação.
  driver_id     uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  truck_id      uuid REFERENCES public.trucks(id) ON DELETE SET NULL,

  -- Número do auto de infração.
  notice_number text,
  -- Órgão autuador: DER-SP, PRF, prefeitura.
  authority     text,
  infraction_code text,
  description   text,

  severity      text NOT NULL DEFAULT 'media'
                  CHECK (severity IN ('leve','media','grave','gravissima')),
  -- Pontos efetivamente aplicados. Coluna e não derivação da gravidade porque
  -- multiplicadores e casos especiais existem; o catálogo do frontend sugere o
  -- valor padrão do CTB e o usuário confirma.
  points        integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  amount        numeric(12,2) NOT NULL DEFAULT 0,

  occurred_at   timestamptz,
  notified_on   date,
  defense_due_on date,
  payment_due_on date,

  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','appealed','paid','cancelled')),

  document_url  text,
  notes         text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_br_fines_org ON public.br_fines(org_id);
CREATE INDEX IF NOT EXISTS idx_br_fines_driver ON public.br_fines(driver_id);
CREATE INDEX IF NOT EXISTS idx_br_fines_truck ON public.br_fines(truck_id);
CREATE INDEX IF NOT EXISTS idx_br_fines_client ON public.br_fines(client_id);
-- Multa em aberto ordenada pelo prazo de defesa: a consulta do painel.
CREATE INDEX IF NOT EXISTS idx_br_fines_org_defense
  ON public.br_fines(org_id, defense_due_on) WHERE status = 'pending';

ALTER TABLE public.br_fines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read br_fines" ON public.br_fines;
CREATE POLICY "org members read br_fines" ON public.br_fines FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members insert br_fines" ON public.br_fines;
CREATE POLICY "org members insert br_fines" ON public.br_fines FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND auth.uid() = user_id);
DROP POLICY IF EXISTS "org members update br_fines" ON public.br_fines;
CREATE POLICY "org members update br_fines" ON public.br_fines FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "org members delete br_fines" ON public.br_fines;
CREATE POLICY "org members delete br_fines" ON public.br_fines FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

DROP TRIGGER IF EXISTS update_br_fines_updated_at ON public.br_fines;
CREATE TRIGGER update_br_fines_updated_at BEFORE UPDATE ON public.br_fines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.br_compliance_items IS
  'Documento com validade de motorista, veículo ou transportadora (CNH, MOPP, toxicológico, ASO, CRLV, tacógrafo, ANTT, RNTRC).';
COMMENT ON COLUMN public.br_compliance_items.expires_on IS
  'Validade real e única fonte de verdade. O catálogo do frontend só sugere o prazo típico no formulário.';
COMMENT ON COLUMN public.br_fines.defense_due_on IS
  'Prazo de defesa/recurso. Perder este prazo consolida a multa e a pontuação — é o alerta principal da tabela.';
