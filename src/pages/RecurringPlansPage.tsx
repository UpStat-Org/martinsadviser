import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import {
  useRecurringPlans,
  useCreateRecurringPlan,
  useUpdateRecurringPlan,
  useDeleteRecurringPlan,
  PLAN_FREQUENCIES,
  type RecurringPlan,
  type PlanFrequency,
  type PlanStatus,
} from "@/hooks/useRecurringPlans";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  Repeat,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Pause,
  Play,
  RefreshCw,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_TONES: Record<PlanStatus, StatusTone> = {
  active: "success",
  paused: "warning",
  cancelled: "neutral",
};

const monthlyEquivalent = (plan: RecurringPlan) => {
  const amount = Number(plan.amount);
  if (plan.frequency === "quarterly") return amount / 3;
  if (plan.frequency === "yearly") return amount / 12;
  return amount;
};

export default function RecurringPlansPage() {
  const { t } = useLanguage();
  const { role } = useAuth();
  const { data: plans, isLoading } = useRecurringPlans();
  const { data: clients } = useClients();
  const { data: services } = useServices(true);
  const createPlan = useCreateRecurringPlan();
  const updatePlan = useUpdateRecurringPlan();
  const deletePlan = useDeleteRecurringPlan();

  const isViewer = role === "viewer";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringPlan | null>(null);
  const [form, setForm] = useState({
    service_id: "__none__",
    client_id: "",
    name: "",
    amount: "",
    frequency: "monthly" as PlanFrequency,
    net_days: "15",
    next_run_on: format(new Date(), "yyyy-MM-dd"),
    status: "active" as PlanStatus,
    description: "",
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const openNew = () => {
    setEditing(null);
    setForm({
      service_id: "__none__",
      client_id: "",
      name: "",
      amount: "",
      frequency: "monthly",
      net_days: "15",
      next_run_on: format(new Date(), "yyyy-MM-dd"),
      status: "active",
      description: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (plan: RecurringPlan) => {
    setEditing(plan);
    setForm({
      service_id: plan.service_id ?? "__none__",
      client_id: plan.client_id,
      name: plan.name,
      amount: String(plan.amount),
      frequency: plan.frequency,
      net_days: String(plan.net_days),
      next_run_on: plan.next_run_on,
      status: plan.status,
      description: plan.description || "",
    });
    setDialogOpen(true);
  };

  const handleServiceChange = (v: string) => {
    if (v === "__none__") {
      setForm({ ...form, service_id: v });
      return;
    }
    const svc = services?.find((s) => s.id === v);
    if (!svc) {
      setForm({ ...form, service_id: v });
      return;
    }
    setForm({
      ...form,
      service_id: v,
      name: svc.name,
      amount: String(svc.default_price),
      frequency:
        svc.billing_type !== "flat"
          ? (svc.billing_type as PlanFrequency)
          : form.frequency,
    });
  };

  const handleSubmit = () => {
    if (!form.client_id || !form.name || !form.amount) return;
    const payload = {
      client_id: form.client_id,
      service_id: form.service_id === "__none__" ? null : form.service_id,
      name: form.name,
      amount: parseFloat(form.amount),
      frequency: form.frequency,
      net_days: form.net_days ? parseInt(form.net_days, 10) : 15,
      next_run_on: form.next_run_on,
      status: form.status,
      description: form.description || null,
    };
    if (editing) {
      updatePlan.mutate(
        { id: editing.id, ...payload },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createPlan.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const stats = useMemo(() => {
    if (!plans) return { mrr: 0, active: 0, generated: 0 };
    const active = plans.filter((p) => p.status === "active");
    const mrr = active.reduce((s, p) => s + monthlyEquivalent(p), 0);
    const generated = plans.reduce((s, p) => s + Number(p.invoices_generated || 0), 0);
    return { mrr, active: active.length, generated };
  }, [plans]);

  return (
    <div className="space-y-6">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-md bg-card border border-border flex items-center justify-center flex-shrink-0">
              <Repeat className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {t("recurring.title")}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl">
                {t("recurring.subtitle")}
              </p>
            </div>
          </div>

          {!isViewer && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={openNew}
                className="h-10 px-4 rounded-md bg-white text-[#0b0d2e] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" />
                {t("recurring.new")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============ SUMMARY CARDS ============ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {[
          {
            label: t("recurring.mrr"),
            value: fmt(stats.mrr),
            icon: DollarSign,
          },
          {
            label: t("recurring.activePlans"),
            value: stats.active,
            icon: RefreshCw,
          },
          {
            label: t("recurring.generated"),
            value: stats.generated,
            icon: Repeat,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-md bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-secondary text-secondary-foreground border border-border opacity-10 blur-2xl group-hover:opacity-25 transition-opacity" />
            <div className="relative flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                <s.icon className="w-4 h-4 text-foreground" />
              </div>
            </div>
            <div className="relative">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {s.label}
              </div>
              <div className="text-2xl lg:text-3xl font-bold tracking-tight truncate">
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ============ TABLE ============ */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !plans || !plans.length ? (
        <EmptyState
          icon={<Repeat className="w-9 h-9 text-success" />}
          title={t("recurring.empty")}
          description={t("recurring.emptyDesc")}
          action={
            !isViewer ? (
              <button
                onClick={openNew}
                className="h-11 px-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-foreground text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("recurring.new")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden border-border/50 shadow-sm [&_td]:!py-3 [&_th]:!h-11">
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[920px] table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                  <TableHead className="w-[220px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.client")}
                  </TableHead>
                  <TableHead className="w-[220px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("recurring.name")}
                  </TableHead>
                  <TableHead className="w-[170px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">
                    {t("recurring.amount")}
                  </TableHead>
                  <TableHead className="w-[130px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("recurring.nextRun")}
                  </TableHead>
                  <TableHead className="w-[130px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("clients.status")}
                  </TableHead>
                  <TableHead className="w-[160px] text-center font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow
                    key={plan.id}
                    className="group hover:bg-muted/40 transition-colors border-border/50"
                  >
                    <TableCell className="text-sm font-semibold truncate">
                      {plan.clients?.company_name || "—"}
                    </TableCell>
                    <TableCell className="text-sm truncate">{plan.name}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono font-bold text-sm">
                        {fmt(Number(plan.amount))}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1">
                        / {t("recurring.freq." + plan.frequency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(plan.next_run_on), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={STATUS_TONES[plan.status] ?? "neutral"}>
                        {t("recurring.st." + plan.status)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        {!isViewer && (
                          <>
                            {plan.status === "active" && (
                              <button
                                onClick={() =>
                                  updatePlan.mutate({ id: plan.id, status: "paused" })
                                }
                                title={t("recurring.pause")}
                                className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {plan.status === "paused" && (
                              <button
                                onClick={() =>
                                  updatePlan.mutate({ id: plan.id, status: "active" })
                                }
                                title={t("recurring.resume")}
                                className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(plan)}
                              className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="w-8 h-8 rounded-md hover:bg-destructive/10 flex items-center justify-center transition-colors">
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("common.delete")}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("common.cannotUndo")}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deletePlan.mutate(plan.id)}
                                  >
                                    {t("common.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ============ DIALOG ============ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                {editing ? (
                  <Pencil className="w-4 h-4 text-secondary-foreground" />
                ) : (
                  <Plus className="w-4 h-4 text-secondary-foreground" />
                )}
              </div>
              {editing ? t("recurring.edit") : t("recurring.new")}
            </DialogTitle>
            <DialogDescription>
              {editing ? t("recurring.editDesc") : t("recurring.newDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("recurring.service")}
              </Label>
              <Select value={form.service_id} onValueChange={handleServiceChange}>
                <SelectTrigger className="h-11 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {services?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("common.client")}
              </Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm({ ...form, client_id: v })}
              >
                <SelectTrigger className="h-11 rounded-md">
                  <SelectValue placeholder={t("kanban.client")} />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("recurring.name")}
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-11 rounded-md"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("recurring.amount")}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("recurring.frequency")}
                </Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) =>
                    setForm({ ...form, frequency: v as PlanFrequency })
                  }
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {t("recurring.freq." + f)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("recurring.netDays")}
                </Label>
                <Input
                  type="number"
                  value={form.net_days}
                  onChange={(e) => setForm({ ...form, net_days: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("recurring.nextRun")}
                </Label>
                <Input
                  type="date"
                  value={form.next_run_on}
                  onChange={(e) =>
                    setForm({ ...form, next_run_on: e.target.value })
                  }
                  className="h-11 rounded-md"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("clients.status")}
              </Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as PlanStatus })}
              >
                <SelectTrigger className="h-11 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("recurring.st.active")}</SelectItem>
                  <SelectItem value="paused">{t("recurring.st.paused")}</SelectItem>
                  <SelectItem value="cancelled">{t("recurring.st.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("recurring.description")}
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="rounded-md"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={
                !form.client_id ||
                !form.name ||
                !form.amount ||
                createPlan.isPending ||
                updatePlan.isPending
              }
              className="group w-full h-11 bg-secondary text-secondary-foreground border border-border font-semibold rounded-md inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60 relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-secondary text-secondary-foreground border border-border -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {createPlan.isPending || updatePlan.isPending
                ? t("common.saving")
                : t("common.save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
