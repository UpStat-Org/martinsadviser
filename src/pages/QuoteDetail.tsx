import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import {
  useQuote,
  useQuoteItems,
  useUpdateQuote,
  useCreateQuoteItem,
  useUpdateQuoteItem,
  useDeleteQuoteItem,
  useAcceptQuote,
  computeTotals,
  lineTotal,
  type QuoteStatus,
  type QuoteItem,
} from "@/hooks/useQuotes";
import { useServices, type BillingType } from "@/hooks/useServices";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Send,
  X,
  Loader2,
  Package,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_TONES: Record<QuoteStatus, StatusTone> = {
  draft: "neutral",
  sent: "warning",
  accepted: "success",
  rejected: "danger",
  expired: "neutral",
};

const BILLING_TYPES: BillingType[] = ["flat", "monthly", "quarterly", "yearly"];

export default function QuoteDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { role } = useAuth();
  const isViewer = role === "viewer";

  const { data: quote, isLoading } = useQuote(id);
  const { data: items } = useQuoteItems(id);
  const { data: services } = useServices(true);
  const updateQuote = useUpdateQuote();
  const createItem = useCreateQuoteItem();
  const updateItem = useUpdateQuoteItem();
  const deleteItem = useDeleteQuoteItem();
  const acceptQuote = useAcceptQuote();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [discountInput, setDiscountInput] = useState("");

  useEffect(() => {
    if (!quote) return;
    setTitle(quote.title);
    setNotes(quote.notes || "");
    setDiscountInput(String(quote.discount ?? 0));
  }, [quote]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const itemList = items ?? [];
  const discount = Number(quote?.discount || 0);
  const totals = computeTotals(itemList, discount);

  // Keep the quote's stored subtotal/total in sync with its line items and
  // discount so the list view stays accurate. Only writes when it drifts, to
  // avoid an update → refetch → update loop.
  useEffect(() => {
    if (!quote || !items) return;
    const { subtotal, total } = computeTotals(items, Number(quote.discount || 0));
    if (
      Number(quote.subtotal || 0) !== subtotal ||
      Number(quote.total || 0) !== total
    ) {
      updateQuote.mutate({ id: quote.id, subtotal, total, silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, quote?.discount, quote?.id, quote?.subtotal, quote?.total]);

  if (isLoading || !quote) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAccepted = quote.status === "accepted";
  const canMutate = !isViewer && !isAccepted;
  const targetName =
    quote.clients?.company_name || quote.leads?.company_name || "—";

  const commitTitle = () => {
    if (title.trim() && title !== quote.title) {
      updateQuote.mutate({ id: quote.id, title: title.trim(), silent: true });
    }
  };

  const commitNotes = () => {
    if (notes !== (quote.notes || "")) {
      updateQuote.mutate({ id: quote.id, notes: notes || null, silent: true });
    }
  };

  const commitDiscount = () => {
    const value = Number(discountInput) || 0;
    if (value !== discount) {
      updateQuote.mutate({ id: quote.id, discount: value, silent: true });
    }
  };

  const addBlankItem = () => {
    createItem.mutate({
      quote_id: quote.id,
      description: "",
      quantity: 1,
      unit_price: 0,
      billing_type: "flat",
      position: itemList.length,
    });
  };

  const addServiceItem = (serviceId: string) => {
    const svc = services?.find((s) => s.id === serviceId);
    if (!svc) return;
    createItem.mutate({
      quote_id: quote.id,
      service_id: svc.id,
      description: svc.name,
      quantity: 1,
      unit_price: Number(svc.default_price || 0),
      billing_type: svc.billing_type,
      position: itemList.length,
    });
  };

  const patchItem = (
    item: QuoteItem,
    patch: Partial<
      Pick<QuoteItem, "description" | "quantity" | "unit_price" | "billing_type">
    >
  ) => {
    updateItem.mutate({ id: item.id, ...patch });
  };

  return (
    <div className="space-y-5">
      <Link
        to="/quotes"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("quotes.back")}
      </Link>

      {/* ============ HEADER CARD ============ */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="font-mono text-xs font-semibold text-muted-foreground">
                {quote.quote_number || "—"}
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitTitle}
                disabled={!canMutate}
                className="h-11 text-lg font-semibold rounded-md"
              />
              <div className="text-sm text-muted-foreground">
                {t("quotes.for")}: <span className="font-semibold text-foreground">{targetName}</span>
              </div>
            </div>
            <div className="flex flex-col items-start lg:items-end gap-2">
              <StatusBadge tone={STATUS_TONES[quote.status] ?? "neutral"} size="lg">
                {t("quotes.st." + quote.status)}
              </StatusBadge>
              <div className="text-xs text-muted-foreground">
                {t("quotes.validUntil")}:{" "}
                {quote.valid_until
                  ? format(new Date(quote.valid_until), "dd/MM/yyyy")
                  : "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {quote.converted_at && (
        <div className="rounded-md border border-success/25 bg-success/10 text-success p-3 text-sm font-semibold">
          {t("quotes.alreadyConverted")}
        </div>
      )}

      {/* ============ LINE ITEMS ============ */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">{t("quotes.title")}</CardTitle>
          {canMutate && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-52">
                <Select value="" onValueChange={addServiceItem}>
                  <SelectTrigger className="h-9 rounded-md">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <Package className="w-3.5 h-3.5" />
                      {t("quotes.pickService")}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {services?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {fmt(Number(s.default_price || 0))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button
                onClick={addBlankItem}
                className="h-9 px-3 rounded-md bg-secondary text-secondary-foreground border border-border text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t("quotes.addItem")}
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("quotes.description")}
                </TableHead>
                <TableHead className="w-[90px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("quotes.qty")}
                </TableHead>
                <TableHead className="w-[130px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("quotes.unitPrice")}
                </TableHead>
                <TableHead className="w-[150px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("quotes.billingType")}
                </TableHead>
                <TableHead className="w-[120px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">
                  {t("quotes.total")}
                </TableHead>
                {canMutate && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canMutate ? 6 : 5}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    {t("quotes.emptyDesc")}
                  </TableCell>
                </TableRow>
              ) : (
                itemList.map((item) => (
                  <TableRow key={item.id} className="border-border/50">
                    <TableCell>
                      <Input
                        defaultValue={item.description}
                        disabled={!canMutate}
                        onBlur={(e) =>
                          patchItem(item, { description: e.target.value })
                        }
                        className="h-9 rounded-md"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        defaultValue={item.quantity}
                        disabled={!canMutate}
                        onBlur={(e) =>
                          patchItem(item, {
                            quantity: Number(e.target.value) || 0,
                          })
                        }
                        className="h-9 rounded-md"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={item.unit_price}
                        disabled={!canMutate}
                        onBlur={(e) =>
                          patchItem(item, {
                            unit_price: Number(e.target.value) || 0,
                          })
                        }
                        className="h-9 rounded-md"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.billing_type}
                        disabled={!canMutate}
                        onValueChange={(v) =>
                          patchItem(item, { billing_type: v as BillingType })
                        }
                      >
                        <SelectTrigger className="h-9 rounded-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BILLING_TYPES.map((bt) => (
                            <SelectItem key={bt} value={bt}>
                              {t("quotes.bt." + bt)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-sm text-right">
                      {fmt(lineTotal(item))}
                    </TableCell>
                    {canMutate && (
                      <TableCell>
                        <button
                          onClick={() =>
                            deleteItem.mutate({ id: item.id, quoteId: quote.id })
                          }
                          className="w-8 h-8 rounded-md hover:bg-destructive/10 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ============ NOTES ============ */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("quotes.notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={commitNotes}
              disabled={!canMutate}
              rows={5}
              className="rounded-md"
            />
          </CardContent>
        </Card>

        {/* ============ TOTALS ============ */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t("quotes.total")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("quotes.subtotal")}</span>
              <span className="font-mono font-semibold">{fmt(totals.subtotal)}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("quotes.discount")}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                onBlur={commitDiscount}
                disabled={!canMutate}
                className="h-10 rounded-md"
              />
            </div>
            <div className="flex items-center justify-between border-t border-border/50 pt-3">
              <span className="font-semibold">{t("quotes.total")}</span>
              <span className="font-mono text-lg font-bold">{fmt(totals.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============ ACTIONS ============ */}
      {!isViewer && (
        <Card className="border-border/50">
          <CardContent className="p-5 flex flex-wrap items-center gap-2">
            {quote.status === "draft" && (
              <button
                onClick={() =>
                  updateQuote.mutate({
                    id: quote.id,
                    status: "sent",
                    sent_at: new Date().toISOString(),
                  })
                }
                className="h-10 px-4 rounded-md bg-secondary text-secondary-foreground border border-border text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-muted transition-colors"
              >
                <Send className="w-4 h-4" />
                {t("quotes.send")}
              </button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  disabled={isAccepted || itemList.length === 0 || !!quote.converted_at}
                  className="h-10 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  {t("quotes.accept")}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("quotes.accept")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("quotes.acceptConfirm")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      acceptQuote.mutate({ quote, items: itemList })
                    }
                  >
                    {t("quotes.accept")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {!isAccepted && quote.status !== "rejected" && (
              <button
                onClick={() =>
                  updateQuote.mutate({ id: quote.id, status: "rejected" })
                }
                className="h-10 px-4 rounded-md bg-card border border-border text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
                {t("quotes.reject")}
              </button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
