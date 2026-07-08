import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClients } from "@/hooks/useClients";
import { useInvoices } from "@/hooks/useInvoices";
import { useExpenses } from "@/hooks/useExpenses";
import { useOrg } from "@/contexts/OrgContext";
import { useAllTimeEntries } from "@/hooks/useTimeTracking";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function ProfitPerClientPage() {
  const { t } = useLanguage();
  const { currentOrg } = useOrg();
  const { data: clients } = useClients();
  const { data: invoices } = useInvoices();
  const { data: expenses } = useExpenses();
  const { data: timeEntries } = useAllTimeEntries();

  // Hourly rate lives on the org row. Default 50 until the user changes it.
  const hourlyRate = (currentOrg as typeof currentOrg & { default_hourly_rate?: number })?.default_hourly_rate ?? 50;

  const rows = useMemo(() => {
    if (!clients) return [];
    const revenueByClient = new Map<string, number>();
    for (const inv of invoices ?? []) {
      if (inv.status !== "paid") continue;
      revenueByClient.set(inv.client_id, (revenueByClient.get(inv.client_id) ?? 0) + Number(inv.amount || 0));
    }
    const minutesByClient = new Map<string, number>();
    for (const e of timeEntries ?? []) {
      if (!e.client_id) continue;
      minutesByClient.set(e.client_id, (minutesByClient.get(e.client_id) ?? 0) + (e.minutes || 0));
    }
    // Direct costs logged against each client feed into cost alongside labor.
    const expensesByClient = new Map<string, number>();
    for (const ex of expenses ?? []) {
      if (!ex.client_id) continue;
      expensesByClient.set(ex.client_id, (expensesByClient.get(ex.client_id) ?? 0) + Number(ex.amount || 0));
    }
    return clients
      .map((c) => {
        const revenue = revenueByClient.get(c.id) ?? 0;
        const minutes = minutesByClient.get(c.id) ?? 0;
        const hours = minutes / 60;
        const laborCost = hours * hourlyRate;
        const directExpenses = expensesByClient.get(c.id) ?? 0;
        const cost = laborCost + directExpenses;
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        return { client: c, revenue, hours, cost, profit, margin };
      })
      .filter((r) => r.revenue > 0 || r.hours > 0 || r.cost > 0)
      .sort((a, b) => b.profit - a.profit);
  }, [clients, invoices, expenses, timeEntries, hourlyRate]);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalProfit = totalRevenue - totalCost;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">
        <div className="relative">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2">{t("common.financeEyebrow")}</p>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">{t("profit.title")}</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl">{t("profit.subtitle")}</p>
          <p className="text-muted-foreground mt-1 text-xs">{t("profit.hourlyRate").replace("{rate}", hourlyRate.toFixed(2))}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <DollarSign className="w-3.5 h-3.5" />
              {t("profit.col.revenue")}
            </div>
            <p className="text-lg font-semibold tabular-nums mt-1">{usd.format(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {t("profit.col.cost")}
            </div>
            <p className="text-lg font-semibold tabular-nums mt-1">{usd.format(totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {totalProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
              {t("profit.col.profit")}
            </div>
            <p className={`text-lg font-semibold tabular-nums mt-1 ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
              {usd.format(totalProfit)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{t("profit.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("profit.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("profit.col.client")}</TableHead>
                  <TableHead className="text-right">{t("profit.col.revenue")}</TableHead>
                  <TableHead className="text-right">{t("profit.col.hours")}</TableHead>
                  <TableHead className="text-right">{t("profit.col.cost")}</TableHead>
                  <TableHead className="text-right">{t("profit.col.profit")}</TableHead>
                  <TableHead className="text-right">{t("profit.col.margin")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.client.id}>
                    <TableCell className="font-medium">{r.client.company_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{usd.format(r.revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.hours.toFixed(1)}</TableCell>
                    <TableCell className="text-right tabular-nums">{usd.format(r.cost)}</TableCell>
                    <TableCell className={`text-right tabular-nums font-semibold ${r.profit >= 0 ? "text-success" : "text-destructive"}`}>
                      {usd.format(r.profit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          r.margin >= 30 ? "bg-success/10 text-success border-success/30" :
                          r.margin >= 0 ? "bg-warning/10 text-warning border-warning/30" :
                          "bg-destructive/10 text-destructive border-destructive/30"
                        }
                      >
                        {r.margin.toFixed(0)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
