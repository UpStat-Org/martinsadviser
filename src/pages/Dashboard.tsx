import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck, FileCheck, AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { usePermits, getExpirationStatus } from "@/hooks/usePermits";
import { useTrucks } from "@/hooks/useTrucks";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function Dashboard() {
  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: trucks, isLoading: loadingTrucks } = useTrucks();
  const { data: permits, isLoading: loadingPermits } = usePermits();
  const navigate = useNavigate();

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

  const isLoading = loadingClients || loadingTrucks || loadingPermits;

  const stats = [
    { label: "Clientes", value: clients?.length ?? 0, icon: Users, color: "text-primary", onClick: () => navigate("/clients") },
    { label: "Caminhões", value: trucks?.length ?? 0, icon: Truck, color: "text-primary", onClick: () => navigate("/trucks") },
    { label: "Permits Ativos", value: metrics.active + metrics.in90 + metrics.in60, icon: FileCheck, color: "text-success", onClick: () => navigate("/permits") },
    { label: "Vencendo em 30d", value: metrics.in30, icon: AlertTriangle, color: "text-warning", onClick: () => navigate("/permits") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do seu sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={stat.onClick}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-9 w-16" /> : <div className="text-3xl font-display font-bold">{stat.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expiration Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Resumo de Vencimentos
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
                { label: "Vencidos", count: metrics.expired, color: "bg-destructive", total: metrics.total },
                { label: "Vencendo em 30 dias", count: metrics.in30, color: "bg-warning", total: metrics.total },
                { label: "Vencendo em 60 dias", count: metrics.in60, color: "bg-accent", total: metrics.total },
                { label: "Vencendo em 90 dias", count: metrics.in90, color: "bg-muted-foreground", total: metrics.total },
                { label: "Válidos (>90 dias)", count: metrics.active, color: "bg-success", total: metrics.total },
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

      {/* Urgent permits table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Permits Urgentes (≤30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : urgentPermits.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum permit com vencimento urgente. 🎉</p>
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
                          {p.expiration_date ? format(new Date(p.expiration_date), "dd MMM yyyy", { locale: pt }) : "—"}
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
            <CardTitle className="font-display text-lg">Últimos Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !clients?.length ? (
              <p className="text-muted-foreground text-sm">Nenhum cliente cadastrado.</p>
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
    </div>
  );
}
