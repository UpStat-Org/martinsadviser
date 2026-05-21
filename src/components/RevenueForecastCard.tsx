import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClients } from "@/hooks/useClients";
import { usePermits } from "@/hooks/usePermits";
import { useInvoices } from "@/hooks/useInvoices";
import {
  computeRevenueForecast,
  type PermitForecast,
  type RevenueForecast,
} from "@/lib/revenueForecast";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function SourceTag({ source, t }: { source: PermitForecast["source"]; t: (k: string) => string }) {
  if (source === "client_history") {
    return <span className="text-[10px] font-semibold text-emerald-600">{t("forecast.source.history")}</span>;
  }
  if (source === "org_average") {
    return <span className="text-[10px] font-semibold text-amber-600">{t("forecast.source.orgAvg")}</span>;
  }
  return <span className="text-[10px] font-semibold text-muted-foreground">{t("forecast.source.noData")}</span>;
}

export function RevenueForecastCard() {
  const { t } = useLanguage();
  const { data: clients } = useClients();
  const { data: permits } = usePermits();
  const { data: invoices } = useInvoices();

  const forecast: RevenueForecast | null = useMemo(() => {
    if (!clients || !permits || !invoices) return null;
    return computeRevenueForecast(clients, permits, invoices);
  }, [clients, permits, invoices]);

  if (!forecast) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          {t("common.loading") || "Carregando..."}
        </CardContent>
      </Card>
    );
  }

  const allUpcoming = forecast.next90.items
    .slice()
    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

  const buckets = [
    {
      key: "30",
      label: t("forecast.bucket.30"),
      bucket: forecast.next30,
      gradient: "from-rose-500 to-red-500",
    },
    {
      key: "60",
      label: t("forecast.bucket.60"),
      bucket: forecast.next60,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      key: "90",
      label: t("forecast.bucket.90"),
      bucket: forecast.next90,
      gradient: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="font-display text-lg">{t("forecast.title")}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{t("forecast.subtitle")}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Bucket totals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {buckets.map((b) => (
            <div
              key={b.key}
              className="relative overflow-hidden rounded-xl border border-border/50 p-4 bg-card"
            >
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${b.gradient} opacity-10 blur-xl`} />
              <p className="relative text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {b.label}
              </p>
              <p className="relative font-display text-2xl font-bold mt-1 tabular-nums">
                {usd.format(b.bucket.total)}
              </p>
              <p className="relative text-xs text-muted-foreground mt-0.5">
                {t("forecast.permitsCount").replace("{count}", String(b.bucket.count))}
              </p>
            </div>
          ))}
        </div>

        {/* Upcoming permits table */}
        {allUpcoming.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 border border-border/40 p-3 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{t("forecast.noData")}</span>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm">
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">{t("common.client") || "Cliente"}</th>
                    <th className="px-3 py-2">Permit</th>
                    <th className="px-3 py-2">{t("forecast.expiringIn").replace("{days}", "")}</th>
                    <th className="px-3 py-2 text-right">{usd.format(0).replace("0", "$")}</th>
                  </tr>
                </thead>
                <tbody>
                  {allUpcoming.map((item) => {
                    const urgent = item.daysUntilExpiration <= 30;
                    return (
                      <tr key={item.permit.id} className="border-t border-border/40 hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <Link
                            to={`/clients/${item.permit.client_id}`}
                            className="text-sm font-medium hover:text-primary truncate block max-w-[180px]"
                          >
                            {item.clientName}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-mono">{item.permit.permit_type}</span>
                            {item.permit.state && (
                              <span className="text-[10px] text-muted-foreground">{item.permit.state}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="outline"
                            className={
                              urgent
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            }
                          >
                            {t("forecast.expiringIn").replace("{days}", String(item.daysUntilExpiration))}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="font-semibold tabular-nums">{usd.format(item.estimatedRevenue)}</div>
                          <SourceTag source={item.source} t={t} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          {t("forecast.note")}
        </p>
      </CardContent>
    </Card>
  );
}
