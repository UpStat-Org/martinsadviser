import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  FileCheck,
  ClipboardList,
  AlertTriangle,
  Clock,
  ArrowRight,
  Mail,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Target,
  Flame,
  RotateCcw,
  Check,
  FileWarning,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { pt, enUS, es } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useAssignedPermits, useAssignedTasks } from "@/hooks/useWorkload";
import { useScheduledMessages } from "@/hooks/useMessages";
import { useRetryMessage } from "@/hooks/useMessages";
import { getExpirationStatus } from "@/hooks/usePermits";
import { useInvoices } from "@/hooks/useInvoices";
import { useUpdateTask } from "@/hooks/useTasks";
import { useRiskScores } from "@/hooks/useRiskScores";
import { factorLabel, isAtRisk, bandLabelKey } from "@/lib/risk";
import { useLanguage } from "@/contexts/LanguageContext";

const dateLocales = { pt, en: enUS, es };

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-secondary text-secondary-foreground border border-border text-foreground border-0",
  medium: "bg-secondary text-secondary-foreground border border-border text-foreground border-0",
  low: "bg-secondary text-secondary-foreground border border-border text-foreground border-0",
};

type ActionKind = "all" | "risk" | "compliance" | "tasks" | "messages" | "finance";
type ActionSeverity = "critical" | "high" | "medium" | "low";

interface ActionItem {
  id: string;
  kind: Exclude<ActionKind, "all">;
  severity: ActionSeverity;
  title: string;
  subtitle: string;
  meta: string;
  route: string;
  icon: typeof AlertTriangle;
  actionLabel?: string;
  onAction?: () => void;
}

const severityStyles: Record<ActionSeverity, string> = {
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  low: "bg-sky-500/10 text-sky-600 border-sky-500/20",
};

