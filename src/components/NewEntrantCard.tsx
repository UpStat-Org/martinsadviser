import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardCheck, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  newEntrantStatus,
  NEW_ENTRANT_REQUIREMENTS,
  type NewEntrantState,
} from "@/lib/newEntrant";
import { format } from "date-fns";
import type { Client } from "@/hooks/useClients";

const STATE_STYLE: Record<NewEntrantState, { badge: string; text: string }> = {
  active: { badge: "bg-sky-500/10 text-sky-600 border-sky-500/30", text: "text-sky-600" },
  audit_overdue: { badge: "bg-destructive text-destructive-foreground", text: "text-destructive" },
  ending_soon: { badge: "bg-warning text-warning-foreground", text: "text-warning" },
  completed: { badge: "bg-success text-success-foreground", text: "text-success" },
  not_in_program: { badge: "bg-muted text-muted-foreground border-border", text: "text-muted-foreground" },
};

export function NewEntrantCard({ client }: { client: Client }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const startOn = (client as Client & { new_entrant_start_at?: string | null }).new_entrant_start_at ?? null;
  const status = newEntrantStatus(startOn);
  const style = STATE_STYLE[status.state];
  const [open, setOpen] = useState(false);
  const [dateInput, setDateInput] = useState(startOn ?? "");
  const [saving, setSaving] = useState(false);

  const progressPct = startOn ? Math.min(100, Math.max(0, (status.daysInProgram / 540) * 100)) : 0;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({ new_entrant_start_at: dateInput || null } as never)
      .eq("id", client.id);
    setSaving(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["clients", "detail", client.id] });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
              <ClipboardCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="font-display text-base">{t("newEntrant.title")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("newEntrant.subtitle")}</p>
            </div>
          </div>
          <Badge className={style.badge}>{t(`newEntrant.state.${status.state}`)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!startOn ? (
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            {t("newEntrant.notSet")}
          </div>
        ) : (
          <>
            <div className="rounded-lg bg-muted/40 border border-border/40 p-3">
              <div className="flex items-baseline justify-between mb-2">
                <p className={`font-display text-lg font-bold ${style.text}`}>
                  {status.state === "completed"
                    ? t("newEntrant.endedDaysAgo").replace("{days}", String(Math.abs(status.daysUntilEnd)))
                    : t("newEntrant.daysToEnd").replace("{days}", String(status.daysUntilEnd))}
                </p>
                <p className="text-xs text-muted-foreground">{t("newEntrant.daysIn").replace("{days}", String(status.daysInProgram))}</p>
              </div>
              <Progress value={progressPct} className="h-1.5" />
              {status.endsOn && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  {t("newEntrant.endsOn").replace("{date}", format(new Date(status.endsOn), "MMM dd, yyyy"))}
                </p>
              )}
            </div>

            {status.state === "audit_overdue" && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-destructive">{t("newEntrant.auditWarning")}</span>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t("newEntrant.requirementsTitle")}
              </p>
              <ul className="space-y-1.5">
                {NEW_ENTRANT_REQUIREMENTS.map((r) => (
                  <li key={r.key} className="flex items-start gap-2 text-sm rounded-md bg-muted/30 p-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{t(r.labelKey)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-full">
          {t("newEntrant.setStartDate")}
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newEntrant.setStartDate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("newEntrant.startDateLabel")}</Label>
              <Input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={saving}>{saving ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
