import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, Plus, Truck, IdCard, MapPin, Receipt, CircleDollarSign,
  CalendarClock, LayoutGrid, List, Loader2,
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
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { useClients } from "@/hooks/useClients";
import { useTrucks } from "@/hooks/useTrucks";
import { useDrivers } from "@/hooks/useDrivers";
import {
  useLoads, useCreateLoad, useUpdateLoad, useInvoiceLoad,
  laneLabel, isReadyToInvoice, ratePerDistance,
  LOAD_BOARD_STATUSES, LOAD_STATUSES,
  type Load, type LoadStatus,
} from "@/hooks/useLoads";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<LoadStatus, StatusTone> = {
  quoted: "neutral",
  booked: "info",
  dispatched: "warning",
  in_transit: "warning",
  delivered: "success",
  cancelled: "danger",
};

// Faixa colorida no topo da coluna e no card. Acompanha o mesmo vocabulário do
// StatusBadge para que a cor signifique a mesma coisa nas duas telas.
const STATUS_BAR: Record<LoadStatus, string> = {
  quoted: "bg-muted-foreground/40",
  booked: "bg-primary",
  dispatched: "bg-warning",
  in_transit: "bg-warning",
  delivered: "bg-success",
  cancelled: "bg-destructive",
};

type ViewMode = "board" | "list";

const EMPTY_FORM = {
  client_id: "",
  reference: "",
  origin_city: "",
  origin_region: "",
  destination_city: "",
  destination_region: "",
  pickup_at: "",
  delivery_at: "",
  rate: "",
  distance: "",
  commodity: "",
  weight: "",
  truck_id: "",
  driver_id: "",
  notes: "",
};

