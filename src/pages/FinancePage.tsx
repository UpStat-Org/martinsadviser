import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, type Invoice } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { DollarSign, Plus, Loader2, Pencil, Trash2, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning text-warning-foreground",
  paid: "bg-success text-success-foreground",
  overdue: "bg-destructive text-destructive-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const PIE_COLORS = ["hsl(38, 92%, 50%)", "hsl(152, 60%, 40%)", "hsl(0, 72%, 51%)", "hsl(220, 16%, 60%)"];

export default function FinancePage() {
  const { t } = useLanguage();
  const { role } = useAuth();
  const { data: invoices, isLoading } = useInvoices();
  const { data: clients } = useClients();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<(Invoice & { clients: { company_name: string } }) | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClient, setFilterClient] = useState("all");

  const [form, setForm] = useState({ client_id: "", amount: "", due_date: "", description: "", status: "pending", paid_date: "" });

  const isViewer = role === "viewer";

  const openNew = () => {
    setEditing(null);
    setForm({ client_id: "", amount: "", due_date: "", description: "", status: "pending", paid_date: "" });
    setDialogOpen(true);
  };

  const openEdit = (inv: Invoice & { clients: { company_name: string } }) => {
    setEditing(inv);
    setForm({
      client_id: inv.client_id,
      amount: String(inv.amount),
      due_date: inv.due_date,
      description: inv.description || "",
      status: inv.status,
      paid_date: inv.paid_date || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.client_id || !form.amount || !form.due_date) return;
    const payload = {
      client_id: form.client_id,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      description: form.description || null,
      status: form.status,
      paid_date: form.paid_date || null,
    };
    if (editing) {
      updateInvoice.mutate({ id: editing.id, ...payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createInvoice.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const filtered = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv) => {
      if (filterStatus !== "all" && inv.status !== filterStatus) return false;
      if (filterClient !== "all" && inv.client_id !== filterClient) return false;
      return true;
    });
  }, [invoices, filterStatus, filterClient]);

  const stats = useMemo(() => {
    if (!invoices) return { totalReceivable: 0, totalPaid: 0, totalOverdue: 0 };
    const totalReceivable = invoices.filter((i) => i.status === "pending").reduce((s, i) => s + Number(i.amount), 0);
    const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
    const totalOverdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + Number(i.amount), 0);
    return { totalReceivable, totalPaid, totalOverdue };
  }, [invoices]);

  const monthlyData = useMemo(() => {
    if (!invoices) return [];
    const map: Record<string, number> = {};
    invoices.filter((i) => i.status === "paid").forEach((inv) => {
      const month = inv.paid_date ? format(new Date(inv.paid_date), "yyyy-MM") : format(new Date(inv.due_date), "yyyy-MM");
      map[month] = (map[month] || 0) + Number(inv.amount);
    });
    return Object.entries(map).sort().slice(-6).map(([month, total]) => ({ month, total }));
  }, [invoices]);

  const pieData = useMemo(() => {
    if (!invoices) return [];
    const counts: Record<string, number> = { pending: 0, paid: 0, overdue: 0, cancelled: 0 };
    invoices.forEach((i) => { counts[i.status] = (counts[i.status] || 0) + 1; });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { pending: t("common.pending"), paid: t("finance.paid"), overdue: t("finance.overdue"), cancelled: t("common.cancelled") };
    return map[s] || s;
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t("finance.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("finance.subtitle")}</p>
        </div>
        {!isViewer && (
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />{t("finance.newInvoice")}
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><Clock className="w-5 h-5 text-warning" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t("finance.receivable")}</p>
                <p className="text-2xl font-bold font-display">{fmt(stats.totalReceivable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="w-5 h-5 text-success" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t("finance.received")}</p>
                <p className="text-2xl font-bold font-display">{fmt(stats.totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t("finance.overdue")}</p>
                <p className="text-2xl font-bold font-display">{fmt(stats.totalOverdue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {invoices && invoices.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">{t("finance.monthlyRevenue")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(152, 60%, 40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">{t("finance.statusDist")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${statusLabel(name)}: ${value}`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("permits.all")}</SelectItem>
            <SelectItem value="pending">{t("common.pending")}</SelectItem>
            <SelectItem value="paid">{t("finance.paid")}</SelectItem>
            <SelectItem value="overdue">{t("finance.overdue")}</SelectItem>
            <SelectItem value="cancelled">{t("common.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("reports.allClients")}</SelectItem>
            {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !filtered.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t("finance.noInvoices")}</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.client")}</TableHead>
                <TableHead>{t("finance.description")}</TableHead>
                <TableHead>{t("finance.amount")}</TableHead>
                <TableHead>{t("finance.dueDate")}</TableHead>
                <TableHead>{t("clients.status")}</TableHead>
                {!isViewer && <TableHead className="w-24">{t("common.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.clients?.company_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{inv.description || "—"}</TableCell>
                  <TableCell className="font-mono">{fmt(Number(inv.amount))}</TableCell>
                  <TableCell>{format(new Date(inv.due_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[inv.status]}>{statusLabel(inv.status)}</Badge></TableCell>
                  {!isViewer && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(inv)}><Pencil className="w-4 h-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>{t("common.delete")}?</AlertDialogTitle><AlertDialogDescription>{t("common.cannotUndo")}</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => deleteInvoice.mutate(inv.id)}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("finance.editInvoice") : t("finance.newInvoice")}</DialogTitle>
            <DialogDescription>{editing ? t("finance.editDesc") : t("finance.newDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("common.client")}</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("kanban.client")} /></SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("finance.amount")}</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("finance.dueDate")}</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("clients.status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("common.pending")}</SelectItem>
                    <SelectItem value="paid">{t("finance.paid")}</SelectItem>
                    <SelectItem value="overdue">{t("finance.overdue")}</SelectItem>
                    <SelectItem value="cancelled">{t("common.cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === "paid" && (
                <div className="space-y-1.5">
                  <Label>{t("finance.paidDate")}</Label>
                  <Input type="date" value={form.paid_date} onChange={(e) => setForm({ ...form, paid_date: e.target.value })} />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("finance.description")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button onClick={handleSubmit} disabled={!form.client_id || !form.amount || !form.due_date || createInvoice.isPending || updateInvoice.isPending} className="w-full">
              {(createInvoice.isPending || updateInvoice.isPending) ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
