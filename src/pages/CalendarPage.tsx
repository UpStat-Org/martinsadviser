import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useMemo, useState } from "react";
import { CalendarDays, AlertTriangle, ShieldAlert, CheckCircle } from "lucide-react";
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
    return permits.filter((p) => p.expiration_date && isSameDay(new Date(p.expiration_date), date));
  }, [date, permits]);

  const expirationDates = useMemo(() => {
    if (!permits) return { expired: [] as Date[], warning: [] as Date[], ok: [] as Date[] };
    const now = new Date();
    const expired: Date[] = [], warning: Date[] = [], ok: Date[] = [];
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

  const upcomingPermits = useMemo(() => {
    if (!permits) return [];
    const now = new Date();
    return permits
      .filter((p) => { if (!p.expiration_date) return false; const diff = Math.ceil((new Date(p.expiration_date).getTime() - now.getTime()) / 86400000); return diff >= 0 && diff <= 30; })
      .sort((a, b) => new Date(a.expiration_date!).getTime() - new Date(b.expiration_date!).getTime());
  }, [permits]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{t("calendar.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("calendar.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-4 flex justify-center">
            <Calendar mode="single" selected={date} onSelect={setDate}
              modifiers={{ expired: expirationDates.expired, warning: expirationDates.warning, ok: expirationDates.ok }}
              modifiersClassNames={{ expired: "bg-destructive/20 text-destructive font-bold rounded-md", warning: "bg-warning/20 text-warning font-bold rounded-md", ok: "bg-success/20 text-success font-bold rounded-md" }}
            />
          </CardContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/20 border border-destructive/40" />{t("calendar.expiredUrgent")}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/20 border border-warning/40" />{t("calendar.days31_90")}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/20 border border-success/40" />{t("common.valid")}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-muted-foreground" />
              {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale }) : t("calendar.selectDate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : selectedPermits.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("calendar.noPermitsDate")}</p>
            ) : (
              <div className="space-y-2">
                {selectedPermits.map((p) => {
                  const status = getExpirationStatus(p.expiration_date);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate("/permits")}>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{p.clients?.company_name ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">{p.permit_type} {p.permit_number ? `#${p.permit_number}` : ""} {p.state ? `• ${p.state}` : ""}</span>
                        {p.trucks?.plate && <span className="text-xs text-muted-foreground">{t("trucks.plate")}: {p.trucks?.plate}</span>}
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />{t("calendar.upcoming30")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : upcomingPermits.length === 0 ? (
            <p className="text-muted-foreground text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />{t("calendar.noUpcoming")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {upcomingPermits.map((p) => {
                const status = getExpirationStatus(p.expiration_date);
                const diff = Math.ceil((new Date(p.expiration_date!).getTime() - new Date().getTime()) / 86400000);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => { setDate(new Date(p.expiration_date!)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10 shrink-0"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{p.clients?.company_name ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">{p.permit_type} {p.state ? `• ${p.state}` : ""}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(p.expiration_date!), "dd/MM/yyyy")}</span>
                      </div>
                    </div>
                    <Badge className={status.color}>{diff === 0 ? t("common.today") : diff < 0 ? t("common.expired") : `${diff}d`}</Badge>
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
