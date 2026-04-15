import { useState, useMemo } from "react";
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
import { usePermits, getExpirationStatus, PERMIT_TYPES } from "@/hooks/usePermits";
import { useClients } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  BarChart3,
  Filter,
  FileBarChart,
  MapPin,
  Building2,
  Calendar as CalendarIcon,
  Search,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { generateBatchCompliancePdf } from "@/utils/compliancePdf";

function exportToCsv(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exportToPdf(rows: Record<string, any>[], title: string, filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const safeTitle = escapeHtml(title);
  const html = `
    <!DOCTYPE html>
    <html><head>
      <title>${safeTitle}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #1a1a1a; }
        h1 { font-size: 20px; margin-bottom: 5px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f4f4f5; padding: 8px 6px; text-align: left; border-bottom: 2px solid #e4e4e7; font-weight: 600; }
        td { padding: 6px; border-bottom: 1px solid #e4e4e7; }
        tr:nth-child(even) { background: #fafafa; }
        .footer { margin-top: 20px; font-size: 10px; color: #999; text-align: right; }
      </style>
    </head><body>
      <h1>${safeTitle}</h1>
      <div class="meta">${new Date().toLocaleDateString()} — ${rows.length} registros</div>
      <table>
        <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${headers.map((h) => `<td>${escapeHtml(String(row[h] ?? "—"))}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
      <div class="footer">MartinsAdviser Report</div>
    </body></html>
  `;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 500);
  } else {
    return false;
  }
  return true;
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: permits, isLoading: permitsLoading } = usePermits();
  const { data: clients } = useClients();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [filterClient, setFilterClient] = useState("all");

  const [batchOpen, setBatchOpen] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const toggleClient = (id: string) => {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllClients = () => {
    if (!clients) return;
    if (selectedClients.size === clients.length) setSelectedClients(new Set());
    else setSelectedClients(new Set(clients.map((c) => c.id)));
  };

  const handleBatchCompliance = async () => {
    if (!selectedClients.size || !clients || !permits) return;
    setBatchGenerating(true);

    const clientsWithPermits = clients
      .filter((c) => selectedClients.has(c.id))
      .map((c) => ({
        client: {
          company_name: c.company_name,
          dot: c.dot,
          mc: c.mc,
          ein: c.ein,
        },
        permits: permits
          .filter((p) => p.client_id === c.id)
          .map((p) => ({
            permit_type: p.permit_type,
            permit_number: p.permit_number,
            state: p.state,
            expiration_date: p.expiration_date,
          })),
      }));

    const success = generateBatchCompliancePdf(clientsWithPermits);
    if (!success) {
      toast({
        title: "Popup bloqueado. Permita popups para gerar o PDF.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Relatório de compliance gerado!" });
      setBatchOpen(false);
    }
    setBatchGenerating(false);
  };

  const states = useMemo(() => {
    if (!permits) return [];
    const s = new Set(permits.map((p) => p.state).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [permits]);

  const filtered = useMemo(() => {
    if (!permits) return [];
    return permits.filter((p) => {
      if (filterType !== "all" && p.permit_type !== filterType) return false;
      if (filterState !== "all" && p.state !== filterState) return false;
      if (filterClient !== "all" && p.client_id !== filterClient) return false;
      if (dateFrom && p.expiration_date && p.expiration_date < dateFrom) return false;
      if (dateTo && p.expiration_date && p.expiration_date > dateTo) return false;
      return true;
    });
  }, [permits, filterType, filterState, filterClient, dateFrom, dateTo]);

  const clientMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients?.forEach((c) => {
      map[c.id] = c.company_name;
    });
    return map;
  }, [clients]);

  const exportRows = useMemo(() => {
    return filtered.map((p) => ({
      Type: p.permit_type,
      Number: p.permit_number || "",
      Client: clientMap[p.client_id] || "",
      Truck: p.trucks?.plate || "",
      State: p.state || "",
      Expiration: p.expiration_date
        ? format(new Date(p.expiration_date), "dd/MM/yyyy")
        : "",
      Status: getExpirationStatus(p.expiration_date).label,
    }));
  }, [filtered, clientMap]);

  const handleCsv = () => {
    exportToCsv(exportRows, `permits-report-${format(new Date(), "yyyy-MM-dd")}`);
    toast({ title: t("reports.generated") });
  };

  const handlePdf = () => {
    const success = exportToPdf(
      exportRows,
      t("reports.title"),
      `permits-report-${format(new Date(), "yyyy-MM-dd")}`
    );
    if (success === false) {
      toast({
        title: "Popup bloqueado. Permita popups para exportar o PDF.",
        variant: "destructive",
      });
    } else {
      toast({ title: t("reports.generated") });
    }
  };

  const activeFilters = [
    dateFrom && "de",
    dateTo && "até",
    filterType !== "all" && "tipo",
    filterState !== "all" && "estado",
    filterClient !== "all" && "cliente",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setFilterType("all");
    setFilterState("all");
    setFilterClient("all");
  };

  const filteredClientsForDialog = useMemo(() => {
    if (!clients) return [];
    if (!clientSearch) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter((c) => c.company_name.toLowerCase().includes(q));
  }, [clients, clientSearch]);

  // Metrics
  const stats = useMemo(() => {
    const total = filtered.length;
    const now = new Date();
    let valid = 0,
      expiring = 0,
      expired = 0;
    filtered.forEach((p) => {
      if (!p.expiration_date) return;
      const diff = Math.ceil(
        (new Date(p.expiration_date).getTime() - now.getTime()) / 86400000
      );
      if (diff < 0) expired++;
      else if (diff <= 30) expiring++;
      else valid++;
    });
    return { total, valid, expiring, expired };
  }, [filtered]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl flex-shrink-0">
              <FileBarChart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
                {t("reports.title")}
              </h1>
              <p className="text-white/70 mt-2 text-sm sm:text-base max-w-xl">
                {t("reports.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSelectedClients(new Set());
                setBatchOpen(true);
              }}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:shadow-lg transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              Compliance em Lote
            </button>
            <button
              onClick={handleCsv}
              disabled={!filtered.length}
              className="h-10 px-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/15 transition-all disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              {t("reports.exportCsv")}
            </button>
            <button
              onClick={handlePdf}
              disabled={!filtered.length}
              className="h-10 px-4 rounded-xl bg-white text-[#0b0d2e] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 transition-all shadow-lg disabled:opacity-60"
            >
              <FileText className="w-4 h-4" />
              {t("reports.exportPdf")}
            </button>
          </div>
        </div>
      </div>

      {/* ============ QUICK STATS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Registros no filtro",
            value: stats.total,
            icon: BarChart3,
            gradient: "from-indigo-500 to-violet-500",
          },
          {
            label: "Válidos (>30d)",
            value: stats.valid,
            icon: ShieldCheck,
            gradient: "from-emerald-500 to-teal-500",
          },
          {
            label: "Vencendo (≤30d)",
            value: stats.expiring,
            icon: CalendarIcon,
            gradient: "from-amber-500 to-orange-500",
          },
          {
            label: "Vencidos",
            value: stats.expired,
            icon: FileText,
            gradient: "from-red-500 to-rose-500",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div
              className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${s.gradient} opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`}
            />
            <div className="relative flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md`}
              >
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="relative">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {s.label}
              </div>
              <div className="font-display text-3xl font-bold tracking-tight">
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ============ FILTERS ============ */}
      <Card className="border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
                <Filter className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base">Filtros</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeFilters > 0
                    ? `${activeFilters} filtro(s) aplicado(s)`
                    : "Refine os resultados do relatório"}
                </p>
              </div>
            </div>
            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-destructive hover:text-destructive/80 inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpar tudo
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("reports.from")}
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 rounded-xl bg-muted/40 border-border/60 focus:bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("reports.to")}
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 rounded-xl bg-muted/40 border-border/60 focus:bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("reports.filterType")}
              </Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/40 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allTypes")}</SelectItem>
                  {PERMIT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("reports.filterState")}
              </Label>
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/40 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allStates")}</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("reports.filterClient")}
              </Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/40 border-border/60">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ RESULTS ============ */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-primary/10 text-primary border border-primary/15 text-xs font-bold">
            <BarChart3 className="w-3.5 h-3.5" />
            {filtered.length} {t("reports.results")}
          </span>
        </div>
      </div>

      {permitsLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !filtered.length ? (
        <Card className="border-border/50">
          <CardContent className="p-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
              <FileBarChart className="w-9 h-9 text-indigo-500" />
            </div>
            <p className="font-display text-lg font-semibold mb-1">
              {t("reports.noResults")}
            </p>
            <p className="text-sm text-muted-foreground">
              Ajuste os filtros para visualizar resultados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.type")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.number")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.client")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.truck")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.state")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("common.expiration")}
                  </TableHead>
                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("clients.status")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((permit) => {
                  const expStatus = getExpirationStatus(permit.expiration_date);
                  return (
                    <TableRow
                      key={permit.id}
                      className="hover:bg-muted/40 transition-colors border-border/50"
                    >
                      <TableCell className="font-semibold text-sm">
                        {permit.permit_type}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {permit.permit_number ? (
                          <span className="inline-flex items-center h-6 px-2 rounded-md bg-muted/50 border border-border/50">
                            {permit.permit_number}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {clientMap[permit.client_id] || "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-xs">
                        {permit.trucks?.plate || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{permit.state || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {permit.expiration_date
                          ? format(new Date(permit.expiration_date), "dd/MM/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={expStatus.color}>{expStatus.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ============ BATCH COMPLIANCE DIALOG ============ */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden p-0 rounded-2xl flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2.5 font-display text-lg">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              Compliance em Lote
            </DialogTitle>
            <DialogDescription className="text-sm">
              Selecione os clientes para gerar o relatório consolidado em PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pt-4 space-y-3 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-muted/40 border-border/60"
              />
            </div>

            {/* Select all bar */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/50">
              <Checkbox
                checked={
                  clients?.length ? selectedClients.size === clients.length : false
                }
                onCheckedChange={toggleAllClients}
              />
              <span className="text-sm font-semibold">
                Selecionar todos
                <span className="text-muted-foreground font-normal ml-1">
                  ({clients?.length || 0})
                </span>
              </span>
              {selectedClients.size > 0 && (
                <span className="ml-auto inline-flex items-center h-6 px-2.5 rounded-md text-[11px] font-bold bg-primary text-primary-foreground">
                  {selectedClients.size} selecionado
                  {selectedClients.size === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {/* Client list */}
            <div className="space-y-1 flex-1 overflow-y-auto pr-1">
              {filteredClientsForDialog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum cliente encontrado
                </p>
              ) : (
                filteredClientsForDialog.map((c) => {
                  const active = selectedClients.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                        active ? "bg-primary/[0.06] border border-primary/20" : "hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      <Checkbox
                        checked={active}
                        onCheckedChange={() => toggleClient(c.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {c.company_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {[c.dot && `DOT ${c.dot}`, c.mc && `MC ${c.mc}`]
                            .filter(Boolean)
                            .join(" · ") || "Sem DOT/MC"}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-6 pt-4 border-t border-border/50">
            <button
              onClick={handleBatchCompliance}
              disabled={selectedClients.size === 0 || batchGenerating}
              className="group w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-[0_10px_30px_-8px_hsl(158_55%_42%/0.55)] text-white font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60 relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {batchGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Gerar PDF ({selectedClients.size}{" "}
                  {selectedClients.size === 1 ? "cliente" : "clientes"})
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