export default function LoadsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { money, dateNumeric, currency } = useRegion();

  const { data: loads, isLoading } = useLoads();
  const { data: clients } = useClients();
  const { data: trucks } = useTrucks();
  const { data: drivers } = useDrivers();

  const createLoad = useCreateLoad();
  const updateLoad = useUpdateLoad();
  const invoiceLoad = useInvoiceLoad();

  const [view, setView] = useLocalStorageState<ViewMode>("dotpilot-loads-view", "board");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LoadStatus | null>(null);
  const [statusFilter, setStatusFilter] = useState<LoadStatus | "all">("all");

  const all = useMemo(() => loads ?? [], [loads]);

  const stats = useMemo(() => {
    // Cargas em rota e receita ainda não faturada são as duas perguntas que o
    // despachante faz toda manhã; o resto do resumo é contexto.
    const active = all.filter((l) => l.status === "dispatched" || l.status === "in_transit");
    const toInvoice = all.filter(isReadyToInvoice);
    const openRevenue = all
      .filter((l) => l.status !== "cancelled" && !l.invoice_id)
      .reduce((sum, l) => sum + Number(l.rate || 0), 0);
    return {
      active: active.length,
      toInvoice: toInvoice.length,
      toInvoiceValue: toInvoice.reduce((s, l) => s + Number(l.rate || 0), 0),
      openRevenue,
      total: all.filter((l) => l.status !== "cancelled").length,
    };
  }, [all]);

  const listRows = useMemo(
    () => (statusFilter === "all" ? all : all.filter((l) => l.status === statusFilter)),
    [all, statusFilter],
  );

  const byStatus = (status: LoadStatus) => all.filter((l) => l.status === status);

  const handleDrop = async (status: LoadStatus) => {
    setDragOver(null);
    if (!draggedId) return;
    const load = all.find((l) => l.id === draggedId);
    setDraggedId(null);
    if (!load || load.status === status) return;
    // silent: o card já se moveu na tela; um toast por arrasto seria ruído.
    await updateLoad.mutateAsync({ id: load.id, status, silent: true });
  };

  const submit = async () => {
    if (!form.client_id) return;
    await createLoad.mutateAsync({
      client_id: form.client_id,
      reference: form.reference || null,
      origin_city: form.origin_city || null,
      origin_region: form.origin_region || null,
      destination_city: form.destination_city || null,
      destination_region: form.destination_region || null,
      // <input type="datetime-local"> devolve "2026-08-24T14:30" sem fuso.
      // new Date() interpreta como horário local, que é o que o despachante
      // digitou, e toISOString normaliza pra UTC na gravação.
      pickup_at: form.pickup_at ? new Date(form.pickup_at).toISOString() : null,
      delivery_at: form.delivery_at ? new Date(form.delivery_at).toISOString() : null,
      rate: form.rate ? Number(form.rate) : 0,
      distance: form.distance ? Number(form.distance) : null,
      commodity: form.commodity || null,
      weight: form.weight ? Number(form.weight) : null,
      truck_id: form.truck_id || null,
      driver_id: form.driver_id || null,
      notes: form.notes || null,
    });
    setForm(EMPTY_FORM);
    setDialogOpen(false);
  };

  const statusLabel = (s: LoadStatus) => t(`loads.status.${s}`);

  const LoadCard = ({ load }: { load: Load }) => {
    const lane = laneLabel(load);
    const perDistance = ratePerDistance(load);
    return (
      <Card
        draggable
        onDragStart={() => setDraggedId(load.id)}
        onDragEnd={() => setDraggedId(null)}
        onClick={() => navigate(`/loads/${load.id}`)}
        className={cn(
          "relative overflow-hidden cursor-grab active:cursor-grabbing border-border/60",
          "transition-all hover:shadow-md hover:-translate-y-0.5",
          draggedId === load.id && "opacity-40",
        )}
      >
        <div className={cn("absolute top-0 left-0 bottom-0 w-1", STATUS_BAR[load.status])} />
        <CardContent className="p-3 pl-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold truncate">
              {load.reference || load.clients?.company_name || t("loads.untitled")}
            </span>
            <span className="text-sm font-semibold tabular-nums shrink-0">{money(load.rate)}</span>
          </div>

          {load.reference && load.clients?.company_name && (
            <p className="text-xs text-muted-foreground truncate">{load.clients.company_name}</p>
          )}

          {lane && (
            <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{lane}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {load.pickup_at && (
              <span className="flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                {dateNumeric(new Date(load.pickup_at))}
              </span>
            )}
            {load.drivers?.full_name && (
              <span className="flex items-center gap-1 truncate">
                <IdCard className="w-3 h-3" />
                {load.drivers.full_name}
              </span>
            )}
            {load.trucks?.plate && (
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {load.trucks.plate}
              </span>
            )}
            {perDistance !== null && (
              <span className="tabular-nums">
                {money(perDistance)}/{load.distance_unit}
              </span>
            )}
          </div>

          {isReadyToInvoice(load) && (
            <StatusBadge tone="warning" size="sm">{t("loads.readyToInvoice")}</StatusBadge>
          )}
          {load.invoice_id && (
            <StatusBadge tone="success" size="sm">{t("loads.invoicedBadge")}</StatusBadge>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("sidebar.section.operation")}
        title={t("loads.title")}
        description={t("loads.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setView("board")}
                aria-pressed={view === "board"}
                className={cn("px-2.5 h-8 flex items-center gap-1.5 text-xs",
                  view === "board" ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> {t("loads.viewBoard")}
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                className={cn("px-2.5 h-8 flex items-center gap-1.5 text-xs border-l border-border",
                  view === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
              >
                <List className="w-3.5 h-3.5" /> {t("loads.viewList")}
              </button>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> {t("loads.new")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("loads.kpi.active")} value={stats.active} icon={Truck} loading={isLoading} />
        <KpiCard
          label={t("loads.kpi.toInvoice")}
          value={stats.toInvoice}
          icon={Receipt}
          tone={stats.toInvoice > 0 ? "warning" : "neutral"}
          loading={isLoading}
          hint={stats.toInvoice > 0 ? money(stats.toInvoiceValue) : undefined}
        />
        <KpiCard
          label={t("loads.kpi.openRevenue")}
          value={money(stats.openRevenue)}
          icon={CircleDollarSign}
          loading={isLoading}
          hint={currency}
        />
        <KpiCard label={t("loads.kpi.total")} value={stats.total} icon={Package} loading={isLoading} />
      </div>

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-5">
          {LOAD_BOARD_STATUSES.map((s) => <Skeleton key={s} className="h-64 rounded-md" />)}
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title={t("loads.empty.title")}
          description={t("loads.empty.desc")}
          action={
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> {t("loads.new")}
            </Button>
          }
        />
      ) : view === "board" ? (
        <div className="grid gap-3 lg:grid-cols-5">
          {LOAD_BOARD_STATUSES.map((status) => {
            const items = byStatus(status);
            const columnValue = items.reduce((s, l) => s + Number(l.rate || 0), 0);
            return (
              <div
                key={status}
                onDragOver={(e) => { e.preventDefault(); setDragOver(status); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(status)}
                className={cn(
                  "space-y-2 rounded-md p-2 transition-colors",
                  dragOver === status ? "bg-accent/60 ring-1 ring-primary/30" : "bg-muted/30",
                )}
              >
                <div className="relative overflow-hidden rounded-md bg-card border border-border/50 p-3">
                  <div className={cn("absolute top-0 left-0 right-0 h-1", STATUS_BAR[status])} />
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs font-semibold truncate">{statusLabel(status)}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      {items.length}
                    </span>
                  </div>
                  {columnValue > 0 && (
                    <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                      {money(columnValue)}
                    </p>
                  )}
                </div>

                {items.map((load) => <LoadCard key={load.id} load={load} />)}
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 p-3 border-b border-border/60">
              <Label htmlFor="loads-status-filter" className="text-xs text-muted-foreground">
                {t("common.status")}
              </Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LoadStatus | "all")}>
                <SelectTrigger id="loads-status-filter" className="h-8 w-48 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {LOAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("loads.col.reference")}</TableHead>
                    <TableHead>{t("common.client")}</TableHead>
                    <TableHead>{t("loads.col.lane")}</TableHead>
                    <TableHead>{t("loads.col.pickup")}</TableHead>
                    <TableHead>{t("nav.drivers")}</TableHead>
                    <TableHead className="text-right">{t("loads.col.rate")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listRows.map((load) => (
                    <TableRow
                      key={load.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/loads/${load.id}`)}
                    >
                      <TableCell className="font-medium">{load.reference || "—"}</TableCell>
                      <TableCell>{load.clients?.company_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {laneLabel(load) ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {load.pickup_at ? dateNumeric(new Date(load.pickup_at)) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{load.drivers?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(load.rate)}</TableCell>
                      <TableCell>
                        <StatusBadge tone={STATUS_TONE[load.status]} size="sm">
                          {statusLabel(load.status)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isReadyToInvoice(load) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5"
                            disabled={invoiceLoad.isPending}
                            onClick={(e) => { e.stopPropagation(); invoiceLoad.mutate({ load }); }}
                          >
                            {invoiceLoad.isPending
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Receipt className="w-3 h-3" />}
                            {t("loads.invoiceAction")}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("loads.new")}</DialogTitle></DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="load-client">{t("common.client")} *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger id="load-client"><SelectValue placeholder={t("loads.selectClient")} /></SelectTrigger>
                <SelectContent>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="load-ref">{t("loads.col.reference")}</Label>
              <Input id="load-ref" value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder={t("loads.referencePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="load-commodity">{t("loads.col.commodity")}</Label>
              <Input id="load-commodity" value={form.commodity}
                onChange={(e) => setForm({ ...form, commodity: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="load-origin">{t("loads.origin")}</Label>
              <div className="flex gap-2">
                <Input id="load-origin" value={form.origin_city}
                  onChange={(e) => setForm({ ...form, origin_city: e.target.value })}
                  placeholder={t("common.city")} />
                <Input value={form.origin_region} className="w-20"
                  onChange={(e) => setForm({ ...form, origin_region: e.target.value })}
                  placeholder={t("common.state")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="load-dest">{t("loads.destination")}</Label>
              <div className="flex gap-2">
                <Input id="load-dest" value={form.destination_city}
                  onChange={(e) => setForm({ ...form, destination_city: e.target.value })}
                  placeholder={t("common.city")} />
                <Input value={form.destination_region} className="w-20"
                  onChange={(e) => setForm({ ...form, destination_region: e.target.value })}
                  placeholder={t("common.state")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="load-pickup">{t("loads.col.pickup")}</Label>
              <Input id="load-pickup" type="datetime-local" value={form.pickup_at}
                onChange={(e) => setForm({ ...form, pickup_at: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="load-delivery">{t("loads.col.delivery")}</Label>
              <Input id="load-delivery" type="datetime-local" value={form.delivery_at}
                onChange={(e) => setForm({ ...form, delivery_at: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="load-rate">{t("loads.col.rate")}</Label>
              <Input id="load-rate" type="number" min={0} step="0.01" inputMode="decimal"
                value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="load-distance">{t("loads.col.distance")}</Label>
              <Input id="load-distance" type="number" min={0} step="0.1" inputMode="decimal"
                value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="load-truck">{t("nav.trucks")}</Label>
              <Select value={form.truck_id} onValueChange={(v) => setForm({ ...form, truck_id: v })}>
                <SelectTrigger id="load-truck"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(trucks ?? []).map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>{tr.plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="load-driver">{t("nav.drivers")}</Label>
              <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                <SelectTrigger id="load-driver"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(drivers ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="load-notes">{t("common.notes")}</Label>
              <Textarea id="load-notes" rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={!form.client_id || createLoad.isPending} className="gap-2">
              {createLoad.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
