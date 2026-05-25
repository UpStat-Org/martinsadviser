import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getHostnameOrg } from "@/lib/orgHost";

export interface HostOrg {
  id: string;
  slug: string;
  name: string;
  branding: Record<string, unknown>;
}

/**
 * Resolves the tenant pointed to by the current URL, fetching the public
 * branding via the get_org_by_hostname RPC. Returns:
 *
 *   - { hostOrg: <row>, isDev: false }   → enforce this org post-login
 *   - { hostOrg: null,  isDev: false }   → subdomain doesn't match any org
 *                                          (caller should render "not found")
 *   - { hostOrg: null,  isDev: true  }   → dev/preview host, fall back to
 *                                          profile.active_org_id
 *
 * The RPC is public (anon+authenticated grant), so this works pre-login on
 * the Login page to render the tenant's branding.
 */
export function useHostnameOrg() {
  const { slug, hostname, isDev, isStrict } = getHostnameOrg();

  const query = useQuery({
    queryKey: ["hostnameOrg", hostname, slug],
    queryFn: async (): Promise<HostOrg | null> => {
      if (!hostname) return null;
      const { data, error } = await supabase
        .rpc("get_org_by_hostname", { p_hostname: hostname })
        .maybeSingle();
      if (error) throw error;
      return (data as HostOrg) ?? null;
    },
    enabled: !!hostname && isStrict,
    staleTime: 5 * 60 * 1000, // branding rarely changes; safe to cache
  });

  return {
    slug,
    hostname,
    isDev,
    isStrict,
    hostOrg: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
  };
}
