import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Download, ChevronLeft, ChevronRight } from "lucide-react";
import {
  generateEvents,
  toICS,
  eventTitle,
  eventDescription,
  CATEGORY_META,
  type ComplianceEvent,
} from "@/lib/complianceCalendar";
import { format } from "date-fns";
import { pt, enUS, es } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

const LOCALES = { pt, en: enUS, es } as const;

export default function ComplianceCalendarPage() {
  const { t, language } = useLanguage();
  const dateLocale = LOCALES[language as keyof typeof LOCALES] ?? pt;

  const [anchor, setAnchor] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });

  const events = useMemo(() => {
    // Show 12 months from anchor.
    const end = new Date(Date.UTC(anchor.getUTCFullYear() + 1, anchor.getUTCMonth(), 0));
    return generateEvents(anchor, end);
  }, [anchor]);

  const allUpcomingYear = useMemo(() => {
    const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const yearEnd = new Date(Date.UTC(new Date().getUTCFullYear(), 11, 31));
    return generateEvents(yearStart, yearEnd);
  }, []);

  const monthsToShow = useMemo(() => {
    const months: Array<{ key: string; label: string; events: ComplianceEvent[] }> = [];
    for (let i = 0; i < 6; i++) {
      const m = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + i, 1));
      const next = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + i + 1, 0));
      const monthEvents = events.filter((e) => {
        const ms = new Date(e.date).getTime();
        return ms >= m.getTime() && ms <= next.getTime();
      });
      months.push({
        key: `${m.getUTCFullYear()}-${m.getUTCMonth()}`,
        label: format(m, "MMMM yyyy", { locale: dateLocale }),
        events: monthEvents,
      });
    }
    return months;
  }, [anchor, events, dateLocale]);

  const downloadICS = () => {
    const blob = new Blob([toICS(allUpcomingYear, t)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `compliance-deadlines-${new Date().toISOString().slice(0, 10)}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.2em] mb-2">
              {t("complianceCal.section")}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
              {t("complianceCal.title")}
            </h1>
            <p className="text-white/70 mt-2 text-sm max-w-xl">
              {t("complianceCal.subtitle")}
            </p>
          </div>
          <Button onClick={downloadICS} className="btn-gradient text-white border-0 gap-1.5">
            <Download className="w-4 h-4" />
            {t("complianceCal.export")}
          </Button>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setAnchor((a) => new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() - 1, 1)))
            }
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm">
            {format(anchor, "MMM yyyy", { locale: dateLocale })} →{" "}
            {format(
              new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 5, 1)),
              "MMM yyyy",
              { locale: dateLocale },
            )}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setAnchor((a) => new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 1)))
            }
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const now = new Date();
            setAnchor(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
          }}
        >
          {t("complianceCal.today")}
        </Button>
      </div>

      {/* Months grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {monthsToShow.map((m) => (
          <Card key={m.key} className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base capitalize flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                {m.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {m.events.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">{t("complianceCal.empty")}</p>
              ) : (
                <ul className="space-y-2">
                  {m.events.map((e, i) => {
                    const meta = CATEGORY_META[e.category];
                    const day = new Date(e.date).getUTCDate();
                    return (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-border/50 p-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <div
                          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-sm flex-shrink-0`}
                        >
                          <span className="font-display text-sm font-bold text-white tabular-nums">{day}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-bold border-border/60">
                              {t(meta.labelKey)}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mt-0.5 truncate">{eventTitle(e, t)}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{eventDescription(e, t)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
