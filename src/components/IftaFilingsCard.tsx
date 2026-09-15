import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { FileSpreadsheet, Loader2, Send, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIftaFilings, useUpsertIftaFiling, type IftaFiling } from "@/hooks/useIfta";
import { useRegion } from "@/hooks/useRegion";

const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const STATUS_TONE: Record<IftaFiling["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  filed: "bg-primary/10 text-primary border-primary/20",
  paid: "bg-success/10 text-success border-success/20",
};

interface Props {
  /** Quarter currently selected on the page; filings are scoped to it. */
  quarter: string;
  clients: Array<{ id: string; company_name: string }> | undefined;
  /** Read-only viewers don't get the advance-status actions. */
  canEdit?: boolean;
}

/**
 * Saved IFTA filings for the selected quarter.
 *
 * The page could already save a draft filing (useUpsertIftaFiling) but
 * useIftaFilings was never rendered anywhere — so a saved draft disappeared
 * with no way to see, resume or progress it. This lists them and moves the
 * status forward: draft → filed → paid.
 */
export function IftaFilingsCard({ quarter, clients, canEdit = true }: Props) {
  const { t } = useLanguage();
  const { money } = useRegion();
  const { data: filings, isLoading } = useIftaFilings(quarter);
  const upsert = useUpsertIftaFiling();

  const clientName = (id: string) =>
    clients?.find((c) => c.id === id)?.company_name ?? "—";

  const advance = (filing: IftaFiling) => {
    const next = filing.status === "draft" ? "filed" : "paid";
    upsert.mutate({
      client_id: filing.client_id,
      user_id: filing.user_id,
      quarter: filing.quarter,
      status: next,
      // Stamp the filing date on the draft → filed transition only; a later
      // paid transition shouldn't rewrite when it was filed.
      ...(next === "filed" ? { filed_at: new Date().toISOString() } : {}),
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          {t("ifta.filingsTitle")}
          <span className="text-xs font-normal text-muted-foreground">· {quarter}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !filings?.length ? (
          <EmptyState
            icon={<FileSpreadsheet className="w-9 h-9 text-muted-foreground" />}
            title={t("ifta.filingsEmptyTitle")}
            description={t("ifta.filingsEmptyDesc")}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ifta.filingClient")}</TableHead>
                  <TableHead className="text-right">{t("ifta.filingMiles")}</TableHead>
                  <TableHead className="text-right">{t("ifta.filingGallons")}</TableHead>
                  <TableHead className="text-right">{t("ifta.filingMpg")}</TableHead>
                  <TableHead className="text-right">{t("ifta.filingTaxDue")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  {canEdit && <TableHead className="w-px" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filings.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{clientName(f.client_id)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.total_miles != null ? num.format(f.total_miles) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.total_gallons != null ? num.format(f.total_gallons) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.fleet_mpg != null ? f.fleet_mpg.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(f.total_tax_due)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_TONE[f.status]}>
                        {t(`ifta.filingStatus.${f.status}`)}
                      </Badge>
                      {f.filed_at && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {format(new Date(f.filed_at), "MM/dd/yyyy")}
                        </div>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        {f.status !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 whitespace-nowrap"
                            disabled={upsert.isPending}
                            onClick={() => advance(f)}
                          >
                            {f.status === "draft" ? (
                              <><Send className="w-3.5 h-3.5" />{t("ifta.markFiled")}</>
                            ) : (
                              <><CheckCircle2 className="w-3.5 h-3.5" />{t("ifta.markPaid")}</>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
