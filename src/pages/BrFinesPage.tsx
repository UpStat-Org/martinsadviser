import { useMemo, useState } from "react";
import {
  Gavel, Plus, AlertTriangle, CircleDollarSign, Trash2, Loader2, ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegion } from "@/hooks/useRegion";
import { useClients } from "@/hooks/useClients";
import { useTrucks } from "@/hooks/useTrucks";
import { useDrivers } from "@/hooks/useDrivers";
import {
  useBrFines, useUpsertBrFine, useDeleteBrFine, type BrFine,
} from "@/hooks/useBrCompliance";
import {
  FINE_POINTS, daysToDefend, isDefendable, consolidatedPoints,
  type FineSeverity,
} from "@/lib/brCompliance";
import { cn } from "@/lib/utils";

const SEVERITIES: FineSeverity[] = ["leve", "media", "grave", "gravissima"];
const STATUSES: BrFine["status"][] = ["pending", "appealed", "paid", "cancelled"];

const STATUS_TONE: Record<BrFine["status"], StatusTone> = {
  pending: "warning",
  appealed: "info",
  paid: "neutral",
  cancelled: "outline",
};

const SEVERITY_TONE: Record<FineSeverity, StatusTone> = {
  leve: "neutral",
  media: "info",
  grave: "warning",
  gravissima: "danger",
};

const EMPTY = {
  notice_number: "",
  authority: "",
  description: "",
  severity: "media" as FineSeverity,
  points: String(FINE_POINTS.media),
  amount: "",
  client_id: "",
  driver_id: "",
  truck_id: "",
  occurred_at: "",
  notified_on: "",
  defense_due_on: "",
  payment_due_on: "",
  status: "pending" as BrFine["status"],
  notes: "",
};

