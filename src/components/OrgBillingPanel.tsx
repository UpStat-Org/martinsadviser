import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CreditCard, ExternalLink, Loader2, Lock, Sparkles } from "lucide-react";

interface BillingInfo {
  subscription_status: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  trial_ends_at: string | null;
}

const STATUS_BADGE: Record<string, { label: string; tone: "default" | "secondary" | "outline" | "destructive" }> = {
  trialing: { label: "Em trial", tone: "secondary" },
  active: { label: "Ativa", tone: "default" },
  past_due: { label: "Pagamento atrasado", tone: "destructive" },
  canceled: { label: "Cancelada", tone: "destructive" },
  suspended: { label: "Suspensa", tone: "destructive" },
};

export function OrgBillingPanel() {
  const { currentOrg, isOrgOwner } = useOrg();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Reflect Stripe redirects (?billing=success|canceled|returned) as a toast.
  useEffect(() => {
    const billing = searchParams.get("billing");
    if (!billing) return;
    if (billing === "success") toast({ title: "Assinatura iniciada!", description: "Pode levar alguns segundos pra refletir aqui." });
    if (billing === "canceled") toast({ title: "Checkout cancelado", variant: "destructive" });
    // Clean the query so refresh doesn't re-trigger the toast.
    const next = new URLSearchParams(searchParams);
    next.delete("billing");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, toast]);

  const billing = useQuery({
    queryKey: ["billing-info", currentOrg?.id],
    queryFn: async (): Promise<BillingInfo | null> => {
      if (!currentOrg) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("subscription_status, stripe_subscription_id, stripe_customer_id, trial_ends_at")
        .eq("id", currentOrg.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as BillingInfo) ?? null;
    },
    enabled: !!currentOrg && isOrgOwner,
    refetchInterval: (q) => {
      // Poll faster right after a Stripe redirect — the webhook may still
      // be in flight. Once the subscription is visible, back off.
      const params = new URLSearchParams(window.location.search);
      return params.get("billing") === "success" && !q.state.data?.stripe_subscription_id ? 3000 : false;
    },
  });

  const startCheckout = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error("No active organization");
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { org_id: currentOrg.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Stripe não retornou uma URL de checkout");
      window.location.href = data.url;
    },
    onError: (e: any) => toast({ title: "Falha ao iniciar checkout", description: e.message, variant: "destructive" }),
  });

  const openPortal = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error("No active organization");
      const { data, error } = await supabase.functions.invoke("stripe-billing-portal", {
        body: { org_id: currentOrg.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Stripe não retornou uma URL do portal");
      window.location.href = data.url;
    },
    onError: (e: any) => toast({ title: "Falha ao abrir portal", description: e.message, variant: "destructive" }),
  });

  if (!currentOrg) return null;

  if (!isOrgOwner) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="text-sm">Apenas o owner da organização vê a faturação.</span>
        </CardContent>
      </Card>
    );
  }

  const info = billing.data;
  const status = info?.subscription_status ?? currentOrg.subscription_status ?? "trialing";
  const badge = STATUS_BADGE[status] ?? { label: status, tone: "outline" as const };
  const hasSubscription = !!info?.stripe_subscription_id;

  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Assinatura
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Plano flat mensal. Pagamento processado via Stripe.
            </p>
          </div>
          <Badge variant={badge.tone}>{badge.label}</Badge>
        </div>

        {billing.isLoading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {info?.trial_ends_at && status === "trialing" && (
              <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs">
                Trial termina em {format(new Date(info.trial_ends_at), "dd/MM/yyyy")}.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Field label="Status" value={badge.label} />
              <Field
                label="Stripe customer"
                value={info?.stripe_customer_id ? maskId(info.stripe_customer_id) : "—"}
                mono
              />
              <Field
                label="Subscription"
                value={info?.stripe_subscription_id ? maskId(info.stripe_subscription_id) : "—"}
                mono
              />
              <Field label="Trial" value={info?.trial_ends_at ? format(new Date(info.trial_ends_at), "dd/MM/yyyy") : "—"} />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {!hasSubscription ? (
                <Button onClick={() => startCheckout.mutate()} disabled={startCheckout.isPending} className="gap-2">
                  {startCheckout.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Iniciar assinatura
                </Button>
              ) : (
                <Button onClick={() => openPortal.mutate()} disabled={openPortal.isPending} variant="outline" className="gap-2">
                  {openPortal.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  Gerenciar pagamento
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono" : ""}>{value}</div>
    </div>
  );
}

function maskId(id: string): string {
  // Stripe IDs are long; show prefix + last 4 so the field stays scannable
  // without leaking the full identifier in screenshots.
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
