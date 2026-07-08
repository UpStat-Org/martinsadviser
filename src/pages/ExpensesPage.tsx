import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
} from "@/hooks/useExpenses";
import { useClients } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  Wallet,
  Receipt,
  Plus,
  Pencil,
  Trash2,
  Download,
  Filter,
  Loader2,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
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
import { StatusBadge } from "@/components/StatusBadge";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

const NONE_VALUE = "__none__";

export default function ExpensesPage() {
  const { t } = useLanguage();
  const { role } = useAuth();
  const { data: expenses, isLoading } = useExpenses();
  const { data: clients } = useClients();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filterCat, setFilterCat] = useLocalStorageState("expenses-cat-filter", "all");
  const [filterClient, setFilterClient] = useLocalStorageState(
    "expenses-client-filter",
    "all"
  );

  const [form, setForm] = useState({
    client_id: NONE_VALUE,
    category: "state_fee" as ExpenseCategory,
    amount: "",
    incurred_on: new Date().toISOString().slice(0, 10),
    billable: false,
    description: "",
  });

  const isViewer = role === "viewer";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const catLabel = (c: ExpenseCategory) => t("expenses.cat." + c);

  const openNew = () => {
    setEditing(null);
    setForm({
      client_id: NONE_VALUE,
      category: "state_fee",
      amount: "",
      incurred_on: new Date().toISOString().slice(0, 10),
      billable: false,
      description: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({
      client_id: exp.client_id ?? NONE_VALUE,
      category: exp.category,
      amount: String(exp.amount),
      incurred_on: exp.incurred_on,
      billable: exp.billable,
      description: exp.description ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.amount) return;
    const payload = {
      client_id: form.client_id === NONE_VALUE ? null : form.client_id,
      category: form.category,
      amount: parseFloat(form.amount),
      description: form.description || null,
      incurred_on: form.incurred_on,
      billable: form.billable,
    };
    if (editing) {
      updateExpense.mutate(
        { id: editing.id, ...payload },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createExpense.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const filtered = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter((exp) => {
      if (filterCat !== "all" && exp.category !== filterCat) return false;
      if (filterClient !== "all" && exp.client_id !== filterClient) return false;
      return true;
    });
  }, [expenses, filterCat, filterClient]);

  const stats = useMemo(() => {
    if (!expenses) return { total: 0, thisMonth: 0, count: 0 };
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const thisMonth = expenses
      .filter((e) => e.incurred_on?.slice(0, 7) === monthPrefix)
      .reduce((s, e) => s + Number(e.amount), 0);
    return { total, thisMonth, count: expenses.length };
  }, [expenses]);

  const byCategory = useMemo(() => {
    if (!expenses) return [];
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return EXPENSE_CATEGORIES.filter((c) => (map[c] || 0) > 0).map((c) => ({
      category: c,
      total: map[c],
    }));
  }, [expenses]);

  const exportExpensesCsv = () => {
    if (!filtered.length) return;
    const rows = filtered.map((exp) => ({
      Cliente: exp.clients?.company_name || t("expenses.orgLevel"),
      Categoria: catLabel(exp.category),
      Descrição: exp.description || "",
      Valor: Number(exp.amount).toFixed(2),
      Data: exp.incurred_on,
      Billable: exp.billable ? t("common.yes") : t("common.no"),
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
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-md bg-card border border-border flex items-center justify-center flex-shrink-0">
              <Wallet className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {t("expenses.title")}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl">
                {t("expenses.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportExpensesCsv}
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
                {t("expenses.new")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============ SUMMARY CARDS ============ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {[
          {
            label: t("expenses.total"),
            value: stats.total,
            isCurrency: true,
            icon: DollarSign,
          },
          {
            label: t("expenses.thisMonth"),
            value: stats.thisMonth,
            isCurrency: true,
            icon: Wallet,
          },
          {
            label: t("expenses.count"),
            value: stats.count,
            isCurrency: false,
            icon: Receipt,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-md bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-secondary text-secondary-foreground border border-border opacity-10 blur-2xl group-hover:opacity-25 transition-opacity" />
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

      {/* ============ BY CATEGORY ============ */}
      {byCategory.length > 0 && (
        <Card className="border-border/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                <Filter className="w-4 h-4 text-secondary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-base">{t("expenses.byCategory")}</h2>
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {byCategory.map((row) => (
                <div
                  key={row.category}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="text-sm font-medium text-foreground">
                    {catLabel(row.category)}
                  </span>
                  <span className="font-mono font-bold text-sm">
                    {fmt(row.total)}
                  </span>
                </div>
              ))}
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
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-44 h-10 rounded-md bg-muted/40 border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("permits.all")}</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {catLabel(c)}
              </SelectItem>
            ))}
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
        <span className="sm:ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-primary/10 text-primary border border-primary/15 text-xs font-bold">
          {filtered.length}
        </span>
      </div>

      {/* ============ TABLE ============ */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !filtered.length ? (
        <EmptyState
          icon={<Receipt className="w-9 h-9 text-success" />}
          title={t("expenses.empty")}
          description={t("expenses.emptyDesc")}
          action={
            !isViewer ? (
              <button
                onClick={openNew}
                className="h-11 px-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-foreground text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("expenses.new")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden border-border/50 shadow-sm [&_td]:!py-3 [&_th]:!h-11">
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[920px] table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                  <TableHead className="w-[200px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.client")}
                  </TableHead>
                  <TableHead className="w-[150px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("expenses.category")}
                  </TableHead>
                  <TableHead className="w-[240px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("finance.description")}
                  </TableHead>
                  <TableHead className="w-[130px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">
                    {t("finance.amount")}
                  </TableHead>
                  <TableHead className="w-[120px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.date")}
                  </TableHead>
                  <TableHead className="w-[110px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("expenses.billable")}
                  </TableHead>
                  <TableHead className="w-[120px] text-center font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((exp) => (
                  <TableRow
                    key={exp.id}
                    className="group hover:bg-muted/40 transition-colors border-border/50"
                  >
                    <TableCell className="text-sm font-semibold">
                      <span className="block truncate">
                        {exp.clients?.company_name ?? (
                          <span className="text-muted-foreground font-normal">
                            {t("expenses.orgLevel")}
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone="neutral">
                        {catLabel(exp.category)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                      {exp.description || "—"}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-sm text-right">
                      {fmt(Number(exp.amount))}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(exp.incurred_on), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={exp.billable ? "success" : "neutral"}>
                        {exp.billable ? t("common.yes") : t("common.no")}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        {!isViewer && (
                          <>
                            <button
                              onClick={() => openEdit(exp)}
                              className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
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
                                    onClick={() => deleteExpense.mutate(exp.id)}
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
              {editing ? t("expenses.edit") : t("expenses.new")}
            </DialogTitle>
            <DialogDescription>
              {editing ? t("expenses.editDesc") : t("expenses.newDesc")}
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>
                    {t("expenses.orgLevel")}
                  </SelectItem>
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
                  {t("expenses.category")}
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm({ ...form, category: v as ExpenseCategory })
                  }
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {catLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.date")}
                </Label>
                <Input
                  type="date"
                  value={form.incurred_on}
                  onChange={(e) =>
                    setForm({ ...form, incurred_on: e.target.value })
                  }
                  className="h-11 rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("expenses.billable")}
                </Label>
                <div className="flex items-center h-11">
                  <Switch
                    checked={form.billable}
                    onCheckedChange={(v) => setForm({ ...form, billable: v })}
                  />
                </div>
              </div>
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
                !form.amount ||
                createExpense.isPending ||
                updateExpense.isPending
              }
              className="group w-full h-11 bg-secondary text-secondary-foreground border border-border font-semibold rounded-md inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60 relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-secondary text-secondary-foreground border border-border -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {createExpense.isPending || updateExpense.isPending
                ? t("common.saving")
                : t("common.save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
