import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, Clock } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";
import { useEmployees, employeeName } from "@/hooks/useEmployees";
import { useAllAssignments } from "@/hooks/useWorkload";
import { useLanguage } from "@/contexts/LanguageContext";

export default function WorkloadPage() {
  const { t } = useLanguage();
  const { data: employees, isLoading: le } = useEmployees();
  const { data: agg, isLoading: la } = useAllAssignments();

  const rows = useMemo(() => {
    if (!employees || !agg) return [];
    const now = new Date();
    return employees.map((e) => {
      const myPermits = agg.permits.filter((p) => p.assigned_to === e.id);
      const myTasks = agg.tasks.filter((t) => t.assigned_to === e.id);
      const overdue = myPermits.filter((p) => p.expiration_date && new Date(p.expiration_date) < now).length;
      const openTasks = myTasks.filter((t) => t.status !== "completed" && t.status !== "discarded").length;
      const done = myTasks.filter((t) => t.status === "completed");

      const slas = done
        .map((t) => (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / 86400000)
        .filter((d) => d >= 0);
      const avgSla = slas.length ? slas.reduce((s, n) => s + n, 0) / slas.length : null;

      return {
        id: e.id,
        name: employeeName(e),
        permits: myPermits.length,
        overdue,
        openTasks,
        completed: done.length,
        avgSla,
      };
    }).sort((a, b) => (b.permits + b.openTasks) - (a.permits + a.openTasks));
  }, [employees, agg]);

  const chartData = rows.map((r) => ({ name: r.name.split(" ")[0], permits: r.permits, tasks: r.openTasks }));

  const isLoading = le || la;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">{t("workload.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("workload.subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> {t("workload.distribution")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : !chartData.length ? (
            <p className="text-sm text-muted-foreground text-center py-12">{t("workload.noAssignments")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="permits" stackId="a" radius={[0, 0, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="hsl(var(--chart-1))" />)}
                </Bar>
                <Bar dataKey="tasks" stackId="a" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="hsl(var(--chart-3))" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 text-xs text-muted-foreground mt-3">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "hsl(var(--chart-1))" }} /> {t("workload.permits")}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "hsl(var(--chart-3))" }} /> {t("workload.openTasks")}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> {t("workload.detailsByEmployee")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !rows.length ? (
            <p className="text-sm text-muted-foreground p-8 text-center">{t("workload.noEmployees")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">{t("workload.employee")}</th>
                  <th className="text-right p-3">{t("workload.permits")}</th>
                  <th className="text-right p-3">{t("workload.overdue")}</th>
                  <th className="text-right p-3">{t("workload.openTasks")}</th>
                  <th className="text-right p-3">{t("workload.completed")}</th>
                  <th className="text-right p-3">{t("workload.avgSla")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 text-right font-mono">{r.permits}</td>
                    <td className="p-3 text-right">
                      {r.overdue > 0 ? <Badge className="bg-destructive text-destructive-foreground">{r.overdue}</Badge> : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="p-3 text-right font-mono">{r.openTasks}</td>
                    <td className="p-3 text-right font-mono text-success">{r.completed}</td>
                    <td className="p-3 text-right font-mono">{r.avgSla !== null ? r.avgSla.toFixed(1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
