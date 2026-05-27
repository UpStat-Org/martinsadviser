import { Link, useNavigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, CalendarDays, DollarSign, FileCheck, Pencil, Plus, Receipt } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentLink } from "@/components/DocumentLink";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useInvoice, useUpdateInvoice } from "@/hooks/useInvoices";
import { usePermits } from "@/hooks/usePermits";
import { useActivityLog } from "@/hooks/useActivityLog";
import { CommentsSection } from "@/components/CommentsSection";
import { PermitFormDialog } from "@/components/PermitFormDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  paid: "bg-success/10 text-success border-success/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [permitOpen, setPermitOpen] = useState(false);
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: permits } = usePermits(undefined, invoice?.client_id);
  const { data: activity } = useActivityLog(invoice?.client_id, 8);
  const updateInvoice = useUpdateInvoice();
  const [form, setForm] = useState({
    amount: "",
    due_date: "",
    description: "",
    status: "pending",
    paid_date: "",
  });

  useEffect(() => {
    if (!invoice || !editOpen) return;
    setForm({
      amount: String(invoice.amount),
      due_date: invoice.due_date,
      description: invoice.description || "",
      status: invoice.status,
      paid_date: invoice.paid_date || "",
    });
  }, [invoice, editOpen]);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-md" />;
  if (!invoice) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const overdueDays =
    invoice.status === "overdue"
      ? Math.max(0, Math.ceil((Date.now() - new Date(invoice.due_date).getTime()) / 86400000))
      : 0;
  const relatedDocs = permits?.filter((permit) => permit.document_url).slice(0, 5) ?? [];

  const handleSave = async () => {
    await updateInvoice.mutateAsync({
      id: invoice.id,
      amount: Number(form.amount),
      due_date: form.due_date,
      description: form.description || null,
      status: form.status,
      paid_date: form.status === "paid" ? form.paid_date || null : null,
    });
    setEditOpen(false);
  };

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("common.back")}
      </button>

      <PageHeader
        title={fmt(Number(invoice.amount))}
        description={invoice.description || t("invoice.noDescription")}
        meta={
          <Badge variant="outline" className={STATUS_STYLES[invoice.status]}>
            {invoice.status}
          </Badge>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4 mr-1.5" />
            {t("common.edit")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusTile label={t("common.status")} value={invoice.status} tone={invoice.status === "overdue" ? "red" : invoice.status === "paid" ? "emerald" : "amber"} />
        <StatusTile label={t("invoiceDetail.overdueDays") !== "invoiceDetail.overdueDays" ? t("invoiceDetail.overdueDays") : "Overdue days"} value={String(overdueDays)} tone={overdueDays ? "red" : "muted"} />
        <StatusTile label={t("nav.permits")} value={String(permits?.length ?? 0)} tone="muted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("invoiceDetail.financialData")}</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info label={t("common.client")} value={invoice.clients?.company_name || "—"} to={`/clients/${invoice.client_id}`} icon={<Building2 className="w-4 h-4" />} />
            <Info label={t("common.value")} value={fmt(Number(invoice.amount))} icon={<DollarSign className="w-4 h-4" />} />
            <Info label={t("common.dueDate")} value={format(new Date(invoice.due_date), "dd/MM/yyyy")} icon={<CalendarDays className="w-4 h-4" />} />
            <Info label={t("common.paymentDate")} value={invoice.paid_date ? format(new Date(invoice.paid_date), "dd/MM/yyyy") : "—"} icon={<CalendarDays className="w-4 h-4" />} />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t("common.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link className="block h-10 px-3 rounded-md bg-muted/60 hover:bg-muted text-sm font-semibold leading-10" to={`/clients/${invoice.client_id}`}>
              {t("invoiceDetail.quickClient")}
            </Link>
            <button
              className="block w-full h-10 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold leading-10 text-left"
              onClick={() => setPermitOpen(true)}
            >
              <Plus className="inline w-4 h-4 mr-2" />
              {t("invoiceDetail.quickNewPermit")}
            </button>
            <Link className="block h-10 px-3 rounded-md bg-muted/60 hover:bg-muted text-sm font-semibold leading-10" to="/finance">
              {t("invoiceDetail.quickBackFinance")}
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Documentos relacionados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {relatedDocs.length ? (
              relatedDocs.map((permit) => (
                <DocumentLink
                  key={permit.id}
                  path={permit.document_url}
                  className="flex items-center justify-between rounded-md border border-border/50 p-3 hover:bg-muted/40"
                >
                  <span className="text-sm font-semibold">{permit.permit_type}</span>
                  <span className="text-xs text-muted-foreground">{t("common.openDocument")}</span>
                </DocumentLink>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("invoiceDetail.noPermitDoc")}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t("common.recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activity?.length ? (
              activity.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-md bg-muted/40 border border-border/50 p-3">
                  <div className="text-sm font-semibold">{item.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("common.noActivity")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <CommentsSection entityType="invoice" entityId={invoice.id} />

      <PermitFormDialog
        open={permitOpen}
        onOpenChange={setPermitOpen}
        defaultClientId={invoice.client_id}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-md">
          <DialogHeader>
            <DialogTitle>{t("invoiceDetail.editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("common.value")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.dueDate")}</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("common.status")}</Label>
                <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("invoice.status.pending")}</SelectItem>
                    <SelectItem value="paid">{t("invoice.status.paid")}</SelectItem>
                    <SelectItem value="overdue">{t("invoice.status.overdue")}</SelectItem>
                    <SelectItem value="cancelled">{t("invoice.status.cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === "paid" && (
                <div className="space-y-1.5">
                  <Label>{t("common.paymentDate")}</Label>
                  <Input
                    type="date"
                    value={form.paid_date}
                    onChange={(e) => setForm({ ...form, paid_date: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("messages.description") !== "messages.description" ? t("messages.description") : "Description"}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={!form.amount || !form.due_date || updateInvoice.isPending}
              className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold disabled:opacity-60"
            >
              {updateInvoice.isPending ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "red" | "muted";
}) {
  const toneClass = {
    emerald: "bg-success/10 text-success border-success/20",
    amber: "bg-warning/10 text-warning border-warning/20",
    red: "bg-destructive/10 text-destructive border-destructive/20",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <div className={`rounded-md border p-4 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Info({
  label,
  value,
  icon,
  to,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  to?: string;
}) {
  const content = (
    <div className="rounded-md bg-muted/40 border border-border/50 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {icon}
        {label}
      </div>
      <div className="font-semibold">{value}</div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}
