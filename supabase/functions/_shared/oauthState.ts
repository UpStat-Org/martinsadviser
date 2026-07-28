// Signed OAuth `state` for the Google Calendar flow.
//
// The state used to be the raw user_id. Google echoes state back verbatim to
// the callback, and the callback is public (verify_jwt = false, since Google
// calls it), so anyone could hit the callback URL with their own auth `code`
// and someone else's user_id in state — writing their Google tokens onto the
// victim's row, or overwriting the victim's connection.
//
// Now state is `<user_id>.<issued_at_ms>.<hmac>`, signed with the project's
// service-role key (auto-injected into every edge function, so both the auth
// and callback functions can derive the same key without a new secret). The
// callback rejects anything it did not sign, and anything older than TTL_MS.

const TTL_MS = 10 * 60 * 1000; // an OAuth consent screen that takes >10min is a retry

function b64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(payload: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}

/** Builds the signed state string to hand to Google. */
export async function issueState(userId: string): Promise<string> {
  const payload = `${userId}.${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}

/**
 * Verifies a state string echoed back by Google. Returns the user_id, or null
 * when the signature doesn't match, the format is wrong, or it has expired.
 */
export async function verifyState(state: string | null): Promise<string | null> {
  if (!state) return null;
  const parts = state.split(".");
  if (parts.length !== 3) return null;

  const [userId, issuedAt, provided] = parts;
  const ts = Number(issuedAt);
  if (!userId || !Number.isFinite(ts)) return null;
  if (Date.now() - ts > TTL_MS) return null;

  const expected = await sign(`${userId}.${issuedAt}`);
  // Constant-time compare — lengths are fixed, so a plain loop is enough.
  if (expected.length !== provided.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0 ? userId : null;
}
