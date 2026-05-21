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
import { Wrench, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  useMaintenanceRecords,
  useCreateMaintenance,
  useDeleteMaintenance,
  MAINTENANCE_TYPES,
  type MaintenanceType,
} from "@/hooks/useMaintenance";
import { format } from "date-fns";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function MaintenancePanel({ truckId }: { truckId: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: records } = useMaintenanceRecords(truckId);
  const createMut = useCreateMaintenance();
  const deleteMut = useDeleteMaintenance();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    service_date: new Date().toISOString().slice(0, 10),
    service_type: "dot_annual_inspection" as MaintenanceType,
    mileage: 0,
    vendor: "",
    cost: 0,
    next_due_at: "",
    document_url: "",
    notes: "",
  });

  // Next DOT annual inspection due — the most regulated cadence.
  const lastDotInspection = (records ?? []).find((r) => r.service_type === "dot_annual_inspection");
  const nextDotDue = lastDotInspection?.next_due_at ?? null;
  const daysUntilDot = nextDotDue
    ? Math.ceil((new Date(nextDotDue).getTime() - Date.now()) / 86_400_000)
    : null;

  const save = async () => {
    if (!user) return;
    await createMut.mutateAsync({
      truck_id: truckId,
      user_id: user.id,
      service_date: form.service_date,
      service_type: form.service_type,
      mileage: form.mileage || null,
      vendor: form.vendor || null,
      cost: form.cost || null,
      next_due_at: form.next_due_at || null,
      document_url: form.document_url || null,
      notes: form.notes || null,
    });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-zinc-500 flex items-center justify-center shadow-md">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="font-display text-base">{t("maintenance.title")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("maintenance.subtitle")}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {t("maintenance.add")}
          </Button>
        </div>
        {nextDotDue && daysUntilDot != null && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 border border-border/40 p-2.5 text-xs">
            <span className="text-muted-foreground">{t("maintenance.type.dot_annual_inspection")}:</span>
            <span className="font-semibold">{format(new Date(nextDotDue), "MMM dd, yyyy")}</span>
            <Badge
              variant="outline"
              className={
                daysUntilDot < 0
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : daysUntilDot <= 30
                  ? "bg-warning/10 text-warning border-warning/30"
                  : "bg-success/10 text-success border-success/30"
              }
            >
              {daysUntilDot < 0
                ? t("mcs150.state.overdue")
                : daysUntilDot <= 30
                ? `${daysUntilDot}d`
                : t("mcs150.state.ok")}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!records?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t("maintenance.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("maintenance.col.date")}</TableHead>
                <TableHead>{t("maintenance.col.type")}</TableHead>
                <TableHead className="text-right">{t("maintenance.col.mileage")}</TableHead>
                <TableHead>{t("maintenance.col.vendor")}</TableHead>
                <TableHead className="text-right">{t("maintenance.col.cost")}</TableHead>
                <TableHead>{t("maintenance.col.nextDue")}</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{format(new Date(r.service_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-xs">{t(`maintenance.type.${r.service_type}`)}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{r.mileage?.toLocaleString() ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.vendor ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{r.cost != null ? usd.format(Number(r.cost)) : "—"}</TableCell>
                  <TableCell className="text-xs">{r.next_due_at ? format(new Date(r.next_due_at), "MMM dd, yyyy") : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(r.id)}>
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
          <DialogHeader><DialogTitle>{t("maintenance.dialogTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("maintenance.field.serviceDate")}</Label>
                <Input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("maintenance.field.serviceType")}</Label>
                <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v as MaintenanceType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_TYPES.map((m) => (<SelectItem key={m} value={m}>{t(`maintenance.type.${m}`)}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t("maintenance.field.mileage")}</Label>
                <Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: parseInt(e.target.value, 10) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("maintenance.field.vendor")}</Label>
                <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("maintenance.field.cost")}</Label>
                <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("maintenance.field.nextDue")}</Label>
              <Input type="date" value={form.next_due_at} onChange={(e) => setForm({ ...form, next_due_at: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("maintenance.field.documentUrl")}</Label>
              <Input placeholder="https://..." value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("maintenance.field.notes")}</Label>
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
