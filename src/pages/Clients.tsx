import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Upload,
  Users,
  FileCheck,
  Truck as TruckIcon,
  ShieldAlert,
  ShieldCheck as ShieldOk,
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
import { RiskBadge } from "@/components/RiskBadge";
import { useRiskScores, type RiskScoreWithClient } from "@/hooks/useRiskScores";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  FilterBar,
  FilterChip,
  FilterChipGroup,
  FilterClearChip,
  FilterDivider,
} from "@/components/FilterBar";

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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
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

  // Server-computed operational risk score per client (latest snapshot). Takes
  // precedence over the permit-only `riskByClient` heuristic when present.
  const { data: riskScores } = useRiskScores();
  const scoreByClient = useMemo(() => {
    const map: Record<string, RiskScoreWithClient> = {};
    for (const s of riskScores ?? []) map[s.client_id] = s;
    return map;
  }, [riskScores]);

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

  const kpiCards: Array<{
    label: string;
    value: number;
    icon: typeof Users;
    tone: "neutral" | "warning" | "danger";
  }> = [
    { label: t("clients.title"), value: stats.total, icon: Users, tone: "neutral" },
    { label: t("common.active"), value: stats.active, icon: TrendingUp, tone: "neutral" },
    { label: t("clients.statsAttention"), value: stats.warning, icon: ShieldAlert, tone: "warning" },
    { label: t("clients.statsUrgent"), value: stats.danger, icon: ShieldAlert, tone: "danger" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("clients.title")}
        description={t("clients.subtitle")}
        actions={
          !isViewer && (
            <>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4 mr-1.5" />
                {t("import.title")}
              </Button>
              <Button size="sm" onClick={() => navigate("/clients/onboarding")}>
                <Plus className="w-4 h-4 mr-1.5" />
                {t("clients.new")}
              </Button>
            </>
          )
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {kpiCards.map((s) => (
          <KpiCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            tone={s.tone}
          />
        ))}
      </div>

      {/* ============ FILTERS ============ */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("clients.search")}
        trailing={
          <>
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
          </>
        }
      >
        <FilterDivider />
        <FilterChipGroup label={t("clients.servicesLabel")}>
          {serviceLabels.map((s) => (
            <FilterChip
              key={s.key}
              active={serviceFilter === s.key}
              onClick={() => setServiceFilter(serviceFilter === s.key ? null : s.key)}
            >
              {s.label}
            </FilterChip>
          ))}
          {serviceFilter && (
            <FilterClearChip onClick={() => setServiceFilter(null)}>
              {t("common.clear")}
            </FilterClearChip>
          )}
        </FilterChipGroup>
        {availableTags.length > 0 && (
          <>
            <FilterDivider />
            <FilterChipGroup label={`${t("tags.filterBy")}:`}>
              {availableTags.map((tg) => (
                <FilterChip
                  key={tg}
                  active={tagFilter === tg}
                  onClick={() => setTagFilter(tagFilter === tg ? null : tg)}
                >
                  {tg}
                </FilterChip>
              ))}
              {tagFilter && (
                <FilterClearChip onClick={() => setTagFilter(null)}>
                  {t("common.clear")}
                </FilterClearChip>
              )}
            </FilterChipGroup>
          </>
        )}
      </FilterBar>

      {/* ============ TABLE ============ */}
      {isLoading ? (
        <Card className="overflow-hidden border-border/50">
          <CardContent className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : !filteredClients?.length ? (
        <EmptyState
          icon={<Users className="w-9 h-9 text-primary" />}
          title={search || serviceFilter ? t("clients.noResults") : t("clients.empty")}
          description={
            search || serviceFilter
              ? t("clients.emptyFilteredDesc")
              : t("clients.emptyCreateDesc")
          }
          action={
            !search && !serviceFilter ? (
              <Button size="lg" onClick={() => navigate("/clients/onboarding")}>
                <Plus className="w-4 h-4 mr-2" />
                {t("clients.registerFirst")}
              </Button>
            ) : undefined
          }
          secondaryAction={
            search || serviceFilter ? (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setServiceFilter(null);
                }}
              >
                {t("common.clearFilters")}
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                {t("import.title")}
              </Button>
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
                          className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center font-semibold text-sm flex-shrink-0"
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
                        <FileCheck className="w-3 h-3 text-success" />
                        {permitCount}
                      </div>
                    </TableCell>}
                    {columns.trucks !== false && <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 h-6 rounded-md bg-muted/60 text-xs font-semibold">
                        <TruckIcon className="w-3 h-3 text-primary" />
                        {truckCount}
                      </div>
                    </TableCell>}
                    {columns.risk !== false && <TableCell>
                      {scoreByClient[client.id] ? (
                        <RiskBadge
                          score={scoreByClient[client.id].score}
                          band={scoreByClient[client.id].band}
                          showLabel
                        />
                      ) : riskByClient[client.id] === "danger" ? (
                        <StatusBadge tone="danger">
                          <ShieldAlert className="w-3 h-3" />
                          {t("common.urgent")}
                        </StatusBadge>
                      ) : riskByClient[client.id] === "warning" ? (
                        <StatusBadge tone="warning">
                          <ShieldAlert className="w-3 h-3" />
                          {t("common.attention")}
                        </StatusBadge>
                      ) : permitCount > 0 ? (
                        <StatusBadge tone="success">
                          <ShieldOk className="w-3 h-3" />
                          OK
                        </StatusBadge>
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
                        aria-label={t("common.openClient")}
                        className="mx-auto w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-md bg-card border border-border/60 shadow-2xl p-2 backdrop-blur-md">
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
