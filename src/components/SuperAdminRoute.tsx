import { type ReactNode } from "react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

/**
 * Wraps a subtree so it only renders when the current user is super-admin.
 * Loading shows a spinner (the check costs one RPC call). On false or
 * error we fall through to NotFound so the route stays undiscoverable.
 */
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useSuperAdmin();
  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) return <NotFound />;
  return <>{children}</>;
}
