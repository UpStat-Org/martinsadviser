import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layers } from "lucide-react";
import { computeAging, type AgingInvoice, type AgingBucket } from "@/lib/aging";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  invoices: AgingInvoice[];
}

const BUCKETS: Array<{ key: AgingBucket; labelKey: string }> = [
  { key: "current", labelKey: "aging.current" },
  { key: "d1_30", labelKey: "aging.d1_30" },
  { key: "d31_60", labelKey: "aging.d31_60" },
  { key: "d61_90", labelKey: "aging.d61_90" },
  { key: "d90plus", labelKey: "aging.d90plus" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export function ArAgingCard({ invoices }: Props) {
  const { t } = useLanguage();
  const report = useMemo(() => computeAging(invoices), [invoices]);

  if (report.totals.total === 0) return null;

  return (
    <Card className="border-border/50 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
      <CardContent className="p-0">
        <div className="p-5 pb-3 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
            <Layers className="w-4 h-4 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-base">{t("aging.title")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("aging.subtitle")}</p>
          </div>
        </div>

        {/* Totals strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 pb-4">
          {BUCKETS.map((b) => (
            <div key={b.key} className="rounded-md border border-border/50 bg-muted/30 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(b.labelKey)}
              </div>
              <div
                className={`mt-1 font-mono font-bold text-sm ${
                  b.key === "d90plus" && report.totals.d90plus > 0 ? "text-destructive" : ""
                }`}
              >
                {fmt(report.totals[b.key])}
              </div>
            </div>
          ))}
        </div>

        {/* Per-client breakdown */}
        <div className="max-h-[360px] overflow-auto">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("common.client")}
                </TableHead>
                {BUCKETS.map((b) => (
                  <TableHead
                    key={b.key}
                    className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right"
                  >
                    {t(b.labelKey)}
                  </TableHead>
                ))}
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.byClient.map((row) => (
                <TableRow key={row.clientId} className="hover:bg-muted/40 border-border/50">
                  <TableCell className="text-sm font-semibold truncate max-w-[180px]">
                    <Link to={`/clients/${row.clientId}`} className="hover:text-primary">
                      {row.name}
                    </Link>
                  </TableCell>
                  {BUCKETS.map((b) => (
                    <TableCell
                      key={b.key}
                      className={`font-mono text-xs text-right ${
                        b.key === "d90plus" && row.d90plus > 0 ? "text-destructive font-bold" : ""
                      }`}
                    >
                      {row[b.key] ? fmt(row[b.key]) : "—"}
                    </TableCell>
                  ))}
                  <TableCell className="font-mono font-bold text-xs text-right">{fmt(row.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
