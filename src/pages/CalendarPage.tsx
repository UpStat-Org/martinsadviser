import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Flame,
  Clock,
  CalendarCheck,
  ArrowUpRight,
} from "lucide-react";
import { usePermits, getExpirationStatus } from "@/hooks/usePermits";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { pt, enUS, es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const dateLocales = { pt, en: enUS, es };

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { data: permits, isLoading } = usePermits();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const locale = dateLocales[language];

  const permitsByDate = useMemo(() => {
    if (!permits) return new Map<string, typeof permits>();
    const map = new Map<string, typeof permits>();
    for (const p of permits) {
      if (!p.expiration_date) continue;
      const key = p.expiration_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [permits]);

  const selectedPermits = useMemo(() => {
    if (!date || !permits) return [];
    return permits.filter(
      (p) => p.expiration_date && isSameDay(new Date(p.expiration_date), date)
    );
  }, [date, permits]);

  const expirationDates = useMemo(() => {
    if (!permits)
      return { expired: [] as Date[], warning: [] as Date[], ok: [] as Date[] };
    const now = new Date();
    const expired: Date[] = [],
      warning: Date[] = [],
      ok: Date[] = [];
    for (const p of permits) {
      if (!p.expiration_date) continue;
      const exp = new Date(p.expiration_date);
      const diff = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
      if (diff < 0) expired.push(exp);
      else if (diff <= 30) expired.push(exp);
      else if (diff <= 90) warning.push(exp);
      else ok.push(exp);
    }
    return { expired, warning, ok };
  }, [permits]);

  const heatmap = useMemo(() => {
    const days: { date: Date; count: number }[] = [];
    if (!permits) return days;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const counts = new Map<string, number>();
    for (const p of permits) {
      if (!p.expiration_date) continue;
      const key = p.expiration_date;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (let i = 0; i < 7 * 12; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: d, count: counts.get(key) ?? 0 });
    }
    return days;
  }, [permits]);

  const heatmapMax = useMemo(
    () => heatmap.reduce((m, d) => Math.max(m, d.count), 0),
    [heatmap]
  );

  const heatColor = (count: number) => {
    if (count === 0) return "bg-muted/40";
    const ratio = heatmapMax ? count / heatmapMax : 0;
    if (ratio < 0.25) return "bg-gradient-to-br from-emerald-400 to-teal-400";
    if (ratio < 0.5) return "bg-gradient-to-br from-amber-400 to-orange-400";
    if (ratio < 0.75) return "bg-gradient-to-br from-orange-500 to-red-500";
    return "bg-gradient-to-br from-red-500 to-rose-600";
  };

  const upcomingPermits = useMemo(() => {
    if (!permits) return [];
    const now = new Date();
    return permits
      .filter((p) => {
        if (!p.expiration_date) return false;
        const diff = Math.ceil(
          (new Date(p.expiration_date).getTime() - now.getTime()) / 86400000
        );
        return diff >= 0 && diff <= 30;
      })
      .sort(
        (a, b) =>
          new Date(a.expiration_date!).getTime() -
          new Date(b.expiration_date!).getTime()
      );
  }, [permits]);

  const stats = useMemo(() => {
    const now = new Date();
    let expired = 0,
      next7 = 0,
      next30 = 0,
      today = 0;
    permits?.forEach((p) => {
      if (!p.expiration_date) return;
      const diff = Math.ceil(
        (new Date(p.expiration_date).getTime() - now.getTime()) / 86400000
      );
      if (diff < 0) expired++;
      else if (diff === 0) today++;
      else if (diff <= 7) next7++;
      else if (diff <= 30) next30++;
    });
    return { expired, today, next7, next30 };
  }, [permits]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl flex-shrink-0">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
                {t("calendar.title")}
              </h1>
              <p className="text-white/70 mt-2 text-sm sm:text-base max-w-xl">
                {t("calendar.subtitle")}
              </p>
            </div>
          </div>

          <button
            onClick={() => setDate(new Date())}
            className="h-10 px-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/15 transition-all"
          >
            <CalendarCheck className="w-4 h-4" />
            Hoje
          </button>
        </div>
      </div>

      {/* ============ QUICK STATS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Vencendo hoje",
            value: stats.today,
            icon: Flame,
            gradient: "from-red-500 to-rose-500",
          },
          {
            label: "Próximos 7 dias",
            value: stats.next7,
            icon: AlertTriangle,
            gradient: "from-amber-500 to-orange-500",
          },
          {
            label: "Próximos 30 dias",
            value: stats.next30,
            icon: Clock,
            gradient: "from-sky-500 to-blue-500",
          },
          {
            label: "Vencidos",
            value: stats.expired,
            icon: ShieldAlert,
            gradient: "from-slate-500 to-zinc-500",
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

      {/* ============ CALENDAR + DAY DETAIL ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 border-border/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
          <CardContent className="p-4 flex flex-col items-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              modifiers={{
                expired: expirationDates.expired,
                warning: expirationDates.warning,
                ok: expirationDates.ok,
              }}
              modifiersClassNames={{
                expired:
                  "bg-red-500/15 text-red-600 dark:text-red-400 font-bold rounded-md",
                warning:
                  "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold rounded-md",
                ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold rounded-md",
              }}
            />
            <div className="flex flex-wrap gap-3 text-xs pt-4 mt-4 border-t border-border/50 w-full justify-center">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-red-500/20 border border-red-500/40" />
                <span className="font-medium">{t("calendar.expiredUrgent")}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/40" />
                <span className="font-medium">{t("calendar.days31_90")}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/40" />
                <span className="font-medium">{t("common.valid")}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-500" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center shadow-md">
                  <CalendarDays className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base leading-tight">
                    {date
                      ? format(date, "dd 'de' MMMM 'de' yyyy", { locale })
                      : t("calendar.selectDate")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedPermits.length}{" "}
                    {selectedPermits.length === 1 ? "permit" : "permits"} nesta data
                  </p>
                </div>
              </div>
              {selectedPermits.length > 0 && (
                <span className="inline-flex items-center h-6 px-2.5 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/15">
                  {selectedPermits.length}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : selectedPermits.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <CalendarCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Dia livre
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("calendar.noPermitsDate")}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {selectedPermits.map((p) => {
                  const status = getExpirationStatus(p.expiration_date);
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate("/permits")}
                      className="group w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 transition-all text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {p.clients?.company_name ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {p.permit_type}
                            {p.permit_number ? ` · #${p.permit_number}` : ""}
                            {p.state ? ` · ${p.state}` : ""}
                          </div>
                          {p.trucks?.plate && (
                            <div className="text-[11px] text-muted-foreground">
                              🚛 {p.trucks.plate}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============ HEATMAP ============ */}
      <Card className="border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500" />
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base">
                {t("calendar.heatmapTitle")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Densidade de vencimentos nos próximos 84 dias
              </p>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : heatmapMax === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("calendar.heatmapEmpty")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className="grid grid-flow-col grid-rows-7 gap-1"
                style={{ gridAutoColumns: "minmax(14px, 1fr)" }}
              >
                {heatmap.map((d) => (
                  <button
                    key={d.date.toISOString()}
                    title={`${format(d.date, "dd/MM/yyyy")} — ${d.count} permit${d.count === 1 ? "" : "s"}`}
                    onClick={() => {
                      setDate(d.date);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`aspect-square rounded hover:ring-2 hover:ring-primary hover:ring-offset-1 hover:ring-offset-background transition-all shadow-sm ${heatColor(
                      d.count
                    )}`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/50">
                <span className="font-medium">{t("calendar.heatmapRange")}</span>
                <div className="flex items-center gap-1.5">
                  <span>{t("calendar.less")}</span>
                  <span className="w-3 h-3 rounded-sm bg-muted/40" />
                  <span className="w-3 h-3 rounded-sm bg-gradient-to-br from-emerald-400 to-teal-400" />
                  <span className="w-3 h-3 rounded-sm bg-gradient-to-br from-amber-400 to-orange-400" />
                  <span className="w-3 h-3 rounded-sm bg-gradient-to-br from-orange-500 to-red-500" />
                  <span className="w-3 h-3 rounded-sm bg-gradient-to-br from-red-500 to-rose-600" />
                  <span>{t("calendar.more")}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ UPCOMING ============ */}
      <Card className="border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-md">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base">
                  {t("calendar.upcoming30")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {upcomingPermits.length}{" "}
                  {upcomingPermits.length === 1 ? "permit" : "permits"} exigem atenção
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : upcomingPermits.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold mb-1">Tudo tranquilo! 🎉</p>
              <p className="text-xs text-muted-foreground">
                {t("calendar.noUpcoming")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {upcomingPermits.map((p) => {
                const status = getExpirationStatus(p.expiration_date);
                const diff = Math.ceil(
                  (new Date(p.expiration_date!).getTime() - new Date().getTime()) /
                    86400000
                );
                const urgencyGradient =
                  diff <= 0
                    ? "from-red-500 to-rose-500"
                    : diff <= 7
                    ? "from-amber-500 to-orange-500"
                    : "from-sky-500 to-blue-500";
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setDate(new Date(p.expiration_date!));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="group flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/60 hover:border-border transition-all text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${urgencyGradient} flex items-center justify-center shadow-md flex-shrink-0`}
                      >
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {p.clients?.company_name ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.permit_type}
                          {p.state ? ` · ${p.state}` : ""}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {format(new Date(p.expiration_date!), "dd MMM yyyy", {
                            locale,
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                      <Badge className={status.color}>
                        {diff === 0
                          ? t("common.today")
                          : diff < 0
                          ? t("common.expired")
                          : `${diff}d`}
                      </Badge>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
