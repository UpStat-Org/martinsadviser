import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationCenter } from "./NotificationCenter";
import { CommandPalette } from "./CommandPalette";
import { SubscriptionBlockedScreen, isSubscriptionBlocked } from "./SubscriptionGate";
import { SubscriptionBanner } from "./SubscriptionBanner";
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
    <div className="flex h-screen overflow-hidden bg-background">
      <CommandPalette />
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <SubscriptionBanner />
        {/* Top bar: flat surface, hairline border, no blur. Mobile leaves
            room for the hamburger button (positioned by AppSidebar). */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="max-w-screen-2xl mx-auto pl-14 pr-4 lg:px-8 h-12 flex items-center gap-3">
            <div className="flex-1 max-w-md">
              <GlobalSearch />
            </div>
            <div className="flex-1" />
            <NotificationCenter />
          </div>
        </div>
        <div className="px-4 py-5 lg:px-8 lg:py-6 max-w-screen-2xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
