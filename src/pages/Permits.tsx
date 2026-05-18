import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  FileText,
  FileCheck,
  RefreshCw,
  History,
  Upload,
  Filter,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Eye,
  X,
} from "lucide-react";
import { usePermits, useDeletePermit, getExpirationStatus } from "@/hooks/usePermits";
import { PermitFormDialog } from "@/components/PermitFormDialog";
import { DocumentViewer } from "@/components/DocumentViewer";
import type { Permit } from "@/hooks/usePermits";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PaginationBar } from "@/components/PaginationBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdatePermit } from "@/hooks/usePermits";
import { useCreatePermitHistory } from "@/hooks/usePermitHistory";
import { PermitHistoryDialog } from "@/components/PermitHistoryDialog";
import { useToast } from "@/hooks/use-toast";
import { SavedFiltersBar } from "@/components/SavedFiltersBar";
import { PermitImportDialog } from "@/components/PermitImportDialog";
import { EmptyState } from "@/components/EmptyState";
import { TablePreferencesToolbar, type Density } from "@/components/TablePreferencesToolbar";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

const TYPE_GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-red-500",
  "from-fuchsia-500 to-pink-500",
  "from-sky-500 to-blue-500",
  "from-purple-500 to-indigo-500",
];

const defaultPermitColumns = {
  number: true,
  client: true,
  truck: true,
  state: true,
  expiration: true,
  status: true,
  doc: true,
};

function gradientForType(type: string) {
  let h = 0;
  for (let i = 0; i < type.length; i++) h = (h * 31 + type.charCodeAt(i)) >>> 0;
  return TYPE_GRADIENTS[h % TYPE_GRADIENTS.length];
}

