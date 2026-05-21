import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import type { Client } from "@/hooks/useClients";

export function PspCard({ client }: { client: Client }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const subscribedAt = (client as Client & { psp_subscribed_at?: string | null }).psp_subscribed_at ?? null;
  const [saving, setSaving] = useState(false);

  const markSubscribed = async () => {
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("clients")
      .update({ psp_subscribed_at: today } as never)
      .eq("id", client.id);
    setSaving(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("psp.toastSaved") });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["clients", "detail", client.id] });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="font-display text-base">{t("psp.title")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("psp.subtitle")}</p>
            </div>
          </div>
          {subscribedAt ? (
            <Badge className="bg-success text-success-foreground">{t("mcs150.state.ok")}</Badge>
          ) : (
            <Badge variant="outline" className="border-warning/30 text-warning">{t("csa.level.alert")}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {subscribedAt ? (
          <p className="text-sm text-muted-foreground">
            {t("psp.subscribed").replace("{date}", format(new Date(subscribedAt), "MMM dd, yyyy"))}
          </p>
        ) : (
          <>
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 border border-border/40 p-3 text-xs text-muted-foreground mb-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t("psp.notSubscribed")}</span>
            </div>
            <Button size="sm" variant="outline" className="w-full" onClick={markSubscribed} disabled={saving}>
              {t("psp.markSubscribed")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
