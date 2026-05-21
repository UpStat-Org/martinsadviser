import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { mcs150Status } from "@/lib/mcs150";
import { format } from "date-fns";
import type { Client } from "@/hooks/useClients";

const STATE_STYLE = {
  overdue: { badge: "bg-destructive text-destructive-foreground", text: "text-destructive", labelKey: "mcs150.state.overdue" },
  due_soon: { badge: "bg-warning text-warning-foreground", text: "text-warning", labelKey: "mcs150.state.dueSoon" },
  ok: { badge: "bg-success text-success-foreground", text: "text-success", labelKey: "mcs150.state.ok" },
  unknown: { badge: "bg-muted text-muted-foreground", text: "text-muted-foreground", labelKey: "mcs150.state.unknown" },
} as const;

export function Mcs150Card({ client }: { client: Client }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);

  const lastFiled = (client as Client & { mcs_150_last_filed_at?: string | null }).mcs_150_last_filed_at ?? null;
  const status = mcs150Status(client.dot, lastFiled);
  const style = STATE_STYLE[status.state];

  const markFiledToday = async () => {
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("clients")
      .update({ mcs_150_last_filed_at: today } as never)
      .eq("id", client.id);
    setSaving(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("mcs150.toastFiled") });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["clients", "detail", client.id] });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="font-display text-base">{t("mcs150.title")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("mcs150.subtitle")}</p>
            </div>
          </div>
          <Badge className={style.badge}>{t(style.labelKey)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.nextDueOn ? (
          <div className="rounded-lg bg-muted/40 border border-border/40 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("mcs150.nextDue")}
            </p>
            <p className={`font-display text-2xl font-bold mt-1 ${style.text}`}>
              {format(new Date(status.nextDueOn), "MMM yyyy")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {status.daysUntilDue! < 0
                ? t("mcs150.overdueBy").replace("{days}", String(Math.abs(status.daysUntilDue!)))
                : t("mcs150.inDays").replace("{days}", String(status.daysUntilDue))}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            {t("mcs150.noDot")}
          </div>
        )}

        {lastFiled && (
          <p className="text-xs text-muted-foreground">
            {t("mcs150.lastFiled").replace("{date}", format(new Date(lastFiled), "dd MMM yyyy"))}
          </p>
        )}

        <Button
          onClick={markFiledToday}
          disabled={saving}
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t("mcs150.markFiled")}
        </Button>
      </CardContent>
    </Card>
  );
}
