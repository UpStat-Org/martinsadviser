import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  Flame,
} from "lucide-react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useEmployees, employeeName } from "@/hooks/useEmployees";
import { useAllAssignments } from "@/hooks/useWorkload";
import { useLanguage } from "@/contexts/LanguageContext";

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

function gradientFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export default function WorkloadPage() {
  const { t } = useLanguage();
  const { data: employees, isLoading: le } = useEmployees();
  const { data: agg, isLoading: la } = useAllAssignments();

  const rows = useMemo(() => {
    if (!employees || !agg) return [];
    const now = new Date();
    return employees
      .map((e) => {
        const myPermits = agg.permits.filter((p) => p.assigned_to === e.id);
        const myTasks = agg.tasks.filter((t) => t.assigned_to === e.id);
        const overdue = myPermits.filter(
          (p) => p.expiration_date && new Date(p.expiration_date) < now
        ).length;
        const openTasks = myTasks.filter(
          (t) => t.status !== "completed" && t.status !== "discarded"
        ).length;
        const done = myTasks.filter((t) => t.status === "completed");

        const slas = done
          .map(
            (t) =>
              (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) /
              86400000
          )
          .filter((d) => d >= 0);
        const avgSla = slas.length
          ? slas.reduce((s, n) => s + n, 0) / slas.length
          : null;

        return {
          id: e.id,
          name: employeeName(e),
          permits: myPermits.length,
          overdue,
          openTasks,
          completed: done.length,
          avgSla,
          load: myPermits.length + openTasks,
        };
      })
      .sort((a, b) => b.load - a.load);
  }, [employees, agg]);

  const chartData = rows.map((r) => ({
    name: r.name.split(" ")[0],
    permits: r.permits,
    tasks: r.openTasks,
  }));

  const stats = useMemo(() => {
    const totalEmployees = rows.length;
    const totalPermits = rows.reduce((s, r) => s + r.permits, 0);
    const totalOpenTasks = rows.reduce((s, r) => s + r.openTasks, 0);
    const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0);
    return { totalEmployees, totalPermits, totalOpenTasks, totalOverdue };
  }, [rows]);

  const maxLoad = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.load), 0),
    [rows]
  );

  const isLoading = le || la;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl flex-shrink-0">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
              {t("workload.title")}
            </h1>
            <p className="text-white/70 mt-2 text-sm sm:text-base max-w-xl">
              {t("workload.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ============ KPIs ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Colaboradores",
            value: stats.totalEmployees,
            icon: Users,
            gradient: "from-indigo-500 to-violet-500",
          },
          {
            label: "Permits atribuídos",
            value: stats.totalPermits,
            icon: TrendingUp,
            gradient: "from-emerald-500 to-teal-500",
          },
          {
            label: "Tarefas abertas",
            value: stats.totalOpenTasks,
            icon: Clock,
            gradient: "from-sky-500 to-blue-500",
          },
          {
            label: "Permits vencidos",
            value: stats.totalOverdue,
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

      {/* ============ DISTRIBUTION CHART ============ */}
      <Card className="border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base">
                {t("workload.distribution")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permits e tarefas abertas por colaborador
              </p>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : !chartData.length ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("workload.noAssignments")}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="wPermits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(234 75% 62%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(234 75% 50%)" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="wTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(280 70% 60%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(280 70% 48%)" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  iconType="circle"
                />
                <Bar
                  dataKey="permits"
                  stackId="a"
                  fill="url(#wPermits)"
                  name={t("workload.permits")}
                />
                <Bar
                  dataKey="tasks"
                  stackId="a"
                  fill="url(#wTasks)"
                  radius={[6, 6, 0, 0]}
                  name={t("workload.openTasks")}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ============ EMPLOYEE DETAILS ============ */}
      <Card className="border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base">
                {t("workload.detailsByEmployee")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ordenado por carga total
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !rows.length ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("workload.noEmployees")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((r, idx) => {
                const loadPct = maxLoad > 0 ? (r.load / maxLoad) * 100 : 0;
                const overloaded = r.overdue > 0 || r.load > maxLoad * 0.75;
                return (
                  <div
                    key={r.id}
                    className="relative overflow-hidden rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-all p-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank + avatar */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {idx < 3 ? (
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                            {idx === 0 ? (
                              <Trophy className="w-3 h-3" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </div>
                        )}
                        <div
                          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradientFor(
                            r.id
                          )} flex items-center justify-center text-white font-semibold text-sm shadow-md`}
                        >
                          {initials(r.name)}
                        </div>
                      </div>

                      {/* Name + load bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-semibold text-sm truncate">
                            {r.name}
                          </span>
                          {overloaded && (
                            <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              <Flame className="w-2.5 h-2.5" />
                              Sobrecarga
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                overloaded
                                  ? "bg-gradient-to-r from-red-500 to-rose-500"
                                  : loadPct > 50
                                  ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                  : "bg-gradient-to-r from-emerald-500 to-teal-500"
                              }`}
                              style={{ width: `${loadPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-muted-foreground w-10 text-right">
                            {loadPct.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="hidden md:grid grid-cols-5 gap-4 flex-shrink-0">
                        <div className="text-center min-w-[60px]">
                          <div className="font-display text-xl font-bold tracking-tight">
                            {r.permits}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Permits
                          </div>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <div
                            className={`font-display text-xl font-bold tracking-tight ${
                              r.overdue > 0
                                ? "text-red-500"
                                : "text-muted-foreground"
                            }`}
                          >
                            {r.overdue}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Atraso
                          </div>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <div className="font-display text-xl font-bold tracking-tight">
                            {r.openTasks}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Abertas
                          </div>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <div className="font-display text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            {r.completed}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Concluídas
                          </div>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <div className="font-display text-xl font-bold tracking-tight">
                            {r.avgSla !== null ? r.avgSla.toFixed(1) : "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            SLA (d)
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile metrics */}
                    <div className="md:hidden grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-border/50">
                      <div className="text-center">
                        <div className="font-display text-sm font-bold">
                          {r.permits}
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase">
                          Permits
                        </div>
                      </div>
                      <div className="text-center">
                        <div
                          className={`font-display text-sm font-bold ${
                            r.overdue > 0 ? "text-red-500" : ""
                          }`}
                        >
                          {r.overdue}
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase">
                          Atraso
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-display text-sm font-bold">
                          {r.openTasks}
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase">
                          Abertas
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-display text-sm font-bold text-emerald-600">
                          {r.completed}
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase">
                          Done
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-display text-sm font-bold">
                          {r.avgSla !== null ? r.avgSla.toFixed(1) : "—"}
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase">
                          SLA
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
