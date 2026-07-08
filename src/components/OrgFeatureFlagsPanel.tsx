import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg, FEATURE_FLAGS, type FeatureFlag } from "@/contexts/OrgContext";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function OrgFeatureFlagsPanel() {
  const { currentOrg, isOrgOwner, refresh, hasFeature } = useOrg();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [pending, setPending] = useState<FeatureFlag | null>(null);

  // Resolved at render so labels/descriptions follow the active locale.
  const FLAG_META: Record<FeatureFlag, { label: string; description: string }> = {
    messages: { label: t("nav.messages"), description: t("messages.subtitle") },
    calendar: { label: t("orgFeatureFlags.calendarLabel"), description: t("orgFeatureFlags.calendarDesc") },
    ai_chat: { label: "AI Chat", description: t("messages.aiDraftPlaceholder") },
    ai_reports: { label: "AI Reports", description: t("orgFeatureFlags.aiReportsDesc") },
    finance: { label: t("nav.finance"), description: t("orgFeatureFlags.financeDesc") },
    portal: { label: t("portal.title") !== "portal.title" ? t("portal.title") : "Client portal", description: t("portal.inviteClient") },
    automations: { label: t("orgFeatureFlags.automationsLabel"), description: t("orgFeatureFlags.automationsDesc") },
    audit_log: { label: t("nav.audit"), description: t("orgFeatureFlags.auditDesc") },
    crm: { label: t("sidebar.section.sales"), description: t("orgFeatureFlags.crmDesc") },
  };

  const updateFlag = useMutation({
    mutationFn: async ({ flag, value }: { flag: FeatureFlag; value: boolean }) => {
      if (!currentOrg) throw new Error("No active organization");
      const nextFlags = { ...(currentOrg.feature_flags ?? {}), [flag]: value };
      const { error } = await supabase
        .from("organizations")
        .update({ feature_flags: nextFlags })
        .eq("id", currentOrg.id);
      if (error) throw error;
    },
    onMutate: ({ flag }) => setPending(flag),
    onSuccess: async () => {
      await refresh();
      qc.invalidateQueries();
      toast({ title: t("orgFeatureFlags.flagUpdated") });
    },
    onError: (e: any) => {
      toast({ title: t("orgFeatureFlags.flagFailed"), description: e.message, variant: "destructive" });
    },
    onSettled: () => setPending(null),
  });

  if (!currentOrg) return null;

  if (!isOrgOwner) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="text-sm">{t("orgFeatureFlags.ownerOnly")}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold">{t("orgFeatureFlags.modulesTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("orgFeatureFlags.modulesHint")}
          </p>
        </div>

        <div className="divide-y divide-border/50 border border-border/50 rounded-lg overflow-hidden">
          {FEATURE_FLAGS.map((flag) => {
            const meta = FLAG_META[flag];
            const enabled = hasFeature(flag);
            const isPending = pending === flag;
            return (
              <div key={flag} className="flex items-start justify-between p-4 gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{meta.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{meta.description}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                  <Switch
                    checked={enabled}
                    disabled={isPending}
                    onCheckedChange={(v) => updateFlag.mutate({ flag, value: v })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
