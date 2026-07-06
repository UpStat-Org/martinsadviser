/* eslint-disable react-refresh/only-export-components */
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, LogOut, ShieldAlert } from "lucide-react";
import type { Organization } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";

const BLOCKING_STATUSES = new Set(["suspended", "canceled"]);

/** Pure predicate so AppLayout can decide whether to render the full shell. */
export function isSubscriptionBlocked(status: string | null | undefined): boolean {
  return !!status && BLOCKING_STATUSES.has(status);
}

/**
 * Full-page screen shown when an org's subscription is suspended or canceled.
 * Rendered by AppLayout INSTEAD of the regular shell — sidebar, search and
 * notifications are deliberately hidden so the user has no navigation
 * affordances inside the locked tenant.
 *
 * Super-admins never reach this screen (AppLayout bypasses them).
 */
export function SubscriptionBlockedScreen({ org }: { org: Organization }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const status = org.subscription_status;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full border-destructive/30">
        <CardContent className="p-8 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-md bg-destructive/10 text-destructive flex items-center justify-center">
            {status === "canceled" ? <Lock className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
          </div>
          <div>
            <h1 className="text-xl font-bold mb-1">
              {status === "canceled"
                ? t("subscription.title.cancelled") !== "subscription.title.cancelled"
                  ? t("subscription.title.cancelled")
                  : "Access ended"
                : t("subscription.title.suspended") !== "subscription.title.suspended"
                ? t("subscription.title.suspended")
                : "Access suspended"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {status === "canceled"
                ? t("subscription.gate.cancelled")
                : t("subscription.gate.suspended")}
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            {org.slug} · {t("common.status").toLowerCase()}: {status}
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <a href="mailto:suporte@dotpilot.online">{t("subscription.contactSupport")}</a>
            </Button>
            <Button variant="ghost" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-3.5 h-3.5" />
              {t("nav.logout")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
