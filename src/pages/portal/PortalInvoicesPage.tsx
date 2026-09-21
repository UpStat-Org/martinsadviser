import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, CreditCard, Loader2, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { usePortalInvoiceCheckout, usePortalInvoices } from "@/hooks/usePortal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegion } from "@/hooks/useRegion";

const tones: Record<string, StatusTone> = { paid: "success", pending: "warning", overdue: "danger", cancelled: "neutral" };

export default function PortalInvoicesPage() {
  const { t } = useLanguage();
  const { money, dateNumeric } = useRegion();
  const [params] = useSearchParams();
  const query = usePortalInvoices();
  const checkout = usePortalInvoiceCheckout();
  const paymentResult = params.get("payment");

  useEffect(() => {
    if (paymentResult !== "success") return;
    query.refetch();
    const timer = window.setTimeout(() => query.refetch(), 2500);
    return () => window.clearTimeout(timer);
  }, [paymentResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const receivable = (query.data ?? []).filter((invoice) => invoice.status === "pending" || invoice.status === "overdue").reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const paid = (query.data ?? []).filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">{t("portal2.invoices")}</h1><p className="text-sm text-muted-foreground mt-1">{t("portal2.invoicesDesc")}</p></div>
    {paymentResult === "success" && <div className="rounded-md border border-success/30 bg-success/10 text-success p-3 flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4" />{t("portal2.paymentProcessing")}</div>}
    {paymentResult === "canceled" && <div className="rounded-md border border-warning/30 bg-warning/10 text-warning p-3 text-sm">{t("portal2.paymentCanceled")}</div>}
    <div className="grid sm:grid-cols-2 gap-3"><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t("portal2.amountDue")}</p><p className="text-2xl font-semibold mt-1">{money(receivable)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t("portal2.amountPaid")}</p><p className="text-2xl font-semibold mt-1">{money(paid)}</p></CardContent></Card></div>
    {query.isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : query.error ? <Card><CardContent className="p-8 text-center text-destructive">{query.error.message}</CardContent></Card> : !query.data?.length ? <EmptyState icon={<Receipt className="w-9 h-9" />} title={t("portal2.noInvoices")} description={t("portal2.noInvoicesDesc")} /> : <div className="space-y-3">{query.data.map((invoice) => { const payable = invoice.status === "pending" || invoice.status === "overdue"; return <Card key={invoice.id}><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4"><div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0"><Receipt className="w-5 h-5" /></div><div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium truncate">{invoice.description || t("portal2.invoice")}</p><StatusBadge tone={tones[invoice.status] || "neutral"}>{t(`invoice.status.${invoice.status}`)}</StatusBadge></div><div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{t("common.dueDate")}: {dateNumeric(new Date(`${invoice.due_date}T12:00:00`))}</span>{invoice.paid_date && <span>{t("common.paymentDate")}: {dateNumeric(new Date(`${invoice.paid_date}T12:00:00`))}</span>}</div></div><div className="sm:text-right"><p className="text-xl font-semibold">{money(invoice.amount)}</p>{payable && <Button size="sm" className="mt-2" onClick={() => checkout.mutate(invoice.id)} disabled={checkout.isPending}><CreditCard />{t("portal2.payNow")}</Button>}</div></CardContent></Card>; })}</div>}
  </div>;
}
