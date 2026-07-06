import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true when the current user is an owner/admin of the DotPilot
 * cliente 0 org — i.e. authorized to operate the super-admin panel.
 *
 * The check is server-side (is_super_admin RPC) so a curious frontend can't
 * just flip a boolean and unlock the panel. The RPCs themselves are also
 * guarded, so the worst case if this hook returned a stale-positive would
 * be the user seeing the page chrome and the requests failing.
 */
export function useSuperAdmin() {
  return useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_super_admin");
      if (error) throw error;
      return data === true;
    },
    staleTime: 5 * 60 * 1000,
  });
}
