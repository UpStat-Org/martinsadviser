import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import {
  useQuotes,
  useCreateQuote,
  useDeleteQuote,
  type QuoteStatus,
} from "@/hooks/useQuotes";
import { useLeads } from "@/hooks/useLeads";
import { useClients } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Plus, Trash2, Eye, Loader2, Check, DollarSign } from "lucide-react";
import { format } from "date-fns";

const STATUS_TONES: Record<QuoteStatus, StatusTone> = {
  draft: "neutral",
  sent: "warning",
  accepted: "success",
  rejected: "danger",
  expired: "neutral",
};

export default function QuotesPage() {
  const { t } = useLanguage();
  const { role } = useAuth();
  const navigate = useNavigate();
  const { data: quotes, isLoading } = useQuotes();
  const { data: leads } = useLeads();
  const { data: clients } = useClients();
  const createQuote = useCreateQuote();
  const deleteQuote = useDeleteQuote();

  const isViewer = role === "viewer";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    target: "client" as "client" | "lead",
    client_id: "",
    lead_id: "",
    title: t("quotes.title"),
    valid_until: "",
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const openLeads = useMemo(
    () => (leads ?? []).filter((l) => l.stage !== "won"),
    [leads]
  );

  const stats = useMemo(() => {
    const list = quotes ?? [];
    const accepted = list.filter((q) => q.status === "accepted");
    return {
      count: list.length,
      acceptedCount: accepted.length,
      acceptedValue: accepted.reduce((s, q) => s + Number(q.total || 0), 0),
    };
  }, [quotes]);

  const openNew = () => {
    setForm({
      target: "client",
      client_id: "",
      lead_id: "",
      title: t("quotes.title"),
      valid_until: "",
    });
    setDialogOpen(true);
  };

  const canSave = form.target === "client" ? !!form.client_id : !!form.lead_id;

  const handleCreate = () => {
    if (!canSave) return;
    createQuote.mutate(
      {
        client_id: form.target === "client" ? form.client_id : null,
        lead_id: form.target === "lead" ? form.lead_id : null,
        title: form.title || t("quotes.title"),
        valid_until: form.valid_until || null,
      },
      {
        onSuccess: (quote) => {
          setDialogOpen(false);
          navigate(`/quotes/${quote.id}`);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-md bg-card border border-border flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {t("quotes.title")}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl">
                {t("quotes.subtitle")}
              </p>
            </div>
          </div>

          {!isViewer && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={openNew}
                className="h-10 px-4 rounded-md bg-white text-[#0b0d2e] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" />
                {t("quotes.new")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============ SUMMARY CARDS ============ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {[
          {
            label: t("quotes.title"),
            value: stats.count,
            isCurrency: false,
            icon: FileText,
          },
          {
            label: t("quotes.st.accepted"),
            value: stats.acceptedCount,
            isCurrency: false,
            icon: Check,
          },
          {
            label: t("quotes.acceptedValue"),
            value: stats.acceptedValue,
            isCurrency: true,
            icon: DollarSign,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-md bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div className="relative flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                <s.icon className="w-4 h-4 text-foreground" />
              </div>
            </div>
            <div className="relative">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {s.label}
              </div>
              <div className="text-2xl lg:text-3xl font-bold tracking-tight truncate">
                {s.isCurrency ? fmt(s.value) : s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ============ TABLE ============ */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !quotes?.length ? (
        <EmptyState
          icon={<FileText className="w-9 h-9 text-muted-foreground" />}
          title={t("quotes.empty")}
          description={t("quotes.emptyDesc")}
          action={
            !isViewer ? (
              <button
                onClick={openNew}
                className="h-11 px-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("quotes.new")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[880px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("quotes.number")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("quotes.title")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("quotes.for")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">
                    {t("quotes.total")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("quotes.validUntil")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("quotes.status")}
                  </TableHead>
                  <TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow
                    key={q.id}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className="group cursor-pointer hover:bg-muted/40 transition-colors border-border/50"
                  >
                    <TableCell className="font-mono text-xs font-semibold">
                      {q.quote_number || "—"}
                    </TableCell>
                    <TableCell className="text-sm font-semibold max-w-[200px] truncate">
                      {q.title}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {q.clients?.company_name || q.leads?.company_name || "—"}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-sm text-right">
                      {fmt(Number(q.total || 0))}
                    </TableCell>
                    <TableCell className="text-sm">
                      {q.valid_until
                        ? format(new Date(q.valid_until), "dd/MM/yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={STATUS_TONES[q.status] ?? "neutral"}>
                        {t("quotes.st." + q.status)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          to={`/quotes/${q.id}`}
                          className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </Link>
                        {!isViewer && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="w-8 h-8 rounded-md hover:bg-destructive/10 flex items-center justify-center transition-colors">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t("common.delete")}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("common.cannotUndo")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t("common.cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteQuote.mutate(q.id)}
                                >
                                  {t("common.delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ============ CREATE DIALOG ============ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                <Plus className="w-4 h-4 text-secondary-foreground" />
              </div>
              {t("quotes.new")}
            </DialogTitle>
            <DialogDescription>{t("quotes.subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("quotes.target")}
              </Label>
              <Select
                value={form.target}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    target: v as "client" | "lead",
                    client_id: "",
                    lead_id: "",
                  })
                }
              >
                <SelectTrigger className="h-11 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">{t("quotes.client")}</SelectItem>
                  <SelectItem value="lead">{t("quotes.lead")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.target === "client" ? (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("quotes.client")}
                </Label>
                <Select
                  value={form.client_id}
                  onValueChange={(v) => setForm({ ...form, client_id: v })}
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <SelectValue placeholder={t("quotes.client")} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("quotes.lead")}
                </Label>
                <Select
                  value={form.lead_id}
                  onValueChange={(v) => setForm({ ...form, lead_id: v })}
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <SelectValue placeholder={t("quotes.lead")} />
                  </SelectTrigger>
                  <SelectContent>
                    {openLeads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("quotes.title")}
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-11 rounded-md"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("quotes.validUntil")}
              </Label>
              <Input
                type="date"
                value={form.valid_until}
                onChange={(e) =>
                  setForm({ ...form, valid_until: e.target.value })
                }
                className="h-11 rounded-md"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={!canSave || createQuote.isPending}
              className="w-full h-11 bg-secondary text-secondary-foreground border border-border font-semibold rounded-md inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {createQuote.isPending ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
