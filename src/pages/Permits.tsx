import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Loader2, FileText, FileCheck, RefreshCw, History } from "lucide-react";
import { usePermits, useDeletePermit, getExpirationStatus } from "@/hooks/usePermits";
import { PermitFormDialog } from "@/components/PermitFormDialog";
import { DocumentViewer } from "@/components/DocumentViewer";
import type { Permit } from "@/hooks/usePermits";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PaginationBar } from "@/components/PaginationBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdatePermit } from "@/hooks/usePermits";
import { useCreatePermitHistory } from "@/hooks/usePermitHistory";
import { PermitHistoryDialog } from "@/components/PermitHistoryDialog";
import { useToast } from "@/hooks/use-toast";
import { SavedFiltersBar } from "@/components/SavedFiltersBar";

export default function Permits() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
  const [viewDocTitle, setViewDocTitle] = useState("");
  const { data: permits, isLoading } = usePermits(search || undefined, undefined, statusFilter);
  const deletePermit = useDeletePermit();
  const updatePermit = useUpdatePermit();
  const createHistory = useCreatePermitHistory();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [historyPermitId, setHistoryPermitId] = useState<string | null>(null);
  const [historyPermitLabel, setHistoryPermitLabel] = useState("");
  const [bulkRenewing, setBulkRenewing] = useState(false);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const totalPages = Math.ceil((permits?.length || 0) / PAGE_SIZE);
  const paginatedPermits = useMemo(() => {
    if (!permits) return [];
    const start = (page - 1) * PAGE_SIZE;
    return permits.slice(start, start + PAGE_SIZE);
  }, [permits, page]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!permits) return;
    if (selected.size === permits.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(permits.map((p) => p.id)));
    }
  };

  const handleBulkRenew = async () => {
    if (selected.size === 0 || !permits) return;
    setBulkRenewing(true);
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const newExpDate = nextYear.toISOString().split("T")[0];

    let success = 0;
    for (const id of selected) {
      const permit = permits.find((p) => p.id === id);
      if (!permit) continue;
      try {
        await createHistory.mutateAsync({
          permit_id: id,
          change_type: "renewed",
          old_values: {
            expiration_date: permit.expiration_date,
            status: permit.status,
          },
          new_values: {
            expiration_date: newExpDate,
            status: "active",
          },
          notes: `Renovação em lote — validade anterior: ${permit.expiration_date || "—"}`,
        });
        await updatePermit.mutateAsync({
          id,
          expiration_date: newExpDate,
          status: "active",
        });
        success++;
      } catch {
        // continue with next
      }
    }
    setBulkRenewing(false);
    setSelected(new Set());
    toast({ title: `${success} permit(s) renovado(s) com sucesso!` });
  };

  const statusFilters = [
    { value: "all", label: t("permits.all") },
    { value: "active", label: t("permits.actives") },
    { value: "expired", label: t("permits.expired") },
    { value: "pending", label: t("permits.pendings") },
  ];

  const handleEdit = (permit: Permit) => { setEditingPermit(permit); setDialogOpen(true); };
  const handleNew = () => { setEditingPermit(null); setDialogOpen(true); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{t("permits.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("permits.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button variant="outline" onClick={handleBulkRenew} disabled={bulkRenewing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${bulkRenewing ? "animate-spin" : ""}`} />
              Renovar {selected.size} selecionado(s)
            </Button>
          )}
          <Button onClick={handleNew}><Plus className="w-4 h-4 mr-2" />{t("permits.new")}</Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("permits.search")} className="pl-10 bg-muted/30 border-border/60 focus:bg-background transition-colors" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {statusFilters.map((f) => (
            <Badge
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              className={`cursor-pointer transition-all ${statusFilter === f.value ? "" : "hover:bg-muted"}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Badge>
          ))}
        </div>
      </div>

      <SavedFiltersBar
        page="permits"
        currentFilters={{ search, statusFilter }}
        onApply={(f) => {
          if (f.search !== undefined) setSearch(f.search);
          if (f.statusFilter !== undefined) setStatusFilter(f.statusFilter);
        }}
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !permits?.length ? (
        <Card className="shadow-soft">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-lg">{t("permits.empty")}</p>
            <Button variant="outline" className="mt-4" onClick={handleNew}><Plus className="w-4 h-4 mr-2" />{t("permits.registerFirst")}</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={permits?.length ? selected.size === permits.length : false}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">{t("common.type")}</TableHead>
                  <TableHead className="font-semibold">{t("common.number")}</TableHead>
                  <TableHead className="font-semibold">{t("common.client")}</TableHead>
                  <TableHead className="font-semibold">{t("common.truck")}</TableHead>
                  <TableHead className="font-semibold">{t("common.state")}</TableHead>
                  <TableHead className="font-semibold">{t("common.expiration")}</TableHead>
                  <TableHead className="font-semibold">{t("clients.status")}</TableHead>
                  <TableHead className="font-semibold">{t("common.doc")}</TableHead>
                  <TableHead className="w-24 font-semibold">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPermits.map((permit) => {
                  const expStatus = getExpirationStatus(permit.expiration_date);
                  return (
                    <TableRow key={permit.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={selected.has(permit.id)}
                          onCheckedChange={() => toggleSelect(permit.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{permit.permit_type}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{permit.permit_number || "—"}</TableCell>
                      <TableCell>{permit.clients?.company_name || "—"}</TableCell>
                      <TableCell>{permit.trucks?.plate || "—"}</TableCell>
                      <TableCell>{permit.state || "—"}</TableCell>
                      <TableCell>{permit.expiration_date ? format(new Date(permit.expiration_date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={expStatus.color}>{expStatus.label}</Badge></TableCell>
                      <TableCell>
                        {permit.document_url ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => { setViewDocUrl(permit.document_url!); setViewDocTitle(`${permit.permit_type} - ${permit.permit_number || ""}`); }}>
                                <FileText className="w-4 h-4 text-primary" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("documents.viewer")}</TooltipContent>
                          </Tooltip>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setHistoryPermitId(permit.id); setHistoryPermitLabel(`${permit.permit_type} ${permit.permit_number || ""}`); }}><History className="w-4 h-4 text-muted-foreground" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(permit)}><Pencil className="w-4 h-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("permits.removePermit")}</AlertDialogTitle>
                                <AlertDialogDescription>{t("common.cannotUndo")}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePermit.mutate(permit.id)}>{t("common.delete")}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />

      <PermitFormDialog open={dialogOpen} onOpenChange={setDialogOpen} permit={editingPermit} />
      {historyPermitId && (
        <PermitHistoryDialog
          open={!!historyPermitId}
          onOpenChange={(v) => { if (!v) setHistoryPermitId(null); }}
          permitId={historyPermitId}
          permitLabel={historyPermitLabel}
        />
      )}
      {viewDocUrl && (
        <DocumentViewer
          open={!!viewDocUrl}
          onOpenChange={(v) => { if (!v) setViewDocUrl(null); }}
          url={viewDocUrl}
          title={viewDocTitle}
        />
      )}
    </div>
  );
}