export default function BrFinesPage() {
  const { t } = useLanguage();
  const { money, dateNumeric } = useRegion();

  const { data: fines, isLoading } = useBrFines();
  const { data: drivers } = useDrivers();
  const { data: trucks } = useTrucks();
  const { data: clients } = useClients();

  const upsert = useUpsertBrFine();
  const remove = useDeleteBrFine();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BrFine | null>(null);
  const [form, setForm] = useState(EMPTY);

  const all = useMemo(() => fines ?? [], [fines]);

  const stats = useMemo(() => {
    const defendable = all.filter((f) => isDefendable(f));
    // Prazo já perdido em multa ainda pendente: o dano que o produto existe
    // para evitar. Fica em destaque separado do que ainda dá para recorrer.
    const missedDeadline = all.filter((f) => {
      if (f.status !== "pending") return false;
      const days = daysToDefend(f.defense_due_on);
      return days !== null && days < 0;
    });
    const openAmount = all
      .filter((f) => f.status === "pending" || f.status === "appealed")
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);
    return {
      defendable: defendable.length,
      missed: missedDeadline.length,
      openAmount,
      points: consolidatedPoints(all),
    };
  }, [all]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (fine: BrFine) => {
    setEditing(fine);
    setForm({
      notice_number: fine.notice_number ?? "",
      authority: fine.authority ?? "",
      description: fine.description ?? "",
      severity: fine.severity,
      points: String(fine.points ?? 0),
      amount: String(fine.amount ?? ""),
      client_id: fine.client_id ?? "",
      driver_id: fine.driver_id ?? "",
      truck_id: fine.truck_id ?? "",
      occurred_at: fine.occurred_at ? fine.occurred_at.slice(0, 10) : "",
      notified_on: fine.notified_on ?? "",
      defense_due_on: fine.defense_due_on ?? "",
      payment_due_on: fine.payment_due_on ?? "",
      status: fine.status,
      notes: fine.notes ?? "",
    });
    setOpen(true);
  };

  // Mudar a gravidade repõe a pontuação padrão do CTB, mas só quando o valor
  // atual ainda é o padrão da gravidade anterior — assim um número ajustado à
  // mão (multiplicador, caso especial) não é apagado sem querer.
  const changeSeverity = (severity: FineSeverity) => {
    setForm((f) => {
      const wasDefault = Number(f.points) === FINE_POINTS[f.severity];
      return { ...f, severity, points: wasDefault ? String(FINE_POINTS[severity]) : f.points };
    });
  };

  const submit = async () => {
    await upsert.mutateAsync({
      id: editing?.id,
      notice_number: form.notice_number || null,
      authority: form.authority || null,
      description: form.description || null,
      severity: form.severity,
      points: Number(form.points) || 0,
      amount: form.amount ? Number(form.amount) : 0,
      client_id: form.client_id || null,
      driver_id: form.driver_id || null,
      truck_id: form.truck_id || null,
      occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : null,
      notified_on: form.notified_on || null,
      defense_due_on: form.defense_due_on || null,
      payment_due_on: form.payment_due_on || null,
      status: form.status,
      notes: form.notes || null,
    });
    setOpen(false);
  };

  const defenseCell = (fine: BrFine) => {
    const days = daysToDefend(fine.defense_due_on);
    if (days === null) return <span className="text-muted-foreground text-xs">—</span>;
    if (fine.status !== "pending") {
      return (
        <span className="text-xs tabular-nums text-muted-foreground">
          {dateNumeric(new Date(fine.defense_due_on!))}
        </span>
      );
    }
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs tabular-nums">{dateNumeric(new Date(fine.defense_due_on!))}</span>
        <span className={cn(
          "text-[11px] font-semibold",
          days < 0 ? "text-destructive" : days <= 7 ? "text-warning" : "text-muted-foreground",
        )}>
          {days < 0
            ? t("br.fine.deadlineMissed")
            : t("br.fine.daysLeft").replace("{days}", String(days))}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("sidebar.section.operation")}
        title={t("br.fines.title")}
        description={t("br.fines.subtitle")}
        actions={
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> {t("br.fine.new")}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("br.fines.kpi.defendable")} value={stats.defendable} icon={Gavel}
          tone={stats.defendable > 0 ? "warning" : "neutral"} loading={isLoading}
          hint={t("br.fines.kpi.defendableHint")}
        />
        <KpiCard
          label={t("br.fines.kpi.missed")} value={stats.missed} icon={AlertTriangle}
          tone={stats.missed > 0 ? "danger" : "neutral"} loading={isLoading}
        />
        <KpiCard
          label={t("br.fines.kpi.openAmount")} value={money(stats.openAmount)}
          icon={CircleDollarSign} loading={isLoading}
        />
        <KpiCard
          label={t("br.fines.kpi.points")} value={stats.points} icon={ShieldAlert}
          loading={isLoading} hint={t("br.fines.kpi.pointsHint")}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-md" />
      ) : all.length === 0 ? (
        <EmptyState
          icon={<Gavel className="w-8 h-8" />}
          title={t("br.fines.empty.title")}
          description={t("br.fines.empty.desc")}
          action={
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" /> {t("br.fine.new")}
            </Button>
          }
        />
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("br.fine.col.notice")}</TableHead>
                  <TableHead>{t("br.fine.col.authority")}</TableHead>
                  <TableHead>{t("nav.drivers")}</TableHead>
                  <TableHead>{t("nav.trucks")}</TableHead>
                  <TableHead>{t("br.fine.col.severity")}</TableHead>
                  <TableHead className="text-right">{t("br.fine.col.points")}</TableHead>
                  <TableHead className="text-right">{t("br.fine.col.amount")}</TableHead>
                  <TableHead>{t("br.fine.col.defense")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((fine) => (
                  <TableRow key={fine.id} className="cursor-pointer" onClick={() => openEdit(fine)}>
                    <TableCell className="font-medium">{fine.notice_number || "—"}</TableCell>
                    <TableCell className="text-xs">{fine.authority || "—"}</TableCell>
                    <TableCell className="text-xs">{fine.drivers?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{fine.trucks?.plate ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge tone={SEVERITY_TONE[fine.severity]} size="sm">
                        {t(`br.severity.${fine.severity}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fine.points}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(fine.amount)}</TableCell>
                    <TableCell>{defenseCell(fine)}</TableCell>
                    <TableCell>
                      <StatusBadge tone={STATUS_TONE[fine.status]} size="sm">
                        {t(`br.fineStatus.${fine.status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        aria-label={t("common.delete")}
                        onClick={(e) => { e.stopPropagation(); remove.mutate(fine.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("br.fine.edit") : t("br.fine.new")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fine-notice">{t("br.fine.col.notice")}</Label>
              <Input id="fine-notice" value={form.notice_number}
                onChange={(e) => setForm({ ...form, notice_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fine-authority">{t("br.fine.col.authority")}</Label>
              <Input id="fine-authority" value={form.authority}
                placeholder={t("br.fine.authorityPlaceholder")}
                onChange={(e) => setForm({ ...form, authority: e.target.value })} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fine-desc">{t("br.fine.col.description")}</Label>
              <Input id="fine-desc" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fine-severity">{t("br.fine.col.severity")}</Label>
              <Select value={form.severity} onValueChange={(v) => changeSeverity(v as FineSeverity)}>
                <SelectTrigger id="fine-severity"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`br.severity.${s}`)} · {FINE_POINTS[s]} {t("br.fine.pointsShort")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fine-points">{t("br.fine.col.points")}</Label>
              <Input id="fine-points" type="number" min={0} value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fine-amount">{t("br.fine.col.amount")}</Label>
              <Input id="fine-amount" type="number" min={0} step="0.01" inputMode="decimal"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fine-status">{t("common.status")}</Label>
              <Select value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as BrFine["status"] })}>
                <SelectTrigger id="fine-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{t(`br.fineStatus.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fine-driver">{t("nav.drivers")}</Label>
              <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                <SelectTrigger id="fine-driver">
                  <SelectValue placeholder={t("br.fine.driverPending")} />
                </SelectTrigger>
                <SelectContent>
                  {(drivers ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fine-truck">{t("nav.trucks")}</Label>
              <Select value={form.truck_id} onValueChange={(v) => setForm({ ...form, truck_id: v })}>
                <SelectTrigger id="fine-truck"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(trucks ?? []).map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>{tr.plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fine-client">{t("common.client")}</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger id="fine-client"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fine-occurred">{t("br.fine.col.occurred")}</Label>
              <Input id="fine-occurred" type="date" value={form.occurred_at}
                onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fine-notified">{t("br.fine.col.notified")}</Label>
              <Input id="fine-notified" type="date" value={form.notified_on}
                onChange={(e) => setForm({ ...form, notified_on: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fine-defense">{t("br.fine.col.defense")}</Label>
              <Input id="fine-defense" type="date" value={form.defense_due_on}
                onChange={(e) => setForm({ ...form, defense_due_on: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">{t("br.fine.defenseHint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fine-payment">{t("br.fine.col.payment")}</Label>
              <Input id="fine-payment" type="date" value={form.payment_due_on}
                onChange={(e) => setForm({ ...form, payment_due_on: e.target.value })} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fine-notes">{t("common.notes")}</Label>
              <Textarea id="fine-notes" rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={upsert.isPending} className="gap-2">
              {upsert.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
