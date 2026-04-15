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
  Sparkles,
  Activity,
} from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { usePermits, getExpirationStatus } from "@/hooks/usePermits";
import { useTrucks } from "@/hooks/useTrucks";
import { useScheduledMessages } from "@/hooks/useMessages";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { format } from "date-fns";
import { pt, enUS, es } from "date-fns/locale";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInvoices } from "@/hooks/useInvoices";
import { PermitCoverageMap } from "@/components/PermitCoverageMap";

const dateLocales = { pt, en: enUS, es };

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

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
    let expired = 0,
      in30 = 0,
      in60 = 0,
      in90 = 0,
      active = 0;
    for (const p of permits) {
      if (!p.expiration_date) continue;
      const diff = Math.ceil(
        (new Date(p.expiration_date).getTime() - now.getTime()) / 86400000
      );
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
    for (const p of permits) {
      map[p.permit_type] = (map[p.permit_type] || 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [permits]);

  const msgStats = useMemo(() => {
    if (!allMessages) return { sent: 0, pending: 0, failed: 0, cancelled: 0 };
    let sent = 0,
      pending = 0,
      failed = 0,
      cancelled = 0;
    for (const m of allMessages) {
      if (m.status === "sent") sent++;
      else if (m.status === "pending") pending++;
      else if (m.status === "failed") failed++;
      else if (m.status === "cancelled") cancelled++;
    }
    return { sent, pending, failed, cancelled };
  }, [allMessages]);

  const msgChartData = useMemo(() => {
    return [
      { name: t("common.sent"), value: msgStats.sent, fill: "hsl(var(--chart-2))" },
      { name: t("common.pending"), value: msgStats.pending, fill: "hsl(var(--chart-3))" },
      { name: t("common.failed"), value: msgStats.failed, fill: "hsl(var(--chart-4))" },
      { name: t("common.cancelled"), value: msgStats.cancelled, fill: "hsl(var(--border))" },
    ].filter((d) => d.value > 0);
  }, [msgStats, t]);

  const urgentPermits = useMemo(() => {
    if (!permits) return [];
    const now = new Date();
    return permits
      .filter((p) => {
        if (!p.expiration_date) return false;
        const diff = Math.ceil(
          (new Date(p.expiration_date).getTime() - now.getTime()) / 86400000
        );
        return diff <= 30;
      })
      .sort(
        (a, b) =>
          new Date(a.expiration_date!).getTime() - new Date(b.expiration_date!).getTime()
      )
      .slice(0, 6);
  }, [permits]);

  const expirationChartData = useMemo(
    () => [
      { name: t("dashboard.expired"), count: metrics.expired, fill: "hsl(var(--chart-4))" },
      { name: "≤30d", count: metrics.in30, fill: "hsl(var(--chart-3))" },
      { name: "≤60d", count: metrics.in60, fill: "hsl(var(--chart-3) / 0.6)" },
      { name: "≤90d", count: metrics.in90, fill: "hsl(var(--border))" },
      { name: ">90d", count: metrics.active, fill: "hsl(var(--chart-2))" },
    ],
    [metrics, t]
  );

  const PIE_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(158, 55%, 42%)",
    "hsl(320, 60%, 50%)",
    "hsl(60, 70%, 45%)",
  ];

  const trendData = useMemo(() => {
    if (!permits) return [];
    const now = new Date();
    const months: { month: string; compliance: number; total: number; expiring: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const monthLabel = format(d, "MMM", { locale: dateLocales[language] });
      const relevantPermits = permits.filter(
        (p) => p.expiration_date && new Date(p.created_at) <= monthEnd
      );
      const valid = relevantPermits.filter((p) => {
        const exp = new Date(p.expiration_date!);
        return exp > monthEnd;
      });
      const expiring = relevantPermits.filter((p) => {
        const exp = new Date(p.expiration_date!);
        const diff = Math.ceil((exp.getTime() - monthEnd.getTime()) / 86400000);
        return diff >= 0 && diff <= 30;
      });
      const score =
        relevantPermits.length > 0
          ? Math.round((valid.length / relevantPermits.length) * 100)
          : 100;
      months.push({
        month: monthLabel,
        compliance: score,
        total: relevantPermits.length,
        expiring: expiring.length,
      });
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
        .filter(
          (inv) =>
            inv.status === "paid" &&
            (inv.paid_date || inv.due_date).startsWith(monthKey)
        )
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

  const hour = new Date().getHours();
  const greeting =
    language === "pt"
      ? hour < 12
        ? "Bom dia"
        : hour < 18
        ? "Boa tarde"
        : "Boa noite"
      : language === "es"
      ? hour < 12
        ? "Buenos días"
        : hour < 18
        ? "Buenas tardes"
        : "Buenas noches"
      : hour < 12
      ? "Good morning"
      : hour < 18
      ? "Good afternoon"
      : "Good evening";

  const kpis = [
    {
      label: t("dashboard.clients"),
      value: clients?.length ?? 0,
      icon: Users,
      gradient: "from-indigo-500 to-violet-500",
      onClick: () => navigate("/clients"),
    },
    {
      label: t("dashboard.trucks"),
      value: trucks?.length ?? 0,
      icon: Truck,
      gradient: "from-blue-500 to-cyan-500",
      onClick: () => navigate("/trucks"),
    },
    {
      label: t("dashboard.activePermits"),
      value: metrics.active + metrics.in90 + metrics.in60,
      icon: FileCheck,
      gradient: "from-emerald-500 to-teal-500",
      onClick: () => navigate("/permits"),
    },
    {
      label: t("dashboard.expiring30d"),
      value: metrics.in30,
      icon: AlertTriangle,
      gradient: "from-amber-500 to-orange-500",
      onClick: () => navigate("/permits"),
    },
    {
      label: t("dashboard.emailsSent"),
      value: msgStats.sent,
      icon: Send,
      gradient: "from-fuchsia-500 to-pink-500",
      onClick: () => navigate("/messages"),
    },
    {
      label: t("dashboard.pendingMsgs"),
      value: msgStats.pending,
      icon: Mail,
      gradient: "from-sky-500 to-blue-500",
      onClick: () => navigate("/messages"),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============ HERO GREETING ============ */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
              <Sparkles className="w-3.5 h-3.5 text-white/80" />
              <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: dateLocales[language] })}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text leading-tight">
              {greeting} 👋
            </h1>
            <p className="text-white/70 mt-2 text-base sm:text-lg max-w-xl">
              {t("dashboard.subtitle")} — {metrics.total} permits monitorados ·{" "}
              {clients?.length ?? 0} clientes ativos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate("/clients/onboarding")}
              className="h-10 px-4 rounded-xl bg-white text-[#0b0d2e] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Novo cliente
            </button>
            <button
              onClick={() => navigate("/permits")}
              className="h-10 px-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/15 transition-all"
            >
              <FileCheck className="w-4 h-4" />
              Ver permits
            </button>
          </div>
        </div>
      </div>

      {/* ============ KPI GRID ============ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((k, i) => (
          <button
            key={k.label}
            onClick={k.onClick}
            className="group relative text-left overflow-hidden rounded-2xl bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div
              className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${k.gradient} opacity-10 blur-2xl group-hover:opacity-30 transition-opacity`}
            />
            <div className="relative flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.gradient} flex items-center justify-center shadow-md`}
              >
                <k.icon className="w-4 h-4 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div className="relative">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {k.label}
              </div>
              {isLoading || loadingMsgs ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <div className="font-display text-3xl font-bold tracking-tight">
                  {k.value}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* ============ MAIN HERO METRICS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance Score */}
        <Card className="lg:col-span-2 relative overflow-hidden border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />
          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="font-display text-base">Compliance Score</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Últimos 6 meses</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-4xl font-bold bg-gradient-to-br from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  {complianceNow}%
                </div>
                <div
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    complianceDelta >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {complianceDelta >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {complianceDelta >= 0 ? "+" : ""}
                  {complianceDelta}% vs mês anterior
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 10, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="complianceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(158 55% 42%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(158 55% 42%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                    }}
                    formatter={(v: number) => [`${v}%`, "Compliance"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="compliance"
                    stroke="hsl(158 55% 42%)"
                    strokeWidth={2.5}
                    fill="url(#complianceGrad)"
                    dot={{ r: 3, fill: "hsl(158 55% 42%)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue snapshot */}
        <Card className="relative overflow-hidden border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5 pointer-events-none" />
          <CardHeader className="pb-2 relative">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="font-display text-base">Revenue mensal</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Este mês</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="font-display text-4xl font-bold tracking-tight">
              ${revenueNow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div
              className={`inline-flex items-center gap-1 text-xs font-semibold mt-1 ${
                revenueDelta >= 0 ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {revenueDelta >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {revenueDelta >= 0 ? "+" : ""}
              {revenueDelta.toFixed(1)}% vs mês anterior
            </div>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={revenueTrend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(234 75% 58%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(234 75% 58%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                    }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(234 75% 58%)"
                    strokeWidth={2.5}
                    fill="url(#revenueGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============ CHARTS ROW ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="font-display text-base">
                {t("dashboard.expirations")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : metrics.total === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">
                {t("dashboard.noPermits")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={expirationChartData}
                  layout="vertical"
                  margin={{ left: 0, right: 15, top: 5, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={55} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                    }}
                    formatter={(value: number) => [value, "Permits"]}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {expirationChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
                <FileCheck className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="font-display text-base">
                {t("dashboard.permitsByType")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : permitsByType.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">
                {t("dashboard.noPermits")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={permitsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {permitsByType.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-md">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="font-display text-base">
                {t("dashboard.messages")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMsgs ? (
              <Skeleton className="h-[220px] w-full" />
            ) : msgChartData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">
                {t("dashboard.noMessages")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={msgChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {msgChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============ EXPIRATION BREAKDOWN ============ */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-zinc-500 flex items-center justify-center shadow-md">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="font-display text-base">
              {t("dashboard.expirationSummary")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: t("dashboard.expired"), count: metrics.expired, accent: "bg-red-500", text: "text-red-500" },
                { label: "30d", count: metrics.in30, accent: "bg-amber-500", text: "text-amber-500" },
                { label: "60d", count: metrics.in60, accent: "bg-orange-400", text: "text-orange-500" },
                { label: "90d", count: metrics.in90, accent: "bg-sky-500", text: "text-sky-500" },
                { label: t("dashboard.valid90"), count: metrics.active, accent: "bg-emerald-500", text: "text-emerald-500" },
              ].map((row) => {
                const pct = metrics.total ? (row.count / metrics.total) * 100 : 0;
                return (
                  <div
                    key={row.label}
                    className="relative rounded-xl border border-border/50 p-4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {row.label}
                      </span>
                      <span className={`text-xs font-bold ${row.text}`}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="font-display text-2xl font-bold tracking-tight mb-2">
                      {row.count}
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${row.accent} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ URGENT & RECENT ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="relative overflow-hidden border-border/50">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-rose-500" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-md">
                  <ShieldAlert className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="font-display text-base">
                  {t("dashboard.urgentPermits")}
                </CardTitle>
              </div>
              {urgentPermits.length > 0 && (
                <Badge variant="destructive" className="h-6">
                  {urgentPermits.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : urgentPermits.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
                  <FileCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-muted-foreground text-sm">{t("dashboard.noUrgent")}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {urgentPermits.map((p) => {
                  const status = getExpirationStatus(p.expiration_date);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer"
                      onClick={() => navigate("/permits")}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-semibold truncate">
                            {p.clients?.company_name ?? "—"}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {p.permit_type}
                            {p.state ? ` · ${p.state}` : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                        <Badge className={status.color}>{status.label}</Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {p.expiration_date
                            ? format(new Date(p.expiration_date), "dd MMM", {
                                locale: dateLocales[language],
                              })
                            : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="font-display text-base">
                  {t("dashboard.recentClients")}
                </CardTitle>
              </div>
              <button
                onClick={() => navigate("/clients")}
                className="text-xs font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1"
              >
                Ver todos <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !clients?.length ? (
              <p className="text-muted-foreground text-sm py-6 text-center">
                {t("dashboard.noClients")}
              </p>
            ) : (
              <div className="space-y-1.5">
                {clients.slice(0, 6).map((c, i) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer"
                    onClick={() => navigate(`/clients/${c.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                          AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
                        } flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-md`}
                      >
                        {initials(c.company_name)}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold truncate">
                          {c.company_name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {c.dot ? `DOT ${c.dot}` : "—"}
                        </span>
                      </div>
                    </div>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============ MAP ============ */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center shadow-md">
              <Map className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="font-display text-base">{t("map.title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <PermitCoverageMap permits={permits} />
        </CardContent>
      </Card>
    </div>
  );
}
