import { useState } from "react";
import { CheckCircle2, FileText, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { usePortalQuotes, usePortalRespondQuote, type PortalQuote } from "@/hooks/usePortal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegion } from "@/hooks/useRegion";

const tones: Record<string, StatusTone> = { sent: "info", accepted: "success", rejected: "danger", expired: "warning" };

export default function PortalQuotesPage() {
  const { t } = useLanguage();
  const { money, dateNumeric } = useRegion();
  const { data: quotes, isLoading, error } = usePortalQuotes();
  const respond = usePortalRespondQuote();
  const [selected, setSelected] = useState<PortalQuote | null>(null);
  const [decision, setDecision] = useState<"accepted" | "rejected">("accepted");
  const [note, setNote] = useState("");

  const openResponse = (quote: PortalQuote, value: "accepted" | "rejected") => { setSelected(quote); setDecision(value); setNote(""); };
  const submit = () => selected && respond.mutate({ quoteId: selected.id, decision, note }, { onSuccess: () => setSelected(null) });

  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">{t("portal2.quotes")}</h1><p className="text-sm text-muted-foreground mt-1">{t("portal2.quotesDesc")}</p></div>
    {isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : error ? <Card><CardContent className="p-8 text-center text-destructive">{error.message}</CardContent></Card> : !quotes?.length ? <EmptyState icon={<FileText className="w-9 h-9" />} title={t("portal2.noQuotes")} description={t("portal2.noQuotesDesc")} /> : <div className="grid gap-4 xl:grid-cols-2">{quotes.map((quote) => <Card key={quote.id}><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{quote.title}</CardTitle><p className="text-xs text-muted-foreground font-mono mt-1">{quote.quote_number || "—"}</p></div><StatusBadge tone={tones[quote.status] || "neutral"}>{t(`quotes.st.${quote.status}`)}</StatusBadge></div></CardHeader><CardContent className="space-y-4">
      <div className="divide-y rounded-md border">{quote.items.map((item) => <div key={item.id} className="flex justify-between gap-3 p-3 text-sm"><div><p className="font-medium">{item.description}</p><p className="text-xs text-muted-foreground">{item.quantity} × {money(item.unit_price)} · {t(`services.bt.${item.billing_type}`)}</p></div><span className="font-medium">{money(item.quantity * item.unit_price)}</span></div>)}</div>
      <div className="space-y-1 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">{t("quotes.subtotal")}</span><span>{money(quote.subtotal)}</span></div>{Number(quote.discount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("quotes.discount")}</span><span>-{money(quote.discount)}</span></div>}<div className="flex justify-between border-t pt-2 text-base font-semibold"><span>{t("quotes.total")}</span><span>{money(quote.total)}</span></div></div>
      {quote.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted p-3">{quote.notes}</p>}
      <div className="flex justify-between items-center gap-3"><span className="text-xs text-muted-foreground">{quote.valid_until ? `${t("quotes.validUntil")}: ${dateNumeric(new Date(`${quote.valid_until}T12:00:00`))}` : ""}</span>{quote.status === "sent" && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openResponse(quote, "rejected")}><XCircle />{t("portal2.reject")}</Button><Button size="sm" onClick={() => openResponse(quote, "accepted")}><CheckCircle2 />{t("portal2.approve")}</Button></div>}</div>
      {quote.client_response_note && <p className="text-xs border-l-2 pl-3 text-muted-foreground">{t("portal2.yourResponse")}: {quote.client_response_note}</p>}
    </CardContent></Card>)}</div>}

    <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>{decision === "accepted" ? t("portal2.approveQuote") : t("portal2.rejectQuote")}</DialogTitle><DialogDescription>{selected?.title}</DialogDescription></DialogHeader><div className="space-y-4"><Textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("portal2.responseNote")} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSelected(null)}>{t("common.cancel")}</Button><Button variant={decision === "rejected" ? "destructive" : "default"} onClick={submit} disabled={respond.isPending}>{respond.isPending && <Loader2 className="animate-spin" />}{decision === "accepted" ? t("portal2.confirmApproval") : t("portal2.confirmRejection")}</Button></div></div></DialogContent></Dialog>
  </div>;
}