export default function Permits() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useLocalStorageState("permits-status-filter", "all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
  const [viewDocTitle, setViewDocTitle] = useState("");
  const { data: permits, isLoading } = usePermits(search || undefined, undefined, statusFilter);
  const deletePermit = useDeletePermit();
  const updatePermit = useUpdatePermit();
  const createHistory = useCreatePermitHistory();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [historyPermitId, setHistoryPermitId] = useState<string | null>(null);
  const [historyPermitLabel, setHistoryPermitLabel] = useState("");
  const [bulkRenewing, setBulkRenewing] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [density, setDensity] = useLocalStorageState<Density>(
    "permits-table-density",
    "comfortable"
  );
  const [columns, setColumns] = useLocalStorageState(
    "permits-table-columns",
    defaultPermitColumns
  );
  const truckFilter = searchParams.get("truck");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const visiblePermits = useMemo(() => {
    if (!permits) return [];
    return truckFilter ? permits.filter((permit) => permit.truck_id === truckFilter) : permits;
  }, [permits, truckFilter]);
  const totalPages = Math.ceil((visiblePermits.length || 0) / PAGE_SIZE);
  const paginatedPermits = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visiblePermits.slice(start, start + PAGE_SIZE);
  }, [visiblePermits, page]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!visiblePermits.length) return;
    if (selected.size === visiblePermits.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visiblePermits.map((p) => p.id)));
    }
  };

  const handleBulkRenew = async () => {
    if (selected.size === 0 || !permits) return;
    setBulkRenewing(true);
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const newExpDate = nextYear.toISOString().split("T")[0];

    let success = 0;
    for (const id of selected) {
      const permit = permits.find((p) => p.id === id);
      if (!permit) continue;
      try {
        await createHistory.mutateAsync({
          permit_id: id,
          change_type: "renewed",
          old_values: { expiration_date: permit.expiration_date, status: permit.status },
          new_values: { expiration_date: newExpDate, status: "active" },
        notes: `${t("permits.bulkRenewNote")} ${permit.expiration_date || "—"}`,
        });
        await updatePermit.mutateAsync({
          id,
          expiration_date: newExpDate,
          status: "active",
        });
        success++;
      } catch {
        /* continue */
      }
    }
    setBulkRenewing(false);
    setSelected(new Set());
    toast({ title: t("permits.bulkRenewSuccess").replace("{count}", String(success)) });
  };

  const statusFilters = [
    { value: "all", label: t("permits.all"), icon: ShieldCheck },
    { value: "active", label: t("permits.actives"), icon: CheckCircle2 },
    { value: "pending", label: t("permits.pendings"), icon: Clock },
    { value: "expired", label: t("permits.expired"), icon: AlertTriangle },
  ];

  const handleEdit = (permit: Permit) => {
    setEditingPermit(permit);
    setDialogOpen(true);
  };
  const handleNew = () => {
    setEditingPermit(null);
    setDialogOpen(true);
  };

  // Quick stats (based on full fetched set for current filters)
  const stats = useMemo(() => {
    const now = new Date();
    const total = permits?.length ?? 0;
    let active = 0,
      expiring = 0,
      expired = 0;
    permits?.forEach((p) => {
      if (!p.expiration_date) return;
      const diff = Math.ceil(
        (new Date(p.expiration_date).getTime() - now.getTime()) / 86400000
      );
      if (diff < 0) expired++;
      else if (diff <= 30) expiring++;
      else active++;
    });
    return { total, active, expiring, expired };
  }, [permits]);

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
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
                {t("permits.title")}
              </h1>
              <p className="text-white/70 mt-2 text-sm sm:text-base max-w-xl">
                {t("permits.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={handleBulkRenew}
                disabled={bulkRenewing}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:shadow-lg transition-all disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${bulkRenewing ? "animate-spin" : ""}`} />
                {t("permits.bulkRenew").replace("{count}", String(selected.size))}
              </button>
            )}
            <button
              onClick={() => setImportOpen(true)}
              className="h-10 px-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/15 transition-all"
            >
              <Upload className="w-4 h-4" />
              {t("common.import")}
            </button>
            <button
              onClick={handleNew}
              className="h-10 px-4 rounded-xl bg-white text-[#0b0d2e] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" />
              {t("permits.new")}
            </button>
          </div>
        </div>
      </div>

      {/* ============ QUICK STATS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: t("permits.stats.total"),
            value: stats.total,
            icon: FileCheck,
            gradient: "from-indigo-500 to-violet-500",
          },
          {
            label: t("permits.stats.valid"),
            value: stats.active,
            icon: ShieldCheck,
            gradient: "from-emerald-500 to-teal-500",
          },
          {
            label: t("permits.stats.expiring"),
            value: stats.expiring,
            icon: Clock,
            gradient: "from-amber-500 to-orange-500",
          },
          {
            label: t("permits.stats.expired"),
            value: stats.expired,
            icon: AlertTriangle,
            gradient: "from-red-500 to-rose-500",
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

      {/* ============ FILTERS ============ */}
      <div className="rounded-2xl bg-card border border-border/50 p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("permits.search")}
            className="pl-10 h-10 bg-muted/40 border-border/60 focus:bg-background rounded-xl transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="hidden sm:block h-8 w-px bg-border/60" />
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
            <Filter className="w-3.5 h-3.5" />
            {t("clients.status")}:
          </div>
          {statusFilters.map((f) => {
            const active = statusFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                  active
                    ? "btn-gradient text-white shadow-md"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
              </button>
            );
            })}
          {truckFilter && (
            <button
              onClick={() => setSearchParams({})}
              className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/15 inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              {t("common.truck")}
            </button>
          )}
        </div>
        <div className="sm:ml-auto">
          <TablePreferencesToolbar
            density={density}
            onDensityChange={setDensity}
            columns={columns}
            onColumnsChange={setColumns}
            columnOptions={[
              { key: "number", label: t("common.number") },
              { key: "client", label: t("common.client") },
              { key: "truck", label: t("common.truck") },
              { key: "state", label: t("common.state") },
              { key: "expiration", label: t("common.expiration") },
              { key: "status", label: t("clients.status") },
              { key: "doc", label: t("common.doc") },
            ]}
          />
        </div>
      </div>

      <SavedFiltersBar
        page="permits"
        currentFilters={{ search, statusFilter }}
        onApply={(f) => {
          if (f.search !== undefined) setSearch(f.search);
          if (f.statusFilter !== undefined) setStatusFilter(f.statusFilter);
        }}
      />

      {/* ============ TABLE ============ */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !visiblePermits.length ? (
        <EmptyState
          icon={<FileCheck className="w-9 h-9 text-emerald-500" />}
          title={search || truckFilter ? t("permits.noResults") : t("permits.empty")}
          description={
            search || truckFilter
              ? t("permits.adjustSearch")
              : t("permits.createFirst")
          }
          action={
            !search && !truckFilter ? (
              <button
                onClick={handleNew}
                className="h-11 px-6 rounded-xl btn-gradient text-white text-sm font-semibold inline-flex items-center gap-2 hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all"
              >
                <Plus className="w-4 h-4" />
                {t("permits.registerFirst")}
              </button>
            ) : (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setSearchParams({});
                }}
                className="h-11 px-5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold"
              >
                {t("common.clearFilters")}
              </button>
            )
          }
          secondaryAction={
            !search && !truckFilter ? (
              <button
                onClick={() => setImportOpen(true)}
                className="h-11 px-5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {t("common.import")}
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
            <Table className="min-w-[1120px] table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={visiblePermits.length ? selected.size === visiblePermits.length : false}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="w-[220px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.type")}
                  </TableHead>
                  {columns.number !== false && <TableHead className="w-[120px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.number")}
                  </TableHead>}
                  {columns.client !== false && <TableHead className="w-[220px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.client")}
                  </TableHead>}
                  {columns.truck !== false && <TableHead className="w-[110px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.truck")}
                  </TableHead>}
                  {columns.state !== false && <TableHead className="w-[90px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.state")}
                  </TableHead>}
                  {columns.expiration !== false && <TableHead className="w-[130px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.expiration")}
                  </TableHead>}
                  {columns.status !== false && <TableHead className="w-[150px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("clients.status")}
                  </TableHead>}
                  {columns.doc !== false && <TableHead className="w-[80px] text-center font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.doc")}
                  </TableHead>}
                  <TableHead className="w-[150px] text-center font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPermits.map((permit) => {
                  const expStatus = getExpirationStatus(permit.expiration_date);
                  const isSelected = selected.has(permit.id);
                  const now = new Date();
                  const diff = permit.expiration_date
                    ? Math.ceil(
                        (new Date(permit.expiration_date).getTime() - now.getTime()) /
                          86400000
                      )
                    : null;
                  return (
                    <TableRow
                      key={permit.id}
                      className={`group hover:bg-muted/40 transition-colors border-border/50 ${
                        isSelected ? "bg-primary/[0.04]" : ""
                      }`}
                    >
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(permit.id)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className={density === "compact" ? "py-2" : "py-3"}>
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientForType(
                              permit.permit_type
                            )} flex items-center justify-center shadow-md flex-shrink-0`}
                          >
                            <FileCheck className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate max-w-[150px]">
                              {permit.permit_type}
                            </div>
                            {permit.state && (
                              <div className="text-[11px] text-muted-foreground">
                                Estado {permit.state}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      {columns.number !== false && <TableCell className="font-mono text-xs text-muted-foreground">
                        {permit.permit_number ? (
                          <span className="inline-flex items-center h-6 px-2 rounded-md bg-muted/50 border border-border/50">
                            {permit.permit_number}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>}
                      {columns.client !== false && <TableCell className="text-sm font-medium">
                        <Link
                          to={`/clients/${permit.client_id}`}
                          className="block truncate hover:text-primary"
                        >
                          {permit.clients?.company_name || "—"}
                        </Link>
                      </TableCell>}
                      {columns.truck !== false && <TableCell className="text-sm">
                        {permit.trucks?.plate ? (
                          <Link to={`/trucks/${permit.truck_id}`} className="font-mono text-xs hover:text-primary">
                            {permit.trucks.plate}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>}
                      {columns.state !== false && <TableCell className="text-sm">{permit.state || "—"}</TableCell>}
                      {columns.expiration !== false && <TableCell>
                        {permit.expiration_date ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {format(new Date(permit.expiration_date), "dd/MM/yyyy")}
                            </span>
                            {diff !== null && (
                              <span
                                className={`text-[10px] font-semibold ${
                                  diff < 0
                                    ? "text-red-500"
                                    : diff <= 30
                                    ? "text-amber-500"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {diff < 0
                                  ? t("common.daysOverdue").replace("{days}", String(Math.abs(diff)))
                                  : t("common.daysRemaining").replace("{days}", String(diff))}
                              </span>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>}
                      {columns.status !== false && <TableCell>
                        <span
                          className={`inline-flex items-center justify-center h-7 min-w-[112px] whitespace-nowrap px-3 rounded-md text-xs font-semibold border ${expStatus.color}`}
                        >
                          {expStatus.label}
                        </span>
                      </TableCell>}
                      {columns.doc !== false && <TableCell className="text-center">
                        {permit.document_url ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => {
                                  setViewDocUrl(permit.document_url!);
                                  setViewDocTitle(
                                    `${permit.permit_type} - ${permit.permit_number || ""}`
                                  );
                                }}
                                className="mx-auto w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center justify-center transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-primary" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{t("documents.viewer")}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            to={`/permits/${permit.id}`}
                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                            title={t("common.openPermit")}
                          >
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </Link>
                          <button
                            onClick={() => {
                              setHistoryPermitId(permit.id);
                              setHistoryPermitLabel(
                                `${permit.permit_type} ${permit.permit_number || ""}`
                              );
                            }}
                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                            title={t("history.title")}
                          >
                            <History className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleEdit(permit)}
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
                                  {t("permits.removePermit")}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("common.cannotUndo")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t("common.cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deletePermit.mutate(permit.id)}
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

      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />

      <PermitFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        permit={editingPermit}
      />
      <PermitImportDialog open={importOpen} onOpenChange={setImportOpen} />
      {historyPermitId && (
        <PermitHistoryDialog
          open={!!historyPermitId}
          onOpenChange={(v) => {
            if (!v) setHistoryPermitId(null);
          }}
          permitId={historyPermitId}
          permitLabel={historyPermitLabel}
        />
      )}
      {viewDocUrl && (
        <DocumentViewer
          open={!!viewDocUrl}
          onOpenChange={(v) => {
            if (!v) setViewDocUrl(null);
          }}
          url={viewDocUrl}
          title={viewDocTitle}
        />
      )}
    </div>
  );
}
