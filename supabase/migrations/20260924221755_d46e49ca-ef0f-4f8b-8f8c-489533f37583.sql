-- 20260824160000_br_compliance.sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text;

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

CREATE TABLE IF NOT EXISTS public.br_compliance_items (
  id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       uuid NOT NULL DEFAULT public.current_org_id()
                 REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL DEFAULT auth.uid(),

  scope        text NOT NULL CHECK (scope IN ('driver','truck','client')),
  driver_id    uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  truck_id     uuid REFERENCES public.trucks(id) ON DELETE CASCADE,
  client_id    uuid REFERENCES public.clients(id) ON DELETE CASCADE,

  kind         text NOT NULL CHECK (kind IN (
                 'cnh','mopp','toxicologico','aso',
                 'crlv','tacografo','antt_veiculo',
                 'rntrc',
                 'outro'
               )),

  document_number text,
  issued_on       date,
  expires_on      date,

  document_url text,
  notes        text,
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

CREATE TABLE IF NOT EXISTS public.br_fines (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL DEFAULT public.current_org_id()
                  REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL DEFAULT auth.uid(),

  client_id     uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  driver_id     uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  truck_id      uuid REFERENCES public.trucks(id) ON DELETE SET NULL,

  notice_number text,
  authority     text,
  infraction_code text,
  description   text,

  severity      text NOT NULL DEFAULT 'media'
                  CHECK (severity IN ('leve','media','grave','gravissima')),
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