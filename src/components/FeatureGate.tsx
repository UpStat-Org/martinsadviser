import { type ReactNode } from "react";
import { useOrg, type FeatureFlag } from "@/contexts/OrgContext";
import NotFound from "@/pages/NotFound";

interface Props {
  flag: FeatureFlag;
  children: ReactNode;
  fallback?: ReactNode;
}

// Gate a route or subtree behind an org feature flag. When the org is still
// loading we render nothing to avoid flashing the gated content. When the
// flag is off we render the fallback (defaults to NotFound, matching the
// app's behavior for unknown routes — keeps the disabled feature undiscoverable).
export function FeatureGate({ flag, children, fallback }: Props) {
  const { hasFeature, loading, currentOrg } = useOrg();
  if (loading) return null;
  if (!currentOrg || !hasFeature(flag)) return <>{fallback ?? <NotFound />}</>;
  return <>{children}</>;
}
