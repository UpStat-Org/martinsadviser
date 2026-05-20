import { useQuery } from "@tanstack/react-query";
import { getSignedDocumentUrl, isAbsoluteUrl } from "@/lib/storage";

/**
 * Resolves a stored permit document path into a usable URL. Accepts either
 * the new path format ("<org_id>/<permit_id>/<ts>.<ext>") or a legacy
 * absolute URL (returned as-is). React Query caches the signed URL for
 * 50 minutes — under the 60-minute TTL so refetches happen before the URL
 * actually expires in the browser.
 *
 * Pass null/undefined to short-circuit. Useful so the call site doesn't
 * need to branch on whether a document exists.
 */
export function useDocumentUrl(pathOrUrl: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-document-url", pathOrUrl],
    queryFn: () => getSignedDocumentUrl(pathOrUrl),
    enabled: !!pathOrUrl,
    staleTime: 50 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export { isAbsoluteUrl };
