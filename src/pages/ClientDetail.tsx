import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClient, useDeleteClient } from "@/hooks/useClients";
import { useTrucks, useDeleteTruck, type Truck } from "@/hooks/useTrucks";
import { usePermits, useDeletePermit, getExpirationStatus, type Permit } from "@/hooks/usePermits";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { TruckFormDialog } from "@/components/TruckFormDialog";
import { PermitFormDialog } from "@/components/PermitFormDialog";
import { ComplianceDashboard } from "@/components/ComplianceDashboard";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { InvitePortalDialog } from "@/components/InvitePortalDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Loader2, Phone, Mail, MapPin, Plus, Truck as TruckIcon, FileCheck, FileText, Eye, Clock, UserPlus, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const serviceLabels = [
  { key: "service_ifta", label: "IFTA" },
  { key: "service_ct", label: "CT" },
  { key: "service_ny", label: "NY" },
  { key: "service_kyu", label: "KYU" },
  { key: "service_nm", label: "NM" },
  { key: "service_automatic", label: "Automatic" },
] as const;

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);
  const { data: trucks } = useTrucks(undefined, id);
  const { data: permits } = usePermits(undefined, id);
  const deleteClient = useDeleteClient();
  const deleteTruck = useDeleteTruck();
  const deletePermit = useDeletePermit();
  const { t, language } = useLanguage();
  const { role } = useAuth();
  const isViewer = role === "viewer";

  const [editOpen, setEditOpen] = useState(false);
  const [truckDialogOpen, setTruckDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [permitDialogOpen, setPermitDialogOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
  const [viewDocTitle, setViewDocTitle] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiReportOpen, setAiReportOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const statusMap: Record<string, { label: string; className: string }> = {
    active: { label: t("common.active"), className: "bg-success text-success-foreground" },
    inactive: { label: t("common.inactive"), className: "bg-muted text-muted-foreground" },
    pending: { label: t("common.pending"), className: "bg-warning text-warning-foreground" },
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  if (!client) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">{t("clients.notFound")}</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/clients")}>{t("common.back")}</Button>
    </div>
  );

  const status = statusMap[client.status] || statusMap.active;
  const handleDelete = async () => { await deleteClient.mutateAsync(client.id); navigate("/clients"); };
  const handleEditTruck = (truck: Truck) => { setEditingTruck(truck); setTruckDialogOpen(true); };
  const handleNewTruck = () => { setEditingTruck(null); setTruckDialogOpen(true); };
  const handleEditPermit = (permit: Permit) => { setEditingPermit(permit); setPermitDialogOpen(true); };
  const handleNewPermit = () => { setEditingPermit(null); setPermitDialogOpen(true); };

  const handleGenerateReport = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-report", {
        body: { client_id: id, language },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiReport(data.report);
      setAiReportOpen(true);
    } catch (e: any) {
      console.error("AI Report error:", e);
      const { toast } = await import("@/hooks/use-toast").then(m => ({ toast: m.useToast }));
      // use a simpler approach
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-foreground">{client.company_name}</h1>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleGenerateReport} disabled={aiLoading}>
          {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {t("ai.generateReport")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="w-4 h-4 mr-2" />{t("portal.inviteClient")}</Button>
        <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="w-4 h-4 mr-2" />{t("common.edit")}</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("clients.removeClient")}</AlertDialogTitle>
              <AlertDialogDescription>{t("clients.removeClientDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>{t("common.delete")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="font-display text-lg">{t("clients.info")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider">EIN</p><p className="font-medium">{client.ein || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider">DOT #</p><p className="font-medium">{client.dot || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider">MC #</p><p className="font-medium">{client.mc || "—"}</p></div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              {client.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /><span>{client.phone}</span></div>}
              {client.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /><span>{client.email}</span></div>}
              {client.address && <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" /><span>{client.address}</span></div>}
            </div>
            {client.notes && <div className="pt-2"><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("clients.notes")}</p><p className="text-sm whitespace-pre-wrap">{client.notes}</p></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">{t("clients.services")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {serviceLabels.map((s) => <Badge key={s.key} variant={client[s.key] ? "default" : "outline"} className={!client[s.key] ? "opacity-40" : ""}>{s.label}</Badge>)}
            </div>
          </CardContent>
        </Card>
      </div>

      <ComplianceDashboard permits={permits} />

      <Tabs defaultValue="trucks">
        <TabsList>
          <TabsTrigger value="trucks" className="gap-2"><TruckIcon className="w-4 h-4" />{t("trucks.title")} ({trucks?.length || 0})</TabsTrigger>
          <TabsTrigger value="permits" className="gap-2"><FileCheck className="w-4 h-4" />{t("permits.title")} ({permits?.length || 0})</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Clock className="w-4 h-4" />{t("activity.title")}</TabsTrigger>
        </TabsList>

        <TabsContent value="trucks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display text-lg">{t("trucks.title")}</CardTitle>
              <Button size="sm" onClick={handleNewTruck}><Plus className="w-4 h-4 mr-2" />{t("common.add")}</Button>
            </CardHeader>
            <CardContent className="p-0">
              {!trucks?.length ? (
                <div className="p-8 text-center text-muted-foreground">{t("clients.noTrucks")}</div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t("trucks.plate")}</TableHead><TableHead>{t("trucks.makeModel")}</TableHead><TableHead>{t("trucks.year")}</TableHead><TableHead>VIN</TableHead><TableHead>{t("clients.status")}</TableHead><TableHead className="w-24">{t("common.actions")}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {trucks.map((truck) => (
                      <TableRow key={truck.id}>
                        <TableCell className="font-medium">{truck.plate}</TableCell>
                        <TableCell>{[truck.make, truck.model].filter(Boolean).join(" ") || "—"}</TableCell>
                        <TableCell>{truck.year || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{truck.vin || "—"}</TableCell>
                        <TableCell><Badge className={truck.status === "active" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>{truck.status === "active" ? t("common.active") : t("common.inactive")}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditTruck(truck)}><Pencil className="w-4 h-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>{t("trucks.removeTruck")}</AlertDialogTitle><AlertDialogDescription>{t("common.cannotUndo")}</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => deleteTruck.mutate(truck.id)}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permits" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display text-lg">{t("permits.title")}</CardTitle>
              <Button size="sm" onClick={handleNewPermit}><Plus className="w-4 h-4 mr-2" />{t("common.add")}</Button>
            </CardHeader>
            <CardContent className="p-0">
              {!permits?.length ? (
                <div className="p-8 text-center text-muted-foreground">{t("clients.noPermits")}</div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t("common.type")}</TableHead><TableHead>{t("common.number")}</TableHead><TableHead>{t("common.truck")}</TableHead><TableHead>{t("common.state")}</TableHead><TableHead>{t("common.expiration")}</TableHead><TableHead>{t("clients.status")}</TableHead><TableHead>{t("common.doc")}</TableHead><TableHead className="w-24">{t("common.actions")}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {permits.map((permit) => {
                      const expStatus = getExpirationStatus(permit.expiration_date);
                      return (
                        <TableRow key={permit.id}>
                          <TableCell className="font-medium">{permit.permit_type}</TableCell>
                          <TableCell className="font-mono text-xs">{permit.permit_number || "—"}</TableCell>
                          <TableCell>{(permit as any).trucks?.plate || "—"}</TableCell>
                          <TableCell>{permit.state || "—"}</TableCell>
                          <TableCell>{permit.expiration_date ? format(new Date(permit.expiration_date), "dd/MM/yyyy") : "—"}</TableCell>
                          <TableCell><Badge className={expStatus.color}>{expStatus.label}</Badge></TableCell>
                          <TableCell>
                            {permit.document_url ? (
                              <Button variant="ghost" size="icon" onClick={() => { setViewDocUrl(permit.document_url!); setViewDocTitle(`${permit.permit_type} - ${permit.permit_number || ""}`); }}>
                                <FileText className="w-4 h-4 text-primary" />
                              </Button>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditPermit(permit)}><Pencil className="w-4 h-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>{t("permits.removePermit")}</AlertDialogTitle><AlertDialogDescription>{t("common.cannotUndo")}</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => deletePermit.mutate(permit.id)}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          {id && <ActivityTimeline clientId={id} />}
        </TabsContent>
      </Tabs>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
      <TruckFormDialog open={truckDialogOpen} onOpenChange={setTruckDialogOpen} truck={editingTruck} defaultClientId={id} />
      <PermitFormDialog open={permitDialogOpen} onOpenChange={setPermitDialogOpen} permit={editingPermit} defaultClientId={id} />
      {viewDocUrl && (
        <DocumentViewer
          open={!!viewDocUrl}
          onOpenChange={(v) => { if (!v) setViewDocUrl(null); }}
          url={viewDocUrl}
          title={viewDocTitle}
        />
      )}
      <InvitePortalDialog open={inviteOpen} onOpenChange={setInviteOpen} clientId={client.id} clientName={client.company_name} />

      {/* AI Report Dialog */}
      <Dialog open={aiReportOpen} onOpenChange={setAiReportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("ai.reportTitle")} — {client.company_name}
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {aiReport}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
