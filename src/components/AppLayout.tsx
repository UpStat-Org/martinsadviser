import { lazy, Suspense } from "react";
import { Link, Outlet } from "react-router-dom";
import { History } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationCenter } from "./NotificationCenter";
import { SubscriptionBlockedScreen, isSubscriptionBlocked } from "./SubscriptionGate";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { useOrg } from "@/contexts/OrgContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

// Command palette is keyboard-triggered (Cmd+K) and renders nothing visible
// until then. Lazy-loading it (and its `cmdk` dependency) keeps the layout
// shell light on first paint.
const CommandPalette = lazy(() =>
  import("./CommandPalette").then((m) => ({ default: m.CommandPalette })),
);

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
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
      <AppSidebar />
      <main className="min-w-0 flex-1 overflow-auto">
        <SubscriptionBanner />
        {/* Top bar: flat surface, hairline border, no blur. Mobile leaves
            room for the hamburger button (positioned by AppSidebar). */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="max-w-screen-2xl mx-auto pl-16 pr-4 lg:px-8 h-16 flex items-center gap-3">
            <div className="min-w-0 flex-1 max-w-md">
              <GlobalSearch />
            </div>
            <div className="hidden sm:block sm:flex-1" />
            <Link
              to="/changelog"
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Changelog"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Changelog</span>
            </Link>
            <NotificationCenter />
          </div>
        </div>
        <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-screen-2xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
