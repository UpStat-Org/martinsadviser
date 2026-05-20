-- ============================================================================
-- clients.country
--
-- Lets the dashboard coverage map switch between US/BR/ES and only show
-- permits whose client belongs to the selected country. Without this the
-- two-letter state codes collide (AL = Alabama vs Alagoas, MT = Montana vs
-- Mato Grosso, etc).
--
-- Default 'US' for the existing rows since MartinsAdviser's cliente 0 was
-- a US-only consultancy. Constraint limits values to the 3 countries we
-- ship maps for; adding more later is a simple CHECK expansion.
-- ============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US'
    CHECK (country IN ('US', 'BR', 'ES'));

-- Help the dashboard's "permits by country" filter stay cheap even as the
-- table grows. Partial would be unnecessary — every row has a country.
CREATE INDEX IF NOT EXISTS idx_clients_country
  ON public.clients (country);
