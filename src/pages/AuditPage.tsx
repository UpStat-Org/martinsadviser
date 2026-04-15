import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ScrollText,
  Plus,
  Pencil,
  Trash2,
  Filter,
  X,
  Users,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
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
    .join("")
    .padEnd(1, "?");
}

const ACTION_CONFIG: Record<
  string,
  { icon: typeof Plus; gradient: string; badge: string }
> = {
  created: {
    icon: Plus,
    gradient: "from-emerald-500 to-teal-500",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  updated: {
    icon: Pencil,
    gradient: "from-amber-500 to-orange-500",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  deleted: {
    icon: Trash2,
    gradient: "from-red-500 to-rose-500",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
};

export default function AuditPage() {
  const { t } = useLanguage();
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles_map"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name");
      return new Map((data || []).map((p) => [p.id, p]));
    },
  });

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      if (entityFilter !== "all" && log.entity_type !== entityFilter) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (dateFrom && log.created_at < dateFrom) return false;
      if (dateTo && log.created_at > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [logs, entityFilter, actionFilter, dateFrom, dateTo]);

  const entityTypes = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map((l) => l.entity_type))];
  }, [logs]);

  const stats = useMemo(() => {
    const total = logs?.length ?? 0;
    const created = logs?.filter((l) => l.action === "created").length ?? 0;
    const updated = logs?.filter((l) => l.action === "updated").length ?? 0;
    const deleted = logs?.filter((l) => l.action === "deleted").length ?? 0;
    return { total, created, updated, deleted };
  }, [logs]);

  const activeFilters = [
    entityFilter !== "all",
    actionFilter !== "all",
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setEntityFilter("all");
    setActionFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl flex-shrink-0">
            <ScrollText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
              {t("audit.title")}
            </h1>
            <p className="text-white/70 mt-2 text-sm sm:text-base max-w-xl">
              {t("audit.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ============ KPIs ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Total de eventos",
            value: stats.total,
            icon: Activity,
            gradient: "from-indigo-500 to-violet-500",
          },
          {
            label: "Criações",
            value: stats.created,
            icon: Plus,
            gradient: "from-emerald-500 to-teal-500",
          },
          {
            label: "Atualizações",
            value: stats.updated,
            icon: Pencil,
            gradient: "from-amber-500 to-orange-500",
          },
          {
            label: "Exclusões",
            value: stats.deleted,
            icon: Trash2,
            gradient: "from-red-500 to-rose-500",
          },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() =>
              setActionFilter(
                s.label === "Criações"
                  ? "created"
                  : s.label === "Atualizações"
                  ? "updated"
                  : s.label === "Exclusões"
                  ? "deleted"
                  : "all"
              )
            }
            className="group relative text-left overflow-hidden rounded-2xl bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
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
          </button>
        ))}
      </div>

      {/* ============ FILTERS ============ */}
      <Card className="border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
                <Filter className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base">Filtros</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeFilters > 0
                    ? `${activeFilters} filtro(s) aplicado(s)`
                    : "Refine os registros de auditoria"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center h-7 px-2.5 rounded-lg bg-primary/10 text-primary border border-primary/15 text-xs font-bold">
                {filtered.length} {t("reports.results")}
              </span>
              {activeFilters > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-destructive hover:text-destructive/80 inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Entidade
              </Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/40 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("audit.allEntities")}</SelectItem>
                  {entityTypes.map((e) => (
                    <SelectItem key={e} value={e}>
                      {t(`activity.entity.${e}`) || e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ação
              </Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/40 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("audit.allActions")}</SelectItem>
                  <SelectItem value="created">
                    {t("activity.action.created")}
                  </SelectItem>
                  <SelectItem value="updated">
                    {t("activity.action.updated")}
                  </SelectItem>
                  <SelectItem value="deleted">
                    {t("activity.action.deleted")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("reports.from")}
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 rounded-xl bg-muted/40 border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("reports.to")}
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 rounded-xl bg-muted/40 border-border/60"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ TABLE ============ */}
      {isLoading ? (
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
              <ScrollText className="w-9 h-9 text-indigo-500" />
            </div>
            <p className="font-display text-lg font-semibold mb-1">
              {t("audit.empty")}
            </p>
            <p className="text-sm text-muted-foreground">
              {activeFilters > 0
                ? "Tente ajustar os filtros para ver mais resultados."
                : "Os eventos do sistema aparecerão aqui."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  Quando
                </TableHead>
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("audit.user")}
                </TableHead>
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("audit.action")}
                </TableHead>
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("audit.entity")}
                </TableHead>
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("audit.details")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => {
                const profile = profiles?.get(log.user_id);
                const details = log.details as Record<string, any> | null;
                const actionCfg =
                  ACTION_CONFIG[log.action] ?? {
                    icon: Activity,
                    gradient: "from-slate-500 to-zinc-500",
                    badge: "bg-muted text-muted-foreground border-border",
                  };
                const ActionIcon = actionCfg.icon;
                const userName =
                  profile?.full_name ||
                  profile?.email ||
                  log.user_id.slice(0, 8);
                return (
                  <TableRow
                    key={log.id}
                    className="hover:bg-muted/40 transition-colors border-border/50"
                  >
                    <TableCell className="py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                          {format(new Date(log.created_at), "dd MMM")}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(log.created_at), "HH:mm")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradientFor(
                            log.user_id
                          )} flex items-center justify-center text-white font-semibold text-[11px] shadow-sm flex-shrink-0`}
                        >
                          {initials(userName)}
                        </div>
                        <span className="text-sm font-medium truncate">
                          {userName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-[11px] font-bold border ${actionCfg.badge}`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded bg-gradient-to-br ${actionCfg.gradient} flex items-center justify-center`}
                        >
                          <ActionIcon className="w-2 h-2 text-white" />
                        </span>
                        {t(`activity.action.${log.action}`) || log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center h-6 px-2 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/15">
                        {t(`activity.entity.${log.entity_type}`) ||
                          log.entity_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                      {details
                        ? Object.entries(details)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
