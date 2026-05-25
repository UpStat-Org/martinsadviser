import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  type Invoice,
} from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  DollarSign,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  TrendingUp,
  Clock,
  AlertTriangle,
  Download,
  Trophy,
  Filter,
  BarChart3,
  Wallet,
  Receipt,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
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
import { TablePreferencesToolbar, type Density } from "@/components/TablePreferencesToolbar";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  paid:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  overdue:
    "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const PIE_COLORS = [
  "hsl(38, 92%, 50%)",
  "hsl(152, 60%, 40%)",
  "hsl(0, 72%, 51%)",
  "hsl(220, 16%, 60%)",
];

const defaultInvoiceColumns = {
  client: true,
  description: true,
  amount: true,
  dueDate: true,
  status: true,
};

export default function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const { role } = useAuth();
  const { data: invoices, isLoading } = useInvoices();
  const { data: clients } = useClients();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<
    (Invoice & { clients: { company_name: string } }) | null
  >(null);
  const [filterStatus, setFilterStatus] = useLocalStorageState("finance-status-filter", "all");
  const [filterClient, setFilterClient] = useLocalStorageState("finance-client-filter", "all");
  const [density, setDensity] = useLocalStorageState<Density>(
    "finance-table-density",
    "comfortable"
  );
  const [columns, setColumns] = useLocalStorageState(
    "finance-table-columns",
    defaultInvoiceColumns
  );

  const [form, setForm] = useState({
    client_id: "",
    amount: "",
    due_date: "",
    description: "",
    status: "pending",
    paid_date: "",
  });

  const isViewer = role === "viewer";

  useEffect(() => {
    const action = searchParams.get("action");
    const clientId = searchParams.get("client");
    if (action !== "new" || !clientId || isViewer) return;
    setEditing(null);
    setForm({
      client_id: clientId,
      amount: "",
      due_date: "",
      description: "",
      status: "pending",
      paid_date: "",
    });
    setDialogOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("action");
    setSearchParams(next);
  }, [searchParams, setSearchParams, isViewer]);

  const openNew = () => {
    setEditing(null);
    setForm({
      client_id: "",
      amount: "",
      due_date: "",
      description: "",
      status: "pending",
      paid_date: "",
    });
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
      updateInvoice.mutate(
        { id: editing.id, ...payload },
        { onSuccess: () => setDialogOpen(false) }
      );
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
    if (!invoices) return { totalReceivable: 0, totalPaid: 0, totalOverdue: 0, count: 0 };
    const totalReceivable = invoices
      .filter((i) => i.status === "pending")
      .reduce((s, i) => s + Number(i.amount), 0);
    const totalPaid = invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + Number(i.amount), 0);
    const totalOverdue = invoices
      .filter((i) => i.status === "overdue")
      .reduce((s, i) => s + Number(i.amount), 0);
    return { totalReceivable, totalPaid, totalOverdue, count: invoices.length };
  }, [invoices]);

  const monthlyData = useMemo(() => {
    if (!invoices) return [];
    const map: Record<string, number> = {};
    invoices
      .filter((i) => i.status === "paid")
      .forEach((inv) => {
        const month = inv.paid_date
          ? format(new Date(inv.paid_date), "yyyy-MM")
          : format(new Date(inv.due_date), "yyyy-MM");
        map[month] = (map[month] || 0) + Number(inv.amount);
      });
    return Object.entries(map)
      .sort()
      .slice(-6)
      .map(([month, total]) => ({ month, total }));
  }, [invoices]);

  const pieData = useMemo(() => {
    if (!invoices) return [];
    const counts: Record<string, number> = {
      pending: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
    };
    invoices.forEach((i) => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const revenueByClient = useMemo(() => {
    if (!invoices || !clients) return [];
    const map: Record<
      string,
      {
        name: string;
        paid: number;
        pending: number;
        overdue: number;
        total: number;
        count: number;
        avgTicket: number;
        maxOverdueDays: number;
      }
    > = {};
    const now = new Date();
    invoices.forEach((inv) => {
      const name = inv.clients?.company_name || "—";
      if (!map[inv.client_id])
        map[inv.client_id] = {
          name,
          paid: 0,
          pending: 0,
          overdue: 0,
          total: 0,
          count: 0,
          avgTicket: 0,
          maxOverdueDays: 0,
        };
      const entry = map[inv.client_id];
      const amount = Number(inv.amount);
      entry.total += amount;
      entry.count += 1;
      if (inv.status === "paid") entry.paid += amount;
      else if (inv.status === "overdue") {
        entry.overdue += amount;
        entry.pending += amount;
        const dueDiff = Math.ceil(
          (now.getTime() - new Date(inv.due_date).getTime()) / 86400000
        );
        if (dueDiff > entry.maxOverdueDays) entry.maxOverdueDays = dueDiff;
      } else if (inv.status === "pending") {
        entry.pending += amount;
      }
    });
    Object.values(map).forEach((e) => {
      e.avgTicket = e.count > 0 ? e.total / e.count : 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [invoices, clients]);

  const delinquentClients = useMemo(
    () => revenueByClient.filter((c) => c.maxOverdueDays > 30),
    [revenueByClient]
  );

  const topClientsChartData = useMemo(() => {
    return revenueByClient.slice(0, 10).map((c) => ({
      name: c.name.length > 20 ? c.name.substring(0, 20) + "…" : c.name,
      paid: c.paid,
      pending: c.pending,
    }));
  }, [revenueByClient]);

  const exportFinanceCsv = () => {
    if (!filtered.length) return;
    const rows = filtered.map((inv) => ({
      Cliente: inv.clients?.company_name || "—",
      Descrição: inv.description || "",
      Valor: Number(inv.amount).toFixed(2),
      Vencimento: inv.due_date,
      Pagamento: inv.paid_date || "",
      Status: statusLabel(inv.status),
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending: t("common.pending"),
      paid: t("finance.paid"),
      overdue: t("finance.overdue"),
      cancelled: t("common.cancelled"),
    };
    return map[s] || s;
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="space-y-6">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-md bg-card border border-border flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {t("finance.title")}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl">
                {t("finance.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportFinanceCsv}
              disabled={!filtered.length}
              className="h-10 px-4 rounded-md bg-card border border-border text-foreground text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/15 transition-all disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              {t("reports.exportCsv")}
            </button>
            {!isViewer && (
              <button
                onClick={openNew}
                className="h-10 px-4 rounded-md bg-white text-[#0b0d2e] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" />
                {t("finance.newInvoice")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============ SUMMARY CARDS ============ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: t("finance.totalInvoices"),
            value: stats.count,
            isCurrency: false,
            icon: Receipt,
            gradient: "from-indigo-500 to-violet-500",
          },
          {
            label: t("finance.receivable"),
            value: stats.totalReceivable,
            isCurrency: true,
            icon: Clock,
            gradient: "from-amber-500 to-orange-500",
          },
          {
            label: t("finance.received"),
            value: stats.totalPaid,
            isCurrency: true,
            icon: TrendingUp,
            gradient: "from-emerald-500 to-teal-500",
          },
          {
            label: t("finance.overdue"),
            value: stats.totalOverdue,
            isCurrency: true,
            icon: AlertTriangle,
            gradient: "from-red-500 to-rose-500",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-md bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div
              className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-secondary text-secondary-foreground border border-border opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`}
            />
            <div className="relative flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center`}
              >
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

      {/* ============ CHARTS ============ */}
      {invoices && invoices.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
            <CardContent className="p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-base">
                    {t("finance.monthlyRevenue")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("finance.lastSixMonths")}
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={monthlyData}
                  margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="barRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(158 55% 42%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(180 60% 45%)" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                    }}
                    formatter={(v: number) => [fmt(v), t("finance.revenue")]}
                  />
                  <Bar dataKey="total" fill="url(#barRevenue)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
            <CardContent className="p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-base">
                    {t("finance.statusDist")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("finance.invoiceDistribution")}
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    label={({ name, value }) => `${statusLabel(name)}: ${value}`}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ REVENUE BY CLIENT ============ */}
      {revenueByClient.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
            <CardContent className="p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-base">
                    {t("finance.topClients")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("finance.byRevenue")}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={topClientsChartData}
                  layout="vertical"
                  margin={{ left: 10, right: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={130}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                    }}
                    formatter={(value: number) => fmt(value)}
                  />
                  <Bar
                    dataKey="paid"
                    stackId="a"
                    fill="hsl(158 55% 42%)"
                    name={t("finance.paid")}
                  />
                  <Bar
                    dataKey="pending"
                    stackId="a"
                    fill="hsl(38 92% 50%)"
                    name={t("common.pending")}
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
            <CardContent className="p-0">
              <div className="p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base">
                      {t("finance.revenueByClient")}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("finance.consolidatedDetails")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                      <TableHead className="w-10 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                        #
                      </TableHead>
                      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                        {t("common.client")}
                      </TableHead>
                      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-center">
                        Inv.
                      </TableHead>
                      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">
                        Ticket
                      </TableHead>
                      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">
                        {t("finance.paid")}
                      </TableHead>
                      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">
                        {t("common.pending")}
                      </TableHead>
                      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueByClient.slice(0, 10).map((row, i) => (
                      <TableRow
                        key={i}
                        className="hover:bg-muted/40 border-border/50"
                      >
                        <TableCell>
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold ${
                              i < 3
                                ? "bg-secondary text-secondary-foreground border border-border text-foreground shadow-sm"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {i + 1}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-semibold truncate max-w-[140px]">
                          {row.name}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {row.count}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right">
                          {fmt(row.avgTicket)}
                        </TableCell>
                        <TableCell className="text-emerald-600 dark:text-emerald-400 font-mono text-xs text-right">
                          {fmt(row.paid)}
                        </TableCell>
                        <TableCell className="text-amber-600 dark:text-amber-400 font-mono text-xs text-right">
                          {fmt(row.pending)}
                        </TableCell>
                        <TableCell className="font-bold font-mono text-xs text-right">
                          {fmt(row.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ DELINQUENT ============ */}
      {delinquentClients.length > 0 && (
        <Card className="border-red-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-red-600 dark:text-red-400">
                    {t("finance.delinquentClients")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("finance.overThirtyDays")}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center h-7 px-3 rounded-lg text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                {delinquentClients.length}
              </span>
            </div>
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("common.client")}
                    </TableHead>
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">
                      {t("finance.overdueAmount")}
                    </TableHead>
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("common.days")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delinquentClients.map((row, i) => (
                    <TableRow key={i} className="border-border/50">
                      <TableCell className="text-sm font-semibold">
                        {row.name}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm text-red-600 dark:text-red-400">
                        {fmt(row.overdue)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center h-6 px-2.5 rounded-md text-xs font-bold bg-secondary text-secondary-foreground border border-border shadow-sm">
                          {row.maxOverdueDays} {t("common.days")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ FILTERS ============ */}
      <div className="rounded-md bg-card border border-border/50 p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground px-1">
          <Filter className="w-3.5 h-3.5" />
          {t("common.filters")}:
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44 h-10 rounded-md bg-muted/40 border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("permits.all")}</SelectItem>
            <SelectItem value="pending">{t("common.pending")}</SelectItem>
            <SelectItem value="paid">{t("finance.paid")}</SelectItem>
            <SelectItem value="overdue">{t("finance.overdue")}</SelectItem>
            <SelectItem value="cancelled">{t("common.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-full sm:w-56 h-10 rounded-md bg-muted/40 border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("reports.allClients")}</SelectItem>
            {clients?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="sm:ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-primary/10 text-primary border border-primary/15 text-xs font-bold">
          {filtered.length} {t(filtered.length === 1 ? "finance.invoice" : "finance.invoices")}
        </span>
        <TablePreferencesToolbar
          density={density}
          onDensityChange={setDensity}
          columns={columns}
          onColumnsChange={setColumns}
          columnOptions={[
            { key: "client", label: t("common.client") },
            { key: "description", label: t("finance.description") },
            { key: "amount", label: t("finance.amount") },
            { key: "dueDate", label: t("finance.dueDate") },
            { key: "status", label: t("clients.status") },
          ]}
        />
      </div>

      {/* ============ TABLE ============ */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !filtered.length ? (
        <EmptyState
          icon={<Receipt className="w-9 h-9 text-emerald-500" />}
          title={t("finance.noInvoices")}
          description={
            filterStatus !== "all" || filterClient !== "all"
              ? t("finance.emptyFilteredDesc")
              : t("finance.emptyCreateDesc")
          }
          action={
            filterStatus !== "all" || filterClient !== "all" ? (
              <button
                onClick={() => {
                  setFilterStatus("all");
                  setFilterClient("all");
                }}
                className="h-11 px-5 rounded-md bg-muted hover:bg-muted/80 text-sm font-semibold"
              >
                {t("common.clearFilters")}
              </button>
            ) : !isViewer ? (
              <button
                onClick={openNew}
                className="h-11 px-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-foreground text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("finance.newInvoice")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <Card
          className={`overflow-hidden border-border/50 shadow-sm ${
            density === "compact"
              ? "[&_td]:!py-2 [&_td]:text-xs [&_th]:!h-9 [&_th]:!py-2"
              : "[&_td]:!py-3 [&_th]:!h-11"
          }`}
        >
          <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[920px] table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                {columns.client !== false && <TableHead className="w-[240px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("common.client")}
                </TableHead>}
                {columns.description !== false && <TableHead className="w-[260px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("finance.description")}
                </TableHead>}
                {columns.amount !== false && <TableHead className="w-[140px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">
                  {t("finance.amount")}
                </TableHead>}
                {columns.dueDate !== false && <TableHead className="w-[130px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("finance.dueDate")}
                </TableHead>}
                {columns.status !== false && <TableHead className="w-[130px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("clients.status")}
                </TableHead>}
                <TableHead className="w-[140px] text-center font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="group hover:bg-muted/40 transition-colors border-border/50"
                >
                  {columns.client !== false && <TableCell className={`text-sm font-semibold ${density === "compact" ? "py-2" : ""}`}>
                    <Link to={`/clients/${inv.client_id}`} className="block truncate hover:text-primary">
                      {inv.clients?.company_name || "—"}
                    </Link>
                  </TableCell>}
                  {columns.description !== false && <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                    {inv.description || "—"}
                  </TableCell>}
                  {columns.amount !== false && <TableCell className="font-mono font-bold text-sm text-right">
                    {fmt(Number(inv.amount))}
                  </TableCell>}
                  {columns.dueDate !== false && <TableCell className="text-sm">
                    {format(new Date(inv.due_date), "dd/MM/yyyy")}
                  </TableCell>}
                  {columns.status !== false && <TableCell>
                    <span
                      className={`inline-flex items-center justify-center h-6 min-w-[92px] whitespace-nowrap px-2.5 rounded-md text-xs font-semibold border ${STATUS_STYLES[inv.status]}`}
                    >
                      {statusLabel(inv.status)}
                    </span>
                  </TableCell>}
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        to={`/finance/${inv.id}`}
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                        title={t("common.openInvoice")}
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                      {!isViewer && (
                        <>
                        <button
                          onClick={() => openEdit(inv)}
                          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors">
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
                                onClick={() => deleteInvoice.mutate(inv.id)}
                              >
                                {t("common.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        </>
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

      {/* ============ DIALOG ============ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                {editing ? (
                  <Pencil className="w-4 h-4 text-secondary-foreground" />
                ) : (
                  <Plus className="w-4 h-4 text-secondary-foreground" />
                )}
              </div>
              {editing ? t("finance.editInvoice") : t("finance.newInvoice")}
            </DialogTitle>
            <DialogDescription>
              {editing ? t("finance.editDesc") : t("finance.newDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("common.client")}
              </Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm({ ...form, client_id: v })}
              >
                <SelectTrigger className="h-11 rounded-md">
                  <SelectValue placeholder={t("kanban.client")} />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("finance.amount")}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("finance.dueDate")}
                </Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("clients.status")}
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("common.pending")}</SelectItem>
                    <SelectItem value="paid">{t("finance.paid")}</SelectItem>
                    <SelectItem value="overdue">{t("finance.overdue")}</SelectItem>
                    <SelectItem value="cancelled">
                      {t("common.cancelled")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === "paid" && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("finance.paidDate")}
                  </Label>
                  <Input
                    type="date"
                    value={form.paid_date}
                    onChange={(e) =>
                      setForm({ ...form, paid_date: e.target.value })
                    }
                    className="h-11 rounded-md"
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("finance.description")}
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="rounded-md"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={
                !form.client_id ||
                !form.amount ||
                !form.due_date ||
                createInvoice.isPending ||
                updateInvoice.isPending
              }
              className="group w-full h-11 bg-secondary text-secondary-foreground border border-border font-semibold rounded-md inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60 relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-secondary text-secondary-foreground border border-border -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {createInvoice.isPending || updateInvoice.isPending
                ? t("common.saving")
                : t("common.save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
