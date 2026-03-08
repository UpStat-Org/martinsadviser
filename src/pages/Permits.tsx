import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Loader2, FileText, FileCheck } from "lucide-react";
import { usePermits, useDeletePermit, getExpirationStatus } from "@/hooks/usePermits";
import { PermitFormDialog } from "@/components/PermitFormDialog";
import { DocumentViewer } from "@/components/DocumentViewer";
import type { Permit } from "@/hooks/usePermits";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Permits() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
  const [viewDocTitle, setViewDocTitle] = useState("");
  const { data: permits, isLoading } = usePermits(search || undefined, undefined, statusFilter);
  const deletePermit = useDeletePermit();
  const { t } = useLanguage();

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
        <Button onClick={handleNew}><Plus className="w-4 h-4 mr-2" />{t("permits.new")}</Button>
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
                {permits.map((permit) => {
                  const expStatus = getExpirationStatus(permit.expiration_date);
                  return (
                    <TableRow key={permit.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium">{permit.permit_type}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{permit.permit_number || "—"}</TableCell>
                      <TableCell>{(permit as any).clients?.company_name || "—"}</TableCell>
                      <TableCell>{(permit as any).trucks?.plate || "—"}</TableCell>
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
      <PermitFormDialog open={dialogOpen} onOpenChange={setDialogOpen} permit={editingPermit} />
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
