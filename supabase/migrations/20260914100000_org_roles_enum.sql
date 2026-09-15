-- Fine-grained roles belong to each organization, not to the legacy global
-- user_roles table. Enum values must be committed before a later migration can
-- safely reference them, hence this deliberately small standalone migration.
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'operator';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'viewer';
