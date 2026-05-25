import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Eye,
} from "lucide-react";
import { useTrucks, useDeleteTruck } from "@/hooks/useTrucks";
import { TruckFormDialog } from "@/components/TruckFormDialog";
import type { Truck, TruckWithClient } from "@/hooks/useTrucks";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { TablePreferencesToolbar, type Density } from "@/components/TablePreferencesToolbar";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

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

const defaultTruckColumns = {
  client: true,
  makeModel: true,
  year: true,
  vin: true,
  status: true,
};

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
  const navigate = useNavigate();
  const [density, setDensity] = useLocalStorageState<Density>(
    "trucks-table-density",
    "comfortable"
  );
  const [columns, setColumns] = useLocalStorageState(
    "trucks-table-columns",
    defaultTruckColumns
  );

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

  const kpis: Array<{ label: string; value: number; icon: typeof TruckIcon }> = [
    { label: t("trucks.statsTotal"), value: stats.total, icon: TruckIcon },
    { label: t("trucks.statsActive"), value: stats.active, icon: CheckCircle2 },
    { label: t("trucks.statsInactive"), value: stats.inactive, icon: XCircle },
    { label: t("trucks.statsRecent"), value: stats.recent, icon: Calendar },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("trucks.title")}
        description={t("trucks.subtitle")}
        actions={
          <Button size="sm" onClick={handleNew}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t("trucks.new")}
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {kpis.map((s) => (
          <div
            key={s.label}
            className="rounded-md border border-border bg-card p-3.5 transition-colors hover:bg-muted/60"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <s.icon className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <div className="text-2xl font-semibold tracking-tight tabular mt-1.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ============ SEARCH ============ */}
      <div className="rounded-md bg-card border border-border/50 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("trucks.search")}
            className="pl-10 h-10 bg-muted/40 border-border/60 focus:bg-background rounded-md transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="sm:ml-auto">
          <TablePreferencesToolbar
            density={density}
            onDensityChange={setDensity}
            columns={columns}
            onColumnsChange={setColumns}
            columnOptions={[
              { key: "client", label: t("common.client") },
              { key: "makeModel", label: t("trucks.makeModel") },
              { key: "year", label: t("trucks.year") },
              { key: "vin", label: "VIN" },
              { key: "status", label: t("clients.status") },
            ]}
          />
        </div>
      </div>

      {/* ============ TABLE ============ */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !trucks?.length ? (
        <EmptyState
          icon={<TruckIcon className="w-9 h-9 text-indigo-500" />}
          title={search ? t("trucks.noResults") : t("trucks.empty")}
          description={
            search
              ? t("trucks.emptyFilteredDesc")
              : t("trucks.emptyCreateDesc")
          }
          action={
            !search ? (
              <button
                onClick={handleNew}
                className="h-11 px-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-white text-sm font-semibold inline-flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                {t("trucks.registerFirst")}
              </button>
            ) : (
              <button
                onClick={() => setSearch("")}
                className="h-11 px-5 rounded-md bg-muted hover:bg-muted/80 text-sm font-semibold"
              >
                {t("common.clearSearch")}
              </button>
            )
          }
          secondaryAction={
            !search ? (
              <button
                onClick={() => navigate("/clients")}
                className="h-11 px-5 rounded-md bg-muted hover:bg-muted/80 text-sm font-semibold"
              >
                {t("common.viewClients")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <Card
          className={`overflow-hidden border-border/50 shadow-sm ${
            density === "compact"
              ? "[&_td]:!py-2 [&_td]:text-xs [&_th]:!h-9 [&_th]:!py-2"
              : "[&_td]:!py-3 [&_th]:!h-11"
          }`}
        >
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[980px] table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                  <TableHead className="w-[190px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("trucks.plate")}
                  </TableHead>
                  {columns.client !== false && <TableHead className="w-[240px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.client")}
                  </TableHead>}
                  {columns.makeModel !== false && <TableHead className="w-[180px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("trucks.makeModel")}
                  </TableHead>}
                  {columns.year !== false && <TableHead className="w-[95px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("trucks.year")}
                  </TableHead>}
                  {columns.vin !== false && <TableHead className="w-[190px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    VIN
                  </TableHead>}
                  {columns.status !== false && <TableHead className="w-[120px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("clients.status")}
                  </TableHead>}
                  <TableHead className="w-[140px] text-center font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
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
                      <TableCell className={density === "compact" ? "py-2" : "py-3"}>
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center flex-shrink-0`}
                          >
                            <TruckIcon className="w-4 h-4 text-secondary-foreground" />
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
                      {columns.client !== false && <TableCell className="text-sm">
                        <Link to={`/clients/${truck.client_id}`} className="block truncate font-medium hover:text-primary">
                          {(truck as TruckWithClient).clients?.company_name || "—"}
                        </Link>
                      </TableCell>}
                      {columns.makeModel !== false && <TableCell className="text-sm font-medium">
                        {[truck.make, truck.model].filter(Boolean).join(" ") || "—"}
                      </TableCell>}
                      {columns.year !== false && <TableCell>
                        {truck.year ? (
                          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-muted/60 text-xs font-semibold">
                            <Hash className="w-3 h-3 text-muted-foreground" />
                            {truck.year}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>}
                      {columns.vin !== false && <TableCell className="text-xs font-mono text-muted-foreground">
                        {truck.vin ? (
                          <span className="inline-flex items-center h-6 max-w-[170px] px-2 rounded-md bg-muted/40 border border-border/50 truncate">
                            {truck.vin}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>}
                      {columns.status !== false && <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 h-6 min-w-[82px] justify-center whitespace-nowrap px-2.5 rounded-md text-xs font-semibold border ${
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
                      </TableCell>}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            to={`/trucks/${truck.id}`}
                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                            title={t("common.openTruck")}
                          >
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </Link>
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
