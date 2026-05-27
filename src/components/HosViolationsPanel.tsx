import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  useHosViolations,
  useCreateHosViolation,
  useUpdateHosViolation,
  useDeleteHosViolation,
  HOS_RULES,
  type HosRule,
  type HosSeverity,
  type HosSource,
} from "@/hooks/useHos";
import { format } from "date-fns";

const SEVERITY_BADGE: Record<HosSeverity, string> = {
  minor: "bg-warning/10 text-warning border-warning/30",
  serious: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

export function HosViolationsPanel({ driverId }: { driverId: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: violations } = useHosViolations(driverId);
  const createMut = useCreateHosViolation();
  const updateMut = useUpdateHosViolation();
  const deleteMut = useDeleteHosViolation();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    occurred_at: new Date().toISOString().slice(0, 16),
    rule_violated: "driving_11h" as HosRule,
    severity: "minor" as HosSeverity,
    source: "manual" as HosSource,
    notes: "",
  });

  const save = async () => {
    if (!user) return;
    await createMut.mutateAsync({
      driver_id: driverId,
      user_id: user.id,
      occurred_at: new Date(form.occurred_at).toISOString(),
      rule_violated: form.rule_violated,
      severity: form.severity,
      source: form.source,
      resolved_at: null,
      notes: form.notes || null,
    });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t("hos.title")} ({violations?.length ?? 0})
          </CardTitle>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {t("hos.add")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{t("hos.subtitle")}</p>
      </CardHeader>
      <CardContent>
        {!violations?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t("hos.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("hos.col.occurredAt")}</TableHead>
                <TableHead>{t("hos.col.rule")}</TableHead>
                <TableHead>{t("hos.col.severity")}</TableHead>
                <TableHead>{t("hos.col.source")}</TableHead>
                <TableHead>{t("hos.col.resolved")}</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-xs">{format(new Date(v.occurred_at), "MMM dd, yyyy HH:mm")}</TableCell>
                  <TableCell className="text-xs">{t(`hos.rule.${v.rule_violated === "driving_11h" ? "driving11h" : v.rule_violated === "on_duty_14h" ? "onDuty14h" : v.rule_violated === "break_30min" ? "break30min" : v.rule_violated === "weekly_60h" ? "weekly60h" : v.rule_violated === "weekly_70h" ? "weekly70h" : v.rule_violated === "logbook_error" ? "logbookError" : "other"}`)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={SEVERITY_BADGE[v.severity]}>{t(`hos.severity.${v.severity}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">{t(`hos.source.${v.source}`)}</TableCell>
                  <TableCell className="text-xs">
                    {v.resolved_at ? format(new Date(v.resolved_at), "MMM dd") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {!v.resolved_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("hos.markResolved")}
                          onClick={() => updateMut.mutate({ id: v.id, patch: { resolved_at: new Date().toISOString() } })}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(v.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("hos.dialogTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("hos.col.occurredAt")}</Label>
              <Input type="datetime-local" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("hos.col.rule")}</Label>
                <Select value={form.rule_violated} onValueChange={(v) => setForm({ ...form, rule_violated: v as HosRule })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOS_RULES.map((r) => (<SelectItem key={r.key} value={r.key}>{t(r.labelKey)}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("hos.col.severity")}</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as HosSeverity })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">{t("hos.severity.minor")}</SelectItem>
                    <SelectItem value="serious">{t("hos.severity.serious")}</SelectItem>
                    <SelectItem value="critical">{t("hos.severity.critical")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("hos.col.source")}</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as HosSource })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t("hos.source.manual")}</SelectItem>
                  <SelectItem value="eld_motive">{t("hos.source.eld_motive")}</SelectItem>
                  <SelectItem value="eld_samsara">{t("hos.source.eld_samsara")}</SelectItem>
                  <SelectItem value="eld_keep_truckin">{t("hos.source.eld_keep_truckin")}</SelectItem>
                  <SelectItem value="fmcsa_inspection">{t("hos.source.fmcsa_inspection")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("drugTest.notes")}</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={createMut.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
