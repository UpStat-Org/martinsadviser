import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Truck as TruckIcon,
  CheckCircle2,
  XCircle,
  Calendar,
  Hash,
} from "lucide-react";
import { useTrucks, useDeleteTruck } from "@/hooks/useTrucks";
import { TruckFormDialog } from "@/components/TruckFormDialog";
import type { Truck } from "@/hooks/useTrucks";
import { useLanguage } from "@/contexts/LanguageContext";

const PLATE_GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-red-500",
  "from-fuchsia-500 to-pink-500",
  "from-sky-500 to-blue-500",
  "from-purple-500 to-indigo-500",
];

function gradientFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PLATE_GRADIENTS[h % PLATE_GRADIENTS.length];
}

export default function Trucks() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const { data: trucks, isLoading } = useTrucks(search || undefined);
  const deleteTruck = useDeleteTruck();
  const { t } = useLanguage();

  const handleEdit = (truck: Truck) => {
    setEditingTruck(truck);
    setDialogOpen(true);
  };
  const handleNew = () => {
    setEditingTruck(null);
    setDialogOpen(true);
  };

  const stats = useMemo(() => {
    const total = trucks?.length ?? 0;
    const active = trucks?.filter((t) => t.status === "active").length ?? 0;
    const inactive = total - active;
    const currentYear = new Date().getFullYear();
    const recent =
      trucks?.filter((t) => t.year && currentYear - Number(t.year) <= 5).length ?? 0;
    return { total, active, inactive, recent };
  }, [trucks]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============ HERO HEADER ============ */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl flex-shrink-0">
              <TruckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
                {t("trucks.title")}
              </h1>
              <p className="text-white/70 mt-2 text-sm sm:text-base max-w-xl">
                {t("trucks.subtitle")}
              </p>
            </div>
          </div>

          <button
            onClick={handleNew}
            className="h-10 px-4 rounded-xl bg-white text-[#0b0d2e] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            {t("trucks.new")}
          </button>
        </div>
      </div>

      {/* ============ QUICK STATS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Total de caminhões",
            value: stats.total,
            icon: TruckIcon,
            gradient: "from-indigo-500 to-violet-500",
          },
          {
            label: "Ativos",
            value: stats.active,
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-teal-500",
          },
          {
            label: "Inativos",
            value: stats.inactive,
            icon: XCircle,
            gradient: "from-slate-500 to-zinc-500",
          },
          {
            label: "Frota recente (≤5 anos)",
            value: stats.recent,
            icon: Calendar,
            gradient: "from-sky-500 to-blue-500",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div
              className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${s.gradient} opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`}
            />
            <div className="relative flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md`}
              >
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="relative">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {s.label}
              </div>
              <div className="font-display text-3xl font-bold tracking-tight">
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ============ SEARCH ============ */}
      <div className="rounded-2xl bg-card border border-border/50 p-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("trucks.search")}
            className="pl-10 h-10 bg-muted/40 border-border/60 focus:bg-background rounded-xl transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ============ TABLE ============ */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !trucks?.length ? (
        <Card className="border-border/50">
          <CardContent className="p-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
              <TruckIcon className="w-9 h-9 text-indigo-500" />
            </div>
            <p className="font-display text-lg font-semibold text-foreground mb-1">
              {search ? "Nenhum caminhão encontrado" : t("trucks.empty")}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {search
                ? "Tente ajustar a busca."
                : "Cadastre o primeiro caminhão da frota."}
            </p>
            {!search && (
              <button
                onClick={handleNew}
                className="h-11 px-6 rounded-xl btn-gradient text-white text-sm font-semibold inline-flex items-center gap-2 hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all"
              >
                <Plus className="w-4 h-4" />
                {t("trucks.registerFirst")}
              </button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("trucks.plate")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.client")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("trucks.makeModel")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("trucks.year")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    VIN
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("clients.status")}
                  </TableHead>
                  <TableHead className="w-24 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucks.map((truck) => {
                  const active = truck.status === "active";
                  return (
                    <TableRow
                      key={truck.id}
                      className="group hover:bg-muted/40 transition-colors border-border/50"
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientFor(
                              truck.id
                            )} flex items-center justify-center shadow-md flex-shrink-0`}
                          >
                            <TruckIcon className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-mono text-sm font-bold tracking-wide">
                              {truck.plate}
                            </div>
                            {truck.vin && (
                              <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                {truck.vin}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {(truck as any).clients?.company_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {[truck.make, truck.model].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell>
                        {truck.year ? (
                          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-muted/60 text-xs font-semibold">
                            <Hash className="w-3 h-3 text-muted-foreground" />
                            {truck.year}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {truck.vin ? (
                          <span className="inline-flex items-center h-6 px-2 rounded-md bg-muted/40 border border-border/50">
                            {truck.vin}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-md text-xs font-semibold border ${
                            active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
                            }`}
                          />
                          {active ? t("common.active") : t("common.inactive")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(truck)}
                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                            title={t("common.edit")}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors"
                                title={t("common.delete")}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t("trucks.removeTruck")}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("trucks.removeTruckDesc")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t("common.cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTruck.mutate(truck.id)}
                                >
                                  {t("common.delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <TruckFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        truck={editingTruck}
      />
    </div>
  );
}
