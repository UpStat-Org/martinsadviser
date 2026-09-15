import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Loader2, Lock } from "lucide-react";
import { errorMessage } from "@/lib/utils";
import { useRegion } from "@/hooks/useRegion";

/**
 * Org-level labor rate, consumed by /profit-per-client to turn logged minutes
 * into cost. Before this panel existed the column had no UI, so every org
 * reported margins against the 50.00 column default.
 *
 * Written through the update_org_hourly_rate RPC rather than a table UPDATE:
 * RLS on organizations is owner-only, and widening it would also hand admins
 * feature_flags and subscription_status.
 */
export function OrgHourlyRatePanel() {
  const { currentOrg, isOrgAdmin, refresh } = useOrg();
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  // O prefixo do input era "$" fixo — errado para qualquer org que não fature
  // em dólar. O rótulo também dizia "(USD)"; ambos vêm da org agora.
  const { currencySymbol } = useRegion();

  const stored = currentOrg?.default_hourly_rate ?? 50;
  const [value, setValue] = useState(String(stored));

  // Re-seed when the org loads or the user switches tenant.
  useEffect(() => { setValue(String(stored)); }, [stored]);

  const save = useMutation({
    mutationFn: async (rate: number) => {
      if (!currentOrg) throw new Error("No active organization");
      // Cast because the RPC postdates the last types.ts regeneration — same
      // reason OrgBrandingPanel casts for update_org_branding.
      const rpc = supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
      const { error } = await rpc("update_org_hourly_rate", {
        p_org_id: currentOrg.id,
        p_rate: rate,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await refresh();
      // The profit report derives every row from this rate.
      qc.invalidateQueries({ queryKey: ["time_entries"] });
      toast({ title: t("orgHourlyRate.saved") });
    },
    onError: (e: unknown) =>
      toast({ title: t("orgHourlyRate.saveFailed"), description: errorMessage(e), variant: "destructive" }),
  });

  if (!currentOrg) return null;

  if (!isOrgAdmin) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="text-sm">{t("orgHourlyRate.adminOnly")}</span>
        </CardContent>
      </Card>
    );
  }

  const parsed = Number(value);
  const invalid = value.trim() === "" || !Number.isFinite(parsed) || parsed < 0;
  const unchanged = !invalid && parsed === stored;

  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t("orgHourlyRate.title")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("orgHourlyRate.desc")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="org-hourly-rate" className="text-xs">
              {t("orgHourlyRate.label")}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencySymbol}</span>
              <Input
                id="org-hourly-rate"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-40 pl-7"
              />
            </div>
          </div>
          <Button
            onClick={() => save.mutate(parsed)}
            disabled={invalid || unchanged || save.isPending}
            className="gap-2"
          >
            {save.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>

        {invalid && <p className="text-xs text-destructive">{t("orgHourlyRate.invalid")}</p>}
      </CardContent>
    </Card>
  );
}
