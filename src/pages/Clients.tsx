import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Loader2,
  Upload,
  Users,
  FileCheck,
  Truck as TruckIcon,
  ShieldAlert,
  ShieldCheck as ShieldOk,
  X,
  Filter,
  TrendingUp,
  Eye,
} from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { ClientImportDialog } from "@/components/ClientImportDialog";
import { PaginationBar } from "@/components/PaginationBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { usePermits } from "@/hooks/usePermits";
import { useTrucks } from "@/hooks/useTrucks";
import { EmptyState } from "@/components/EmptyState";
import { TablePreferencesToolbar, type Density } from "@/components/TablePreferencesToolbar";
import { SavedViewsToolbar } from "@/components/SavedViewsToolbar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditableCell } from "@/components/EditableCell";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { ScoreBadge } from "@/components/ComplianceScorecard";

const serviceLabels = [
  { key: "service_ifta", label: "IFTA" },
  { key: "service_ct", label: "CT" },
  { key: "service_ny", label: "NY" },
  { key: "service_kyu", label: "KYU" },
  { key: "service_nm", label: "NM" },
  { key: "service_automatic", label: "Auto" },
] as const;

type ServiceKey = (typeof serviceLabels)[number]["key"];

const defaultClientColumns = {
  dot: true,
  mc: true,
  phone: true,
  services: true,
  permits: true,
  trucks: true,
  risk: true,
  score: true,
  status: true,
};

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-red-500",
  "from-fuchsia-500 to-pink-500",
  "from-sky-500 to-blue-500",
  "from-purple-500 to-indigo-500",
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function gradientFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

