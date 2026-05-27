import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Truck,
  FileCheck,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Mail,
  Send,
  Map,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { usePermits, getExpirationStatus } from "@/hooks/usePermits";
import { useTrucks } from "@/hooks/useTrucks";
import { useScheduledMessages } from "@/hooks/useMessages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { format } from "date-fns";
import { pt, enUS, es } from "date-fns/locale";
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInvoices } from "@/hooks/useInvoices";
import { PermitCoverageMap } from "@/components/PermitCoverageMap";
import { RevenueForecastCard } from "@/components/RevenueForecastCard";
import { PortfolioRiskCard } from "@/components/PortfolioRiskCard";
import { PageHeader, SectionHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";

const dateLocales = { pt, en: enUS, es };

const TOOLTIP_STYLE = {
  borderRadius: 6,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  fontSize: 12,
};

export default function Dashboard() {
  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: trucks, isLoading: loadingTrucks } = useTrucks();
  const { data: permits, isLoading: loadingPermits } = usePermits();
  const { data: allMessages, isLoading: loadingMsgs } = useScheduledMessages();
  const { data: invoices } = useInvoices();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const metrics = useMemo(() => {
    if (!permits) return { expired: 0, in30: 0, in60: 0, in90: 0, active: 0, total: 0 };
    const now = new Date();
    let expired = 0, in30 = 0, in60 = 0, in90 = 0, active = 0;
    for (const p of permits) {
      if (!p.expiration_date) continue;
      const diff = Math.ceil((new Date(p.expiration_date).getTime() - now.getTime()) / 86400000);
      if (diff < 0) expired++;
      else if (diff <= 30) in30++;
      else if (diff <= 60) in60++;
      else if (diff <= 90) in90++;
      else active++;
    }
    return { expired, in30, in60, in90, active, total: permits.length };
  }, [permits]);

  const permitsByType = useMemo(() => {
    if (!permits) return [];
    const map: Record<string, number> = {};
    for (const p of permits) map[p.permit_type] = (map[p.permit_type] || 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [permits]);

  const msgStats = useMemo(() => {
    if (!allMessages) return { sent: 0, pending: 0, failed: 0, cancelled: 0 };
    let sent = 0, pending = 0, failed = 0, cancelled = 0;
    for (const m of allMessages) {
      if (m.status === "sent") sent++;
      else if (m.status === "pending") pending++;
      else if (m.status === "failed") failed++;
      else if (m.status === "cancelled") cancelled++;
    }
    return { sent, pending, failed, cancelled };
  }, [allMessages]);

  const msgChartData = useMemo(
    () =>
      [
        { name: t("common.sent"), value: msgStats.sent, fill: "hsl(var(--chart-2))" },
        { name: t("common.pending"), value: msgStats.pending, fill: "hsl(var(--chart-3))" },
        { name: t("common.failed"), value: msgStats.failed, fill: "hsl(var(--chart-4))" },
        { name: t("common.cancelled"), value: msgStats.cancelled, fill: "hsl(var(--border))" },
      ].filter((d) => d.value > 0),
    [msgStats, t],
  );

  const urgentPermits = useMemo(() => {
    if (!permits) return [];
    const now = new Date();
    return permits
      .filter((p) => {
        if (!p.expiration_date) return false;
        const diff = Math.ceil((new Date(p.expiration_date).getTime() - now.getTime()) / 86400000);
        return diff <= 30;
      })
      .sort(
        (a, b) => new Date(a.expiration_date!).getTime() - new Date(b.expiration_date!).getTime(),
      )
      .slice(0, 6);
  }, [permits]);

  const expirationChartData = useMemo(
    () => [
      { name: t("dashboard.expired"), count: metrics.expired, fill: "hsl(var(--destructive))" },
      { name: "≤30d", count: metrics.in30, fill: "hsl(var(--warning))" },
      { name: "≤60d", count: metrics.in60, fill: "hsl(32 92% 62%)" },
      { name: "≤90d", count: metrics.in90, fill: "hsl(var(--primary) / 0.7)" },
      { name: ">90d", count: metrics.active, fill: "hsl(var(--success))" },
    ],
    [metrics, t],
  );

  const trendData = useMemo(() => {
    if (!permits) return [];
    const now = new Date();
    const months: { month: string; compliance: number; total: number; expiring: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const monthLabel = format(d, "MMM", { locale: dateLocales[language] });
      const relevantPermits = permits.filter(
        (p) => p.expiration_date && new Date(p.created_at) <= monthEnd,
      );
      const valid = relevantPermits.filter((p) => new Date(p.expiration_date!) > monthEnd);
      const expiring = relevantPermits.filter((p) => {
        const diff = Math.ceil(
          (new Date(p.expiration_date!).getTime() - monthEnd.getTime()) / 86400000,
        );
        return diff >= 0 && diff <= 30;
      });
      const score =
        relevantPermits.length > 0
          ? Math.round((valid.length / relevantPermits.length) * 100)
          : 100;
      months.push({ month: monthLabel, compliance: score, total: relevantPermits.length, expiring: expiring.length });
    }
    return months;
  }, [permits, language]);

  const revenueTrend = useMemo(() => {
    if (!invoices) return [];
    const now = new Date();
    const months: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = format(d, "yyyy-MM");
      const monthLabel = format(d, "MMM", { locale: dateLocales[language] });
      const total = invoices
        .filter((inv) => inv.status === "paid" && (inv.paid_date || inv.due_date).startsWith(monthKey))
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
      months.push({ month: monthLabel, revenue: total });
    }
    return months;
  }, [invoices, language]);

  const complianceNow = trendData.length ? trendData[trendData.length - 1].compliance : 100;
  const compliancePrev = trendData.length > 1 ? trendData[trendData.length - 2].compliance : complianceNow;
  const complianceDelta = complianceNow - compliancePrev;

  const revenueNow = revenueTrend.length ? revenueTrend[revenueTrend.length - 1].revenue : 0;
  const revenuePrev = revenueTrend.length > 1 ? revenueTrend[revenueTrend.length - 2].revenue : 0;
  const revenueDelta = revenuePrev > 0 ? ((revenueNow - revenuePrev) / revenuePrev) * 100 : 0;

  const isLoading = loadingClients || loadingTrucks || loadingPermits;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.title") !== "dashboard.title" ? t("dashboard.title") : "Dashboard"}
        description={`${metrics.total} ${t("common.monitoredPermits")} · ${clients?.length ?? 0} ${t("common.activeClients")}`}
        meta={
          <span className="tabular">
            {format(new Date(), "EEE, dd MMM yyyy", { locale: dateLocales[language] })}
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate("/permits")}>
              <FileCheck className="w-4 h-4 mr-1.5" />
              {t("common.viewPermits")}
            </Button>
            <Button size="sm" onClick={() => navigate("/clients/onboarding")}>
              <Plus className="w-4 h-4 mr-1.5" />
              {t("common.newClient")}
            </Button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        <KpiCard
          label={t("dashboard.clients")}
          value={clients?.length ?? 0}
          loading={loadingClients}
          icon={Users}
          onClick={() => navigate("/clients")}
        />
        <KpiCard
          label={t("dashboard.trucks")}
          value={trucks?.length ?? 0}
          loading={loadingTrucks}
          icon={Truck}
          onClick={() => navigate("/trucks")}
        />
        <KpiCard
          label={t("dashboard.activePermits")}
          value={metrics.active + metrics.in90 + metrics.in60}
          loading={loadingPermits}
          icon={FileCheck}
          onClick={() => navigate("/permits")}
        />
        <KpiCard
          label={t("dashboard.expiring30d")}
          value={metrics.in30}
          loading={loadingPermits}
          icon={AlertTriangle}
          tone={metrics.in30 > 0 ? "warning" : "neutral"}
          onClick={() => navigate("/permits")}
        />
        <KpiCard
          label={t("dashboard.emailsSent")}
          value={msgStats.sent}
          loading={loadingMsgs}
          icon={Send}
          onClick={() => navigate("/messages")}
        />
        <KpiCard
          label={t("dashboard.pendingMsgs")}
          value={msgStats.pending}
          loading={loadingMsgs}
          icon={Mail}
          tone={msgStats.pending > 0 ? "warning" : "neutral"}
          onClick={() => navigate("/messages")}
        />
      </div>

      {/* Compliance + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  {t("compliance.score")}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.lastSixMonths")}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tracking-tight tabular">{complianceNow}%</div>
                <div
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium tabular",
                    complianceDelta >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {complianceDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {complianceDelta >= 0 ? "+" : ""}
                  {complianceDelta} pp
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 10, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="complianceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number) => [`${v}%`, t("compliance.title")]}
                  />
                  <Area
                    type="monotone"
                    dataKey="compliance"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    fill="url(#complianceGrad)"
                    dot={{ r: 2.5, fill: "hsl(var(--chart-2))", strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              {t("dashboard.monthlyRevenue")}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.thisMonth")}</p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight tabular">
              ${revenueNow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium tabular mt-0.5",
                revenueDelta >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {revenueDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {revenueDelta >= 0 ? "+" : ""}
              {revenueDelta.toFixed(1)}% vs {t("common.previousMonth")}
            </div>
            <div className="mt-4 h-[110px]">
              <Sparkline
                data={revenueTrend}
                value={(p) => p.revenue}
                tooltip={(p) => `${p.month}: $${p.revenue.toFixed(2)}`}
                color="hsl(var(--primary))"
                strokeWidth={2}
                aria-label={t("dashboard.revenue")}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              {t("dashboard.expirations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : metrics.total === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">{t("dashboard.noPermits")}</p>
            ) : (
              <ExpirationBars data={expirationChartData} total={metrics.total} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-muted-foreground" />
              {t("dashboard.permitsByType")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : permitsByType.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">{t("dashboard.noPermits")}</p>
            ) : (
              <PermitsByTypeChart data={permitsByType} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              {t("dashboard.messages")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMsgs ? (
              <Skeleton className="h-[220px] w-full" />
            ) : msgChartData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">{t("dashboard.noMessages")}</p>
            ) : (
              <PermitsByTypeChart
                data={msgChartData.map((d) => ({ name: d.name, value: d.value }))}
                colors={msgChartData.map((d) => d.fill)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiration breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {t("dashboard.expirationSummary")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { label: t("dashboard.expired"), count: metrics.expired, accent: "bg-destructive", text: "text-destructive" },
                { label: "30d", count: metrics.in30, accent: "bg-warning", text: "text-warning" },
                { label: "60d", count: metrics.in60, accent: "bg-warning/70", text: "text-warning" },
                { label: "90d", count: metrics.in90, accent: "bg-primary/70", text: "text-primary" },
                { label: t("dashboard.valid90"), count: metrics.active, accent: "bg-success", text: "text-success" },
              ].map((row) => {
                const pct = metrics.total ? (row.count / metrics.total) * 100 : 0;
                return (
                  <div key={row.label} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{row.label}</span>
                      <span className={cn("text-xs font-semibold tabular", row.text)}>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="text-xl font-semibold tabular mb-2">{row.count}</div>
                    <div className="h-1 rounded-sm bg-muted overflow-hidden">
                      <div className={cn("h-full transition-all", row.accent)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <PortfolioRiskCard />

      {/* Urgent permits + recent clients — table-style rows, no avatar gradients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <SectionHeader
              title={
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-destructive" />
                  {t("dashboard.urgentPermits")}
                </span>
              }
              actions={
                urgentPermits.length > 0 ? (
                  <Badge variant="destructive" className="h-5 text-[11px]">{urgentPermits.length}</Badge>
                ) : null
              }
            />
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : urgentPermits.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <FileCheck className="w-5 h-5 mx-auto mb-2 text-success" />
                {t("dashboard.noUrgent")}
              </div>
            ) : (
              <ul className="divide-y divide-border -mx-2">
                {urgentPermits.map((p) => {
                  const status = getExpirationStatus(p.expiration_date);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/permits/${p.id}`)}
                        className="w-full flex items-center justify-between gap-3 px-2 py-2.5 text-left hover:bg-muted/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{p.clients?.company_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground truncate font-mono">
                            {p.permit_type}{p.state ? ` · ${p.state}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={status.color}>{status.label}</Badge>
                          <span className="text-[11px] text-muted-foreground tabular w-14 text-right">
                            {p.expiration_date ? format(new Date(p.expiration_date), "dd MMM", { locale: dateLocales[language] }) : "—"}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <SectionHeader
              title={
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  {t("dashboard.recentClients")}
                </span>
              }
              actions={
                <button
                  type="button"
                  onClick={() => navigate("/clients")}
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  {t("common.viewAll")}
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              }
            />
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !clients?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("dashboard.noClients")}</p>
            ) : (
              <ul className="divide-y divide-border -mx-2">
                {clients.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/clients/${c.id}`)}
                      className="w-full flex items-center justify-between gap-3 px-2 py-2.5 text-left hover:bg-muted/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.company_name}</div>
                        <div className="text-xs text-muted-foreground truncate font-mono">
                          {c.dot ? `DOT ${c.dot}` : "—"}
                        </div>
                      </div>
                      <Badge variant={c.status === "active" ? "default" : "secondary"} className="shrink-0">
                        {c.status}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <RevenueForecastCard />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Map className="w-4 h-4 text-muted-foreground" />
            {t("map.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PermitCoverageMap permits={permits} />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────

/**
 * Horizontal expiration bands. We're not using Recharts here — a plain row
 * layout with semantic colors reads cleaner than a bar chart that has to
 * fight Recharts' padding/axis defaults. The bar width is proportional to
 * the largest band so the visual still scales with the data, and the count
 * is shown inline at the right of each row.
 */
function ExpirationBars({
  data,
  total,
}: {
  data: Array<{ name: string; count: number; fill: string }>;
  total: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-2.5 py-1">
      {data.map((row) => {
        const widthPct = (row.count / max) * 100;
        const sharePct = total > 0 ? (row.count / total) * 100 : 0;
        return (
          <div key={row.name} className="grid grid-cols-[55px_1fr_auto] items-center gap-3">
            <span className="text-[11px] font-medium text-muted-foreground tabular text-right">
              {row.name}
            </span>
            <div className="relative h-6 bg-muted/60 rounded overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded transition-[width] duration-500"
                style={{ width: `${Math.max(widthPct, row.count > 0 ? 4 : 0)}%`, backgroundColor: row.fill }}
              />
            </div>
            <div className="flex items-baseline gap-1.5 min-w-[60px] justify-end">
              <span className="text-sm font-semibold tabular">{row.count}</span>
              <span className="text-[10px] text-muted-foreground tabular">
                {sharePct.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Donut + side legend. Recharts' built-in `label` prop tries to draw text
 * around the pie which overlaps with multiple slices; pulling the labels
 * into a side list keeps both readable. Colors come from a single-hue
 * sequence so the chart looks intentional instead of clown-vomit.
 */
function PermitsByTypeChart({
  data,
  colors,
}: {
  data: Array<{ name: string; value: number }>;
  /** When provided, colors are matched to data by INPUT index (before sort). */
  colors?: string[];
}) {
  // Default palette — single-hue sequence descending in opacity so the
  // chart looks like an intentional distribution, not random Crayola.
  const defaultPalette = [
    "hsl(var(--primary))",
    "hsl(var(--primary) / 0.78)",
    "hsl(var(--primary) / 0.6)",
    "hsl(var(--primary) / 0.45)",
    "hsl(var(--primary) / 0.32)",
    "hsl(var(--primary) / 0.22)",
    "hsl(var(--muted-foreground) / 0.4)",
    "hsl(var(--muted-foreground) / 0.25)",
  ];

  // Sort biggest-first so the legend reads top→bottom by importance. When
  // explicit colors are passed (e.g. messages with semantic chart-2/3/4),
  // carry them through the sort so each slice keeps its intended color.
  const indexed = data.map((d, i) => ({
    ...d,
    color: colors?.[i] ?? defaultPalette[i % defaultPalette.length],
  }));
  const sorted = [...indexed].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, d) => sum + d.value, 0);
  const palette = sorted.map((d) => d.color);

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <ResponsiveContainer width={140} height={160}>
          <PieChart>
            <Pie
              data={sorted}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={70}
              paddingAngle={1.5}
              dataKey="value"
              stroke="hsl(var(--card))"
              strokeWidth={2}
            >
              {sorted.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-semibold tabular leading-none">{total}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">total</span>
        </div>
      </div>
      <ul className="flex-1 min-w-0 space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
        {sorted.map((d, i) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <li key={d.name} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: palette[i % palette.length] }}
              />
              <span className="flex-1 truncate text-foreground">{d.name}</span>
              <span className="text-muted-foreground tabular">{d.value}</span>
              <span className="text-muted-foreground tabular w-9 text-right">
                {pct.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
