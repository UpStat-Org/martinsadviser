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

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
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
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">{fmt(Number(invoice.amount))}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {invoice.description || "Invoice sem descrição"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={STATUS_STYLES[invoice.status]}>
              {invoice.status}
            </Badge>
            <button
              onClick={() => setEditOpen(true)}
              className="h-9 px-3 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold inline-flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Editar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusTile label="Status operacional" value={invoice.status} tone={invoice.status === "overdue" ? "red" : invoice.status === "paid" ? "emerald" : "amber"} />
        <StatusTile label="Dias em atraso" value={String(overdueDays)} tone={overdueDays ? "red" : "muted"} />
        <StatusTile label="Permits do cliente" value={String(permits?.length ?? 0)} tone="muted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dados financeiros</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info label="Cliente" value={invoice.clients?.company_name || "—"} to={`/clients/${invoice.client_id}`} icon={<Building2 className="w-4 h-4" />} />
            <Info label="Valor" value={fmt(Number(invoice.amount))} icon={<DollarSign className="w-4 h-4" />} />
            <Info label="Vencimento" value={format(new Date(invoice.due_date), "dd/MM/yyyy")} icon={<CalendarDays className="w-4 h-4" />} />
            <Info label="Pagamento" value={invoice.paid_date ? format(new Date(invoice.paid_date), "dd/MM/yyyy") : "—"} icon={<CalendarDays className="w-4 h-4" />} />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link className="block h-10 px-3 rounded-xl bg-muted/60 hover:bg-muted text-sm font-semibold leading-10" to={`/clients/${invoice.client_id}`}>
              Abrir cliente
            </Link>
            <button
              className="block w-full h-10 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold leading-10 text-left"
              onClick={() => setPermitOpen(true)}
            >
              <Plus className="inline w-4 h-4 mr-2" />
              Novo permit do cliente
            </button>
            <Link className="block h-10 px-3 rounded-xl bg-muted/60 hover:bg-muted text-sm font-semibold leading-10" to="/finance">
              Voltar ao financeiro
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
                  className="flex items-center justify-between rounded-xl border border-border/50 p-3 hover:bg-muted/40"
                >
                  <span className="text-sm font-semibold">{permit.permit_type}</span>
                  <span className="text-xs text-muted-foreground">Abrir documento</span>
                </DocumentLink>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum documento de permit encontrado para este cliente.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activity?.length ? (
              activity.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl bg-muted/40 border border-border/50 p-3">
                  <div className="text-sm font-semibold">{item.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
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
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === "paid" && (
                <div className="space-y-1.5">
                  <Label>Data de pagamento</Label>
                  <Input
                    type="date"
                    value={form.paid_date}
                    onChange={(e) => setForm({ ...form, paid_date: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={!form.amount || !form.due_date || updateInvoice.isPending}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
            >
              {updateInvoice.isPending ? "Salvando..." : "Salvar"}
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
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    red: "bg-red-500/10 text-red-600 border-red-500/20",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
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
    <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {icon}
        {label}
      </div>
      <div className="font-semibold">{value}</div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}