export default function MyDeskPage() {
  const [activeKind, setActiveKind] = useState<ActionKind>("all");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { data: permits, isLoading: lp } = useAssignedPermits(user?.id);
  const { data: tasks, isLoading: lt } = useAssignedTasks(user?.id);
  const { data: messages } = useScheduledMessages();
  const { data: invoices } = useInvoices();
  const { data: riskScores } = useRiskScores();
  const retryMessage = useRetryMessage();
  const updateTask = useUpdateTask();

  const userName = (user?.user_metadata as any)?.full_name?.split(" ")[0] ?? "";

  const stats = useMemo(() => {
    const now = new Date();
    const overduePermits = (permits ?? []).filter(
      (p) => p.expiration_date && new Date(p.expiration_date) < now
    ).length;
    const next7 = (permits ?? []).filter((p) => {
      if (!p.expiration_date) return false;
      const diff = Math.ceil(
        (new Date(p.expiration_date).getTime() - now.getTime()) / 86400000
      );
      return diff >= 0 && diff <= 7;
    }).length;
    const dueToday = (tasks ?? []).filter(
      (t) => t.due_date && t.due_date === now.toISOString().slice(0, 10)
    ).length;
    const failedMsgs = (messages ?? []).filter((m) => m.status === "failed").length;
    const overdueInvoices = (invoices ?? []).filter((i) => i.status === "overdue").length;
    return { overduePermits, next7, dueToday, failedMsgs, overdueInvoices };
  }, [permits, tasks, messages, invoices]);

  const totalAttention =
    stats.overduePermits + stats.next7 + stats.dueToday + stats.failedMsgs + stats.overdueInvoices;

  const cards = [
    {
      label: t("mydesk.overduePermits"),
      value: stats.overduePermits,
      icon: AlertTriangle,
      gradient: "from-red-500 to-rose-500",
      desc: t("mydesk.immediateAction"),
    },
    {
      label: t("mydesk.expiring7d"),
      value: stats.next7,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      desc: t("calendar.next7"),
    },
    {
      label: t("mydesk.tasksToday"),
      value: stats.dueToday,
      icon: ClipboardList,
      gradient: "from-indigo-500 to-violet-500",
      desc: t("kanban.stats.today"),
    },
    {
      label: t("mydesk.failedMessages"),
      value: stats.failedMsgs,
      icon: Mail,
      gradient: "from-fuchsia-500 to-pink-500",
      desc: t("mydesk.requiresRetry"),
    },
  ];

  const actionItems = useMemo<ActionItem[]>(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const items: ActionItem[] = [];

    // Risk roll-up: clients the daily job flagged high/critical lead the queue.
    (riskScores ?? [])
      .filter((s) => isAtRisk(s.band))
      .forEach((s) => {
        const top = [...(s.factors ?? [])].sort((a, b) => b.points - a.points)[0];
        items.push({
          id: `risk-${s.client_id}`,
          kind: "risk",
          severity: s.band === "critical" ? "critical" : "high",
          title: `${s.clients?.company_name ?? "—"} — ${t("risk.scoreLabel")} ${s.score}`,
          subtitle: top ? factorLabel(t, top) : t(bandLabelKey(s.band)),
          meta: t(bandLabelKey(s.band)),
          route: `/clients/${s.client_id}`,
          icon: ShieldAlert,
        });
      });

    (permits ?? []).forEach((permit) => {
      if (!permit.expiration_date) {
        items.push({
          id: `permit-nodate-${permit.id}`,
          kind: "compliance",
          severity: "medium",
          title: `${permit.permit_type} sem vencimento`,
          subtitle: permit.clients?.company_name ?? t("mydesk.noClient"),
          meta: t("mydesk.validateDate"),
          route: `/permits/${permit.id}`,
          icon: FileWarning,
        });
        return;
      }

      const diff = Math.ceil((new Date(permit.expiration_date).getTime() - now.getTime()) / 86400000);
      if (diff < 0 || diff <= 7) {
        items.push({
          id: `permit-${permit.id}`,
          kind: "compliance",
          severity: diff < 0 ? "critical" : "high",
          title: diff < 0 ? `${permit.permit_type} vencido` : `${permit.permit_type} vence em ${diff}d`,
          subtitle: permit.clients?.company_name ?? t("mydesk.noClient"),
          meta: format(new Date(permit.expiration_date), "dd/MM/yyyy"),
          route: `/permits/${permit.id}`,
          icon: AlertTriangle,
        });
      }

      if (!permit.document_url) {
        items.push({
          id: `permit-doc-${permit.id}`,
          kind: "compliance",
          severity: "low",
          title: `${permit.permit_type} sem documento`,
          subtitle: permit.clients?.company_name ?? t("mydesk.noClient"),
          meta: t("mydesk.attachDocument"),
          route: `/permits/${permit.id}`,
          icon: FileWarning,
        });
      }
    });

    (tasks ?? []).forEach((task) => {
      if (!task.due_date) return;
      const overdue = task.due_date < today;
      const dueToday = task.due_date === today;
      if (!overdue && !dueToday) return;
      items.push({
        id: `task-${task.id}`,
        kind: "tasks",
        severity: overdue ? "high" : "medium",
        title: task.name,
        subtitle: task.clients?.company_name ?? t("mydesk.noClient"),
        meta: overdue ? t("mydesk.overdueTask") : t("mydesk.dueToday"),
        route: "/tasks",
        icon: ClipboardList,
        actionLabel: t("mydesk.complete"),
        onAction: () => updateTask.mutate({ id: task.id, status: "completed" }),
      });
    });

    (messages ?? [])
      .filter((message) => message.status === "failed")
      .forEach((message) => {
        items.push({
          id: `message-${message.id}`,
          kind: "messages",
          severity: "high",
          title: message.subject || t("mydesk.failedMessage"),
          subtitle: message.clients?.company_name ?? t("mydesk.noClient"),
          meta: message.last_error || t("mydesk.requiresRetry"),
          route: "/messages",
          icon: Mail,
          actionLabel: t("mydesk.retry"),
          onAction: () => retryMessage.mutate(message.id),
        });
      });

    (invoices ?? [])
      .filter((invoice) => invoice.status === "overdue")
      .forEach((invoice) => {
        const overdueDays = Math.max(
          0,
          Math.ceil((now.getTime() - new Date(invoice.due_date).getTime()) / 86400000)
        );
        items.push({
          id: `invoice-${invoice.id}`,
          kind: "finance",
          severity: overdueDays > 30 ? "critical" : "high",
          title: `${t("finance.overdue")} ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(invoice.amount))}`,
          subtitle: invoice.clients?.company_name ?? t("mydesk.noClient"),
          meta: `${overdueDays} ${t("common.days")}`,
          route: `/finance/${invoice.id}`,
          icon: DollarSign,
        });
      });

    const order: Record<ActionSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return items.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [permits, tasks, messages, invoices, riskScores, retryMessage, updateTask, t]);

  const filteredActions = activeKind === "all"
    ? actionItems
    : actionItems.filter((item) => item.kind === activeKind);

  const actionCounts = {
    all: actionItems.length,
    risk: actionItems.filter((item) => item.kind === "risk").length,
    compliance: actionItems.filter((item) => item.kind === "compliance").length,
    tasks: actionItems.filter((item) => item.kind === "tasks").length,
    messages: actionItems.filter((item) => item.kind === "messages").length,
    finance: actionItems.filter((item) => item.kind === "finance").length,
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("myDesk.greeting.morning")
      : hour < 18
      ? t("myDesk.greeting.afternoon")
      : t("myDesk.greeting.evening");

  return (
    <div className="space-y-6">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-md bg-card border border-border flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border mb-3">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {format(new Date(), "EEEE, dd 'de' MMMM", {
                    locale: dateLocales[language],
                  })}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {greeting}{userName ? `, ${userName}` : ""} 👋
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl">
                {t("mydesk.subtitle")} — {totalAttention} {totalAttention === 1 ? t("myDesk.attention.one") : t("myDesk.attention.other")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate("/tasks")}
              className="h-10 px-4 rounded-md bg-white text-[#0b0d2e] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 transition-all shadow-lg"
            >
              <ClipboardList className="w-4 h-4" />
              Kanban
            </button>
            <button
              onClick={() => navigate("/permits")}
              className="h-10 px-4 rounded-md bg-card border border-border text-foreground text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/15 transition-all"
            >
              <FileCheck className="w-4 h-4" />
              Permits
            </button>
          </div>
        </div>
      </div>

      {/* ============ KPI CARDS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c) => {
          const isZero = c.value === 0;
          return (
            <div
              key={c.label}
              className="group relative overflow-hidden rounded-md bg-card border border-border/50 p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
            >
              <div
                className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-secondary text-secondary-foreground border border-border opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`}
              />
              <div className="relative flex items-start justify-between mb-4">
                <div
                  className={`w-11 h-11 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center`}
                >
                  <c.icon className="w-5 h-5 text-foreground" />
                </div>
                {isZero ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500/70" />
                ) : (
                  <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                )}
              </div>
              <div className="relative">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {c.label}
                </div>
                <div className="text-2xl font-semibold tracking-tight tracking-tight">
                  {c.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{c.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ============ ACTION CENTER ============ */}
      <Card className="border-border/50 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                <Flame className="w-4 h-4 text-secondary-foreground" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {t("mydesk.actionCenter")}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {actionItems.length} {t(actionItems.length === 1 ? "common.item" : "common.items")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "all", label: t("search.all"), count: actionCounts.all },
                { key: "risk", label: t("common.risk"), count: actionCounts.risk },
                { key: "compliance", label: t("nav.permits"), count: actionCounts.compliance },
                { key: "tasks", label: t("nav.tasks"), count: actionCounts.tasks },
                { key: "messages", label: t("nav.messages"), count: actionCounts.messages },
                { key: "finance", label: t("nav.finance"), count: actionCounts.finance },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveKind(filter.key as ActionKind)}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    activeKind === filter.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {filter.label} {filter.count > 0 && <span className="ml-1 opacity-80">{filter.count}</span>}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredActions.length ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto rounded-md bg-emerald-500/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold">{t("mydesk.noActions")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("mydesk.noActionsDesc")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-md border border-border/50 overflow-hidden">
              {filteredActions.slice(0, 18).map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 hover:bg-muted/40 transition-colors">
                    <button
                      onClick={() => navigate(item.route)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div className={`w-10 h-10 rounded-md border flex items-center justify-center shrink-0 ${severityStyles[item.severity]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{item.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <Badge variant="outline" className={`${severityStyles[item.severity]} whitespace-nowrap`}>
                        {item.meta}
                      </Badge>
                      {item.actionLabel && item.onAction && (
                        <button
                          onClick={item.onAction}
                          className="h-8 px-2.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          {item.kind === "messages" ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          {item.actionLabel}
                        </button>
                      )}
                      <button
                        onClick={() => navigate(item.route)}
                        className="h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                      >
                        {t("common.open")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ LISTS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Permits */}
        <Card className="border-border/50 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                  <FileCheck className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    {t("mydesk.myPermits")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {permits?.length ?? 0} {t("myDesk.assignedToYou")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/permits")}
                className="text-xs font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1"
              >
                {t("common.viewAll")} <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {lp ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !permits?.length ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 mx-auto rounded-md bg-emerald-500/10 flex items-center justify-center mb-3">
                  <Target className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {t("myDesk.nothingHere")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("mydesk.noPermits")}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {permits.map((p) => {
                  const s = getExpirationStatus(p.expiration_date);
                  const overdue = p.expiration_date && new Date(p.expiration_date) < new Date();
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/clients/${p.client_id}`)}
                      className="group w-full flex items-center justify-between p-3 rounded-md hover:bg-muted/60 transition-all text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
                            overdue
                              ? "bg-secondary text-secondary-foreground border border-border border border-red-500/20"
                              : "bg-secondary text-secondary-foreground border border-border border border-emerald-500/20"
                          }`}
                        >
                          <FileCheck
                            className={`w-4 h-4 ${overdue ? "text-red-500" : "text-emerald-500"}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {p.clients?.company_name ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {p.permit_type}
                            {p.state ? ` · ${p.state}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                        <Badge className={s.color}>{s.label}</Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {p.expiration_date
                            ? format(new Date(p.expiration_date), "dd MMM", {
                                locale: dateLocales[language],
                              })
                            : "—"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Tasks */}
        <Card className="border-border/50 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    {t("mydesk.myTasks")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tasks?.length ?? 0} {t("myDesk.activeTasks")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/tasks")}
                className="h-8 text-xs font-semibold text-primary hover:text-primary/80"
              >
                Kanban <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lt ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !tasks?.length ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 mx-auto rounded-md bg-indigo-500/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-500" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {t("myDesk.allDone")}
                </p>
                <p className="text-xs text-muted-foreground">{t("mydesk.noTasks")}</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {tasks.map((task) => {
                  const overdue =
                    task.due_date && new Date(task.due_date) < new Date();
                  const priorityClass =
                    PRIORITY_STYLES[task.priority as string] ??
                    "bg-muted text-muted-foreground";
                  return (
                    <div
                      key={task.id}
                      className="group w-full flex items-center justify-between p-3 rounded-md hover:bg-muted/60 transition-all text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
                            overdue
                              ? "bg-secondary text-secondary-foreground border border-border border border-red-500/20"
                              : "bg-secondary text-secondary-foreground border border-border border border-indigo-500/20"
                          }`}
                        >
                          {overdue ? (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          ) : (
                            <ClipboardList className="w-4 h-4 text-indigo-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {task.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                            <span className="truncate">
                              {task.clients?.company_name ?? t("mydesk.noClient")}
                            </span>
                            {task.due_date && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                <span
                                  className={
                                    overdue
                                      ? "text-red-500 font-semibold"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {format(new Date(task.due_date), "dd MMM", {
                                    locale: dateLocales[language],
                                  })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className={priorityClass}>
                        {task.priority || task.status}
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
