import { supabase } from "@/integrations/supabase/client";

export const PERMIT_DOCUMENTS_BUCKET = "permit-documents";

// Signed URLs are issued for this long. Long enough that opening a PDF in
// an iframe + scrolling around won't expire mid-session; short enough that
// a copy/pasted link doesn't become a permanent leak.
const DEFAULT_TTL_SECONDS = 60 * 60; // 1h

/**
 * True if the input looks like an absolute http(s) URL. Used to detect
 * legacy `permit.document_url` values that haven't been path-migrated yet
 * — we serve them as-is for backward compatibility during the cutover.
 */
export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Mints a short-lived signed URL for a path inside permit-documents. The
 * caller's RLS policies on storage.objects (org membership or portal-user
 * link) determine whether the call succeeds. Returns null when the path
 * is empty/invalid or Supabase declines.
 */
export async function getSignedDocumentUrl(
  path: string | null | undefined,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string | null> {
  if (!path) return null;
  // Already-resolved absolute URL (legacy row before the path migration).
  if (isAbsoluteUrl(path)) return path;

  const { data, error } = await supabase
    .storage
    .from(PERMIT_DOCUMENTS_BUCKET)
    .createSignedUrl(path, ttlSeconds);
  if (error) {
    console.error("getSignedDocumentUrl failed", { path, error });
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Uploads a compliance document (DQF file, HVUT Schedule 1, etc.) to the
 * permit-documents bucket. RLS requires the first path segment to be the
 * caller's org_id, so we always prefix it. `prefix` namespaces uploads
 * within the org folder (e.g. "dqf", "hvut").
 *
 * Returns the stored path. The caller persists this path on its row and
 * resolves it via `useDocumentUrl` for signed downloads.
 */
export async function uploadComplianceDocument(
  orgId: string,
  prefix: "dqf" | "hvut",
  entityId: string,
  file: File,
): Promise<string | null> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${orgId}/${prefix}/${entityId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(PERMIT_DOCUMENTS_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) {
    console.error("uploadComplianceDocument failed", { path, error });
    return null;
  }
  return path;
}
