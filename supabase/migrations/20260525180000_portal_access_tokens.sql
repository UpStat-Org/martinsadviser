-- Portal access-by-email flow.
--
-- When an org admin invites a client to the portal we now:
--   1. auto-generate a random password (admin never sees it)
--   2. encrypt it server-side and store the ciphertext here
--   3. mint a one-shot UUID access_token with a TTL (default 7 days)
--   4. email the client a link `/portal/login?access=<token>` — the public
--      `redeem-portal-token` edge function exchanges the token for
--      `{ email, password }` so the login form can pre-fill and submit.
--
-- The plaintext password is never returned to anything other than the
-- portal user's own browser (and only via the signed link), so we store
-- it encrypted with PORTAL_ENCRYPTION_KEY rather than relying on RLS
-- alone — service role still bypasses RLS and shouldn't be a leak.
ALTER TABLE public.client_portal_users
  ADD COLUMN IF NOT EXISTS initial_password_encrypted text,
  ADD COLUMN IF NOT EXISTS access_token uuid,
  ADD COLUMN IF NOT EXISTS access_token_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS client_portal_users_access_token_unique
  ON public.client_portal_users(access_token)
  WHERE access_token IS NOT NULL;
