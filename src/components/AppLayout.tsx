import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationCenter } from "./NotificationCenter";
import { SubscriptionBlockedScreen, isSubscriptionBlocked } from "./SubscriptionGate";
import { useOrg } from "@/contexts/OrgContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

export function AppLayout() {
  const { currentOrg, loading: orgLoading } = useOrg();
  const { data: isSuperAdmin } = useSuperAdmin();

  // When the active org's subscription is hard-blocked and the user isn't a
  // super-admin, swap the entire shell for the block screen — no sidebar,
  // no search, no notifications. Super-admins still see the full chrome so
  // they can navigate to /super-admin and unblock the tenant.
  const blocked =
    !orgLoading &&
    !!currentOrg &&
    !isSuperAdmin &&
    isSubscriptionBlocked(currentOrg.subscription_status);

  if (blocked) {
    return <SubscriptionBlockedScreen org={currentOrg} />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-auto bg-background">
        <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md border-b border-border/50 px-4 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto pl-10 lg:pl-0 flex items-center gap-2">
            <div className="flex-1 max-w-md">
              <GlobalSearch />
            </div>
            <div className="flex-1" />
            <div className="h-8 w-px bg-border/60 mx-1 hidden sm:block" />
            <NotificationCenter />
          </div>
        </div>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
