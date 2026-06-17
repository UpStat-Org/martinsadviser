import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Users,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  IdCard,
  Stethoscope,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { DriverFormDialog } from "@/components/DriverFormDialog";
import { EldDriverMatchingPanel } from "@/components/EldDriverMatchingPanel";
import { useDrivers } from "@/hooks/useDrivers";
import { useClients } from "@/hooks/useClients";
import { useAllDriverDocuments } from "@/hooks/useDqf";
import { useHosViolations } from "@/hooks/useHos";
import { useLanguage } from "@/contexts/LanguageContext";
import { driverCompliance, type ExpiryInfo, type ComplianceLevel } from "@/lib/dqf";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const LEVEL_BADGE: Record<ComplianceLevel, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  attention: "bg-warning/10 text-warning border-warning/30",
  ok: "bg-success/10 text-success border-success/30",
};

function ExpiryCell({ info }: { info: ExpiryInfo }) {
  const { t } = useLanguage();
  if (info.state === "missing") return <span className="text-xs text-muted-foreground">—</span>;
  const tone =
    info.state === "expired"
      ? "text-destructive"
      : info.state === "expiring"
      ? "text-warning"
      : "text-muted-foreground";
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-xs">{format(new Date(info.date!), "MMM dd, yyyy")}</span>
      {info.state === "expired" ? (
        <span className="text-[10px] font-bold text-destructive">{t("driversPage.overdue")}</span>
      ) : info.state === "expiring" ? (
        <span className={cn("text-[10px] font-bold", tone)}>
          {t("driversPage.inDays").replace("{days}", String(info.daysUntil))}
        </span>
      ) : null}
    </div>
  );
}

type LevelFilter = "all" | ComplianceLevel;

export default function DriversPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: drivers, isLoading } = useDrivers();
  const { data: clients } = useClients("");
  const { data: docsByDriver } = useAllDriverDocuments();
  const { data: hos } = useHosViolations();

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [addOpen, setAddOpen] = useState(false);

  const clientName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients ?? []) m.set(c.id, c.company_name);
    return m;
  }, [clients]);

  const openHosByDriver = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of hos ?? []) {
      if (v.resolved_at) continue;
      m.set(v.driver_id, (m.get(v.driver_id) ?? 0) + 1);
    }
    return m;
  }, [hos]);

  // Decorate each driver with its compliance rollup, then sort worst-first.
  const rows = useMemo(() => {
    const now = Date.now();
    return (drivers ?? [])
      .map((d) => ({
        driver: d,
        company: clientName.get(d.client_id) ?? "—",
        openHos: openHosByDriver.get(d.id) ?? 0,
        compliance: driverCompliance(d, docsByDriver?.get(d.id), now),
      }))
      .sort((a, b) => b.compliance.urgency - a.compliance.urgency || a.driver.full_name.localeCompare(b.driver.full_name));
  }, [drivers, clientName, docsByDriver, openHosByDriver]);

  const stats = useMemo(() => {
    let critical = 0, attention = 0, ok = 0, openHos = 0;
    for (const r of rows) {
      if (r.driver.status === "terminated") continue;
      if (r.compliance.level === "critical") critical++;
      else if (r.compliance.level === "attention") attention++;
      else ok++;
      openHos += r.openHos;
    }
    return { total: rows.length, critical, attention, ok, openHos };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (levelFilter !== "all" && r.compliance.level !== levelFilter) return false;
      if (!q) return true;
      return (
        r.driver.full_name.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        (r.driver.cdl_number ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, levelFilter]);

  const FILTERS: Array<{ key: LevelFilter; label: string; count: number }> = [
    { key: "all", label: t("driversPage.filterAll"), count: stats.total },
    { key: "critical", label: t("driversPage.filterCritical"), count: stats.critical },
    { key: "attention", label: t("driversPage.filterAttention"), count: stats.attention },
    { key: "ok", label: t("driversPage.filterOk"), count: stats.ok },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("driversPage.title")}
        description={t("driversPage.subtitle")}
        actions={
          <Button onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t("driversPage.add")}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label={t("driversPage.kpiTotal")} value={stats.total} icon={Users} loading={isLoading} />
        <KpiCard
          label={t("driversPage.kpiCritical")}
          value={stats.critical}
          icon={ShieldAlert}
          tone="danger"
          loading={isLoading}
          onClick={() => setLevelFilter("critical")}
        />
        <KpiCard
          label={t("driversPage.kpiAttention")}
          value={stats.attention}
          icon={AlertTriangle}
          tone="warning"
          loading={isLoading}
          onClick={() => setLevelFilter("attention")}
        />
        <KpiCard
          label={t("driversPage.kpiOpenHos")}
          value={stats.openHos}
          icon={AlertTriangle}
          tone={stats.openHos > 0 ? "warning" : "neutral"}
          loading={isLoading}
        />
      </div>

      <EldDriverMatchingPanel />

      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("driversPage.searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setLevelFilter(f.key)}
                  className={cn(
                    "h-8 px-3 rounded-md text-xs font-medium border transition-colors inline-flex items-center gap-1.5",
                    levelFilter === f.key
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-card border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {f.label}
                  <span className="tabular-nums opacity-70">{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="w-6 h-6 text-muted-foreground" />}
              title={rows.length === 0 ? t("driversPage.emptyTitle") : t("driversPage.noMatch")}
              description={rows.length === 0 ? t("driversPage.emptyDesc") : t("driversPage.noMatchDesc")}
              action={
                rows.length === 0 ? (
                  <Button onClick={() => setAddOpen(true)} className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    {t("driversPage.add")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("driversPage.colDriver")}</TableHead>
                    <TableHead><span className="inline-flex items-center gap-1"><IdCard className="w-3.5 h-3.5" />{t("driversPage.colCdl")}</span></TableHead>
                    <TableHead><span className="inline-flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" />{t("driversPage.colMedical")}</span></TableHead>
                    <TableHead>{t("driversPage.colDqf")}</TableHead>
                    <TableHead>{t("driversPage.colHos")}</TableHead>
                    <TableHead>{t("driversPage.colStatus")}</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(({ driver, company, openHos, compliance }) => (
                    <TableRow
                      key={driver.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/drivers/${driver.id}`)}
                    >
                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium">{driver.full_name}</span>
                          <span className="text-xs text-muted-foreground">{company}</span>
                        </div>
                      </TableCell>
                      <TableCell><ExpiryCell info={compliance.cdl} /></TableCell>
                      <TableCell><ExpiryCell info={compliance.medical} /></TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            compliance.dqf.complete
                              ? "bg-success/10 text-success border-success/30"
                              : compliance.dqf.percent >= 75
                              ? "bg-warning/10 text-warning border-warning/30"
                              : "bg-destructive/10 text-destructive border-destructive/30"
                          }
                        >
                          {compliance.dqf.percent}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {openHos > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {openHos}
                          </span>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-success/70" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={LEVEL_BADGE[compliance.level]}>
                          {t(`driversPage.level.${compliance.level}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DriverFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
