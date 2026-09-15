import { type ReactNode } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { TruckLoadingScreen } from "@/components/TruckLoadingScreen";
import NotFound from "@/pages/NotFound";

export function OrgAdminRoute({ children }: { children: ReactNode }) {
  const { isOrgAdmin, loading } = useOrg();

  if (loading) return <TruckLoadingScreen />;
  if (!isOrgAdmin) return <NotFound />;
  return <>{children}</>;
}
