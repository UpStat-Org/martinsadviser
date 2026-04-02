import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck, FileCheck, AlertTriangle, Clock, ShieldAlert, Mail, Send, XCircle, Map } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { usePermits, getExpirationStatus } from "@/hooks/usePermits";
import { useTrucks } from "@/hooks/useTrucks";
import { useScheduledMessages } from "@/hooks/useMessages";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { format } from "date-fns";
import { pt, enUS, es } from "date-fns/locale";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { PermitCoverageMap } from "@/components/PermitCoverageMap";

const dateLocales = { pt, en: enUS, es };

export default function Dashboard() {
  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: trucks, isLoading: loadingTrucks } = useTrucks();
  const { data: permits, isLoading: loadingPermits } = usePermits();
  const { data: allMessages, isLoading: loadingMsgs } = useScheduledMessages();
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
    for (const p of permits) {
      map[p.permit_type] = (map[p.permit_type] || 0) + 1;
    }
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

  const msgChartData = useMemo(() => {
    return [
      { name: t("common.sent"), value: msgStats.sent, fill: "hsl(var(--chart-2))" },
      { name: t("common.pending"), value: msgStats.pending, fill: "hsl(var(--chart-3))" },
      { name: t("common.failed"), value: msgStats.failed, fill: "hsl(var(--chart-4))" },
      { name: t("common.cancelled"), value: msgStats.cancelled, fill: "hsl(var(--border))" },
    ].filter(d => d.value > 0);
  }, [msgStats, t]);

  const urgentPermits = useMemo(() => {
    if (!permits) return [];
    const now = new Date();
    return permits
      .filter((p) => {
        if (!p.expiration_date) return false;
        const diff = Math.ceil((new Date(p.expiration_date).getTime() - now.getTime()) / 86400000);
        return diff <= 30;
      })
      .sort((a, b) => new Date(a.expiration_date!).getTime() - new Date(b.expiration_date!).getTime())
      .slice(0, 8);
  }, [permits]);

  const expirationChartData = useMemo(() => [
    { name: t("dashboard.expired"), count: metrics.expired, fill: "hsl(var(--chart-4))" },
    { name: "≤30d", count: metrics.in30, fill: "hsl(var(--chart-3))" },
    { name: "≤60d", count: metrics.in60, fill: "hsl(var(--chart-3) / 0.6)" },
    { name: "≤90d", count: metrics.in90, fill: "hsl(var(--border))" },
    { name: ">90d", count: metrics.active, fill: "hsl(var(--chart-2))" },
  ], [metrics, t]);

  const PIE_COLORS = [
    "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
    "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(158, 55%, 42%)",
    "hsl(320, 60%, 50%)", "hsl(60, 70%, 45%)",
  ];

  const isLoading = loadingClients || loadingTrucks || loadingPermits;

  const stats = [
    { label: t("dashboard.clients"), value: clients?.length ?? 0, icon: Users, bgColor: "bg-primary/8", iconColor: "text-primary", onClick: () => navigate("/clients") },
    { label: t("dashboard.trucks"), value: trucks?.length ?? 0, icon: Truck, bgColor: "bg-primary/8", iconColor: "text-primary", onClick: () => navigate("/trucks") },
    { label: t("dashboard.activePermits"), value: metrics.active + metrics.in90 + metrics.in60, icon: FileCheck, bgColor: "bg-success/8", iconColor: "text-success", onClick: () => navigate("/permits") },
    { label: t("dashboard.expiring30d"), value: metrics.in30, icon: AlertTriangle, bgColor: "bg-warning/8", iconColor: "text-warning", onClick: () => navigate("/permits") },
    { label: t("dashboard.emailsSent"), value: msgStats.sent, icon: Send, bgColor: "bg-primary/8", iconColor: "text-primary", onClick: () => navigate("/messages") },
    { label: t("dashboard.pendingMsgs"), value: msgStats.pending, icon: Mail, bgColor: "bg-accent/8", iconColor: "text-accent-foreground", onClick: () => navigate("/messages") },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <Card
            key={stat.label}
            className="cursor-pointer hover:shadow-soft-md hover:-translate-y-0.5 transition-all duration-200"
            onClick={stat.onClick}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</CardTitle>
              <div className={`w-9 h-9 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading || loadingMsgs ? <Skeleton className="h-9 w-16" /> : <div className="text-3xl font-display font-bold">{stat.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-warning" />
              </div>
              {t("dashboard.expirations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : metrics.total === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">{t("dashboard.noPermits")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={expirationChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={55} />
                  <Tooltip formatter={(value: number) => [value, "Permits"]} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {expirationChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-primary" />
              </div>
              {t("dashboard.permitsByType")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : permitsByType.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">{t("dashboard.noPermits")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={permitsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {permitsByType.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-success" />
              </div>
              {t("dashboard.messages")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMsgs ? (
              <Skeleton className="h-[220px] w-full" />
            ) : msgChartData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">{t("dashboard.noMessages")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={msgChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {msgChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiration summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            {t("dashboard.expirationSummary")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: t("dashboard.expired"), count: metrics.expired, total: metrics.total },
                { label: t("dashboard.expiring30"), count: metrics.in30, total: metrics.total },
                { label: t("dashboard.expiring60"), count: metrics.in60, total: metrics.total },
                { label: t("dashboard.expiring90"), count: metrics.in90, total: metrics.total },
                { label: t("dashboard.valid90"), count: metrics.active, total: metrics.total },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-44 shrink-0">{row.label}</span>
                  <Progress value={row.total ? (row.count / row.total) * 100 : 0} className="h-2 flex-1" />
                  <span className="text-sm font-semibold w-8 text-right">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Urgent permits & Recent clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-destructive" />
              </div>
              {t("dashboard.urgentPermits")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : urgentPermits.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("dashboard.noUrgent")}</p>
            ) : (
              <div className="space-y-2">
                {urgentPermits.map((p) => {
                  const status = getExpirationStatus(p.expiration_date);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{p.clients?.company_name ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">{p.permit_type} {p.state ? `• ${p.state}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {p.expiration_date ? format(new Date(p.expiration_date), "dd MMM yyyy", { locale: dateLocales[language] }) : "—"}
                        </span>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              {t("dashboard.recentClients")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !clients?.length ? (
              <p className="text-muted-foreground text-sm">{t("dashboard.noClients")}</p>
            ) : (
              <div className="space-y-2">
                {clients.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50 cursor-pointer hover:bg-muted/60 transition-colors"
                    onClick={() => navigate(`/clients/${c.id}`)}
                  >
                    <div>
                      <span className="text-sm font-medium">{c.company_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{c.dot ? `DOT ${c.dot}` : ""}</span>
                    </div>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Map className="w-4 h-4 text-primary" />
            </div>
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
