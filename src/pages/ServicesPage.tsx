import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { StatusBadge } from "@/components/StatusBadge";
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  BILLING_TYPES,
  type Service,
  type BillingType,
} from "@/hooks/useServices";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Package, Plus, Loader2, Pencil, Trash2 } from "lucide-react";

export default function ServicesPage() {
  const { t } = useLanguage();
  const { role } = useAuth();
  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const isViewer = role === "viewer";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({
    name: "",
    default_price: "",
    billing_type: "flat" as BillingType,
    active: true,
    description: "",
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: "",
      default_price: "",
      billing_type: "flat",
      active: true,
      description: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (svc: Service) => {
    setEditing(svc);
    setForm({
      name: svc.name,
      default_price: String(svc.default_price),
      billing_type: svc.billing_type,
      active: svc.active,
      description: svc.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name) return;
    const payload = {
      name: form.name,
      default_price: form.default_price ? parseFloat(form.default_price) : 0,
      billing_type: form.billing_type,
      active: form.active,
      description: form.description || null,
    };
    if (editing) {
      updateService.mutate(
        { id: editing.id, ...payload },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createService.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-md bg-card border border-border flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {t("services.title")}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl">
                {t("services.subtitle")}
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
                {t("services.new")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============ TABLE ============ */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !services || !services.length ? (
        <EmptyState
          icon={<Package className="w-9 h-9 text-success" />}
          title={t("services.empty")}
          description={t("services.emptyDesc")}
          action={
            !isViewer ? (
              <button
                onClick={openNew}
                className="h-11 px-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-foreground text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("services.new")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden border-border/50 shadow-sm [&_td]:!py-3 [&_th]:!h-11">
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[880px] table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                  <TableHead className="w-[220px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("services.name")}
                  </TableHead>
                  <TableHead className="w-[280px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("services.description")}
                  </TableHead>
                  <TableHead className="w-[140px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">
                    {t("services.price")}
                  </TableHead>
                  <TableHead className="w-[130px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("services.billing")}
                  </TableHead>
                  <TableHead className="w-[110px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("services.active")}
                  </TableHead>
                  <TableHead className="w-[130px] text-center font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((svc) => (
                  <TableRow
                    key={svc.id}
                    className="group hover:bg-muted/40 transition-colors border-border/50"
                  >
                    <TableCell className="text-sm font-semibold truncate">
                      {svc.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[260px] truncate">
                      {svc.description || "—"}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-sm text-right">
                      {fmt(Number(svc.default_price))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone="neutral">
                        {t("services.bt." + svc.billing_type)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={svc.active ? "success" : "neutral"}>
                        {svc.active ? t("common.yes") : t("common.no")}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        {!isViewer && (
                          <>
                            <button
                              onClick={() => openEdit(svc)}
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
                                    onClick={() => deleteService.mutate(svc.id)}
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
              {editing ? t("services.edit") : t("services.new")}
            </DialogTitle>
            <DialogDescription>
              {editing ? t("services.editDesc") : t("services.newDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("services.name")}
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
                  {t("services.price")}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.default_price}
                  onChange={(e) =>
                    setForm({ ...form, default_price: e.target.value })
                  }
                  className="h-11 rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("services.billing")}
                </Label>
                <Select
                  value={form.billing_type}
                  onValueChange={(v) =>
                    setForm({ ...form, billing_type: v as BillingType })
                  }
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_TYPES.map((bt) => (
                      <SelectItem key={bt} value={bt}>
                        {t("services.bt." + bt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 h-11">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("services.active")}
              </Label>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("services.description")}
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
                !form.name ||
                createService.isPending ||
                updateService.isPending
              }
              className="group w-full h-11 bg-secondary text-secondary-foreground border border-border font-semibold rounded-md inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60 relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-secondary text-secondary-foreground border border-border -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {createService.isPending || updateService.isPending
                ? t("common.saving")
                : t("common.save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