export default function Clients() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { data: clients, isLoading } = useClients(search);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { role } = useAuth();
  const isViewer = role === "viewer";

  const [serviceFilter, setServiceFilter] = useLocalStorageState<ServiceKey | null>(
    "clients-service-filter",
    null
  );
  const [tagFilter, setTagFilter] = useLocalStorageState<string | null>(
    "clients-tag-filter",
    null
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClientForBulk = useQueryClient();
  const { toast: toastBulk } = useToast();

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkUpdateStatus = async (status: "active" | "inactive" | "pending") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await supabase.from("clients").update({ status }).in("id", ids);
    if (error) {
      toastBulk({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }
    queryClientForBulk.invalidateQueries({ queryKey: ["clients"] });
    toastBulk({ title: t("bulk.toastUpdated").replace("{count}", String(ids.length)) });
    clearSelection();
  };

  const bulkApplyTag = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const input = window.prompt(t("bulk.applyTagPrompt"));
    if (!input) return;
    const newTags = input.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (newTags.length === 0) return;
    // Merge into each client's existing tags individually since Postgres
    // doesn't have a native bulk "append tags" path via supabase-js — we
    // batch these in parallel.
    const targets = (clients ?? []).filter((c) => ids.includes(c.id));
    await Promise.all(
      targets.map((c) => {
        const existing = (c as typeof c & { tags?: string[] | null }).tags ?? [];
        const merged = Array.from(new Set([...existing, ...newTags]));
        return supabase.from("clients").update({ tags: merged } as never).eq("id", c.id);
      }),
    );
    queryClientForBulk.invalidateQueries({ queryKey: ["clients"] });
    toastBulk({ title: t("bulk.toastUpdated").replace("{count}", String(ids.length)) });
    clearSelection();
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(t("bulk.confirmDelete").replace("{count}", String(ids.length)))) return;
    const { error } = await supabase.from("clients").delete().in("id", ids);
    if (error) {
      toastBulk({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }
    queryClientForBulk.invalidateQueries({ queryKey: ["clients"] });
    toastBulk({ title: t("bulk.toastDeleted").replace("{count}", String(ids.length)) });
    clearSelection();
  };
  const [density, setDensity] = useLocalStorageState<Density>(
    "clients-table-density",
    "comfortable"
  );
  const [columns, setColumns] = useLocalStorageState(
    "clients-table-columns",
    defaultClientColumns
  );
  const { data: allPermits } = usePermits();
  const { data: allTrucks } = useTrucks();

  const permitCountByClient = useMemo(() => {
    const map: Record<string, number> = {};
    allPermits?.forEach((p) => {
      map[p.client_id] = (map[p.client_id] || 0) + 1;
    });
    return map;
  }, [allPermits]);

  const truckCountByClient = useMemo(() => {
    const map: Record<string, number> = {};
    allTrucks?.forEach((t) => {
      map[t.client_id] = (map[t.client_id] || 0) + 1;
    });
    return map;
  }, [allTrucks]);

  const permitsByClient = useMemo(() => {
    const map: Record<string, NonNullable<typeof allPermits>> = {};
    allPermits?.forEach((p) => {
      (map[p.client_id] ||= []).push(p);
    });
    return map;
  }, [allPermits]);

  const trucksByClient = useMemo(() => {
    const map: Record<string, NonNullable<typeof allTrucks>> = {};
    allTrucks?.forEach((tr) => {
      (map[tr.client_id] ||= []).push(tr);
    });
    return map;
  }, [allTrucks]);

  const riskByClient = useMemo(() => {
    const map: Record<string, "ok" | "warning" | "danger"> = {};
    if (!allPermits) return map;
    const now = new Date();
    allPermits.forEach((p) => {
      if (!p.expiration_date) return;
      const diff = Math.ceil(
        (new Date(p.expiration_date).getTime() - now.getTime()) / 86400000
      );
      const current = map[p.client_id] || "ok";
      if (diff < 0 || diff <= 30) map[p.client_id] = "danger";
      else if (diff <= 90 && current !== "danger") map[p.client_id] = "warning";
      else if (!map[p.client_id]) map[p.client_id] = "ok";
    });
    return map;
  }, [allPermits]);

  // Union of all tags across the org — used by the filter dropdown.
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of clients ?? []) {
      const tags = (c as typeof c & { tags?: string[] | null }).tags ?? [];
      for (const tag of tags) set.add(tag);
    }
    return Array.from(set).sort();
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!clients) return clients;
    return clients.filter((c) => {
      if (serviceFilter && !c[serviceFilter]) return false;
      if (tagFilter) {
        const tags = (c as typeof c & { tags?: string[] | null }).tags ?? [];
        if (!tags.includes(tagFilter)) return false;
      }
      return true;
    });
  }, [clients, serviceFilter, tagFilter]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const totalPages = Math.ceil((filteredClients?.length || 0) / PAGE_SIZE);
  const paginatedClients = useMemo(() => {
    if (!filteredClients) return [];
    const start = (page - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, page]);

  useEffect(() => {
    setPage(1);
  }, [search, serviceFilter]);

  const statusMap: Record<string, { label: string; className: string }> = {
    active: {
      label: t("common.active"),
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    },
    inactive: {
      label: t("common.inactive"),
      className: "bg-muted text-muted-foreground border-border",
    },
    pending: {
      label: t("common.pending"),
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    },
  };

  // Quick stats
  const stats = useMemo(() => {
    const total = clients?.length ?? 0;
    const active = clients?.filter((c) => c.status === "active").length ?? 0;
    let danger = 0,
      warning = 0;
    clients?.forEach((c) => {
      if (riskByClient[c.id] === "danger") danger++;
      else if (riskByClient[c.id] === "warning") warning++;
    });
    return { total, active, danger, warning };
  }, [clients, riskByClient]);

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
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
                {t("clients.title")}
              </h1>
              <p className="text-white/70 mt-2 text-sm sm:text-base max-w-xl">
                {t("clients.subtitle")}
              </p>
            </div>
          </div>

          {!isViewer && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setImportOpen(true)}
                className="h-10 px-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/15 transition-all"
              >
                <Upload className="w-4 h-4" />
                {t("import.title")}
              </button>
              <button
                onClick={() => navigate("/clients/onboarding")}
                className="h-10 px-4 rounded-xl bg-white text-[#0b0d2e] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" />
                {t("clients.new")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============ QUICK STATS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Total de clientes",
            value: stats.total,
            icon: Users,
            gradient: "from-indigo-500 to-violet-500",
          },
          {
            label: "Clientes ativos",
            value: stats.active,
            icon: TrendingUp,
            gradient: "from-emerald-500 to-teal-500",
          },
          {
            label: "Em atenção",
            value: stats.warning,
            icon: ShieldAlert,
            gradient: "from-amber-500 to-orange-500",
          },
          {
            label: "Urgentes",
            value: stats.danger,
            icon: ShieldAlert,
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
            placeholder={t("clients.search")}
            className="pl-10 h-10 bg-muted/40 border-border/60 focus:bg-background rounded-xl transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="hidden sm:block h-8 w-px bg-border/60" />
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
            <Filter className="w-3.5 h-3.5" />
            Serviços:
          </div>
          {serviceLabels.map((s) => {
            const active = serviceFilter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setServiceFilter(active ? null : s.key)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? "btn-gradient text-white shadow-md"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            );
          })}
          {serviceFilter && (
            <button
              onClick={() => setServiceFilter(null)}
              className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/15 inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Limpar
            </button>
          )}
        </div>
        {availableTags.length > 0 && (
          <>
            <div className="hidden sm:block h-8 w-px bg-border/60" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
                <Filter className="w-3.5 h-3.5" />
                {t("tags.filterBy")}:
              </div>
              {availableTags.map((tg) => {
                const active = tagFilter === tg;
                return (
                  <button
                    key={tg}
                    onClick={() => setTagFilter(active ? null : tg)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? "btn-gradient text-white shadow-md"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {tg}
                  </button>
                );
              })}
              {tagFilter && (
                <button
                  onClick={() => setTagFilter(null)}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/15 inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Limpar
                </button>
              )}
            </div>
          </>
        )}
        <div className="sm:ml-auto flex items-center gap-2">
          <SavedViewsToolbar
            scope="clients"
            currentFilters={{ search, serviceFilter, tagFilter }}
            onApply={(f) => {
              const filters = f as { search?: string; serviceFilter?: ServiceKey | null; tagFilter?: string | null };
              setSearch(filters.search ?? "");
              setServiceFilter(filters.serviceFilter ?? null);
              setTagFilter(filters.tagFilter ?? null);
            }}
          />
          <TablePreferencesToolbar
            density={density}
            onDensityChange={setDensity}
            columns={columns}
            onColumnsChange={setColumns}
            columnOptions={[
              { key: "dot", label: "DOT" },
              { key: "mc", label: "MC" },
              { key: "phone", label: t("clients.phone") },
              { key: "services", label: t("clients.services") },
              { key: "permits", label: "Permits" },
              { key: "trucks", label: "Trucks" },
              { key: "risk", label: t("common.risk") },
              { key: "score", label: "Score" },
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
      ) : !filteredClients?.length ? (
        <EmptyState
          icon={<Users className="w-9 h-9 text-indigo-500" />}
          title={search || serviceFilter ? t("clients.noResults") : t("clients.empty")}
          description={
            search || serviceFilter
              ? t("clients.emptyFilteredDesc")
              : t("clients.emptyCreateDesc")
          }
          action={
            !search && !serviceFilter ? (
              <button
                onClick={() => navigate("/clients/onboarding")}
                className="h-11 px-6 rounded-xl btn-gradient text-white text-sm font-semibold inline-flex items-center gap-2 hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all"
              >
                <Plus className="w-4 h-4" />
                {t("clients.registerFirst")}
              </button>
            ) : undefined
          }
          secondaryAction={
            search || serviceFilter ? (
              <button
                onClick={() => {
                  setSearch("");
                  setServiceFilter(null);
                }}
                className="h-11 px-5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold"
              >
                {t("common.clearFilters")}
              </button>
            ) : (
              <button
                onClick={() => setImportOpen(true)}
                className="h-11 px-5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {t("import.title")}
              </button>
            )
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
          <Table className="min-w-[1180px] table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={paginatedClients.length > 0 && paginatedClients.every((c) => selectedIds.has(c.id))}
                    onCheckedChange={(checked) => {
                      const next = new Set(selectedIds);
                      if (checked) paginatedClients.forEach((c) => next.add(c.id));
                      else paginatedClients.forEach((c) => next.delete(c.id));
                      setSelectedIds(next);
                    }}
                  />
                </TableHead>
                <TableHead className="w-[250px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("clients.company")}
                </TableHead>
                {columns.dot !== false && <TableHead className="w-[120px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  DOT
                </TableHead>}
                {columns.mc !== false && <TableHead className="w-[110px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  MC
                </TableHead>}
                {columns.phone !== false && <TableHead className="w-[150px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("clients.phone")}
                </TableHead>}
                {columns.services !== false && <TableHead className="w-[180px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("clients.services")}
                </TableHead>}
                {columns.permits !== false && <TableHead className="w-[95px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-center">
                  Permits
                </TableHead>}
                {columns.trucks !== false && <TableHead className="w-[95px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-center">
                  Trucks
                </TableHead>}
                {columns.risk !== false && <TableHead className="w-[130px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("common.risk")}
                </TableHead>}
                {columns.score !== false && <TableHead className="w-[80px] text-center font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  Score
                </TableHead>}
                {columns.status !== false && <TableHead className="w-[120px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("clients.status")}
                </TableHead>}
                <TableHead className="w-[80px] text-center font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("common.open")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client) => {
                const status = statusMap[client.status] || statusMap.active;
                const activeServices = serviceLabels.filter((s) => client[s.key]);
                const permitCount = permitCountByClient[client.id] || 0;
                const truckCount = truckCountByClient[client.id] || 0;
                return (
                  <TableRow
                    key={client.id}
                    className="group cursor-pointer hover:bg-muted/40 transition-colors border-border/50"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()} className={density === "compact" ? "py-2" : "py-3"}>
                      <Checkbox
                        checked={selectedIds.has(client.id)}
                        onCheckedChange={() => toggleSelected(client.id)}
                      />
                    </TableCell>
                    <TableCell className={density === "compact" ? "py-2" : "py-3"}>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientFor(
                            client.id
                          )} flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0`}
                        >
                          {initials(client.company_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate max-w-[170px]">
                            {client.company_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {client.ein ? `EIN ${client.ein}` : "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {columns.dot !== false && <TableCell className="text-muted-foreground font-mono text-xs">
                      {client.dot || "—"}
                    </TableCell>}
                    {columns.mc !== false && <TableCell className="text-muted-foreground font-mono text-xs">
                      {client.mc || "—"}
                    </TableCell>}
                    {columns.phone !== false && <TableCell className="text-muted-foreground text-sm">
                      <EditableCell
                        mode="text"
                        value={client.phone}
                        placeholder="—"
                        onSave={async (next) => {
                          const { error } = await supabase.from("clients").update({ phone: next }).eq("id", client.id);
                          if (error) {
                            toastBulk({ title: t("common.error"), description: error.message, variant: "destructive" });
                            return;
                          }
                          queryClientForBulk.invalidateQueries({ queryKey: ["clients"] });
                        }}
                      />
                    </TableCell>}
                    {columns.services !== false && <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {activeServices.length > 0 ? (
                          activeServices.map((s) => (
                            <span
                              key={s.key}
                              className="inline-flex items-center h-5 px-2 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/15"
                            >
                              {s.label}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>}
                    {columns.permits !== false && <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 h-6 rounded-md bg-muted/60 text-xs font-semibold">
                        <FileCheck className="w-3 h-3 text-emerald-500" />
                        {permitCount}
                      </div>
                    </TableCell>}
                    {columns.trucks !== false && <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 h-6 rounded-md bg-muted/60 text-xs font-semibold">
                        <TruckIcon className="w-3 h-3 text-sky-500" />
                        {truckCount}
                      </div>
                    </TableCell>}
                    {columns.risk !== false && <TableCell>
                      {riskByClient[client.id] === "danger" ? (
                        <Badge
                          className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 gap-1"
                          variant="outline"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          {t("common.urgent")}
                        </Badge>
                      ) : riskByClient[client.id] === "warning" ? (
                        <Badge
                          className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1"
                          variant="outline"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          {t("common.attention")}
                        </Badge>
                      ) : permitCount > 0 ? (
                        <Badge
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1"
                          variant="outline"
                        >
                          <ShieldOk className="w-3 h-3" />
                          OK
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>}
                    {columns.score !== false && <TableCell className="text-center">
                      <ScoreBadge
                        client={client}
                        trucks={trucksByClient[client.id]}
                        permits={permitsByClient[client.id]}
                      />
                    </TableCell>}
                    {columns.status !== false && <TableCell>
                      <EditableCell
                        mode="select"
                        value={client.status}
                        options={[
                          { value: "active", label: t("common.active") },
                          { value: "inactive", label: t("common.inactive") },
                          { value: "pending", label: t("common.pending") },
                        ]}
                        onSave={async (next) => {
                          if (!next) return;
                          const { error } = await supabase.from("clients").update({ status: next }).eq("id", client.id);
                          if (error) {
                            toastBulk({ title: t("common.error"), description: error.message, variant: "destructive" });
                            return;
                          }
                          queryClientForBulk.invalidateQueries({ queryKey: ["clients"] });
                        }}
                      />
                    </TableCell>}
                    <TableCell className="text-center">
                      <Link
                        to={`/clients/${client.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="mx-auto w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                        title={t("common.openClient")}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
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

      {/* Bulk action bar — floats at the bottom when ≥1 row selected. */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-card border border-border/60 shadow-2xl p-2 backdrop-blur-md">
          <span className="px-3 text-sm font-semibold">
            {t("bulk.selected").replace("{count}", String(selectedIds.size))}
          </span>
          <div className="h-6 w-px bg-border" />
          <Select onValueChange={(v) => bulkUpdateStatus(v as "active" | "inactive" | "pending")}>
            <SelectTrigger className="h-8 text-xs gap-1 border-0 bg-muted/50 hover:bg-muted">
              <SelectValue placeholder={t("bulk.setStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("common.active")}</SelectItem>
              <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
              <SelectItem value="pending">{t("common.pending")}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={bulkApplyTag} className="h-8 text-xs">
            {t("bulk.applyTag")}
          </Button>
          <Button size="sm" variant="ghost" onClick={bulkDelete} className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
            {t("bulk.delete")}
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={clearSelection} className="h-8 text-xs">
            {t("bulk.clear")}
          </Button>
        </div>
      )}

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ClientImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
