import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermits, getExpirationStatus, PERMIT_TYPES } from "@/hooks/usePermits";
import { useClients } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, Loader2, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { generateBatchCompliancePdf } from "@/utils/compliancePdf";

function exportToCsv(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h] ?? "";
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
    setTimeout(() => { win.print(); }, 500);
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

  // Batch compliance
  const [batchOpen, setBatchOpen] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [batchGenerating, setBatchGenerating] = useState(false);

  const toggleClient = (id: string) => {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllClients = () => {
    if (!clients) return;
    if (selectedClients.size === clients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(clients.map((c) => c.id)));
    }
  };

  const handleBatchCompliance = async () => {
    if (!selectedClients.size || !clients || !permits) return;
    setBatchGenerating(true);

    const clientsWithPermits = clients
      .filter((c) => selectedClients.has(c.id))
      .map((c) => ({
        client: { company_name: c.company_name, dot: c.dot, mc: c.mc, ein: c.ein },
        permits: permits.filter((p) => p.client_id === c.id).map((p) => ({
          permit_type: p.permit_type,
          permit_number: p.permit_number,
          state: p.state,
          expiration_date: p.expiration_date,
        })),
      }));

    const success = generateBatchCompliancePdf(clientsWithPermits);
    if (!success) {
      toast({ title: "Popup bloqueado. Permita popups para gerar o PDF.", variant: "destructive" });
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
    clients?.forEach((c) => { map[c.id] = c.company_name; });
    return map;
  }, [clients]);

  const exportRows = useMemo(() => {
    return filtered.map((p) => ({
      Type: p.permit_type,
      Number: p.permit_number || "",
      Client: clientMap[p.client_id] || "",
      Truck: p.trucks?.plate || "",
      State: p.state || "",
      Expiration: p.expiration_date ? format(new Date(p.expiration_date), "dd/MM/yyyy") : "",
      Status: getExpirationStatus(p.expiration_date).label,
    }));
  }, [filtered, clientMap]);

  const handleCsv = () => {
    exportToCsv(exportRows, `permits-report-${format(new Date(), "yyyy-MM-dd")}`);
    toast({ title: t("reports.generated") });
  };

  const handlePdf = () => {
    const success = exportToPdf(exportRows, t("reports.title"), `permits-report-${format(new Date(), "yyyy-MM-dd")}`);
    if (success === false) {
      toast({ title: "Popup bloqueado. Permita popups para exportar o PDF.", variant: "destructive" });
    } else {
      toast({ title: t("reports.generated") });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t("reports.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("reports.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSelectedClients(new Set()); setBatchOpen(true); }}>
            <ShieldCheck className="w-4 h-4 mr-2" />Compliance em Lote
          </Button>
          <Button variant="outline" onClick={handleCsv} disabled={!filtered.length}>
            <Download className="w-4 h-4 mr-2" />{t("reports.exportCsv")}
          </Button>
          <Button onClick={handlePdf} disabled={!filtered.length}>
            <FileText className="w-4 h-4 mr-2" />{t("reports.exportPdf")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("reports.from")}</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("reports.to")}</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("reports.filterType")}</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allTypes")}</SelectItem>
                  {PERMIT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("reports.filterState")}</Label>
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allStates")}</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("reports.filterClient")}</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allClients")}</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-sm">{filtered.length} {t("reports.results")}</Badge>
      </div>

      {permitsLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("reports.noResults")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.type")}</TableHead>
                  <TableHead>{t("common.number")}</TableHead>
                  <TableHead>{t("common.client")}</TableHead>
                  <TableHead>{t("common.truck")}</TableHead>
                  <TableHead>{t("common.state")}</TableHead>
                  <TableHead>{t("common.expiration")}</TableHead>
                  <TableHead>{t("clients.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((permit) => {
                  const expStatus = getExpirationStatus(permit.expiration_date);
                  return (
                    <TableRow key={permit.id}>
                      <TableCell className="font-medium">{permit.permit_type}</TableCell>
                      <TableCell className="font-mono text-xs">{permit.permit_number || "—"}</TableCell>
                      <TableCell>{clientMap[permit.client_id] || "—"}</TableCell>
                      <TableCell>{permit.trucks?.plate || "—"}</TableCell>
                      <TableCell>{permit.state || "—"}</TableCell>
                      <TableCell>{permit.expiration_date ? format(new Date(permit.expiration_date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell><Badge className={expStatus.color}>{expStatus.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Batch Compliance Dialog */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Relatório de Compliance em Lote
            </DialogTitle>
            <DialogDescription>Selecione os clientes para gerar o relatório consolidado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                checked={clients?.length ? selectedClients.size === clients.length : false}
                onCheckedChange={toggleAllClients}
              />
              <span className="text-sm font-medium">Selecionar todos ({clients?.length || 0})</span>
              {selectedClients.size > 0 && (
                <Badge variant="secondary" className="ml-auto">{selectedClients.size} selecionados</Badge>
              )}
            </div>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {clients?.map((c) => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    checked={selectedClients.has(c.id)}
                    onCheckedChange={() => toggleClient(c.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[c.dot && `DOT: ${c.dot}`, c.mc && `MC: ${c.mc}`].filter(Boolean).join(" · ") || "Sem DOT/MC"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <Button
              onClick={handleBatchCompliance}
              disabled={selectedClients.size === 0 || batchGenerating}
              className="w-full"
            >
              {batchGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
              ) : (
                <>Gerar PDF ({selectedClients.size} clientes)</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
