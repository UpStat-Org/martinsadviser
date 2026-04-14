import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Briefcase, FileCheck, ClipboardList, AlertTriangle, Clock, ArrowRight, Mail } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useAssignedPermits, useAssignedTasks } from "@/hooks/useWorkload";
import { useScheduledMessages } from "@/hooks/useMessages";
import { getExpirationStatus } from "@/hooks/usePermits";

export default function MyDeskPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: permits, isLoading: lp } = useAssignedPermits(user?.id);
  const { data: tasks, isLoading: lt } = useAssignedTasks(user?.id);
  const { data: messages } = useScheduledMessages();

  const stats = useMemo(() => {
    const now = new Date();
    const overduePermits = (permits ?? []).filter((p) => p.expiration_date && new Date(p.expiration_date) < now).length;
    const next7 = (permits ?? []).filter((p) => {
      if (!p.expiration_date) return false;
      const diff = Math.ceil((new Date(p.expiration_date).getTime() - now.getTime()) / 86400000);
      return diff >= 0 && diff <= 7;
    }).length;
    const dueToday = (tasks ?? []).filter((t) => t.due_date && t.due_date === now.toISOString().slice(0, 10)).length;
    const failedMsgs = (messages ?? []).filter((m) => m.status === "failed").length;
    return { overduePermits, next7, dueToday, failedMsgs };
  }, [permits, tasks, messages]);

  const cards = [
    { label: "Permits vencidos", value: stats.overduePermits, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Vencendo em 7d", value: stats.next7, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Tarefas hoje", value: stats.dueToday, icon: ClipboardList, color: "text-primary", bg: "bg-primary/10" },
    { label: "Mensagens falhas", value: stats.failedMsgs, icon: Mail, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Minha Mesa</h1>
          <p className="text-muted-foreground text-sm">O que precisa da sua atenção hoje</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</CardTitle>
              <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-primary" />
              Meus Permits
              <span className="text-xs font-normal text-muted-foreground">({permits?.length ?? 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lp ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !permits?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum permit atribuído a você.</p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {permits.map((p) => {
                  const s = getExpirationStatus(p.expiration_date);
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/clients/${p.client_id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/40 border hover:bg-muted/60 transition-colors text-left"
                    >
                      <div>
                        <div className="text-sm font-medium">{p.clients?.company_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{p.permit_type}{p.state ? ` • ${p.state}` : ""}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {p.expiration_date ? format(new Date(p.expiration_date), "dd/MM/yyyy") : "—"}
                        </span>
                        <Badge className={s.color}>{s.label}</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              Minhas Tarefas
              <span className="text-xs font-normal text-muted-foreground">({tasks?.length ?? 0})</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")}>Kanban <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </CardHeader>
          <CardContent>
            {lt ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !tasks?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem tarefas atribuídas.</p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {tasks.map((t) => {
                  const overdue = t.due_date && new Date(t.due_date) < new Date();
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                      <div>
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.clients?.company_name ?? "Sem cliente"}
                          {t.due_date ? ` • ${format(new Date(t.due_date), "dd/MM")}` : ""}
                        </div>
                      </div>
                      <Badge className={overdue ? "bg-destructive text-destructive-foreground" : "bg-muted"}>
                        {t.priority || t.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
