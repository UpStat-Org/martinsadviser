import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg, FEATURE_FLAGS, type FeatureFlag } from "@/contexts/OrgContext";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";

// Labels/descriptions kept local — these are admin-facing only and
// short-lived (will be replaced by the billing-tier copy in Mês 3).
const FLAG_META: Record<FeatureFlag, { label: string; description: string }> = {
  messages: {
    label: "Mensagens",
    description: "Envio de emails/WhatsApp, templates e mensagens agendadas",
  },
  calendar: {
    label: "Calendário",
    description: "Integração com Google Calendar e sincronização de permits",
  },
  ai_chat: {
    label: "AI Chat",
    description: "Assistente de IA por cliente (aba “AI” no detalhe do cliente)",
  },
  ai_reports: {
    label: "AI Reports",
    description: "Geração de relatórios de compliance via IA",
  },
  finance: {
    label: "Financeiro",
    description: "Faturas, financeiro e cobranças",
  },
  portal: {
    label: "Portal do cliente",
    description: "Acesso externo do cliente final + assinaturas de documentos",
  },
  automations: {
    label: "Automações",
    description: "Regras automáticas de notificação de vencimento e autopilot",
  },
  audit_log: {
    label: "Trilha de auditoria",
    description: "Página /audit com histórico de alterações",
  },
};

export function OrgFeatureFlagsPanel() {
  const { currentOrg, isOrgOwner, refresh, hasFeature } = useOrg();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [pending, setPending] = useState<FeatureFlag | null>(null);

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
      toast({ title: "Flag atualizada" });
    },
    onError: (e: any) => {
      toast({ title: "Falha ao atualizar", description: e.message, variant: "destructive" });
    },
    onSettled: () => setPending(null),
  });

  if (!currentOrg) return null;

  if (!isOrgOwner) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="text-sm">Apenas o owner da organização pode alterar feature flags.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold">Módulos da organização</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Liga ou desliga features para todos os membros da organização. Mudanças entram em vigor após reload.
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
