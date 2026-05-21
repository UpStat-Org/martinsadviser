import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, X, ExternalLink, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

// Soft warning bar above the app. Catches the two states SubscriptionGate
// doesn't (it only hard-blocks suspended/canceled):
//
//   - past_due: payment failed or trial ended without a card — owner has
//     a one-click "fix" via the Stripe billing portal
//   - trialing with <=3 days left: friendly nudge to subscribe before
//     access flips to past_due
//
// Master orgs and super-admins skip the banner entirely.

const DISMISS_KEY = "subscription-banner-dismissed-at";
const DISMISS_HOURS = 8; // re-show after this many hours

export function SubscriptionBanner() {
  const { currentOrg, isOrgOwner, loading } = useOrg();
  const { data: isSuperAdmin } = useSuperAdmin();
  const { toast } = useToast();

  const billing = useQuery({
    queryKey: ["banner-billing", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("subscription_status, trial_ends_at, is_master_org")
        .eq("id", currentOrg!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { subscription_status: string; trial_ends_at: string | null; is_master_org: boolean } | null;
    },
  });

  // Past-due users have a Stripe customer already, so we send them to the
  // billing portal to update card / pay invoice. Trial-ending users don't
  // yet have a subscription, so we kick them into checkout instead.
  const billingAction = useMutation({
    mutationFn: async (intent: "portal" | "checkout") => {
      if (!currentOrg) throw new Error("no org");
      const fn = intent === "portal" ? "stripe-billing-portal" : "stripe-checkout";
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { org_id: currentOrg.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Stripe não retornou URL");
      window.location.href = data.url;
    },
    onError: (e: any) => toast({ title: "Falha", description: e.message, variant: "destructive" }),
  });

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(DISMISS_KEY);
    if (!stored) return false;
    const ts = parseInt(stored, 10);
    if (Number.isNaN(ts)) return false;
    return (Date.now() - ts) < DISMISS_HOURS * 60 * 60 * 1000;
  });

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  if (loading || !currentOrg || !billing.data) return null;
  if (billing.data.is_master_org || isSuperAdmin) return null;
  if (dismissed) return null;

  const status = billing.data.subscription_status;
  const trialEnd = billing.data.trial_ends_at ? new Date(billing.data.trial_ends_at) : null;
  const daysLeft = trialEnd ? differenceInDays(trialEnd, new Date()) : null;

  // Decide which variant to show — past_due wins over trial nudge.
  const isPastDue = status === "past_due";
  const isTrialEndingSoon = status === "trialing" && daysLeft !== null && daysLeft <= 3;

  if (!isPastDue && !isTrialEndingSoon) return null;

  const variant = isPastDue ? "danger" : "warn";

  return (
    <div
      className={cn(
        "border-b px-4 lg:px-8 py-2.5 flex items-center gap-3",
        variant === "danger"
          ? "bg-destructive/10 border-destructive/30 text-destructive-foreground"
          : "bg-amber-500/10 border-amber-500/30 text-foreground",
      )}
    >
      <div className={cn(
        "shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
        variant === "danger" ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-700 dark:text-amber-300",
      )}>
        {isPastDue ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0 text-sm">
        {isPastDue ? (
          <>
            <strong>Pagamento pendente.</strong>{" "}
            <span className="text-muted-foreground">
              Atualize seu método de pagamento pra evitar suspensão do acesso.
            </span>
          </>
        ) : (
          <>
            <strong>
              {daysLeft === 0 ? "Seu trial expira hoje." : `Trial expira em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}.`}
            </strong>{" "}
            <span className="text-muted-foreground">
              Assine pra continuar usando o app sem interrupção.
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isOrgOwner && (
          <Button
            size="sm"
            variant={variant === "danger" ? "destructive" : "default"}
            onClick={() => billingAction.mutate(isPastDue ? "portal" : "checkout")}
            disabled={billingAction.isPending}
            className="gap-1.5"
          >
            {billingAction.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            {isPastDue ? "Atualizar pagamento" : "Assinar"}
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={dismiss} title="Dispensar por 8h" className="h-8 w-8">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
