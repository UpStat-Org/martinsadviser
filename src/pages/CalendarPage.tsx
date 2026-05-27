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
    if (ratio < 0.25) return "bg-secondary text-secondary-foreground border border-border";
    if (ratio < 0.5) return "bg-secondary text-secondary-foreground border border-border";
    if (ratio < 0.75) return "bg-secondary text-secondary-foreground border border-border";
    return "bg-secondary text-secondary-foreground border border-border";
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
    <div className="space-y-6">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-md bg-card border border-border flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {t("calendar.title")}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl">
                {t("calendar.subtitle")}
              </p>
            </div>
          </div>

          <button
            onClick={() => setDate(new Date())}
            className="h-10 px-4 rounded-md bg-card border border-border text-foreground text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/15 transition-all"
          >
            <CalendarCheck className="w-4 h-4" />
            {t("common.today")}
          </button>
        </div>
      </div>

      {/* ============ QUICK STATS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: t("calendar.expiringToday"),
            value: stats.today,
            icon: Flame,
            gradient: "from-red-500 to-rose-500",
          },
          {
            label: t("calendar.next7"),
            value: stats.next7,
            icon: AlertTriangle,
            gradient: "from-amber-500 to-orange-500",
          },
          {
            label: t("calendar.next30"),
            value: stats.next30,
            icon: Clock,
            gradient: "from-sky-500 to-blue-500",
          },
          {
            label: t("permits.stats.expired"),
            value: stats.expired,
            icon: ShieldAlert,
            gradient: "from-slate-500 to-zinc-500",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-md bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div
              className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-secondary text-secondary-foreground border border-border opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`}
            />
            <div className="relative flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center`}
              >
                <s.icon className="w-4 h-4 text-foreground" />
              </div>
            </div>
            <div className="relative">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {s.label}
              </div>
              <div className="text-xl font-semibold tracking-tight tracking-tight">
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ============ CALENDAR + DAY DETAIL ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 border-border/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
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
                  "bg-destructive/15 text-destructive font-bold rounded-md",
                warning:
                  "bg-warning/15 text-warning font-bold rounded-md",
                ok: "bg-success/15 text-success font-bold rounded-md",
              }}
            />
            <div className="flex flex-wrap gap-3 text-xs pt-4 mt-4 border-t border-border/50 w-full justify-center">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-destructive/20 border border-destructive/40" />
                <span className="font-medium">{t("calendar.expiredUrgent")}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-warning/20 border border-warning/40" />
                <span className="font-medium">{t("calendar.days31_90")}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-success/20 border border-success/40" />
                <span className="font-medium">{t("common.valid")}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight">
                    {date
                      ? format(date, "dd 'de' MMMM 'de' yyyy", { locale })
                      : t("calendar.selectDate")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedPermits.length}{" "}
                    {selectedPermits.length === 1 ? t("calendar.permitsOnDate.one") : t("calendar.permitsOnDate.other")}
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
                <div className="w-14 h-14 mx-auto rounded-md bg-success/10 border border-success/20 flex items-center justify-center mb-3">
                  <CalendarCheck className="w-6 h-6 text-success" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {t("calendar.dayFree")}
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
                      className="group w-full flex items-center justify-between p-3 rounded-md hover:bg-muted/60 transition-all text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
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
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
              <Flame className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-base">
                {t("calendar.heatmapTitle")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("calendar.densityTitle")}
              </p>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : heatmapMax === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto rounded-md bg-success/10 flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-success" />
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
                  <span className="w-3 h-3 rounded-sm bg-secondary text-secondary-foreground border border-border" />
                  <span className="w-3 h-3 rounded-sm bg-secondary text-secondary-foreground border border-border" />
                  <span className="w-3 h-3 rounded-sm bg-secondary text-secondary-foreground border border-border" />
                  <span className="w-3 h-3 rounded-sm bg-secondary text-secondary-foreground border border-border" />
                  <span>{t("calendar.more")}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ UPCOMING ============ */}
      <Card className="border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-secondary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-base">
                  {t("calendar.upcoming30")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {upcomingPermits.length}{" "}
                  {upcomingPermits.length === 1 ? t("calendar.permitsAttention.one") : t("calendar.permitsAttention.other")}
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
              <div className="w-14 h-14 mx-auto rounded-md bg-success/10 border border-success/20 flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <p className="text-sm font-semibold mb-1">{t("calendar.allClear")} 🎉</p>
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
                    className="group flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border/50 hover:bg-muted/60 hover:border-border transition-all text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center flex-shrink-0`}
                      >
                        <AlertTriangle className="w-4 h-4 text-secondary-foreground" />
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
