import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertOctagon, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useAccidents, useCreateAccident, useDeleteAccident, type AccidentSeverity } from "@/hooks/useAccidents";
import { format } from "date-fns";

const SEVERITY_BADGE: Record<AccidentSeverity, string> = {
  minor: "bg-warning/10 text-warning border-warning/30",
  major: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  fatal: "bg-destructive/10 text-destructive border-destructive/30",
};

interface Props {
  clientId: string;
  truckId?: string;
  driverId?: string;
}

export function AccidentsPanel({ clientId, truckId, driverId }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: accidents } = useAccidents({ clientId, truckId, driverId });
  const createMut = useCreateAccident();
  const deleteMut = useDeleteAccident();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    occurred_at: new Date().toISOString().slice(0, 16),
    location: "",
    state: "",
    fatalities: 0,
    injuries: 0,
    tow_required: false,
    severity: "minor" as AccidentSeverity,
    fmcsa_report_number: "",
    police_report_number: "",
    narrative: "",
  });

  const save = async () => {
    if (!user) return;
    await createMut.mutateAsync({
      client_id: clientId,
      truck_id: truckId ?? null,
      driver_id: driverId ?? null,
      user_id: user.id,
      occurred_at: new Date(form.occurred_at).toISOString(),
      location: form.location || null,
      state: form.state || null,
      fatalities: form.fatalities,
      injuries: form.injuries,
      tow_required: form.tow_required,
      severity: form.severity,
      fmcsa_report_number: form.fmcsa_report_number || null,
      police_report_number: form.police_report_number || null,
      narrative: form.narrative || null,
      document_url: null,
    });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
              <AlertOctagon className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{t("accidents.title")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("accidents.subtitle")}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {t("accidents.add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!accidents?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t("accidents.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("accidents.col.date")}</TableHead>
                <TableHead>{t("accidents.col.location")}</TableHead>
                <TableHead>{t("accidents.col.severity")}</TableHead>
                <TableHead className="text-right">{t("accidents.col.fatalities")}</TableHead>
                <TableHead className="text-right">{t("accidents.col.injuries")}</TableHead>
                <TableHead>{t("accidents.col.reportable")}</TableHead>
                <TableHead>{t("accidents.col.reportNumber")}</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accidents.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{format(new Date(a.occurred_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-xs">{[a.location, a.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={SEVERITY_BADGE[a.severity]}>{t(`accidents.severity.${a.severity}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{a.fatalities}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{a.injuries}</TableCell>
                  <TableCell>
                    {a.usdot_reportable
                      ? <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{t("accidents.reportableYes")}</Badge>
                      : <Badge variant="outline">{t("accidents.reportableNo")}</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{a.fmcsa_report_number ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(a.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("accidents.dialogTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("accidents.field.occurredAt")}</Label>
              <Input type="datetime-local" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("accidents.field.location")}</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("accidents.field.state")}</Label>
                <Input maxLength={3} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t("accidents.field.fatalities")}</Label>
                <Input type="number" min={0} value={form.fatalities} onChange={(e) => setForm({ ...form, fatalities: parseInt(e.target.value, 10) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("accidents.field.injuries")}</Label>
                <Input type="number" min={0} value={form.injuries} onChange={(e) => setForm({ ...form, injuries: parseInt(e.target.value, 10) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("accidents.field.severity")}</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as AccidentSeverity })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">{t("accidents.severity.minor")}</SelectItem>
                    <SelectItem value="major">{t("accidents.severity.major")}</SelectItem>
                    <SelectItem value="fatal">{t("accidents.severity.fatal")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <Label className="cursor-pointer">{t("accidents.field.towRequired")}</Label>
              <Switch checked={form.tow_required} onCheckedChange={(v) => setForm({ ...form, tow_required: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("accidents.field.fmcsaReport")}</Label>
                <Input value={form.fmcsa_report_number} onChange={(e) => setForm({ ...form, fmcsa_report_number: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("accidents.field.policeReport")}</Label>
                <Input value={form.police_report_number} onChange={(e) => setForm({ ...form, police_report_number: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("accidents.field.narrative")}</Label>
              <Textarea rows={3} value={form.narrative} onChange={(e) => setForm({ ...form, narrative: e.target.value })} />
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
