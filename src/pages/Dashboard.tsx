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
      { name: t("common.sent"), value: msgStats.sent, fill: "hsl(152, 60%, 40%)" },
      { name: t("common.pending"), value: msgStats.pending, fill: "hsl(38, 92%, 50%)" },
      { name: t("common.failed"), value: msgStats.failed, fill: "hsl(0, 72%, 51%)" },
      { name: t("common.cancelled"), value: msgStats.cancelled, fill: "hsl(220, 16%, 60%)" },
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
    { name: t("dashboard.expired"), count: metrics.expired, fill: "hsl(0, 72%, 51%)" },
    { name: "≤30d", count: metrics.in30, fill: "hsl(38, 92%, 50%)" },
    { name: "≤60d", count: metrics.in60, fill: "hsl(38, 70%, 60%)" },
    { name: "≤90d", count: metrics.in90, fill: "hsl(220, 16%, 60%)" },
    { name: ">90d", count: metrics.active, fill: "hsl(152, 60%, 40%)" },
  ], [metrics, t]);

  const PIE_COLORS = [
    "hsl(215, 80%, 48%)", "hsl(152, 60%, 40%)", "hsl(38, 92%, 50%)",
    "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)", "hsl(180, 60%, 40%)",
    "hsl(320, 60%, 50%)", "hsl(60, 70%, 45%)",
  ];

  const isLoading = loadingClients || loadingTrucks || loadingPermits;

  const stats = [
    { label: t("dashboard.clients"), value: clients?.length ?? 0, icon: Users, color: "text-primary", onClick: () => navigate("/clients") },
    { label: t("dashboard.trucks"), value: trucks?.length ?? 0, icon: Truck, color: "text-primary", onClick: () => navigate("/trucks") },
    { label: t("dashboard.activePermits"), value: metrics.active + metrics.in90 + metrics.in60, icon: FileCheck, color: "text-success", onClick: () => navigate("/permits") },
    { label: t("dashboard.expiring30d"), value: metrics.in30, icon: AlertTriangle, color: "text-warning", onClick: () => navigate("/permits") },
    { label: t("dashboard.emailsSent"), value: msgStats.sent, icon: Send, color: "text-primary", onClick: () => navigate("/messages") },
    { label: t("dashboard.pendingMsgs"), value: msgStats.pending, icon: Mail, color: "text-accent-foreground", onClick: () => navigate("/messages") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={stat.onClick}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading || loadingMsgs ? <Skeleton className="h-9 w-16" /> : <div className="text-3xl font-display font-bold">{stat.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
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
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={55} />
                  <Tooltip formatter={(value: number) => [value, "Permits"]} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
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
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-muted-foreground" />
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
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-muted-foreground" />
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

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
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
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{(p as any).clients?.company_name ?? "—"}</span>
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
          <CardHeader>
            <CardTitle className="font-display text-lg">{t("dashboard.recentClients")}</CardTitle>
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
                    className="flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
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

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Map className="w-5 h-5 text-muted-foreground" />
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
